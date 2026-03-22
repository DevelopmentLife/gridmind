"""THRIFT — Platform FinOps agent.

Manages internal costs, staging auto-scale, and LLM budgets.
"""

from __future__ import annotations

import json

import structlog

from cortex.base_agent import BaseAgent
from cortex.models import AgentTier, AutonomyLevel, EventEnvelope, ToolDefinition

logger = structlog.get_logger(__name__)


class ThriftAgent(BaseAgent):
    """Platform FinOps: internal costs, staging auto-scale, LLM budgets."""

    AGENT_NAME = "thrift"
    TIER = AgentTier.SPECIALIZED
    AUTONOMY_LEVEL = AutonomyLevel.AUTONOMOUS
    MODEL_ASSIGNMENT = "claude-sonnet-4-6"
    VISIBILITY = "Internal"
    DESCRIPTION = "Platform FinOps: internal costs, staging auto-scale, LLM budgets"
    CYCLE_INTERVAL_SECONDS = 900.0
    TOOLS = [
        ToolDefinition(
            name="get_pod_resource_usage",
            description="Get CPU and memory usage for all pods",
            input_schema={"type": "object", "properties": {"namespace": {"type": "string"}}},
        ),
        ToolDefinition(
            name="scale_staging_deployment",
            description="Scale staging environment deployments to save costs",
            input_schema={
                "type": "object",
                "properties": {"deployment": {"type": "string"}, "replicas": {"type": "integer"}},
            },
        ),
        ToolDefinition(
            name="get_llm_spend",
            description="Get LLM API token spend for the current billing period",
            input_schema={"type": "object", "properties": {}},
        ),
    ]
    SUBSCRIPTIONS: list[str] = []
    EMISSIONS = ["finops.cost_report", "finops.budget_alert"]

    async def run_cycle(self) -> None:
        """Analyze platform costs and optimize where possible."""
        pod_usage = await self._invoke_tool("get_pod_resource_usage", namespace="gridmind")
        llm_spend = await self._invoke_tool("get_llm_spend")

        # Analyze costs and find savings opportunities
        analysis = await self._llm(
            system=(
                "You are THRIFT, a FinOps optimization agent. Analyze resource usage and "
                "LLM spend to find cost savings. Return JSON: {\"total_monthly_estimate_usd\": "
                "float, \"llm_spend_usd\": float, \"savings_opportunities\": [{\"area\": str, "
                "\"current_cost_usd\": float, \"potential_savings_usd\": float, "
                "\"action\": str}], \"budget_status\": \"within|warning|exceeded\"}"
            ),
            messages=[{
                "role": "user",
                "content": (
                    f"Pod usage: {json.dumps(pod_usage)}\n"
                    f"LLM spend: {json.dumps(llm_spend)}"
                ),
            }],
        )

        try:
            report = json.loads(analysis)
        except json.JSONDecodeError:
            report = {
                "total_monthly_estimate_usd": 0,
                "llm_spend_usd": 0,
                "savings_opportunities": [],
                "budget_status": "within",
            }

        await self._emit(EventEnvelope(
            event_type="finops.cost_report",
            tenant_id=self._context.tenant_id,
            payload=report,
        ))

        # Alert if budget exceeded
        if report.get("budget_status") in ("warning", "exceeded"):
            await self._emit(EventEnvelope(
                event_type="finops.budget_alert",
                tenant_id=self._context.tenant_id,
                payload={
                    "status": report.get("budget_status"),
                    "total_estimate": report.get("total_monthly_estimate_usd"),
                    "llm_spend": report.get("llm_spend_usd"),
                },
            ))

        # Auto-scale staging during off-hours (if applicable)
        env = self._context.config.environment
        if env in ("staging", "development"):
            for opportunity in report.get("savings_opportunities", []):
                if opportunity.get("action", "").startswith("scale_down_"):
                    target = opportunity.get("area", "")
                    if target:
                        await self._invoke_tool(
                            "scale_staging_deployment",
                            deployment=target,
                            replicas=0,
                        )

    async def process(self, event: EventEnvelope) -> None:
        """Handle inbound events."""
