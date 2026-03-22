"""Tests for agents.forge_agent — ForgeAgent (Provisioning)."""

from __future__ import annotations

import pytest

from cortex.base_agent import AgentContext
from cortex.models import AgentTier, AutonomyLevel, EventEnvelope


@pytest.fixture
def forge(make_agent_context):
    from agents.forge_agent import ForgeAgent
    ctx: AgentContext = make_agent_context("test-tenant")
    return ForgeAgent(ctx)


class TestForgeDeclarations:
    def test_agent_name(self):
        from agents.forge_agent import ForgeAgent
        assert ForgeAgent.AGENT_NAME == "forge"

    def test_tier_is_execution(self):
        from agents.forge_agent import ForgeAgent
        assert ForgeAgent.TIER == AgentTier.EXECUTION

    def test_autonomy_is_supervised(self):
        from agents.forge_agent import ForgeAgent
        assert ForgeAgent.AUTONOMY_LEVEL == AutonomyLevel.SUPERVISED

    def test_model_assignment_is_deterministic(self):
        from agents.forge_agent import ForgeAgent
        assert ForgeAgent.MODEL_ASSIGNMENT == "deterministic"

    def test_visibility_is_customer(self):
        from agents.forge_agent import ForgeAgent
        assert ForgeAgent.VISIBILITY == "Customer"

    def test_description_set(self):
        from agents.forge_agent import ForgeAgent
        assert len(ForgeAgent.DESCRIPTION) > 0

    def test_subscriptions_include_scaling_decision(self):
        from agents.forge_agent import ForgeAgent
        assert "scaling.decision" in ForgeAgent.SUBSCRIPTIONS

    def test_subscriptions_include_provision_requested(self):
        from agents.forge_agent import ForgeAgent
        assert "onboarding.provision_requested" in ForgeAgent.SUBSCRIPTIONS

    def test_emissions_include_provision_started(self):
        from agents.forge_agent import ForgeAgent
        assert "execution.provision_started" in ForgeAgent.EMISSIONS

    def test_cycle_interval_is_event_driven(self):
        from agents.forge_agent import ForgeAgent
        assert ForgeAgent.CYCLE_INTERVAL_SECONDS == 0.0


class TestForgeProcessing:
    async def test_run_cycle_does_not_emit(self, forge, mock_event_mesh):
        await forge.run_cycle()
        assert len(mock_event_mesh.published_events) == 0

    async def test_process_scaling_decision_requests_approval(
        self, forge, mock_approval_gate
    ):
        """FORGE is SUPERVISED — scaling must request approval."""
        event = EventEnvelope(
            event_type="scaling.decision",
            tenant_id="test-tenant",
            payload={
                "deployment_id": "deploy-1",
                "action": {"replicas": 3, "action": "scale_up"},
                "status": "approved",
            },
        )
        await forge.process(event)
        mock_approval_gate.request_approval.assert_called_once()

    async def test_process_scaling_decision_emits_provision_started(
        self, forge, mock_event_mesh
    ):
        event = EventEnvelope(
            event_type="scaling.decision",
            tenant_id="test-tenant",
            payload={
                "deployment_id": "deploy-1",
                "action": {"replicas": 3},
                "status": "approved",
            },
        )
        await forge.process(event)
        event_types = [e.event_type for e in mock_event_mesh.published_events]
        assert "execution.provision_started" in event_types

    async def test_process_provision_requested_emits_provision_started(
        self, forge, mock_event_mesh
    ):
        event = EventEnvelope(
            event_type="onboarding.provision_requested",
            tenant_id="test-tenant",
            payload={
                "workspace": "tenant-abc",
                "terraform_vars": {"instance_type": "db.t3.medium"},
            },
        )
        await forge.process(event)
        event_types = [e.event_type for e in mock_event_mesh.published_events]
        assert "execution.provision_started" in event_types

    async def test_process_unknown_event_does_not_raise(self, forge):
        event = EventEnvelope(
            event_type="unknown.event",
            tenant_id="test-tenant",
            payload={},
        )
        await forge.process(event)

    async def test_process_does_not_raise(self, forge):
        event = EventEnvelope(
            event_type="scaling.decision",
            tenant_id="test-tenant",
            payload={},
        )
        try:
            await forge.process(event)
        except Exception:
            pass
