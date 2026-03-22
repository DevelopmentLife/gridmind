"""COMPTROLLER — Billing Intelligence agent.

Monitors margins, detects billing anomalies (SPIKE, EROSION, SHOCK).
"""

from __future__ import annotations

import json
import math

import structlog

from cortex.base_agent import BaseAgent
from cortex.models import AgentTier, AutonomyLevel, EventEnvelope, ToolDefinition

logger = structlog.get_logger(__name__)

ANOMALY_TYPES = ["SPIKE", "EROSION", "SHOCK"]
MIN_MARGIN_TARGET = 0.55


class ComptrollerAgent(BaseAgent):
    """Billing Intelligence: margin monitoring, anomaly detection."""

    AGENT_NAME = "comptroller"
    TIER = AgentTier.SPECIALIZED
    AUTONOMY_LEVEL = AutonomyLevel.AUTONOMOUS
    MODEL_ASSIGNMENT = "claude-sonnet-4-6"
    VISIBILITY = "Internal"
    DESCRIPTION = "Billing Intelligence: margin monitoring, anomaly detection (SPIKE/EROSION/SHOCK)"
    CYCLE_INTERVAL_SECONDS = 300.0
    TOOLS = [
        ToolDefinition(
            name="get_stripe_invoices",
            description="Get recent Stripe invoices for margin analysis",
            input_schema={
                "type": "object",
                "properties": {"limit": {"type": "integer"}, "status": {"type": "string"}},
            },
        ),
        ToolDefinition(
            name="get_cost_history",
            description="Get infrastructure cost history",
            input_schema={"type": "object", "properties": {"days": {"type": "integer"}}},
        ),
        ToolDefinition(
            name="update_billing_alert",
            description="Update billing alert thresholds",
            input_schema={
                "type": "object",
                "properties": {
                    "alert_type": {"type": "string"},
                    "threshold": {"type": "number"},
                },
            },
        ),
    ]
    SUBSCRIPTIONS: list[str] = []
    EMISSIONS = ["billing.margin_report", "billing.anomaly_detected"]

    async def run_cycle(self) -> None:
        """Analyze billing data, compute margins, detect anomalies."""
        invoices = await self._invoke_tool("get_stripe_invoices", limit=50, status="paid")
        costs = await self._invoke_tool("get_cost_history", days=30)

        # Compute margin using the PRD formula
        monthly_cost = costs.get("result", {}).get("total_monthly_usd", 0.0)
        if not isinstance(monthly_cost, (int, float)):
            monthly_cost = 0.0

        if monthly_cost > 0:
            margin_target = max(MIN_MARGIN_TARGET, 0.75 - 0.035 * math.log(monthly_cost / 100))
            customer_price = monthly_cost / (1 - margin_target)
            actual_margin = 1 - (monthly_cost / max(customer_price, 0.01))
        else:
            margin_target = 0.75
            customer_price = 0.0
            actual_margin = 0.0

        margin_report = {
            "monthly_cost_usd": round(monthly_cost, 2),
            "customer_price_usd": round(customer_price, 2),
            "margin_target": round(margin_target, 4),
            "actual_margin": round(actual_margin, 4),
            "margin_healthy": actual_margin >= margin_target,
        }

        await self._emit(EventEnvelope(
            event_type="billing.margin_report",
            tenant_id=self._context.tenant_id,
            payload=margin_report,
        ))

        # Detect anomalies
        previous_cost = await self.get_context("last_monthly_cost")
        anomalies: list[dict[str, object]] = []

        if previous_cost is not None:
            prev = float(previous_cost)
            if prev > 0:
                change_pct = (monthly_cost - prev) / prev * 100
                if change_pct > 50:
                    anomalies.append({
                        "type": "SPIKE",
                        "change_pct": round(change_pct, 2),
                        "previous": prev,
                        "current": monthly_cost,
                    })
                elif actual_margin < margin_target and actual_margin < 0.5:
                    anomalies.append({
                        "type": "EROSION",
                        "actual_margin": round(actual_margin, 4),
                        "target_margin": round(margin_target, 4),
                    })
                elif change_pct > 200:
                    anomalies.append({
                        "type": "SHOCK",
                        "change_pct": round(change_pct, 2),
                    })

        await self.set_context("last_monthly_cost", monthly_cost, ttl=86400)

        if anomalies:
            await self._emit(EventEnvelope(
                event_type="billing.anomaly_detected",
                tenant_id=self._context.tenant_id,
                payload={"anomalies": anomalies},
            ))
            # Update alert thresholds
            for anomaly in anomalies:
                await self._invoke_tool(
                    "update_billing_alert",
                    alert_type=str(anomaly.get("type", "")),
                    threshold=monthly_cost * 1.2,
                )

    async def process(self, event: EventEnvelope) -> None:
        """Handle inbound events."""
