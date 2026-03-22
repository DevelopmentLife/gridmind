"""CortexRuntime — process lifecycle manager for the agent fleet."""

from __future__ import annotations

import asyncio
import json
import signal
from typing import Any

import structlog
from prometheus_client import start_http_server

from cortex.approval import ApprovalGate
from cortex.audit import AuditLogger
from cortex.base_agent import AgentContext, BaseAgent
from cortex.config import CortexConfig
from cortex.event_mesh import EventMesh
from cortex.llm import LLMClient
from cortex.models import AgentInfo, AgentStatus, EventEnvelope
from cortex.state import StateManager

logger = structlog.get_logger(__name__)


class CortexRuntime:
    """Process-level lifecycle manager for the Cortex agent fleet.

    Manages connections to NATS, PostgreSQL, and Redis, bootstraps shared
    services, instantiates agents per tenant, and handles graceful shutdown.
    """

    def __init__(self, config: CortexConfig) -> None:
        self._config = config
        self._agent_classes: list[type[BaseAgent]] = []
        self._tenant_ids: list[str] = []
        self._agents: list[BaseAgent] = []
        self._event_mesh = EventMesh(config)
        self._state_manager = StateManager()
        self._llm_client = LLMClient(api_key=config.anthropic_api_key)
        self._audit_logger: AuditLogger | None = None
        self._approval_gate: ApprovalGate | None = None
        self._shutdown_event = asyncio.Event()

    @classmethod
    def from_env(cls) -> CortexRuntime:
        """Create a CortexRuntime from environment variables.

        Returns:
            A configured CortexRuntime instance.
        """
        config = CortexConfig()
        return cls(config)

    def register(self, agent_class: type[BaseAgent]) -> CortexRuntime:
        """Register an agent class for instantiation.

        Args:
            agent_class: A BaseAgent subclass to register.

        Returns:
            Self for fluent chaining.
        """
        self._agent_classes.append(agent_class)
        logger.info("runtime.registered", agent=agent_class.AGENT_NAME)
        return self

    def set_tenants(self, tenant_ids: list[str]) -> CortexRuntime:
        """Set active tenant IDs for multi-tenant agent instantiation.

        Args:
            tenant_ids: List of tenant identifiers.

        Returns:
            Self for fluent chaining.
        """
        self._tenant_ids = tenant_ids
        logger.info("runtime.tenants_set", count=len(tenant_ids))
        return self

    def list_agents(self) -> list[AgentInfo]:
        """Return metadata about all running agent instances.

        Returns:
            List of AgentInfo objects for each running agent.
        """
        return [
            AgentInfo(
                agent_name=agent.AGENT_NAME,
                tenant_id=agent._context.tenant_id,
                tier=agent.TIER,
                autonomy_level=agent.AUTONOMY_LEVEL,
                model_assignment=agent.MODEL_ASSIGNMENT,
                visibility=agent.VISIBILITY,
                description=agent.DESCRIPTION,
                status=AgentStatus.HEALTHY if agent._running else AgentStatus.STOPPED,
                metrics=agent.metrics,
            )
            for agent in self._agents
        ]

    async def run_until_shutdown(self) -> None:
        """Main entry point: connect services, start agents, block until shutdown.

        Connects to NATS, PostgreSQL, and Redis, bootstraps shared services,
        instantiates and starts all registered agents per tenant, then blocks
        until SIGINT or SIGTERM is received for graceful shutdown.
        """
        logger.info(
            "runtime.starting",
            environment=self._config.environment,
            agent_classes=len(self._agent_classes),
            tenants=len(self._tenant_ids),
        )

        # Connect infrastructure
        await self._event_mesh.connect()
        await self._state_manager.connect(
            self._config.database_url, self._config.redis_url
        )

        # Bootstrap shared services
        self._audit_logger = AuditLogger(self._state_manager)
        await self._audit_logger.start()

        self._approval_gate = ApprovalGate(self._config, self._event_mesh)

        # Subscribe to approval responses
        await self._event_mesh.subscribe(
            "gridmind.events.*.approval.response",
            self._handle_approval_response,
            durable_name="cortex-approval-handler",
        )

        # Start Prometheus metrics server
        try:
            start_http_server(self._config.prometheus_port)
            logger.info("runtime.prometheus_started", port=self._config.prometheus_port)
        except OSError as exc:
            logger.warning("runtime.prometheus_failed", error=str(exc))

        # Instantiate agents per tenant
        if not self._tenant_ids:
            self._tenant_ids = ["default"]

        for tenant_id in self._tenant_ids:
            for agent_cls in self._agent_classes:
                context = AgentContext(
                    tenant_id=tenant_id,
                    config=self._config,
                    event_mesh=self._event_mesh,
                    state_manager=self._state_manager,
                    llm_client=self._llm_client,
                    audit_logger=self._audit_logger,
                    approval_gate=self._approval_gate,
                )
                agent = agent_cls(context)
                self._agents.append(agent)

        # Subscribe agents to their event patterns
        for agent in self._agents:
            for pattern in agent.SUBSCRIPTIONS:
                subject = f"gridmind.events.{agent._context.tenant_id}.{pattern}"
                await self._event_mesh.subscribe(
                    subject,
                    self._make_agent_handler(agent),
                    durable_name=f"{agent.AGENT_NAME}-{agent._context.tenant_id}-{pattern.replace('.', '-').replace('*', 'all').replace('>', 'gt')}",
                )

        # Start all agents
        await asyncio.gather(*(agent.start() for agent in self._agents))
        logger.info("runtime.all_agents_started", count=len(self._agents))

        # Set up signal handlers
        loop = asyncio.get_running_loop()
        for sig in (signal.SIGINT, signal.SIGTERM):
            try:
                loop.add_signal_handler(sig, self._signal_handler)
            except NotImplementedError:
                # Windows does not support add_signal_handler
                pass

        # Block until shutdown signal
        await self._shutdown_event.wait()
        await self._graceful_shutdown()

    def _signal_handler(self) -> None:
        """Handle shutdown signals by setting the shutdown event."""
        logger.info("runtime.signal_received")
        self._shutdown_event.set()

    async def _graceful_shutdown(self) -> None:
        """Stop all agents and close connections."""
        logger.info("runtime.shutting_down", agent_count=len(self._agents))

        # Stop all agents concurrently
        await asyncio.gather(
            *(agent.stop() for agent in self._agents),
            return_exceptions=True,
        )

        # Stop audit logger
        if self._audit_logger is not None:
            await self._audit_logger.stop()

        # Close connections
        await self._event_mesh.close()
        await self._state_manager.close()

        logger.info("runtime.shutdown_complete")

    def _make_agent_handler(self, agent: BaseAgent) -> Any:
        """Create a message handler callback for an agent.

        Args:
            agent: The agent to route messages to.

        Returns:
            An async callback for NATS message handling.
        """

        async def handler(msg: Any) -> None:
            try:
                data = json.loads(msg.data.decode())
                event = EventEnvelope(**data)
                await agent.process(event)
                agent._metrics.events_processed += 1
                await msg.ack()
            except Exception as exc:
                agent._metrics.errors += 1
                logger.error(
                    "runtime.event_handler_error",
                    agent=agent.AGENT_NAME,
                    error=str(exc),
                    exc_info=True,
                )
                try:
                    await msg.nak(delay=5)
                except Exception:
                    pass

        return handler

    async def _handle_approval_response(self, msg: Any) -> None:
        """Route approval response events to the ApprovalGate."""
        try:
            data = json.loads(msg.data.decode())
            event = EventEnvelope(**data)
            if self._approval_gate is not None:
                await self._approval_gate.handle_response(event)
            await msg.ack()
        except Exception as exc:
            logger.error("runtime.approval_handler_error", error=str(exc))
