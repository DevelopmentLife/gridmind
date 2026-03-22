"""GREMLIN — Chaos Testing agent.

Injects controlled faults to validate system resilience. Requires CHAOS_ENABLED=true.
"""

from __future__ import annotations

import enum
import json
import os

import structlog

from cortex.base_agent import BaseAgent
from cortex.models import AgentTier, AutonomyLevel, EventEnvelope, ToolDefinition

logger = structlog.get_logger(__name__)


class FaultType(str, enum.Enum):
    """Types of chaos faults that can be injected."""

    POD_KILL = "pod_kill"
    DB_LATENCY = "db_latency"
    CONNECTION_EXHAUSTION = "connection_exhaustion"


class GremlinAgent(BaseAgent):
    """Chaos Testing: requires CHAOS_ENABLED=true."""

    AGENT_NAME = "gremlin"
    TIER = AgentTier.SELF_HEALING
    AUTONOMY_LEVEL = AutonomyLevel.SUPERVISED
    MODEL_ASSIGNMENT = "claude-sonnet-4-6"
    VISIBILITY = "Internal"
    DESCRIPTION = "Chaos Testing: requires CHAOS_ENABLED=true"
    CYCLE_INTERVAL_SECONDS = 3600.0
    TOOLS = [
        ToolDefinition(
            name="kill_pod",
            description="Kill a specific Kubernetes pod",
            input_schema={
                "type": "object",
                "properties": {"pod_name": {"type": "string"}, "namespace": {"type": "string"}},
            },
        ),
        ToolDefinition(
            name="inject_db_latency",
            description="Inject artificial latency into database queries",
            input_schema={
                "type": "object",
                "properties": {"latency_ms": {"type": "integer"}, "duration_s": {"type": "integer"}},
            },
        ),
        ToolDefinition(
            name="exhaust_db_connections",
            description="Create connections to approach the pool limit",
            input_schema={
                "type": "object",
                "properties": {"target_pct": {"type": "number"}, "duration_s": {"type": "integer"}},
            },
        ),
    ]
    SUBSCRIPTIONS: list[str] = []
    EMISSIONS = [
        "self_healing.chaos_test_started",
        "self_healing.chaos_test_completed",
    ]

    async def run_cycle(self) -> None:
        """Plan and execute a chaos test if enabled."""
        chaos_enabled = os.environ.get("CHAOS_ENABLED", "false").lower() == "true"
        if not chaos_enabled:
            logger.debug("gremlin.disabled", reason="CHAOS_ENABLED not set")
            return

        # Only run in non-production environments
        if self._context.config.environment == "production":
            logger.warning("gremlin.skipped_production")
            return

        # Use LLM to select an appropriate chaos test
        plan = await self._llm(
            system=(
                "You are GREMLIN, a chaos engineering agent. Select a fault injection test "
                "that will validate system resilience without causing data loss. "
                "Return JSON: {\"fault_type\": \"pod_kill|db_latency|connection_exhaustion\", "
                "\"target\": str, \"parameters\": {}, \"expected_impact\": str, "
                "\"duration_seconds\": int}"
            ),
            messages=[{
                "role": "user",
                "content": "Plan a chaos test for the current environment.",
            }],
        )

        try:
            test_plan = json.loads(plan)
        except json.JSONDecodeError:
            test_plan = {
                "fault_type": "db_latency",
                "target": "primary",
                "parameters": {"latency_ms": 100, "duration_s": 30},
                "expected_impact": "Increased query latency",
                "duration_seconds": 30,
            }

        fault_type = test_plan.get("fault_type", "db_latency")

        # Request approval before injecting faults
        await self._request_approval(
            f"Chaos test: {fault_type} targeting {test_plan.get('target', 'unknown')}",
            risk_level="high",
        )

        await self._emit(EventEnvelope(
            event_type="self_healing.chaos_test_started",
            tenant_id=self._context.tenant_id,
            payload=test_plan,
        ))

        try:
            params = test_plan.get("parameters", {})
            if fault_type == "pod_kill":
                await self._invoke_tool(
                    "kill_pod",
                    pod_name=params.get("pod_name", "test-pod"),
                    namespace=params.get("namespace", "gridmind"),
                )
            elif fault_type == "db_latency":
                await self._invoke_tool(
                    "inject_db_latency",
                    latency_ms=params.get("latency_ms", 100),
                    duration_s=params.get("duration_s", 30),
                )
            elif fault_type == "connection_exhaustion":
                await self._invoke_tool(
                    "exhaust_db_connections",
                    target_pct=params.get("target_pct", 0.8),
                    duration_s=params.get("duration_s", 30),
                )

            await self._emit(EventEnvelope(
                event_type="self_healing.chaos_test_completed",
                tenant_id=self._context.tenant_id,
                payload={**test_plan, "status": "completed"},
            ))
        except Exception as exc:
            logger.error("gremlin.test_failed", error=str(exc))
            await self._emit(EventEnvelope(
                event_type="self_healing.chaos_test_completed",
                tenant_id=self._context.tenant_id,
                payload={**test_plan, "status": "failed", "error": str(exc)},
            ))

    async def process(self, event: EventEnvelope) -> None:
        """Handle inbound events."""
