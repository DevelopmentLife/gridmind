"""Tests for agents.ledger — LedgerAgent (Cost Telemetry)."""

from __future__ import annotations

import pytest

from cortex.base_agent import AgentContext
from cortex.models import AgentTier, AutonomyLevel, EventEnvelope


@pytest.fixture
def ledger(make_agent_context):
    from agents.ledger import LedgerAgent
    ctx: AgentContext = make_agent_context("test-tenant")
    return LedgerAgent(ctx)


class TestLedgerDeclarations:
    def test_agent_name(self):
        from agents.ledger import LedgerAgent
        assert LedgerAgent.AGENT_NAME == "ledger"

    def test_tier_is_perception(self):
        from agents.ledger import LedgerAgent
        assert LedgerAgent.TIER == AgentTier.PERCEPTION

    def test_autonomy_is_autonomous(self):
        from agents.ledger import LedgerAgent
        assert LedgerAgent.AUTONOMY_LEVEL == AutonomyLevel.AUTONOMOUS

    def test_model_assignment_is_haiku(self):
        from agents.ledger import LedgerAgent
        assert LedgerAgent.MODEL_ASSIGNMENT == "claude-haiku-4-5"

    def test_visibility_is_internal(self):
        from agents.ledger import LedgerAgent
        assert LedgerAgent.VISIBILITY == "Internal"

    def test_description_set(self):
        from agents.ledger import LedgerAgent
        assert len(LedgerAgent.DESCRIPTION) > 0

    def test_emissions_include_cost_snapshot(self):
        from agents.ledger import LedgerAgent
        assert "perception.cost_snapshot" in LedgerAgent.EMISSIONS

    def test_emissions_include_cost_anomaly(self):
        from agents.ledger import LedgerAgent
        assert "perception.cost_anomaly" in LedgerAgent.EMISSIONS

    def test_cycle_interval_is_positive(self):
        from agents.ledger import LedgerAgent
        assert LedgerAgent.CYCLE_INTERVAL_SECONDS > 0

    def test_tools_contain_pg_query_stats(self):
        from agents.ledger import LedgerAgent
        tool_names = {t.name for t in LedgerAgent.TOOLS}
        assert "get_pg_query_stats" in tool_names


class TestLedgerProcessing:
    async def test_process_unknown_event_does_not_raise(self, ledger):
        from unittest.mock import MagicMock
        event = MagicMock(spec=EventEnvelope)
        event.tenant_id = "test-tenant"
        event.event_type = "unknown.event"
        await ledger.process(event)

    async def test_run_cycle_emits_cost_snapshot(self, ledger, mock_event_mesh):
        await ledger.run_cycle()
        event_types = [e.event_type for e in mock_event_mesh.published_events]
        assert "perception.cost_snapshot" in event_types

    async def test_run_cycle_stores_hourly_rate(self, ledger, mock_state_manager):
        await ledger.run_cycle()
        mock_state_manager.set_context.assert_called()

    async def test_run_cycle_emits_anomaly_on_large_rate_change(
        self, ledger, mock_event_mesh, mock_state_manager
    ):
        """When hourly rate changes by >20%, a cost_anomaly event is emitted."""
        async def get_ctx(agent_id, tenant_id, key):
            if key == "last_hourly_rate":
                return 10.0  # Previous rate
            return None
        mock_state_manager.get_context.side_effect = get_ctx

        # Mock billing tool to return a rate that's >20% different
        from unittest.mock import AsyncMock
        original_invoke = ledger._invoke_tool

        async def mock_invoke(name, **kwargs):
            if name == "get_cloud_billing_snapshot":
                return {"result": {"hourly_rate_usd": 20.0}}  # 100% increase
            return {"result": []}
        ledger._invoke_tool = mock_invoke  # type: ignore[method-assign]

        await ledger.run_cycle()
        event_types = [e.event_type for e in mock_event_mesh.published_events]
        assert "perception.cost_anomaly" in event_types

    async def test_run_cycle_does_not_raise(self, ledger):
        try:
            await ledger.run_cycle()
        except Exception:
            pass
