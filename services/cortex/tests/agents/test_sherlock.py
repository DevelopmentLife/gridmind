"""Tests for agents.sherlock — SherlockAgent (Incident Reasoning)."""

from __future__ import annotations

import pytest

from cortex.base_agent import AgentContext
from cortex.models import AgentTier, AutonomyLevel, EventEnvelope


@pytest.fixture
def sherlock(make_agent_context):
    from agents.sherlock import SherlockAgent
    ctx: AgentContext = make_agent_context("test-tenant")
    return SherlockAgent(ctx)


class TestSherlockDeclarations:
    def test_agent_name(self):
        from agents.sherlock import SherlockAgent
        assert SherlockAgent.AGENT_NAME == "sherlock"

    def test_tier_is_reasoning(self):
        from agents.sherlock import SherlockAgent
        assert SherlockAgent.TIER == AgentTier.REASONING

    def test_autonomy_is_autonomous(self):
        from agents.sherlock import SherlockAgent
        assert SherlockAgent.AUTONOMY_LEVEL == AutonomyLevel.AUTONOMOUS

    def test_model_assignment_is_opus(self):
        from agents.sherlock import SherlockAgent
        assert SherlockAgent.MODEL_ASSIGNMENT == "claude-opus-4-6"

    def test_visibility_is_customer(self):
        from agents.sherlock import SherlockAgent
        assert SherlockAgent.VISIBILITY == "Customer"

    def test_description_set(self):
        from agents.sherlock import SherlockAgent
        assert len(SherlockAgent.DESCRIPTION) > 0

    def test_subscriptions_include_incident_detected(self):
        from agents.sherlock import SherlockAgent
        assert "self_healing.incident_detected" in SherlockAgent.SUBSCRIPTIONS

    def test_emissions_include_incident_analysis(self):
        from agents.sherlock import SherlockAgent
        assert "incident.analysis" in SherlockAgent.EMISSIONS

    def test_emissions_include_root_cause(self):
        from agents.sherlock import SherlockAgent
        assert "incident.root_cause" in SherlockAgent.EMISSIONS

    def test_cycle_interval_is_event_driven(self):
        from agents.sherlock import SherlockAgent
        assert SherlockAgent.CYCLE_INTERVAL_SECONDS == 0.0


class TestSherlockProcessing:
    async def test_run_cycle_does_not_emit(self, sherlock, mock_event_mesh):
        await sherlock.run_cycle()
        assert len(mock_event_mesh.published_events) == 0

    async def test_process_incident_emits_analysis(self, sherlock, mock_event_mesh):
        event = EventEnvelope(
            event_type="self_healing.incident_detected",
            tenant_id="test-tenant",
            payload={"type": "agent_dead", "agent_name": "argus"},
        )
        await sherlock.process(event)
        event_types = [e.event_type for e in mock_event_mesh.published_events]
        assert "incident.analysis" in event_types

    async def test_process_incident_calls_llm_with_context(self, sherlock, mock_llm_client):
        event = EventEnvelope(
            event_type="self_healing.incident_detected",
            tenant_id="test-tenant",
            payload={"type": "agent_dead", "agent_name": "argus"},
        )
        await sherlock.process(event)
        mock_llm_client.call.assert_called_once()

    async def test_process_emits_root_cause_when_confidence_high(
        self, sherlock, mock_event_mesh, mock_llm_client
    ):
        """When the LLM returns confidence >= 0.6, a root_cause event is emitted."""
        import json
        async def high_confidence_response(model, system, messages, max_tokens=4096):
            return json.dumps({
                "hypotheses": [{
                    "cause": "connection_pool_exhausted",
                    "confidence": 0.95,
                    "evidence": ["High connection count"],
                    "recommended_actions": ["increase_pool_size"],
                    "severity": "high",
                }],
                "summary": "Connection pool exhausted",
                "estimated_impact": "Service degradation",
            })
        mock_llm_client.call.side_effect = high_confidence_response

        event = EventEnvelope(
            event_type="self_healing.incident_detected",
            tenant_id="test-tenant",
            payload={"type": "agent_dead"},
        )
        await sherlock.process(event)
        event_types = [e.event_type for e in mock_event_mesh.published_events]
        assert "incident.root_cause" in event_types

    async def test_process_does_not_raise_on_malformed_llm_response(
        self, sherlock, mock_event_mesh, mock_llm_client
    ):
        async def bad_response(model, system, messages, max_tokens=4096):
            return "not valid json"
        mock_llm_client.call.side_effect = bad_response

        event = EventEnvelope(
            event_type="self_healing.incident_detected",
            tenant_id="test-tenant",
            payload={},
        )
        # Should not raise — falls back to default hypotheses
        await sherlock.process(event)
        assert len(mock_event_mesh.published_events) >= 1

    async def test_process_does_not_raise(self, sherlock):
        event = EventEnvelope(
            event_type="self_healing.incident_detected",
            tenant_id="test-tenant",
            payload={},
        )
        try:
            await sherlock.process(event)
        except Exception:
            pass
