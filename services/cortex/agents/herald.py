"""HERALD — Communications agent.

Manages customer communications via SendGrid and Twilio.
"""

from __future__ import annotations

import enum
import json

import structlog

from cortex.base_agent import BaseAgent
from cortex.models import AgentTier, AutonomyLevel, EventEnvelope, ToolDefinition

logger = structlog.get_logger(__name__)


class MessageChannel(str, enum.Enum):
    """Communication channels."""

    EMAIL = "email"
    SMS = "sms"
    PUSH = "push"


class MessageCategory(str, enum.Enum):
    """Categories of outbound messages."""

    TRANSACTIONAL = "transactional"
    OPERATIONAL = "operational"
    MARKETING = "marketing"
    DIGEST = "digest"


class HeraldAgent(BaseAgent):
    """Communications: SendGrid/Twilio, drip campaigns."""

    AGENT_NAME = "herald"
    TIER = AgentTier.SPECIALIZED
    AUTONOMY_LEVEL = AutonomyLevel.AUTONOMOUS
    MODEL_ASSIGNMENT = "claude-sonnet-4-6"
    VISIBILITY = "Internal"
    DESCRIPTION = "Communications: SendGrid/Twilio, drip campaigns"
    CYCLE_INTERVAL_SECONDS = 3600.0
    TOOLS = [
        ToolDefinition(
            name="send_email",
            description="Send an email via SendGrid",
            input_schema={
                "type": "object",
                "properties": {
                    "to": {"type": "string"},
                    "template_id": {"type": "string"},
                    "dynamic_data": {"type": "object"},
                },
            },
        ),
        ToolDefinition(
            name="send_sms",
            description="Send an SMS via Twilio",
            input_schema={
                "type": "object",
                "properties": {"to": {"type": "string"}, "body": {"type": "string"}},
            },
        ),
        ToolDefinition(
            name="get_customer_profile",
            description="Get customer profile including communication preferences",
            input_schema={"type": "object", "properties": {"tenant_id": {"type": "string"}}},
        ),
    ]
    SUBSCRIPTIONS: list[str] = []
    EMISSIONS = ["communication.sent", "communication.digest_generated"]

    async def run_cycle(self) -> None:
        """Generate and send periodic digest communications."""
        profile = await self._invoke_tool(
            "get_customer_profile", tenant_id=self._context.tenant_id
        )

        email = profile.get("result", {}).get("email")
        preferences = profile.get("result", {}).get("preferences", {})

        if not email:
            return

        # Check if digest is opted-in
        digest_enabled = preferences.get("weekly_digest", True)
        if not digest_enabled:
            return

        # Generate digest content using LLM
        digest = await self._llm(
            system=(
                "You are HERALD, a communications specialist. Generate a weekly digest "
                "email summarizing the customer's deployment health and key events. "
                "Return JSON: {\"subject\": str, \"summary\": str, \"highlights\": [str], "
                "\"action_items\": [str]}"
            ),
            messages=[{
                "role": "user",
                "content": f"Customer profile: {json.dumps(profile)}",
            }],
        )

        try:
            digest_data = json.loads(digest)
        except json.JSONDecodeError:
            digest_data = {
                "subject": "Your GridMind Weekly Digest",
                "summary": "All systems operational.",
                "highlights": [],
                "action_items": [],
            }

        await self._invoke_tool(
            "send_email",
            to=str(email),
            template_id="weekly-digest",
            dynamic_data=digest_data,
        )

        await self._emit(EventEnvelope(
            event_type="communication.digest_generated",
            tenant_id=self._context.tenant_id,
            payload={"type": "weekly_digest", "recipient": str(email)},
        ))

    async def process(self, event: EventEnvelope) -> None:
        """Handle inbound events."""
