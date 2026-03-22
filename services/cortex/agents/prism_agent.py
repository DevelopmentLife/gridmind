"""PRISM — Query Optimizer agent.

Generates index recommendations, materialized view suggestions, query rewrites,
and HNSW tuning advice.
"""

from __future__ import annotations

import json

import structlog

from cortex.base_agent import BaseAgent
from cortex.models import AgentTier, AutonomyLevel, EventEnvelope, ToolDefinition

logger = structlog.get_logger(__name__)


class PrismAgent(BaseAgent):
    """Query Optimizer: index recs, MVs, rewrites, HNSW tuning."""

    AGENT_NAME = "prism"
    TIER = AgentTier.REASONING
    AUTONOMY_LEVEL = AutonomyLevel.ADVISORY
    MODEL_ASSIGNMENT = "claude-sonnet-4-6"
    VISIBILITY = "Customer"
    DESCRIPTION = "Query Optimizer: index recs, MVs, rewrites, HNSW tuning"
    CYCLE_INTERVAL_SECONDS = 600.0
    TOOLS = [
        ToolDefinition(
            name="explain_query",
            description="Run EXPLAIN ANALYZE on a query and return the plan",
            input_schema={"type": "object", "properties": {"query": {"type": "string"}}},
        ),
        ToolDefinition(
            name="get_index_bloat",
            description="Get index bloat statistics for all indexes",
            input_schema={"type": "object", "properties": {}},
        ),
        ToolDefinition(
            name="get_table_stats",
            description="Get table statistics including row counts and dead tuples",
            input_schema={"type": "object", "properties": {"table": {"type": "string"}}},
        ),
    ]
    SUBSCRIPTIONS = ["perception.workload_profile"]
    EMISSIONS = ["reasoning.optimization_recommendations"]

    async def run_cycle(self) -> None:
        """Scan for slow queries, analyze index usage, and emit optimization recs."""
        index_bloat = await self._invoke_tool("get_index_bloat")

        # Use LLM to generate optimization recommendations
        analysis = await self._llm(
            system=(
                "You are a PostgreSQL query optimization expert. Analyze index bloat data "
                "and suggest optimizations. Return JSON: {\"recommendations\": "
                "[{\"type\": \"index|mv|rewrite|hnsw\", \"priority\": \"high|medium|low\", "
                "\"description\": str, \"sql\": str, \"estimated_improvement_pct\": float}]}"
            ),
            messages=[{
                "role": "user",
                "content": f"Index bloat: {json.dumps(index_bloat)}",
            }],
        )

        try:
            recs = json.loads(analysis)
        except json.JSONDecodeError:
            recs = {"recommendations": []}

        await self._emit(EventEnvelope(
            event_type="reasoning.optimization_recommendations",
            tenant_id=self._context.tenant_id,
            payload=recs,
        ))

    async def process(self, event: EventEnvelope) -> None:
        """React to workload profile changes by reassessing query patterns."""
        if event.event_type == "perception.workload_profile":
            workload_class = event.payload.get("classification", "OLTP")
            await self.set_context("current_workload", workload_class, ttl=3600)
