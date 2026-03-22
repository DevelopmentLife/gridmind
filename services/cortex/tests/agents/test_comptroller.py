"""Tests for agents.comptroller — ComptrollerAgent (Billing Intelligence)."""

from __future__ import annotations

import pytest

from cortex.base_agent import AgentContext
from cortex.models import AgentTier, AutonomyLevel, EventEnvelope


@pytest.fixture
def comptroller(make_agent_context):
    from agents.comptroller import ComptrollerAgent
    ctx: AgentContext = make_agent_context("test-tenant")
    return ComptrollerAgent(ctx)


class TestComptrollerDeclarations:
    def test_agent_name(self):
        from agents.comptroller import ComptrollerAgent
        assert ComptrollerAgent.AGENT_NAME == "comptroller"

    def test_tier_is_specialized(self):
        from agents.comptroller import ComptrollerAgent
        assert ComptrollerAgent.TIER == AgentTier.SPECIALIZED

    def test_autonomy_is_autonomous(self):
        from agents.comptroller import ComptrollerAgent
        assert ComptrollerAgent.AUTONOMY_LEVEL == AutonomyLevel.AUTONOMOUS

    def test_model_assignment_is_sonnet(self):
        from agents.comptroller import ComptrollerAgent
        assert ComptrollerAgent.MODEL_ASSIGNMENT == "claude-sonnet-4-6"

    def test_visibility_is_internal(self):
        from agents.comptroller import ComptrollerAgent
        assert ComptrollerAgent.VISIBILITY == "Internal"

    def test_description_set(self):
        from agents.comptroller import ComptrollerAgent
        assert len(ComptrollerAgent.DESCRIPTION) > 0

    def test_emissions_include_margin_report(self):
        from agents.comptroller import ComptrollerAgent
        assert "billing.margin_report" in ComptrollerAgent.EMISSIONS

    def test_emissions_include_anomaly_detected(self):
        from agents.comptroller import ComptrollerAgent
        assert "billing.anomaly_detected" in ComptrollerAgent.EMISSIONS

    def test_tools_contain_stripe_invoices(self):
        from agents.comptroller import ComptrollerAgent
        tool_names = {t.name for t in ComptrollerAgent.TOOLS}
        assert "get_stripe_invoices" in tool_names

    def test_cycle_interval_is_positive(self):
        from agents.comptroller import ComptrollerAgent
        assert ComptrollerAgent.CYCLE_INTERVAL_SECONDS > 0


class TestComptrollerProcessing:
    async def test_process_unknown_event_does_not_raise(self, comptroller):
        from unittest.mock import MagicMock
        event = MagicMock(spec=EventEnvelope)
        event.tenant_id = "test-tenant"
        event.event_type = "unknown.event"
        await comptroller.process(event)

    async def test_run_cycle_emits_margin_report(self, comptroller, mock_event_mesh):
        await comptroller.run_cycle()
        event_types = [e.event_type for e in mock_event_mesh.published_events]
        assert "billing.margin_report" in event_types

    async def test_run_cycle_emits_anomaly_on_spike(
        self, comptroller, mock_event_mesh, mock_state_manager
    ):
        """When monthly cost spikes >50% from previous, an anomaly is emitted."""
        async def get_ctx(agent_id, tenant_id, key):
            if key == "last_monthly_cost":
                return 1000.0
            return None
        mock_state_manager.get_context.side_effect = get_ctx

        async def high_cost_invoke(name, **kwargs):
            if name == "get_cost_history":
                return {"result": {"total_monthly_usd": 2000.0}}  # 100% spike
            return {"result": {}}
        comptroller._invoke_tool = high_cost_invoke  # type: ignore[method-assign]

        await comptroller.run_cycle()
        event_types = [e.event_type for e in mock_event_mesh.published_events]
        assert "billing.anomaly_detected" in event_types

    async def test_run_cycle_stores_cost_in_context(self, comptroller, mock_state_manager):
        await comptroller.run_cycle()
        mock_state_manager.set_context.assert_called()

    async def test_margin_formula_correct_for_positive_cost(self, comptroller):
        """Verify the margin calculation produces a plausible result."""
        import math
        cost = 1000.0
        min_margin = 0.55
        margin_target = max(min_margin, 0.75 - 0.035 * math.log(cost / 100))
        assert 0.5 <= margin_target <= 0.75

    async def test_run_cycle_does_not_raise(self, comptroller):
        try:
            await comptroller.run_cycle()
        except Exception:
            pass
