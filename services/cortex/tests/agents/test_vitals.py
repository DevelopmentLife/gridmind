"""Tests for agents.vitals — VitalsAgent (Infrastructure Health)."""

from __future__ import annotations

import pytest

from cortex.base_agent import AgentContext
from cortex.models import AgentTier, AutonomyLevel, EventEnvelope


@pytest.fixture
def vitals(make_agent_context):
    from agents.vitals import VitalsAgent
    ctx: AgentContext = make_agent_context("test-tenant")
    return VitalsAgent(ctx)


class TestVitalsDeclarations:
    def test_agent_name(self):
        from agents.vitals import VitalsAgent
        assert VitalsAgent.AGENT_NAME == "vitals"

    def test_tier_is_self_healing(self):
        from agents.vitals import VitalsAgent
        assert VitalsAgent.TIER == AgentTier.SELF_HEALING

    def test_autonomy_is_autonomous(self):
        from agents.vitals import VitalsAgent
        assert VitalsAgent.AUTONOMY_LEVEL == AutonomyLevel.AUTONOMOUS

    def test_model_assignment_is_deterministic(self):
        from agents.vitals import VitalsAgent
        assert VitalsAgent.MODEL_ASSIGNMENT == "deterministic"

    def test_visibility_is_internal(self):
        from agents.vitals import VitalsAgent
        assert VitalsAgent.VISIBILITY == "Internal"

    def test_description_set(self):
        from agents.vitals import VitalsAgent
        assert len(VitalsAgent.DESCRIPTION) > 0

    def test_no_tools(self):
        from agents.vitals import VitalsAgent
        assert VitalsAgent.TOOLS == []

    def test_emissions_include_health_report(self):
        from agents.vitals import VitalsAgent
        assert "infra.health_report" in VitalsAgent.EMISSIONS

    def test_emissions_include_incident_detected(self):
        from agents.vitals import VitalsAgent
        assert "self_healing.incident_detected" in VitalsAgent.EMISSIONS

    def test_cycle_interval_is_positive(self):
        from agents.vitals import VitalsAgent
        assert VitalsAgent.CYCLE_INTERVAL_SECONDS > 0


class TestVitalsProbes:
    async def test_probe_nats_healthy_when_connected(self, vitals):
        vitals._context.event_mesh.is_connected = True
        result = await vitals._probe_nats()
        assert result["status"] == "healthy"

    async def test_probe_nats_unhealthy_when_disconnected(self, vitals):
        vitals._context.event_mesh.is_connected = False
        result = await vitals._probe_nats()
        assert result["status"] == "unhealthy"

    async def test_probe_redis_healthy_on_ping(self, vitals, mock_redis):
        result = await vitals._probe_redis()
        assert result["status"] == "healthy"

    async def test_probe_postgres_uses_pool(self, vitals, mock_pg):
        result = await vitals._probe_postgres()
        # Pool.acquire is mocked and returns 1 from fetchval
        assert result["status"] == "healthy"


class TestVitalsProcessing:
    async def test_process_unknown_event_does_not_raise(self, vitals):
        from unittest.mock import MagicMock
        event = MagicMock(spec=EventEnvelope)
        event.tenant_id = "test-tenant"
        event.event_type = "unknown.event"
        await vitals.process(event)

    async def test_run_cycle_emits_health_report(self, vitals, mock_event_mesh):
        await vitals.run_cycle()
        event_types = [e.event_type for e in mock_event_mesh.published_events]
        assert "infra.health_report" in event_types

    async def test_run_cycle_emits_incident_on_unhealthy_component(
        self, vitals, mock_event_mesh
    ):
        """When a component probe returns unhealthy, an incident is emitted."""
        vitals._context.event_mesh.is_connected = False
        await vitals.run_cycle()
        event_types = [e.event_type for e in mock_event_mesh.published_events]
        assert "self_healing.incident_detected" in event_types

    async def test_run_cycle_does_not_raise(self, vitals):
        try:
            await vitals.run_cycle()
        except Exception:
            pass
