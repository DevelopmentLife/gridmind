"""BaseAgent ABC and AgentContext — foundation for all Cortex agents."""

from __future__ import annotations

import abc
import asyncio
import json
import time
from dataclasses import dataclass
from typing import Any

import structlog

from cortex.approval import AdvisoryOnlyError, ApprovalGate
from cortex.audit import AuditLogger
from cortex.config import CortexConfig
from cortex.event_mesh import EventMesh
from cortex.llm import LLMClient
from cortex.models import (
    AgentMetrics,
    AgentTier,
    AutonomyLevel,
    EventEnvelope,
    ToolDefinition,
    TIER_PUBLISH_PERMISSIONS,
)
from cortex.state import StateManager

logger = structlog.get_logger(__name__)


@dataclass
class AgentContext:
    """Runtime context injected into each agent instance."""

    tenant_id: str
    config: CortexConfig
    event_mesh: EventMesh
    state_manager: StateManager
    llm_client: LLMClient
    audit_logger: AuditLogger
    approval_gate: ApprovalGate


class BaseAgent(abc.ABC):
    """Abstract base class for all Cortex agents.

    Subclasses must define class variables (AGENT_NAME, TIER, etc.) and implement
    the `process()` and `run_cycle()` abstract methods.
    """

    # --- Class variables to be defined by subclasses ---
    AGENT_NAME: str = ""
    TIER: AgentTier = AgentTier.PERCEPTION
    AUTONOMY_LEVEL: AutonomyLevel = AutonomyLevel.AUTONOMOUS
    MODEL_ASSIGNMENT: str = "deterministic"
    VISIBILITY: str = "Internal"
    DESCRIPTION: str = ""
    TOOLS: list[ToolDefinition] = []
    SUBSCRIPTIONS: list[str] = []
    EMISSIONS: list[str] = []
    CYCLE_INTERVAL_SECONDS: float = 0.0

    def __init__(self, context: AgentContext) -> None:
        self._context = context
        self._metrics = AgentMetrics()
        self._running = False
        self._heartbeat_task: asyncio.Task[None] | None = None
        self._cycle_task: asyncio.Task[None] | None = None
        self._tool_handlers: dict[str, Any] = {}
        self._log = logger.bind(
            agent=self.AGENT_NAME,
            tenant_id=context.tenant_id,
            tier=self.TIER.value,
        )

    @property
    def agent_id(self) -> str:
        """Unique identifier for this agent instance."""
        return f"{self.AGENT_NAME}:{self._context.tenant_id}"

    @property
    def metrics(self) -> AgentMetrics:
        """Current runtime metrics for this agent."""
        return self._metrics

    # --- Lifecycle ---

    async def start(self) -> None:
        """Start the agent: run on_start, begin heartbeat loop, and cycle loop."""
        self._running = True
        await self.on_start()

        # Start heartbeat loop
        self._heartbeat_task = asyncio.create_task(self._heartbeat_loop())

        # Start cycle loop if this is a tick-driven agent
        if self.CYCLE_INTERVAL_SECONDS > 0:
            self._cycle_task = asyncio.create_task(self._cycle_loop())

        self._log.info("agent.started")

    async def stop(self) -> None:
        """Stop the agent: cancel tasks, run on_stop."""
        self._running = False

        if self._heartbeat_task is not None:
            self._heartbeat_task.cancel()
            try:
                await self._heartbeat_task
            except asyncio.CancelledError:
                pass

        if self._cycle_task is not None:
            self._cycle_task.cancel()
            try:
                await self._cycle_task
            except asyncio.CancelledError:
                pass

        await self.on_stop()
        self._log.info("agent.stopped")

    async def on_start(self) -> None:
        """Lifecycle hook called when the agent starts. Override for setup."""

    async def on_stop(self) -> None:
        """Lifecycle hook called when the agent stops. Override for cleanup."""

    # --- Abstract methods ---

    @abc.abstractmethod
    async def process(self, event: EventEnvelope) -> None:
        """Handle an inbound event from the event mesh.

        Args:
            event: The event envelope to process.
        """

    @abc.abstractmethod
    async def run_cycle(self) -> None:
        """Execute the agent's proactive tick-driven logic."""

    # --- Built-in capabilities ---

    async def _emit(self, event: EventEnvelope) -> None:
        """Publish an event with tier-based permission enforcement.

        Args:
            event: The event to publish.

        Raises:
            PermissionError: If the agent's tier does not permit this event type.
        """
        allowed_prefixes = TIER_PUBLISH_PERMISSIONS.get(self.TIER, [])
        if not any(event.event_type.startswith(prefix) for prefix in allowed_prefixes):
            raise PermissionError(
                f"Agent {self.AGENT_NAME} (tier={self.TIER.value}) "
                f"cannot publish event type '{event.event_type}'"
            )

        event.source_agent = self.AGENT_NAME
        if not event.tenant_id:
            event.tenant_id = self._context.tenant_id

        await self._context.event_mesh.publish(event)
        self._context.audit_logger.log(
            tenant_id=self._context.tenant_id,
            agent_id=self.AGENT_NAME,
            action="event_emitted",
            resource_type="event",
            resource_id=event.event_id,
            details={"event_type": event.event_type},
        )

    async def _invoke_tool(self, name: str, **kwargs: Any) -> dict[str, Any]:
        """Invoke a tool from the agent's allowlist.

        Args:
            name: Tool name (must be in self.TOOLS).
            **kwargs: Tool input parameters.

        Returns:
            Tool execution result as a dict.

        Raises:
            PermissionError: If the tool is not in the agent's allowlist.
        """
        allowed_names = {t.name for t in self.TOOLS}
        if name not in allowed_names:
            raise PermissionError(
                f"Agent {self.AGENT_NAME} is not allowed to invoke tool '{name}'"
            )

        handler = self._tool_handlers.get(name)
        if handler is not None:
            result = await handler(**kwargs)
            self._log.debug("tool.invoked", tool=name)
            return result if isinstance(result, dict) else {"result": result}

        # Default: return empty result for tools without registered handlers
        self._log.warning("tool.no_handler", tool=name)
        return {"status": "no_handler", "tool": name}

    async def _llm(self, system: str, messages: list[dict[str, Any]]) -> str:
        """Make a single-turn LLM call.

        Args:
            system: System prompt.
            messages: Conversation messages.

        Returns:
            The LLM response text.
        """
        return await self._context.llm_client.call(
            model=self.MODEL_ASSIGNMENT,
            system=system,
            messages=messages,
        )

    async def _llm_with_tools(
        self,
        system: str,
        message: str,
        tools: list[ToolDefinition] | None = None,
        max_iterations: int = 10,
    ) -> str:
        """Run an agentic tool-use loop with the LLM.

        The LLM can request tool calls which are executed and fed back until
        either the LLM returns a final text response or max_iterations is reached.

        Args:
            system: System prompt.
            message: Initial user message.
            tools: Tool definitions (defaults to self.TOOLS).
            max_iterations: Maximum tool-use iterations.

        Returns:
            The final LLM response text.
        """
        if tools is None:
            tools = self.TOOLS

        messages: list[dict[str, Any]] = [{"role": "user", "content": message}]

        for _ in range(max_iterations):
            response_text, tool_calls = await self._context.llm_client.call_with_tools(
                model=self.MODEL_ASSIGNMENT,
                system=system,
                messages=messages,
                tools=tools,
            )

            if not tool_calls:
                return response_text

            # Execute each tool call and feed results back
            tool_results: list[dict[str, Any]] = []
            for tc in tool_calls:
                try:
                    result = await self._invoke_tool(tc["name"], **tc.get("input", {}))
                    tool_results.append({"tool": tc["name"], "result": result})
                except PermissionError as exc:
                    tool_results.append({"tool": tc["name"], "error": str(exc)})

            messages.append({"role": "assistant", "content": response_text})
            messages.append({
                "role": "user",
                "content": f"Tool results: {json.dumps(tool_results)}",
            })

        return response_text  # type: ignore[possibly-undefined]

    async def _request_approval(self, action_description: str, risk_level: str) -> bool:
        """Request approval through the approval gate.

        SUPERVISED agents block here until a human approves or rejects.
        AUTONOMOUS agents auto-approve. ADVISORY agents raise.

        Args:
            action_description: Human-readable description of the action.
            risk_level: Risk classification (low, medium, high, critical).

        Returns:
            True if approved.
        """
        return await self._context.approval_gate.request_approval(
            agent_id=self.AGENT_NAME,
            tenant_id=self._context.tenant_id,
            action=action_description,
            risk_level=risk_level,
            autonomy_level=self.AUTONOMY_LEVEL,
        )

    # --- Context state shortcuts ---

    async def set_context(self, key: str, value: Any, ttl: int | None = None) -> None:
        """Store a value in the agent's Redis context."""
        await self._context.state_manager.set_context(
            self.AGENT_NAME, self._context.tenant_id, key, value, ttl
        )

    async def get_context(self, key: str) -> Any | None:
        """Retrieve a value from the agent's Redis context."""
        return await self._context.state_manager.get_context(
            self.AGENT_NAME, self._context.tenant_id, key
        )

    async def delete_context(self, key: str) -> None:
        """Delete a value from the agent's Redis context."""
        await self._context.state_manager.delete_context(
            self.AGENT_NAME, self._context.tenant_id, key
        )

    # --- Heartbeat ---

    async def emit_heartbeat(self) -> None:
        """Emit a heartbeat event to the event mesh."""
        heartbeat = EventEnvelope(
            event_type="agent.heartbeat",
            tenant_id=self._context.tenant_id,
            source_agent=self.AGENT_NAME,
            payload={
                "agent_name": self.AGENT_NAME,
                "tier": self.TIER.value,
                "metrics": self._metrics.model_dump(),
            },
        )
        # Heartbeat bypasses tier permission check — always allowed
        heartbeat.source_agent = self.AGENT_NAME
        await self._context.event_mesh.publish(heartbeat)

    async def _heartbeat_loop(self) -> None:
        """Background loop emitting heartbeats at the configured interval."""
        interval = self._context.config.heartbeat_interval
        while self._running:
            try:
                await self.emit_heartbeat()
            except Exception as exc:
                self._log.warning("heartbeat.error", error=str(exc))
            await asyncio.sleep(interval)

    async def _cycle_loop(self) -> None:
        """Background loop running the agent's cycle at CYCLE_INTERVAL_SECONDS."""
        while self._running:
            start = time.monotonic()
            try:
                await self.run_cycle()
                self._metrics.cycles_completed += 1
            except Exception as exc:
                self._metrics.errors += 1
                self._log.error("cycle.error", error=str(exc), exc_info=True)
            finally:
                duration_ms = (time.monotonic() - start) * 1000
                # Running average
                total = self._metrics.cycles_completed + self._metrics.errors
                if total > 0:
                    self._metrics.avg_cycle_duration_ms = (
                        (self._metrics.avg_cycle_duration_ms * (total - 1) + duration_ms) / total
                    )

            await asyncio.sleep(self.CYCLE_INTERVAL_SECONDS)
