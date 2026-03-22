"""STEWARD — Customer Intelligence agent.

Computes customer health scores (0-100) and predicts churn risk.
"""

from __future__ import annotations

import json

import structlog

from cortex.base_agent import BaseAgent
from cortex.models import AgentTier, AutonomyLevel, EventEnvelope, ToolDefinition

logger = structlog.get_logger(__name__)


class StewardAgent(BaseAgent):
    """Customer Intelligence: health scoring (0-100), churn prediction."""

    AGENT_NAME = "steward"
    TIER = AgentTier.SPECIALIZED
    AUTONOMY_LEVEL = AutonomyLevel.AUTONOMOUS
    MODEL_ASSIGNMENT = "claude-sonnet-4-6"
    VISIBILITY = "Internal"
    DESCRIPTION = "Customer Intelligence: health scoring (0-100), churn prediction"
    CYCLE_INTERVAL_SECONDS = 3600.0
    TOOLS = [
        ToolDefinition(
            name="get_customer_usage",
            description="Get customer usage metrics for scoring",
            input_schema={"type": "object", "properties": {"tenant_id": {"type": "string"}}},
        ),
        ToolDefinition(
            name="get_payment_history",
            description="Get customer payment history and billing status",
            input_schema={"type": "object", "properties": {"tenant_id": {"type": "string"}}},
        ),
        ToolDefinition(
            name="get_support_tickets",
            description="Get customer support ticket history",
            input_schema={"type": "object", "properties": {"tenant_id": {"type": "string"}}},
        ),
    ]
    SUBSCRIPTIONS: list[str] = []
    EMISSIONS = ["customer.health_score", "customer.churn_risk"]

    async def run_cycle(self) -> None:
        """Compute customer health score and churn risk prediction."""
        tenant_id = self._context.tenant_id

        usage = await self._invoke_tool("get_customer_usage", tenant_id=tenant_id)
        payments = await self._invoke_tool("get_payment_history", tenant_id=tenant_id)
        tickets = await self._invoke_tool("get_support_tickets", tenant_id=tenant_id)

        # Use LLM to compute a composite health score
        analysis = await self._llm(
            system=(
                "You are STEWARD, a customer success analyst. Compute a health score (0-100) "
                "based on usage patterns, payment history, and support interactions. "
                "Return JSON: {\"health_score\": int, \"factors\": "
                "[{\"factor\": str, \"score\": int, \"weight\": float}], "
                "\"churn_risk\": \"low|medium|high|critical\", "
                "\"churn_probability\": float, \"recommendations\": [str]}"
            ),
            messages=[{
                "role": "user",
                "content": (
                    f"Usage: {json.dumps(usage)}\n"
                    f"Payments: {json.dumps(payments)}\n"
                    f"Tickets: {json.dumps(tickets)}"
                ),
            }],
        )

        try:
            result = json.loads(analysis)
        except json.JSONDecodeError:
            result = {
                "health_score": 75,
                "factors": [],
                "churn_risk": "low",
                "churn_probability": 0.1,
                "recommendations": [],
            }

        health_score = result.get("health_score", 75)
        churn_risk = result.get("churn_risk", "low")

        await self._emit(EventEnvelope(
            event_type="customer.health_score",
            tenant_id=tenant_id,
            payload={
                "health_score": health_score,
                "factors": result.get("factors", []),
            },
        ))

        # Emit churn risk if elevated
        if churn_risk in ("medium", "high", "critical"):
            await self._emit(EventEnvelope(
                event_type="customer.churn_risk",
                tenant_id=tenant_id,
                payload={
                    "risk_level": churn_risk,
                    "probability": result.get("churn_probability", 0),
                    "health_score": health_score,
                    "recommendations": result.get("recommendations", []),
                },
            ))
            logger.info(
                "steward.churn_risk_elevated",
                risk=churn_risk,
                score=health_score,
            )

        await self.set_context("last_health_score", health_score, ttl=86400)

    async def process(self, event: EventEnvelope) -> None:
        """Handle inbound events."""
