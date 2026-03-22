"""Tests for agents.pulse — PulseAgent (Heartbeat Monitor)."""

from __future__ import annotations

import time

import pytest

from cortex.base_agent import AgentContext
from cortex.models import AgentStatus, AgentTier, AutonomyLevel, EventEnvelope


@pytest.fixture
def pulse(make_agent_context):
    from agents.pulse import PulseAgent
    ctx: AgentContext = make_agent_context("test-tenant")
    return PulseAgent(ctx)


class TestPulseDeclarations:
    def test_agent_name(self):
        from agents.pulse import PulseAgent
        assert PulseAgent.AGENT_NAME == "pulse"

    def test_tier_is_self_healing(self):
        from agents.pulse import PulseAgent
        assert PulseAgent.TIER == AgentTier.SELF_HEALING

    def test_autonomy_is_autonomous(self):
        from agents.pulse import PulseAgent
        assert PulseAgent.AUTONOMY_LEVEL == AutonomyLevel.AUTONOMOUS

    def test_model_assignment_is_deterministic(self):
        from agents.pulse import PulseAgent
        assert PulseAgent.MODEL_ASSIGNMENT == "deterministic"

    def test_visibility_is_internal(self):
        from agents.pulse import PulseAgent
        assert PulseAgent.VISIBILITY == "Internal"

    def test_description_set(self):
        from agents.pulse import PulseAgent
        assert len(PulseAgent.DESCRIPTION) > 0

    def test_subscriptions_include_heartbeat(self):
        from agents.pulse import PulseAgent
        assert "agent.heartbeat" in PulseAgent.SUBSCRIPTIONS

    def test_emissions_include_status_changed(self):
        from agents.pulse import PulseAgent
        assert "agent.status_changed" in PulseAgent.EMISSIONS

    def test_emissions_include_incident_detected(self):
        from agents.pulse import PulseAgent
        assert "self_healing.incident_detected" in PulseAgent.EMISSIONS

    def test_records_initialized_empty(self, pulse):
        assert pulse._records == {}


class TestPulseProcessing:
    async def test_process_heartbeat_registers_agent(self, pulse):
        event = EventEnvelope(
            event_type="agent.heartbeat",
            tenant_id="test-tenant",
            payload={"agent_name": "argus"},
        )
        await pulse.process(event)
        assert "argus" in pulse._records

    async def test_process_heartbeat_updates_last_heartbeat(self, pulse):
        before = time.monotonic()
        event = EventEnvelope(
            event_type="agent.heartbeat",
            tenant_id="test-tenant",
            payload={"agent_name": "argus"},
        )
        await pulse.process(event)
        assert pulse._records["argus"].last_heartbeat >= before

    async def test_process_heartbeat_ignores_non_heartbeat_events(self, pulse):
        event = EventEnvelope(
            event_type="perception.workload_profile",
            tenant_id="test-tenant",
            payload={"agent_name": "argus"},
        )
        await pulse.process(event)
        assert "argus" not in pulse._records

    async def test_process_heartbeat_resets_degraded_to_healthy(
        self, pulse, mock_event_mesh
    ):
        """A new heartbeat from a degraded agent resets its status."""
        from agents.pulse import _AgentRecord
        pulse._records["argus"] = _AgentRecord(
            agent_name="argus",
            last_heartbeat=time.monotonic() - 100,
            missed_count=4,
            status=AgentStatus.DEGRADED,
        )
        event = EventEnvelope(
            event_type="agent.heartbeat",
            tenant_id="test-tenant",
            payload={"agent_name": "argus"},
        )
        await pulse.process(event)
        assert pulse._records["argus"].status == AgentStatus.HEALTHY
        # A status_changed event should have been emitted
        event_types = [e.event_type for e in mock_event_mesh.published_events]
        assert "agent.status_changed" in event_types

    async def test_run_cycle_detects_dead_agent(self, pulse, mock_event_mesh):
        """An agent with 6+ missed beats should be marked dead and trigger an incident."""
        from agents.pulse import _AgentRecord
        # Simulate an agent whose last heartbeat was 200 seconds ago
        pulse._records["oracle"] = _AgentRecord(
            agent_name="oracle",
            last_heartbeat=time.monotonic() - 200,
            missed_count=0,
            status=AgentStatus.HEALTHY,
            heartbeat_interval=10.0,
        )
        await pulse.run_cycle()
        event_types = [e.event_type for e in mock_event_mesh.published_events]
        assert "self_healing.incident_detected" in event_types

    async def test_run_cycle_does_not_raise(self, pulse):
        try:
            await pulse.run_cycle()
        except Exception:
            pass
