"""TITAN — Scaling Arbiter agent.

Produces ranked scaling option sets with 6-phase retraction protocol.
"""

from __future__ import annotations

import json

import structlog

from cortex.base_agent import BaseAgent
from cortex.models import AgentTier, AutonomyLevel, EventEnvelope, ToolDefinition

logger = structlog.get_logger(__name__)

SCALING_PHASES = [
    "evaluate", "propose", "approve", "execute", "verify", "retract",
]


class TitanAgent(BaseAgent):
    """Scaling Arbiter: ranked option sets, 6-phase retraction protocol."""

    AGENT_NAME = "titan"
    TIER = AgentTier.REASONING
    AUTONOMY_LEVEL = AutonomyLevel.SUPERVISED
    MODEL_ASSIGNMENT = "claude-sonnet-4-6"
    VISIBILITY = "Customer"
    DESCRIPTION = "Scaling Arbiter: ranked option sets, 6-phase retraction protocol"
    CYCLE_INTERVAL_SECONDS = 0.0  # Event-driven
    TOOLS = [
        ToolDefinition(
            name="get_current_replica_count",
            description="Get the current number of replicas for a deployment",
            input_schema={"type": "object", "properties": {"deployment_id": {"type": "string"}}},
        ),
        ToolDefinition(
            name="get_instance_pricing",
            description="Get instance pricing for available instance types",
            input_schema={"type": "object", "properties": {"region": {"type": "string"}}},
        ),
        ToolDefinition(
            name="get_cost_history",
            description="Get historical cost data for a deployment",
            input_schema={
                "type": "object",
                "properties": {
                    "deployment_id": {"type": "string"},
                    "days": {"type": "integer"},
                },
            },
        ),
    ]
    SUBSCRIPTIONS = [
        "perception.capacity_warning",
        "perception.workload_shift_detected",
    ]
    EMISSIONS = [
        "scaling.recommendation",
        "scaling.decision",
        "approval.request",
    ]

    async def run_cycle(self) -> None:
        """TITAN is event-driven; no proactive cycle."""

    async def process(self, event: EventEnvelope) -> None:
        """Evaluate scaling needs in response to capacity or workload events."""
        deployment_id = event.payload.get("deployment_id", "default")

        # Gather current state
        replicas = await self._invoke_tool(
            "get_current_replica_count", deployment_id=deployment_id
        )
        pricing = await self._invoke_tool("get_instance_pricing", region="us-east-1")
        cost_history = await self._invoke_tool(
            "get_cost_history", deployment_id=deployment_id, days=7
        )

        # Use LLM to generate ranked scaling options
        analysis = await self._llm(
            system=(
                "You are a database scaling expert. Given the current capacity warning or "
                "workload shift, the current replica count, instance pricing, and cost history, "
                "produce ranked scaling options. Return JSON: {\"options\": [{\"action\": ..., "
                "\"replicas\": int, \"instance_type\": str, \"estimated_monthly_cost_usd\": float, "
                "\"risk_level\": str, \"rationale\": str}], \"recommendation\": int (index)}"
            ),
            messages=[{
                "role": "user",
                "content": (
                    f"Event: {json.dumps(event.payload)}\n"
                    f"Current replicas: {json.dumps(replicas)}\n"
                    f"Pricing: {json.dumps(pricing)}\n"
                    f"Cost history: {json.dumps(cost_history)}"
                ),
            }],
        )

        try:
            options = json.loads(analysis)
        except json.JSONDecodeError:
            options = {"options": [], "recommendation": -1}

        # Emit scaling recommendation
        await self._emit(EventEnvelope(
            event_type="scaling.recommendation",
            tenant_id=self._context.tenant_id,
            payload={
                "trigger_event": event.event_type,
                "deployment_id": deployment_id,
                "options": options.get("options", []),
                "recommended_index": options.get("recommendation", 0),
            },
        ))

        # Request approval for the recommended option
        recommended = options.get("options", [{}])
        if recommended:
            rec = recommended[min(options.get("recommendation", 0), len(recommended) - 1)]
            risk = rec.get("risk_level", "medium")
            action_desc = (
                f"Scale deployment {deployment_id}: {rec.get('action', 'unknown')} "
                f"to {rec.get('replicas', '?')} replicas ({rec.get('instance_type', '?')})"
            )
            try:
                approved = await self._request_approval(action_desc, risk)
                if approved:
                    await self._emit(EventEnvelope(
                        event_type="scaling.decision",
                        tenant_id=self._context.tenant_id,
                        payload={
                            "deployment_id": deployment_id,
                            "action": rec,
                            "status": "approved",
                        },
                    ))
            except Exception as exc:
                logger.warning("titan.approval_failed", error=str(exc))
