"""SENTINEL — Drift Detection agent.

Detects schema, configuration, security, performance, and compliance drift.
"""

from __future__ import annotations

import json

import structlog

from cortex.base_agent import BaseAgent
from cortex.models import AgentTier, AutonomyLevel, EventEnvelope, ToolDefinition

logger = structlog.get_logger(__name__)

DRIFT_CATEGORIES = ["schema", "config", "security", "performance", "compliance"]


class SentinelAgent(BaseAgent):
    """Drift Detection: schema/config/security/perf/compliance drift scoring."""

    AGENT_NAME = "sentinel"
    TIER = AgentTier.PERCEPTION
    AUTONOMY_LEVEL = AutonomyLevel.AUTONOMOUS
    MODEL_ASSIGNMENT = "claude-haiku-4-5"
    VISIBILITY = "Internal"
    DESCRIPTION = "Drift Detection: schema/config/security/perf/compliance drift scoring"
    CYCLE_INTERVAL_SECONDS = 120.0
    TOOLS = [
        ToolDefinition(
            name="snapshot_schema",
            description="Take a snapshot of the current database schema",
            input_schema={"type": "object", "properties": {}},
        ),
        ToolDefinition(
            name="snapshot_config",
            description="Take a snapshot of current PostgreSQL configuration",
            input_schema={"type": "object", "properties": {}},
        ),
        ToolDefinition(
            name="snapshot_security",
            description="Take a snapshot of current security settings (roles, hba, ssl)",
            input_schema={"type": "object", "properties": {}},
        ),
    ]
    SUBSCRIPTIONS: list[str] = []
    EMISSIONS = ["perception.drift_report", "perception.drift_detected"]

    async def run_cycle(self) -> None:
        """Snapshot current state, compare with baseline, score drift."""
        schema = await self._invoke_tool("snapshot_schema")
        config = await self._invoke_tool("snapshot_config")
        security = await self._invoke_tool("snapshot_security")

        # Load previous snapshots for comparison
        prev_schema = await self.get_context("snapshot_schema")
        prev_config = await self.get_context("snapshot_config")
        prev_security = await self.get_context("snapshot_security")

        # Use LLM to analyze drift if we have previous snapshots
        drift_scores: dict[str, float] = {}
        drift_details: list[dict[str, str]] = []

        if prev_schema is not None or prev_config is not None:
            analysis = await self._llm(
                system=(
                    "You are a drift detection specialist. Compare previous and current "
                    "snapshots and score drift on a 0-1 scale for each category: "
                    f"{DRIFT_CATEGORIES}. Return JSON: {{\"drift_detected\": bool, "
                    "\"scores\": {category: score}, \"details\": [{\"category\": ..., "
                    "\"description\": ...}]}}"
                ),
                messages=[{
                    "role": "user",
                    "content": (
                        f"Previous schema: {json.dumps(prev_schema)}\n"
                        f"Current schema: {json.dumps(schema)}\n"
                        f"Previous config: {json.dumps(prev_config)}\n"
                        f"Current config: {json.dumps(config)}\n"
                        f"Previous security: {json.dumps(prev_security)}\n"
                        f"Current security: {json.dumps(security)}"
                    ),
                }],
            )

            try:
                result = json.loads(analysis)
                drift_scores = result.get("scores", {})
                drift_details = result.get("details", [])
            except json.JSONDecodeError:
                drift_scores = {cat: 0.0 for cat in DRIFT_CATEGORIES}

        # Store current snapshots for next cycle comparison
        await self.set_context("snapshot_schema", schema, ttl=86400)
        await self.set_context("snapshot_config", config, ttl=86400)
        await self.set_context("snapshot_security", security, ttl=86400)

        # Emit drift report
        total_score = sum(drift_scores.values()) / max(len(drift_scores), 1)
        await self._emit(EventEnvelope(
            event_type="perception.drift_report",
            tenant_id=self._context.tenant_id,
            payload={
                "scores": drift_scores,
                "total_drift_score": round(total_score, 3),
                "details": drift_details,
            },
        ))

        # Alert if significant drift detected
        if total_score > 0.3:
            await self._emit(EventEnvelope(
                event_type="perception.drift_detected",
                tenant_id=self._context.tenant_id,
                payload={
                    "drift_score": round(total_score, 3),
                    "categories": [
                        cat for cat, score in drift_scores.items() if score > 0.2
                    ],
                },
            ))

    async def process(self, event: EventEnvelope) -> None:
        """Handle inbound events."""
