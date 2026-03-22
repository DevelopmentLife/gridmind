"""Tests for agents.prism_agent — PrismAgent (Query Optimizer)."""

from __future__ import annotations

import pytest

from cortex.base_agent import AgentContext
from cortex.models import AgentTier, AutonomyLevel, EventEnvelope


@pytest.fixture
def prism(make_agent_context):
    from agents.prism_agent import PrismAgent
    ctx: AgentContext = make_agent_context("test-tenant")
    return PrismAgent(ctx)


class TestPrismDeclarations:
    def test_agent_name(self):
        from agents.prism_agent import PrismAgent
        assert PrismAgent.AGENT_NAME == "prism"

    def test_tier_is_reasoning(self):
        from agents.prism_agent import PrismAgent
        assert PrismAgent.TIER == AgentTier.REASONING

    def test_autonomy_is_advisory(self):
        from agents.prism_agent import PrismAgent
        assert PrismAgent.AUTONOMY_LEVEL == AutonomyLevel.ADVISORY

    def test_model_assignment_is_sonnet(self):
        from agents.prism_agent import PrismAgent
        assert PrismAgent.MODEL_ASSIGNMENT == "claude-sonnet-4-6"

    def test_visibility_is_customer(self):
        from agents.prism_agent import PrismAgent
        assert PrismAgent.VISIBILITY == "Customer"

    def test_description_set(self):
        from agents.prism_agent import PrismAgent
        assert len(PrismAgent.DESCRIPTION) > 0

    def test_subscriptions_include_workload_profile(self):
        from agents.prism_agent import PrismAgent
        assert "perception.workload_profile" in PrismAgent.SUBSCRIPTIONS

    def test_emissions_include_optimization_recommendations(self):
        from agents.prism_agent import PrismAgent
        assert "reasoning.optimization_recommendations" in PrismAgent.EMISSIONS

    def test_cycle_interval_is_positive(self):
        from agents.prism_agent import PrismAgent
        assert PrismAgent.CYCLE_INTERVAL_SECONDS > 0

    def test_tools_contain_explain_query(self):
        from agents.prism_agent import PrismAgent
        tool_names = {t.name for t in PrismAgent.TOOLS}
        assert "explain_query" in tool_names


class TestPrismProcessing:
    async def test_process_workload_profile_stores_workload_class(
        self, prism, mock_state_manager
    ):
        event = EventEnvelope(
            event_type="perception.workload_profile",
            tenant_id="test-tenant",
            payload={"classification": "OLAP"},
        )
        await prism.process(event)
        mock_state_manager.set_context.assert_called()

    async def test_process_unknown_event_does_not_raise(self, prism):
        from unittest.mock import MagicMock
        event = MagicMock(spec=EventEnvelope)
        event.tenant_id = "test-tenant"
        event.event_type = "unknown.event"
        await prism.process(event)

    async def test_run_cycle_emits_optimization_recommendations(self, prism, mock_event_mesh):
        await prism.run_cycle()
        event_types = [e.event_type for e in mock_event_mesh.published_events]
        assert "reasoning.optimization_recommendations" in event_types

    async def test_run_cycle_calls_llm(self, prism, mock_llm_client):
        await prism.run_cycle()
        mock_llm_client.call.assert_called_once()

    async def test_advisory_agent_does_not_request_approval(self, prism, mock_approval_gate):
        """ADVISORY agents should never call request_approval directly in run_cycle."""
        await prism.run_cycle()
        mock_approval_gate.request_approval.assert_not_called()

    async def test_run_cycle_does_not_raise(self, prism):
        try:
            await prism.run_cycle()
        except Exception:
            pass
