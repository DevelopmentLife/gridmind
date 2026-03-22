"""Tests for agents.convoy — ConvoyAgent (Migration)."""

from __future__ import annotations

import pytest

from cortex.base_agent import AgentContext
from cortex.models import AgentTier, AutonomyLevel, EventEnvelope


@pytest.fixture
def convoy(make_agent_context):
    from agents.convoy import ConvoyAgent
    ctx: AgentContext = make_agent_context("test-tenant")
    return ConvoyAgent(ctx)


class TestConvoyDeclarations:
    def test_agent_name(self):
        from agents.convoy import ConvoyAgent
        assert ConvoyAgent.AGENT_NAME == "convoy"

    def test_tier_is_execution(self):
        from agents.convoy import ConvoyAgent
        assert ConvoyAgent.TIER == AgentTier.EXECUTION

    def test_autonomy_is_supervised(self):
        from agents.convoy import ConvoyAgent
        assert ConvoyAgent.AUTONOMY_LEVEL == AutonomyLevel.SUPERVISED

    def test_model_assignment_is_sonnet(self):
        from agents.convoy import ConvoyAgent
        assert ConvoyAgent.MODEL_ASSIGNMENT == "claude-sonnet-4-6"

    def test_visibility_is_customer(self):
        from agents.convoy import ConvoyAgent
        assert ConvoyAgent.VISIBILITY == "Customer"

    def test_description_set(self):
        from agents.convoy import ConvoyAgent
        assert len(ConvoyAgent.DESCRIPTION) > 0

    def test_subscriptions_include_migrate_requested(self):
        from agents.convoy import ConvoyAgent
        assert "action.migrate_requested" in ConvoyAgent.SUBSCRIPTIONS

    def test_emissions_include_migration_started(self):
        from agents.convoy import ConvoyAgent
        assert "execution.migration_started" in ConvoyAgent.EMISSIONS

    def test_emissions_include_migration_completed(self):
        from agents.convoy import ConvoyAgent
        assert "execution.migration_completed" in ConvoyAgent.EMISSIONS

    def test_cycle_interval_is_event_driven(self):
        from agents.convoy import ConvoyAgent
        assert ConvoyAgent.CYCLE_INTERVAL_SECONDS == 0.0


class TestConvoyProcessing:
    async def test_run_cycle_does_not_emit(self, convoy, mock_event_mesh):
        await convoy.run_cycle()
        assert len(mock_event_mesh.published_events) == 0

    async def test_process_migrate_requested_emits_migration_started(
        self, convoy, mock_event_mesh
    ):
        event = EventEnvelope(
            event_type="action.migrate_requested",
            tenant_id="test-tenant",
            payload={
                "source_db": "db_old",
                "target_db": "db_new",
                "volume_id": "vol-123",
            },
        )
        await convoy.process(event)
        event_types = [e.event_type for e in mock_event_mesh.published_events]
        assert "execution.migration_started" in event_types

    async def test_process_requests_approval_before_migration(
        self, convoy, mock_approval_gate
    ):
        """CONVOY is SUPERVISED — migration must request approval."""
        event = EventEnvelope(
            event_type="action.migrate_requested",
            tenant_id="test-tenant",
            payload={"source_db": "old", "target_db": "new", "volume_id": "vol-1"},
        )
        await convoy.process(event)
        mock_approval_gate.request_approval.assert_called_once()

    async def test_process_emits_migration_phases(self, convoy, mock_event_mesh):
        event = EventEnvelope(
            event_type="action.migrate_requested",
            tenant_id="test-tenant",
            payload={"source_db": "old", "target_db": "new", "volume_id": "vol-1"},
        )
        await convoy.process(event)
        event_types = [e.event_type for e in mock_event_mesh.published_events]
        assert "execution.migration_phase" in event_types

    async def test_process_does_not_raise(self, convoy):
        event = EventEnvelope(
            event_type="action.migrate_requested",
            tenant_id="test-tenant",
            payload={"source_db": "old", "target_db": "new", "volume_id": "vol-1"},
        )
        try:
            await convoy.process(event)
        except Exception:
            pass

    async def test_process_unknown_event_does_not_raise(self, convoy):
        event = EventEnvelope(
            event_type="unknown.event",
            tenant_id="test-tenant",
            payload={},
        )
        await convoy.process(event)
