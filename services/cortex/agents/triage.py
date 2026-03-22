"""TRIAGE — Human Escalation agent.

Manages P1-P4 severity escalation with context-rich summaries.
"""

from __future__ import annotations

import json

import structlog

from cortex.base_agent import BaseAgent
from cortex.models import AgentTier, AutonomyLevel, EventEnvelope, ToolDefinition

logger = structlog.get_logger(__name__)

SEVERITY_LEVELS = {
    "P1": {"response_time_min": 5, "channels": ["pagerduty", "slack", "push"]},
    "P2": {"response_time_min": 15, "channels": ["pagerduty", "slack"]},
    "P3": {"response_time_min": 60, "channels": ["slack"]},
    "P4": {"response_time_min": 480, "channels": ["slack"]},
}


class TriageAgent(BaseAgent):
    """Human Escalation: P1-P4 with context-rich summaries."""

    AGENT_NAME = "triage"
    TIER = AgentTier.SELF_HEALING
    AUTONOMY_LEVEL = AutonomyLevel.AUTONOMOUS
    MODEL_ASSIGNMENT = "claude-opus-4-6"
    VISIBILITY = "Internal"
    DESCRIPTION = "Human Escalation: P1-P4 with context-rich summaries"
    CYCLE_INTERVAL_SECONDS = 0.0  # Event-driven
    TOOLS = [
        ToolDefinition(
            name="page_pagerduty",
            description="Page on-call via PagerDuty",
            input_schema={
                "type": "object",
                "properties": {
                    "severity": {"type": "string"},
                    "summary": {"type": "string"},
                    "details": {"type": "object"},
                },
            },
        ),
        ToolDefinition(
            name="post_slack",
            description="Post a message to a Slack channel",
            input_schema={
                "type": "object",
                "properties": {
                    "channel": {"type": "string"},
                    "message": {"type": "string"},
                    "blocks": {"type": "array"},
                },
            },
        ),
        ToolDefinition(
            name="send_push_notification",
            description="Send a push notification to mobile devices",
            input_schema={
                "type": "object",
                "properties": {
                    "title": {"type": "string"},
                    "body": {"type": "string"},
                    "data": {"type": "object"},
                },
            },
        ),
    ]
    SUBSCRIPTIONS = [
        "incident.root_cause",
        "self_healing.recovery_failed",
        "self_healing.incident_detected",
    ]
    EMISSIONS = [
        "action.escalation_sent",
    ]

    async def run_cycle(self) -> None:
        """TRIAGE is event-driven; no proactive cycle."""

    async def process(self, event: EventEnvelope) -> None:
        """Evaluate incident severity and escalate to humans with context."""
        # Use Opus to assess severity and build a concise summary
        assessment = await self._llm(
            system=(
                "You are TRIAGE, an incident severity assessor. Evaluate the incident and "
                "determine its severity (P1=critical, P2=high, P3=medium, P4=low). "
                "Return JSON: {\"severity\": \"P1|P2|P3|P4\", \"title\": str (max 80 chars), "
                "\"summary\": str (2-3 sentences), \"impact\": str, "
                "\"recommended_actions\": [str]}"
            ),
            messages=[{
                "role": "user",
                "content": (
                    f"Event type: {event.event_type}\n"
                    f"Payload: {json.dumps(event.payload)}"
                ),
            }],
        )

        try:
            result = json.loads(assessment)
        except json.JSONDecodeError:
            result = {
                "severity": "P3",
                "title": f"Incident: {event.event_type}",
                "summary": "Unable to assess severity — manual review required.",
                "impact": "unknown",
                "recommended_actions": ["manual_investigation"],
            }

        severity = result.get("severity", "P3")
        config = SEVERITY_LEVELS.get(severity, SEVERITY_LEVELS["P3"])
        channels = config["channels"]

        title = result.get("title", f"Incident: {event.event_type}")
        summary = result.get("summary", "")

        # Send notifications via configured channels
        for channel in channels:
            try:
                if channel == "pagerduty":
                    await self._invoke_tool(
                        "page_pagerduty",
                        severity=severity,
                        summary=title,
                        details=result,
                    )
                elif channel == "slack":
                    await self._invoke_tool(
                        "post_slack",
                        channel="#incidents",
                        message=f"[{severity}] {title}\n{summary}",
                        blocks=[],
                    )
                elif channel == "push":
                    await self._invoke_tool(
                        "send_push_notification",
                        title=f"[{severity}] {title}",
                        body=summary,
                        data={"event_id": event.event_id},
                    )
            except Exception as exc:
                logger.error(
                    "triage.notification_failed",
                    channel=channel,
                    error=str(exc),
                )

        await self._emit(EventEnvelope(
            event_type="action.escalation_sent",
            tenant_id=self._context.tenant_id,
            correlation_id=event.correlation_id or event.event_id,
            payload={
                "severity": severity,
                "title": title,
                "channels_notified": channels,
            },
        ))
