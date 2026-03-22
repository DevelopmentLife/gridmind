"""ARGUS — Workload Profiler agent.

Classifies queries (OLTP, OLAP, AI_INFERENCE, AI_TRAINING, ETL_BATCH, STREAMING, IDLE)
and builds rolling 7-day workload models.
"""

from __future__ import annotations

import json
from typing import Any

import structlog

from cortex.base_agent import BaseAgent
from cortex.models import AgentTier, AutonomyLevel, EventEnvelope, ToolDefinition

logger = structlog.get_logger(__name__)

WORKLOAD_CLASSES = [
    "OLTP", "OLAP", "AI_INFERENCE", "AI_TRAINING", "ETL_BATCH", "STREAMING", "IDLE",
]


class ArgusAgent(BaseAgent):
    """Workload Profiler: classifies queries and builds rolling workload models."""

    AGENT_NAME = "argus"
    TIER = AgentTier.PERCEPTION
    AUTONOMY_LEVEL = AutonomyLevel.AUTONOMOUS
    MODEL_ASSIGNMENT = "claude-haiku-4-5"
    VISIBILITY = "Customer"
    DESCRIPTION = "Workload Profiler: classifies queries and builds rolling workload models"
    CYCLE_INTERVAL_SECONDS = 60.0
    TOOLS = [
        ToolDefinition(
            name="query_pg_stats",
            description="Query pg_stat_statements for recent query metrics",
            input_schema={"type": "object", "properties": {"limit": {"type": "integer"}}},
        ),
        ToolDefinition(
            name="query_redis_metrics",
            description="Query Redis INFO and command stats",
            input_schema={"type": "object", "properties": {}},
        ),
    ]
    SUBSCRIPTIONS: list[str] = []
    EMISSIONS = ["perception.workload_profile", "perception.workload_shift_detected"]

    async def run_cycle(self) -> None:
        """Query stats, classify workload, and emit a workload profile event."""
        # Gather current metrics via tools
        pg_stats = await self._invoke_tool("query_pg_stats", limit=100)
        redis_metrics = await self._invoke_tool("query_redis_metrics")

        # Use LLM to classify workload pattern
        analysis = await self._llm(
            system=(
                "You are a database workload profiler. Analyze the provided metrics and "
                "classify the workload. Return JSON with: classification (one of "
                f"{WORKLOAD_CLASSES}), qps, p50_latency_ms, p95_latency_ms, p99_latency_ms, "
                "active_connections, and confidence (0-1)."
            ),
            messages=[{
                "role": "user",
                "content": f"PG stats: {json.dumps(pg_stats)}\nRedis metrics: {json.dumps(redis_metrics)}",
            }],
        )

        try:
            profile_data = json.loads(analysis)
        except json.JSONDecodeError:
            profile_data = {
                "classification": "OLTP",
                "qps": 0,
                "p50_latency_ms": 0.0,
                "p95_latency_ms": 0.0,
                "p99_latency_ms": 0.0,
                "active_connections": 0,
                "confidence": 0.5,
            }

        # Emit workload profile event
        await self._emit(EventEnvelope(
            event_type="perception.workload_profile",
            tenant_id=self._context.tenant_id,
            payload=profile_data,
        ))

        # Check for workload shift by comparing with previous classification
        previous = await self.get_context("last_classification")
        current = profile_data.get("classification", "UNKNOWN")

        if previous is not None and previous != current:
            await self._emit(EventEnvelope(
                event_type="perception.workload_shift_detected",
                tenant_id=self._context.tenant_id,
                payload={
                    "previous": previous,
                    "current": current,
                    "confidence": profile_data.get("confidence", 0),
                },
            ))
            logger.info(
                "argus.workload_shift",
                previous=previous,
                current=current,
            )

        await self.set_context("last_classification", current, ttl=86400)

    async def process(self, event: EventEnvelope) -> None:
        """Handle inbound events (none subscribed for ARGUS)."""
