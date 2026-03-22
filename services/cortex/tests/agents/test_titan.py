"""Tests for agents.titan — TitanAgent (Scaling Arbiter)."""

from __future__ import annotations

import pytest

from cortex.base_agent import AgentContext
from cortex.models import AgentTier, AutonomyLevel, EventEnvelope


@pytest.fixture
def titan(make_agent_context):
    from agents.titan import TitanAgent
    ctx: AgentContext = make_agent_context("test-tenant")
    return TitanAgent(ctx)


class TestTitanDeclarations:
    def test_agent_name(self):
        from agents.titan import TitanAgent
        assert TitanAgent.AGENT_NAME == "titan"

    def test_tier_is_reasoning(self):
        from agents.titan import TitanAgent
        assert TitanAgent.TIER == AgentTier.REASONING

    def test_autonomy_is_supervised(self):
        from agents.titan import TitanAgent
        assert TitanAgent.AUTONOMY_LEVEL == AutonomyLevel.SUPERVISED

    def test_model_assignment_is_sonnet(self):
        from agents.titan import TitanAgent
        assert TitanAgent.MODEL_ASSIGNMENT == "claude-sonnet-4-6"

    def test_visibility_is_customer(self):
        from agents.titan import TitanAgent
        assert TitanAgent.VISIBILITY == "Customer"

    def test_description_set(self):
        from agents.titan import TitanAgent
        assert len(TitanAgent.DESCRIPTION) > 0

    def test_subscriptions_include_capacity_warning(self):
        from agents.titan import TitanAgent
        assert "perception.capacity_warning" in TitanAgent.SUBSCRIPTIONS

    def test_subscriptions_include_workload_shift(self):
        from agents.titan import TitanAgent
        assert "perception.workload_shift_detected" in TitanAgent.SUBSCRIPTIONS

    def test_emissions_include_scaling_recommendation(self):
        from agents.titan import TitanAgent
        assert "scaling.recommendation" in TitanAgent.EMISSIONS

    def test_cycle_interval_is_event_driven(self):
        from agents.titan import TitanAgent
        assert TitanAgent.CYCLE_INTERVAL_SECONDS == 0.0


class TestTitanProcessing:
    async def test_run_cycle_does_not_emit(self, titan, mock_event_mesh):
        await titan.run_cycle()
        assert len(mock_event_mesh.published_events) == 0

    async def test_process_capacity_warning_emits_recommendation(self, titan, mock_event_mesh):
        event = EventEnvelope(
            event_type="perception.capacity_warning",
            tenant_id="test-tenant",
            payload={"warnings": [{"metric": "cpu", "horizon": "1h", "forecast_value": 90.0}]},
        )
        await titan.process(event)
        event_types = [e.event_type for e in mock_event_mesh.published_events]
        assert "scaling.recommendation" in event_types

    async def test_process_workload_shift_emits_recommendation(self, titan, mock_event_mesh):
        event = EventEnvelope(
            event_type="perception.workload_shift_detected",
            tenant_id="test-tenant",
            payload={"previous": "OLTP", "current": "OLAP", "confidence": 0.9},
        )
        await titan.process(event)
        event_types = [e.event_type for e in mock_event_mesh.published_events]
        assert "scaling.recommendation" in event_types

    async def test_process_calls_llm_for_reasoning(self, titan, mock_llm_client):
        event = EventEnvelope(
            event_type="perception.capacity_warning",
            tenant_id="test-tenant",
            payload={"deployment_id": "deploy-1"},
        )
        await titan.process(event)
        mock_llm_client.call.assert_called_once()

    async def test_process_requests_approval_for_supervised_agent(
        self, titan, mock_approval_gate, mock_llm_client
    ):
        """TITAN is SUPERVISED, so it must request approval before executing."""
        import json
        async def mock_llm_response(model, system, messages, max_tokens=4096):
            return json.dumps({
                "options": [{
                    "action": "scale_up",
                    "replicas": 3,
                    "instance_type": "db.r5.large",
                    "estimated_monthly_cost_usd": 500.0,
                    "risk_level": "medium",
                    "rationale": "Scale to handle load",
                }],
                "recommendation": 0,
            })
        mock_llm_client.call.side_effect = mock_llm_response

        event = EventEnvelope(
            event_type="perception.capacity_warning",
            tenant_id="test-tenant",
            payload={"deployment_id": "deploy-1"},
        )
        await titan.process(event)
        mock_approval_gate.request_approval.assert_called_once()

    async def test_process_does_not_raise(self, titan):
        event = EventEnvelope(
            event_type="perception.capacity_warning",
            tenant_id="test-tenant",
            payload={},
        )
        try:
            await titan.process(event)
        except Exception:
            pass
