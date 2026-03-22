"""HARBOR — Onboarding agent.

Manages 7-phase conversational deployment onboarding.
"""

from __future__ import annotations

import enum
import json

import structlog

from cortex.base_agent import BaseAgent
from cortex.models import AgentTier, AutonomyLevel, EventEnvelope, ToolDefinition

logger = structlog.get_logger(__name__)


class OnboardingPhase(str, enum.Enum):
    """The 7 phases of customer onboarding."""

    INTENT_DISCOVERY = "intent_discovery"
    CLOUD_CREDENTIALS = "cloud_credentials"
    ENGINE_SELECTION = "engine_selection"
    TOPOLOGY_DESIGN = "topology_design"
    BILLING_SETUP = "billing_setup"
    PROVISIONING = "provisioning"
    GO_LIVE = "go_live"


PHASE_ORDER = list(OnboardingPhase)


class HarborAgent(BaseAgent):
    """Onboarding: 7-phase conversational deployment."""

    AGENT_NAME = "harbor"
    TIER = AgentTier.SPECIALIZED
    AUTONOMY_LEVEL = AutonomyLevel.SUPERVISED
    MODEL_ASSIGNMENT = "claude-sonnet-4-6"
    VISIBILITY = "Customer"
    DESCRIPTION = "Onboarding: 7-phase conversational deployment"
    CYCLE_INTERVAL_SECONDS = 0.0  # Event-driven
    TOOLS = [
        ToolDefinition(
            name="validate_cloud_credentials",
            description="Validate AWS/GCP/Azure credentials for provisioning",
            input_schema={
                "type": "object",
                "properties": {
                    "provider": {"type": "string"},
                    "credentials": {"type": "object"},
                },
            },
        ),
        ToolDefinition(
            name="create_stripe_checkout",
            description="Create a Stripe checkout session for billing setup",
            input_schema={
                "type": "object",
                "properties": {"plan_id": {"type": "string"}, "tenant_id": {"type": "string"}},
            },
        ),
        ToolDefinition(
            name="trigger_provision",
            description="Trigger infrastructure provisioning via FORGE agent",
            input_schema={
                "type": "object",
                "properties": {"tenant_id": {"type": "string"}, "config": {"type": "object"}},
            },
        ),
    ]
    SUBSCRIPTIONS = [
        "onboarding.phase_transition",
        "onboarding.started",
    ]
    EMISSIONS = [
        "onboarding.phase_completed",
        "onboarding.provision_requested",
        "specialized.onboarding_completed",
    ]

    async def run_cycle(self) -> None:
        """HARBOR is event-driven; no proactive cycle."""

    async def process(self, event: EventEnvelope) -> None:
        """Handle onboarding phase transitions."""
        if event.event_type == "onboarding.started":
            await self._start_onboarding(event)
        elif event.event_type == "onboarding.phase_transition":
            await self._handle_phase(event)

    async def _start_onboarding(self, event: EventEnvelope) -> None:
        """Initialize a new onboarding session."""
        session_id = event.payload.get("session_id", "")
        await self.set_context(f"onboard:{session_id}:phase", OnboardingPhase.INTENT_DISCOVERY.value)
        await self._emit(EventEnvelope(
            event_type="onboarding.phase_completed",
            tenant_id=self._context.tenant_id,
            payload={"session_id": session_id, "phase": "initialized", "next": "intent_discovery"},
        ))

    async def _handle_phase(self, event: EventEnvelope) -> None:
        """Process a phase transition event."""
        session_id = event.payload.get("session_id", "")
        phase_str = event.payload.get("phase", "")
        phase_data = event.payload.get("data", {})

        try:
            phase = OnboardingPhase(phase_str)
        except ValueError:
            logger.warning("harbor.invalid_phase", phase=phase_str)
            return

        if phase == OnboardingPhase.CLOUD_CREDENTIALS:
            result = await self._invoke_tool(
                "validate_cloud_credentials",
                provider=phase_data.get("provider", "aws"),
                credentials=phase_data.get("credentials", {}),
            )
            valid = result.get("result", {}).get("valid", False)
            if not valid:
                return

        elif phase == OnboardingPhase.BILLING_SETUP:
            await self._invoke_tool(
                "create_stripe_checkout",
                plan_id=phase_data.get("plan_id", "growth"),
                tenant_id=self._context.tenant_id,
            )

        elif phase == OnboardingPhase.PROVISIONING:
            await self._request_approval(
                f"Provision infrastructure for tenant {self._context.tenant_id}",
                risk_level="high",
            )
            await self._invoke_tool(
                "trigger_provision",
                tenant_id=self._context.tenant_id,
                config=phase_data,
            )
            await self._emit(EventEnvelope(
                event_type="onboarding.provision_requested",
                tenant_id=self._context.tenant_id,
                payload={"session_id": session_id, "config": phase_data},
            ))

        elif phase == OnboardingPhase.GO_LIVE:
            await self._emit(EventEnvelope(
                event_type="specialized.onboarding_completed",
                tenant_id=self._context.tenant_id,
                payload={"session_id": session_id},
            ))

        # Advance to next phase
        phase_idx = PHASE_ORDER.index(phase)
        if phase_idx < len(PHASE_ORDER) - 1:
            next_phase = PHASE_ORDER[phase_idx + 1]
            await self.set_context(
                f"onboard:{session_id}:phase", next_phase.value
            )

        await self._emit(EventEnvelope(
            event_type="onboarding.phase_completed",
            tenant_id=self._context.tenant_id,
            payload={
                "session_id": session_id,
                "phase": phase.value,
                "next": PHASE_ORDER[min(phase_idx + 1, len(PHASE_ORDER) - 1)].value,
            },
        ))
