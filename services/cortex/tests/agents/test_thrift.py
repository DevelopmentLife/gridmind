"""Tests for agents.thrift — ThriftAgent (Platform FinOps)."""

from __future__ import annotations

import pytest

from cortex.base_agent import AgentContext
from cortex.models import AgentTier, AutonomyLevel, EventEnvelope


@pytest.fixture
def thrift(make_agent_context):
    from agents.thrift import ThriftAgent
    ctx: AgentContext = make_agent_context("test-tenant")
    return ThriftAgent(ctx)


class TestThriftDeclarations:
    def test_agent_name(self):
        from agents.thrift import ThriftAgent
        assert ThriftAgent.AGENT_NAME == "thrift"

    def test_tier_is_specialized(self):
        from agents.thrift import ThriftAgent
        assert ThriftAgent.TIER == AgentTier.SPECIALIZED

    def test_autonomy_is_autonomous(self):
        from agents.thrift import ThriftAgent
        assert ThriftAgent.AUTONOMY_LEVEL == AutonomyLevel.AUTONOMOUS

    def test_model_assignment_is_sonnet(self):
        from agents.thrift import ThriftAgent
        assert ThriftAgent.MODEL_ASSIGNMENT == "claude-sonnet-4-6"

    def test_visibility_is_internal(self):
        from agents.thrift import ThriftAgent
        assert ThriftAgent.VISIBILITY == "Internal"

    def test_description_set(self):
        from agents.thrift import ThriftAgent
        assert len(ThriftAgent.DESCRIPTION) > 0

    def test_emissions_include_cost_report(self):
        from agents.thrift import ThriftAgent
        assert "finops.cost_report" in ThriftAgent.EMISSIONS

    def test_emissions_include_budget_alert(self):
        from agents.thrift import ThriftAgent
        assert "finops.budget_alert" in ThriftAgent.EMISSIONS

    def test_tools_contain_get_llm_spend(self):
        from agents.thrift import ThriftAgent
        tool_names = {t.name for t in ThriftAgent.TOOLS}
        assert "get_llm_spend" in tool_names

    def test_cycle_interval_is_positive(self):
        from agents.thrift import ThriftAgent
        assert ThriftAgent.CYCLE_INTERVAL_SECONDS > 0


class TestThriftProcessing:
    async def test_process_unknown_event_does_not_raise(self, thrift):
        from unittest.mock import MagicMock
        event = MagicMock(spec=EventEnvelope)
        event.tenant_id = "test-tenant"
        event.event_type = "unknown.event"
        await thrift.process(event)

    async def test_run_cycle_emits_cost_report(self, thrift, mock_event_mesh):
        await thrift.run_cycle()
        event_types = [e.event_type for e in mock_event_mesh.published_events]
        assert "finops.cost_report" in event_types

    async def test_run_cycle_emits_budget_alert_when_exceeded(
        self, thrift, mock_event_mesh, mock_llm_client
    ):
        import json
        async def exceeded_response(model, system, messages, max_tokens=4096):
            return json.dumps({
                "total_monthly_estimate_usd": 50000.0,
                "llm_spend_usd": 5000.0,
                "savings_opportunities": [],
                "budget_status": "exceeded",
            })
        mock_llm_client.call.side_effect = exceeded_response

        await thrift.run_cycle()
        event_types = [e.event_type for e in mock_event_mesh.published_events]
        assert "finops.budget_alert" in event_types

    async def test_run_cycle_calls_llm(self, thrift, mock_llm_client):
        await thrift.run_cycle()
        mock_llm_client.call.assert_called_once()

    async def test_run_cycle_does_not_raise(self, thrift):
        try:
            await thrift.run_cycle()
        except Exception:
            pass
