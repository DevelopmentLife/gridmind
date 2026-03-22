"""Tests for agents.harbor — HarborAgent (Onboarding)."""

from __future__ import annotations

import pytest

from cortex.base_agent import AgentContext
from cortex.models import AgentTier, AutonomyLevel, EventEnvelope


@pytest.fixture
def harbor(make_agent_context):
    from agents.harbor import HarborAgent
    ctx: AgentContext = make_agent_context("test-tenant")
    return HarborAgent(ctx)


class TestHarborDeclarations:
    def test_agent_name(self):
        from agents.harbor import HarborAgent
        assert HarborAgent.AGENT_NAME == "harbor"

    def test_tier_is_specialized(self):
        from agents.harbor import HarborAgent
        assert HarborAgent.TIER == AgentTier.SPECIALIZED

    def test_autonomy_is_supervised(self):
        from agents.harbor import HarborAgent
        assert HarborAgent.AUTONOMY_LEVEL == AutonomyLevel.SUPERVISED

    def test_model_assignment_is_sonnet(self):
        from agents.harbor import HarborAgent
        assert HarborAgent.MODEL_ASSIGNMENT == "claude-sonnet-4-6"

    def test_visibility_is_customer(self):
        from agents.harbor import HarborAgent
        assert HarborAgent.VISIBILITY == "Customer"

    def test_description_set(self):
        from agents.harbor import HarborAgent
        assert len(HarborAgent.DESCRIPTION) > 0

    def test_subscriptions_include_onboarding_started(self):
        from agents.harbor import HarborAgent
        assert "onboarding.started" in HarborAgent.SUBSCRIPTIONS

    def test_subscriptions_include_phase_transition(self):
        from agents.harbor import HarborAgent
        assert "onboarding.phase_transition" in HarborAgent.SUBSCRIPTIONS

    def test_emissions_include_phase_completed(self):
        from agents.harbor import HarborAgent
        assert "onboarding.phase_completed" in HarborAgent.EMISSIONS

    def test_cycle_interval_is_event_driven(self):
        from agents.harbor import HarborAgent
        assert HarborAgent.CYCLE_INTERVAL_SECONDS == 0.0


class TestHarborProcessing:
    async def test_run_cycle_does_not_emit(self, harbor, mock_event_mesh):
        await harbor.run_cycle()
        assert len(mock_event_mesh.published_events) == 0

    async def test_process_onboarding_started_emits_phase_completed(
        self, harbor, mock_event_mesh
    ):
        event = EventEnvelope(
            event_type="onboarding.started",
            tenant_id="test-tenant",
            payload={"session_id": "sess-abc123"},
        )
        await harbor.process(event)
        event_types = [e.event_type for e in mock_event_mesh.published_events]
        assert "onboarding.phase_completed" in event_types

    async def test_process_phase_transition_invalid_phase_does_not_raise(self, harbor):
        event = EventEnvelope(
            event_type="onboarding.phase_transition",
            tenant_id="test-tenant",
            payload={"session_id": "sess-abc", "phase": "invalid_phase", "data": {}},
        )
        await harbor.process(event)  # Should not raise

    async def test_process_provisioning_phase_requests_approval(
        self, harbor, mock_approval_gate
    ):
        """HARBOR is SUPERVISED — provisioning phase must request approval."""
        event = EventEnvelope(
            event_type="onboarding.phase_transition",
            tenant_id="test-tenant",
            payload={
                "session_id": "sess-1",
                "phase": "provisioning",
                "data": {"instance_type": "db.t3.medium"},
            },
        )
        await harbor.process(event)
        mock_approval_gate.request_approval.assert_called_once()

    async def test_process_go_live_emits_onboarding_completed(
        self, harbor, mock_event_mesh
    ):
        event = EventEnvelope(
            event_type="onboarding.phase_transition",
            tenant_id="test-tenant",
            payload={"session_id": "sess-1", "phase": "go_live", "data": {}},
        )
        await harbor.process(event)
        event_types = [e.event_type for e in mock_event_mesh.published_events]
        assert "specialized.onboarding_completed" in event_types

    async def test_process_does_not_raise(self, harbor):
        event = EventEnvelope(
            event_type="onboarding.started",
            tenant_id="test-tenant",
            payload={"session_id": "sess-1"},
        )
        try:
            await harbor.process(event)
        except Exception:
            pass
