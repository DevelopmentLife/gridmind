"""LEDGER — Cost Telemetry agent.

Real-time cost attribution per query, tenant, and workload class.
"""

from __future__ import annotations

import json

import structlog

from cortex.base_agent import BaseAgent
from cortex.models import AgentTier, AutonomyLevel, EventEnvelope, ToolDefinition

logger = structlog.get_logger(__name__)


class LedgerAgent(BaseAgent):
    """Cost Telemetry: real-time cost attribution per query/tenant/class."""

    AGENT_NAME = "ledger"
    TIER = AgentTier.PERCEPTION
    AUTONOMY_LEVEL = AutonomyLevel.AUTONOMOUS
    MODEL_ASSIGNMENT = "claude-haiku-4-5"
    VISIBILITY = "Internal"
    DESCRIPTION = "Cost Telemetry: real-time cost attribution per query/tenant/class"
    CYCLE_INTERVAL_SECONDS = 30.0
    TOOLS = [
        ToolDefinition(
            name="get_pg_query_stats",
            description="Get query execution statistics from pg_stat_statements",
            input_schema={"type": "object", "properties": {"top_n": {"type": "integer"}}},
        ),
        ToolDefinition(
            name="get_cloud_billing_snapshot",
            description="Get current cloud billing snapshot from provider API",
            input_schema={"type": "object", "properties": {}},
        ),
    ]
    SUBSCRIPTIONS: list[str] = []
    EMISSIONS = ["perception.cost_snapshot", "perception.cost_anomaly"]

    async def run_cycle(self) -> None:
        """Collect cost data, compute attribution, and emit snapshot."""
        query_stats = await self._invoke_tool("get_pg_query_stats", top_n=50)
        billing = await self._invoke_tool("get_cloud_billing_snapshot")

        # Deterministic cost computation (no LLM needed for basic aggregation)
        total_calls = sum(
            q.get("calls", 0) for q in query_stats.get("result", [])
            if isinstance(q, dict)
        )
        total_time_ms = sum(
            q.get("total_time_ms", 0) for q in query_stats.get("result", [])
            if isinstance(q, dict)
        )

        hourly_rate = billing.get("result", {}).get("hourly_rate_usd", 0.0)
        if isinstance(hourly_rate, (int, float)):
            cost_per_query = hourly_rate / max(total_calls, 1) * 3600
        else:
            cost_per_query = 0.0

        snapshot = {
            "total_queries": total_calls,
            "total_time_ms": total_time_ms,
            "hourly_rate_usd": hourly_rate,
            "cost_per_query_usd": round(cost_per_query, 8),
        }

        await self._emit(EventEnvelope(
            event_type="perception.cost_snapshot",
            tenant_id=self._context.tenant_id,
            payload=snapshot,
        ))

        # Check for cost anomalies (>20% change from previous)
        previous_rate = await self.get_context("last_hourly_rate")
        if previous_rate is not None and isinstance(hourly_rate, (int, float)):
            prev = float(previous_rate)
            if prev > 0 and abs(hourly_rate - prev) / prev > 0.2:
                await self._emit(EventEnvelope(
                    event_type="perception.cost_anomaly",
                    tenant_id=self._context.tenant_id,
                    payload={
                        "previous_rate": prev,
                        "current_rate": hourly_rate,
                        "change_pct": round((hourly_rate - prev) / prev * 100, 2),
                    },
                ))

        await self.set_context("last_hourly_rate", hourly_rate, ttl=3600)

    async def process(self, event: EventEnvelope) -> None:
        """Handle inbound events."""
