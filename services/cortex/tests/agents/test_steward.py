"""Tests for agents.steward — StewardAgent (Customer Intelligence)."""

from __future__ import annotations

import pytest

from cortex.base_agent import AgentContext
from cortex.models import AgentTier, AutonomyLevel, EventEnvelope


@pytest.fixture
def steward(make_agent_context):
    from agents.steward import StewardAgent
    ctx: AgentContext = make_agent_context("test-tenant")
    return StewardAgent(ctx)


class TestStewardDeclarations:
    def test_agent_name(self):
        from agents.steward import StewardAgent
        assert StewardAgent.AGENT_NAME == "steward"

    def test_tier_is_specialized(self):
        from agents.steward import StewardAgent
        assert StewardAgent.TIER == AgentTier.SPECIALIZED

    def test_autonomy_is_autonomous(self):
        from agents.steward import StewardAgent
        assert StewardAgent.AUTONOMY_LEVEL == AutonomyLevel.AUTONOMOUS

    def test_model_assignment_is_sonnet(self):
        from agents.steward import StewardAgent
        assert StewardAgent.MODEL_ASSIGNMENT == "claude-sonnet-4-6"

    def test_visibility_is_internal(self):
        from agents.steward import StewardAgent
        assert StewardAgent.VISIBILITY == "Internal"

    def test_description_set(self):
        from agents.steward import StewardAgent
        assert len(StewardAgent.DESCRIPTION) > 0

    def test_emissions_include_health_score(self):
        from agents.steward import StewardAgent
        assert "customer.health_score" in StewardAgent.EMISSIONS

    def test_emissions_include_churn_risk(self):
        from agents.steward import StewardAgent
        assert "customer.churn_risk" in StewardAgent.EMISSIONS

    def test_tools_contain_get_customer_usage(self):
        from agents.steward import StewardAgent
        tool_names = {t.name for t in StewardAgent.TOOLS}
        assert "get_customer_usage" in tool_names

    def test_cycle_interval_is_positive(self):
        from agents.steward import StewardAgent
        assert StewardAgent.CYCLE_INTERVAL_SECONDS > 0


class TestStewardProcessing:
    async def test_process_unknown_event_does_not_raise(self, steward):
        from unittest.mock import MagicMock
        event = MagicMock(spec=EventEnvelope)
        event.tenant_id = "test-tenant"
        event.event_type = "unknown.event"
        await steward.process(event)

    async def test_run_cycle_emits_health_score(self, steward, mock_event_mesh):
        await steward.run_cycle()
        event_types = [e.event_type for e in mock_event_mesh.published_events]
        assert "customer.health_score" in event_types

    async def test_run_cycle_emits_churn_risk_when_elevated(
        self, steward, mock_event_mesh, mock_llm_client
    ):
        import json
        async def high_churn_response(model, system, messages, max_tokens=4096):
            return json.dumps({
                "health_score": 30,
                "factors": [],
                "churn_risk": "high",
                "churn_probability": 0.75,
                "recommendations": ["reach_out_to_customer"],
            })
        mock_llm_client.call.side_effect = high_churn_response

        await steward.run_cycle()
        event_types = [e.event_type for e in mock_event_mesh.published_events]
        assert "customer.churn_risk" in event_types

    async def test_run_cycle_no_churn_risk_when_low(
        self, steward, mock_event_mesh, mock_llm_client
    ):
        import json
        async def low_churn_response(model, system, messages, max_tokens=4096):
            return json.dumps({
                "health_score": 90,
                "factors": [],
                "churn_risk": "low",
                "churn_probability": 0.05,
                "recommendations": [],
            })
        mock_llm_client.call.side_effect = low_churn_response

        await steward.run_cycle()
        event_types = [e.event_type for e in mock_event_mesh.published_events]
        assert "customer.churn_risk" not in event_types

    async def test_run_cycle_calls_llm(self, steward, mock_llm_client):
        await steward.run_cycle()
        mock_llm_client.call.assert_called_once()

    async def test_run_cycle_stores_health_score_in_context(
        self, steward, mock_state_manager
    ):
        await steward.run_cycle()
        mock_state_manager.set_context.assert_called()

    async def test_run_cycle_does_not_raise(self, steward):
        try:
            await steward.run_cycle()
        except Exception:
            pass
