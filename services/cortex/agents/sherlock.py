"""SHERLOCK — Incident Reasoning agent.

Produces ranked root cause hypotheses with evidence chains for database incidents.
"""

from __future__ import annotations

import json

import structlog

from cortex.base_agent import BaseAgent
from cortex.models import AgentTier, AutonomyLevel, EventEnvelope, ToolDefinition

logger = structlog.get_logger(__name__)


class SherlockAgent(BaseAgent):
    """Incident Reasoning: ranked root cause hypotheses with evidence chains."""

    AGENT_NAME = "sherlock"
    TIER = AgentTier.REASONING
    AUTONOMY_LEVEL = AutonomyLevel.AUTONOMOUS
    MODEL_ASSIGNMENT = "claude-opus-4-6"
    VISIBILITY = "Customer"
    DESCRIPTION = "Incident Reasoning: ranked root cause hypotheses with evidence chains"
    CYCLE_INTERVAL_SECONDS = 0.0  # Event-driven
    TOOLS = [
        ToolDefinition(
            name="get_blocking_queries",
            description="Get currently blocking queries from pg_stat_activity",
            input_schema={"type": "object", "properties": {}},
        ),
        ToolDefinition(
            name="get_pg_logs",
            description="Get recent PostgreSQL log entries",
            input_schema={
                "type": "object",
                "properties": {
                    "minutes": {"type": "integer"},
                    "severity": {"type": "string"},
                },
            },
        ),
        ToolDefinition(
            name="get_replication_lag",
            description="Get replication lag across all replicas",
            input_schema={"type": "object", "properties": {}},
        ),
        ToolDefinition(
            name="get_recent_events",
            description="Get recent events from the event mesh for correlation",
            input_schema={
                "type": "object",
                "properties": {"minutes": {"type": "integer"}, "types": {"type": "array"}},
            },
        ),
    ]
    SUBSCRIPTIONS = [
        "self_healing.incident_detected",
        "perception.capacity_warning",
        "perception.cost_anomaly",
    ]
    EMISSIONS = [
        "incident.analysis",
        "incident.root_cause",
    ]

    async def run_cycle(self) -> None:
        """SHERLOCK is event-driven; no proactive cycle."""

    async def process(self, event: EventEnvelope) -> None:
        """Investigate an incident by gathering evidence and reasoning about root causes."""
        incident_type = event.event_type
        correlation_id = event.correlation_id or event.event_id

        # Gather evidence from multiple sources
        blocking = await self._invoke_tool("get_blocking_queries")
        logs = await self._invoke_tool("get_pg_logs", minutes=15, severity="ERROR")
        repl_lag = await self._invoke_tool("get_replication_lag")
        recent_events = await self._invoke_tool(
            "get_recent_events", minutes=30, types=["perception", "self_healing"]
        )

        # Use Opus for deep incident reasoning
        analysis = await self._llm(
            system=(
                "You are SHERLOCK, an expert database incident investigator. Analyze all "
                "available evidence and produce ranked root cause hypotheses. For each "
                "hypothesis, provide: cause (short label), confidence (0-1), evidence chain "
                "(list of facts supporting it), recommended_actions (list of strings), and "
                "severity (critical/high/medium/low). Return JSON: "
                "{\"hypotheses\": [...], \"summary\": str, \"estimated_impact\": str}"
            ),
            messages=[{
                "role": "user",
                "content": (
                    f"Incident trigger: {incident_type}\n"
                    f"Trigger payload: {json.dumps(event.payload)}\n"
                    f"Blocking queries: {json.dumps(blocking)}\n"
                    f"Recent PG logs: {json.dumps(logs)}\n"
                    f"Replication lag: {json.dumps(repl_lag)}\n"
                    f"Recent events: {json.dumps(recent_events)}"
                ),
            }],
        )

        try:
            result = json.loads(analysis)
        except json.JSONDecodeError:
            result = {
                "hypotheses": [{
                    "cause": "unknown",
                    "confidence": 0.0,
                    "evidence": ["Unable to parse LLM analysis"],
                    "recommended_actions": ["manual_investigation"],
                    "severity": "medium",
                }],
                "summary": "Analysis inconclusive — manual investigation recommended",
                "estimated_impact": "unknown",
            }

        # Emit detailed analysis
        await self._emit(EventEnvelope(
            event_type="incident.analysis",
            tenant_id=self._context.tenant_id,
            correlation_id=correlation_id,
            payload={
                "trigger": incident_type,
                "hypotheses": result.get("hypotheses", []),
                "summary": result.get("summary", ""),
                "estimated_impact": result.get("estimated_impact", ""),
            },
        ))

        # Emit top root cause if confidence is high enough
        hypotheses = result.get("hypotheses", [])
        if hypotheses:
            top = hypotheses[0]
            if top.get("confidence", 0) >= 0.6:
                await self._emit(EventEnvelope(
                    event_type="incident.root_cause",
                    tenant_id=self._context.tenant_id,
                    correlation_id=correlation_id,
                    payload={
                        "cause": top.get("cause", "unknown"),
                        "confidence": top.get("confidence", 0),
                        "severity": top.get("severity", "medium"),
                        "recommended_actions": top.get("recommended_actions", []),
                    },
                ))
                logger.info(
                    "sherlock.root_cause_identified",
                    cause=top.get("cause"),
                    confidence=top.get("confidence"),
                )
