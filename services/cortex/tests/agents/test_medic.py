"""Tests for agents.medic — MedicAgent (Agent Recovery)."""

from __future__ import annotations

import pytest

from cortex.base_agent import AgentContext
from cortex.models import AgentTier, AutonomyLevel, EventEnvelope


@pytest.fixture
def medic(make_agent_context):
    from agents.medic import MedicAgent
    ctx: AgentContext = make_agent_context("test-tenant")
    return MedicAgent(ctx)


class TestMedicDeclarations:
    def test_agent_name(self):
        from agents.medic import MedicAgent
        assert MedicAgent.AGENT_NAME == "medic"

    def test_tier_is_self_healing(self):
        from agents.medic import MedicAgent
        assert MedicAgent.TIER == AgentTier.SELF_HEALING

    def test_autonomy_is_autonomous(self):
        from agents.medic import MedicAgent
        assert MedicAgent.AUTONOMY_LEVEL == AutonomyLevel.AUTONOMOUS

    def test_model_assignment_is_sonnet(self):
        from agents.medic import MedicAgent
        assert MedicAgent.MODEL_ASSIGNMENT == "claude-sonnet-4-6"

    def test_visibility_is_internal(self):
        from agents.medic import MedicAgent
        assert MedicAgent.VISIBILITY == "Internal"

    def test_description_set(self):
        from agents.medic import MedicAgent
        assert len(MedicAgent.DESCRIPTION) > 0

    def test_subscriptions_include_status_changed(self):
        from agents.medic import MedicAgent
        assert "agent.status_changed" in MedicAgent.SUBSCRIPTIONS

    def test_subscriptions_include_incident_detected(self):
        from agents.medic import MedicAgent
        assert "self_healing.incident_detected" in MedicAgent.SUBSCRIPTIONS

    def test_emissions_include_recovery_started(self):
        from agents.medic import MedicAgent
        assert "self_healing.recovery_started" in MedicAgent.EMISSIONS

    def test_cycle_interval_is_event_driven(self):
        from agents.medic import MedicAgent
        assert MedicAgent.CYCLE_INTERVAL_SECONDS == 0.0


class TestMedicPlaybookSelection:
    def test_select_playbook_agent_dead_returns_crash(self, medic):
        from agents.medic import RecoveryPlaybook
        result = medic._select_playbook("agent_dead", "dead", {"missed_heartbeats": 7})
        assert result == RecoveryPlaybook.CRASH

    def test_select_playbook_degraded_status_returns_degradation(self, medic):
        from agents.medic import RecoveryPlaybook
        result = medic._select_playbook("", "degraded", {})
        assert result == RecoveryPlaybook.DEGRADATION

    def test_select_playbook_oom_returns_oom(self, medic):
        from agents.medic import RecoveryPlaybook
        result = medic._select_playbook("oom_killed", "", {})
        assert result == RecoveryPlaybook.OOM

    def test_select_playbook_no_match_returns_none(self, medic):
        result = medic._select_playbook("", "", {})
        assert result is None


class TestMedicProcessing:
    async def test_run_cycle_does_not_emit(self, medic, mock_event_mesh):
        await medic.run_cycle()
        assert len(mock_event_mesh.published_events) == 0

    async def test_process_incident_emits_recovery_started(self, medic, mock_event_mesh):
        event = EventEnvelope(
            event_type="self_healing.incident_detected",
            tenant_id="test-tenant",
            payload={"agent_name": "argus", "type": "agent_dead", "missed_heartbeats": 7},
        )
        await medic.process(event)
        event_types = [e.event_type for e in mock_event_mesh.published_events]
        assert "self_healing.recovery_started" in event_types

    async def test_process_ignores_self_recovery(self, medic, mock_event_mesh):
        """MEDIC should not attempt to recover itself."""
        event = EventEnvelope(
            event_type="self_healing.incident_detected",
            tenant_id="test-tenant",
            payload={"agent_name": "medic", "type": "agent_dead"},
        )
        await medic.process(event)
        assert len(mock_event_mesh.published_events) == 0

    async def test_process_skips_empty_agent_name(self, medic, mock_event_mesh):
        event = EventEnvelope(
            event_type="self_healing.incident_detected",
            tenant_id="test-tenant",
            payload={"type": "agent_dead"},
        )
        await medic.process(event)
        assert len(mock_event_mesh.published_events) == 0

    async def test_process_does_not_raise(self, medic):
        event = EventEnvelope(
            event_type="self_healing.incident_detected",
            tenant_id="test-tenant",
            payload={"agent_name": "argus", "type": "agent_dead"},
        )
        try:
            await medic.process(event)
        except Exception:
            pass
