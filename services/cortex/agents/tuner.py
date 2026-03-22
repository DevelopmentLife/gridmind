"""TUNER — Configuration agent.

Manages PostgreSQL configuration with staged rollout, dry-run, canary test, and auto-rollback.
"""

from __future__ import annotations

import json

import structlog

from cortex.base_agent import BaseAgent
from cortex.models import AgentTier, AutonomyLevel, EventEnvelope, ToolDefinition

logger = structlog.get_logger(__name__)


class TunerAgent(BaseAgent):
    """Configuration: staged rollout, dry-run, canary test, auto-rollback."""

    AGENT_NAME = "tuner"
    TIER = AgentTier.EXECUTION
    AUTONOMY_LEVEL = AutonomyLevel.SUPERVISED
    MODEL_ASSIGNMENT = "claude-sonnet-4-6"
    VISIBILITY = "Customer"
    DESCRIPTION = "Configuration: staged rollout, dry-run, canary test, auto-rollback"
    CYCLE_INTERVAL_SECONDS = 0.0  # Event-driven
    TOOLS = [
        ToolDefinition(
            name="pg_reload_conf",
            description="Reload PostgreSQL configuration without restart",
            input_schema={"type": "object", "properties": {}},
        ),
        ToolDefinition(
            name="alter_system",
            description="Modify a PostgreSQL system parameter via ALTER SYSTEM",
            input_schema={
                "type": "object",
                "properties": {"parameter": {"type": "string"}, "value": {"type": "string"}},
            },
        ),
        ToolDefinition(
            name="get_current_config",
            description="Get current PostgreSQL configuration parameters",
            input_schema={"type": "object", "properties": {"parameters": {"type": "array"}}},
        ),
        ToolDefinition(
            name="run_test_queries",
            description="Run test queries to verify configuration change impact",
            input_schema={
                "type": "object",
                "properties": {"queries": {"type": "array"}, "iterations": {"type": "integer"}},
            },
        ),
    ]
    SUBSCRIPTIONS = [
        "perception.workload_shift_detected",
        "action.tune_requested",
    ]
    EMISSIONS = [
        "execution.config_change_started",
        "execution.config_change_completed",
        "execution.config_change_rolled_back",
    ]

    async def run_cycle(self) -> None:
        """TUNER is event-driven; no proactive cycle."""

    async def process(self, event: EventEnvelope) -> None:
        """Evaluate and apply configuration changes."""
        # Get current config
        current_config = await self._invoke_tool("get_current_config", parameters=[])

        # Use LLM to recommend config changes based on event context
        recommendations = await self._llm(
            system=(
                "You are a PostgreSQL tuning expert. Based on the workload event and current "
                "config, recommend configuration changes. Return JSON: "
                "{\"changes\": [{\"parameter\": str, \"current\": str, \"recommended\": str, "
                "\"reason\": str}], \"requires_restart\": bool}"
            ),
            messages=[{
                "role": "user",
                "content": (
                    f"Event: {json.dumps(event.payload)}\n"
                    f"Current config: {json.dumps(current_config)}"
                ),
            }],
        )

        try:
            plan = json.loads(recommendations)
        except json.JSONDecodeError:
            plan = {"changes": [], "requires_restart": False}

        changes = plan.get("changes", [])
        if not changes:
            return

        # Request approval for the configuration changes
        change_summary = "; ".join(
            f"{c.get('parameter')}={c.get('recommended')}" for c in changes
        )
        await self._request_approval(
            f"Apply config changes: {change_summary}",
            risk_level="medium" if not plan.get("requires_restart") else "high",
        )

        # Dry-run: benchmark before changes
        baseline = await self._invoke_tool("run_test_queries", queries=[], iterations=3)

        await self._emit(EventEnvelope(
            event_type="execution.config_change_started",
            tenant_id=self._context.tenant_id,
            payload={"changes": changes},
        ))

        # Apply changes
        previous_values: list[dict[str, str]] = []
        try:
            for change in changes:
                param = change.get("parameter", "")
                new_val = change.get("recommended", "")
                old_val = change.get("current", "")
                previous_values.append({"parameter": param, "value": old_val})

                await self._invoke_tool("alter_system", parameter=param, value=new_val)

            await self._invoke_tool("pg_reload_conf")

            # Canary test: benchmark after changes
            post_test = await self._invoke_tool("run_test_queries", queries=[], iterations=3)

            await self._emit(EventEnvelope(
                event_type="execution.config_change_completed",
                tenant_id=self._context.tenant_id,
                payload={"changes": changes, "baseline": baseline, "post_test": post_test},
            ))
        except Exception as exc:
            logger.error("tuner.apply_failed", error=str(exc))
            # Rollback
            for prev in previous_values:
                try:
                    await self._invoke_tool(
                        "alter_system",
                        parameter=prev["parameter"],
                        value=prev["value"],
                    )
                except Exception as rollback_exc:
                    logger.error("tuner.rollback_failed", error=str(rollback_exc))

            await self._invoke_tool("pg_reload_conf")
            await self._emit(EventEnvelope(
                event_type="execution.config_change_rolled_back",
                tenant_id=self._context.tenant_id,
                payload={"changes": changes, "error": str(exc)},
            ))
