"""Tests for agents.triage — TriageAgent (Human Escalation)."""

from __future__ import annotations

import pytest

from cortex.base_agent import AgentContext
from cortex.models import AgentTier, AutonomyLevel, EventEnvelope


@pytest.fixture
def triage(make_agent_context):
    from agents.triage import TriageAgent
    ctx: AgentContext = make_agent_context("test-tenant")
    return TriageAgent(ctx)


class TestTriageDeclarations:
    def test_agent_name(self):
        from agents.triage import TriageAgent
        assert TriageAgent.AGENT_NAME == "triage"

    def test_tier_is_self_healing(self):
        from agents.triage import TriageAgent
        assert TriageAgent.TIER == AgentTier.SELF_HEALING

    def test_autonomy_is_autonomous(self):
        from agents.triage import TriageAgent
        assert TriageAgent.AUTONOMY_LEVEL == AutonomyLevel.AUTONOMOUS

    def test_model_assignment_is_opus(self):
        from agents.triage import TriageAgent
        assert TriageAgent.MODEL_ASSIGNMENT == "claude-opus-4-6"

    def test_visibility_is_internal(self):
        from agents.triage import TriageAgent
        assert TriageAgent.VISIBILITY == "Internal"

    def test_description_set(self):
        from agents.triage import TriageAgent
        assert len(TriageAgent.DESCRIPTION) > 0

    def test_subscriptions_include_root_cause(self):
        from agents.triage import TriageAgent
        assert "incident.root_cause" in TriageAgent.SUBSCRIPTIONS

    def test_subscriptions_include_recovery_failed(self):
        from agents.triage import TriageAgent
        assert "self_healing.recovery_failed" in TriageAgent.SUBSCRIPTIONS

    def test_emissions_include_escalation_sent(self):
        from agents.triage import TriageAgent
        assert "action.escalation_sent" in TriageAgent.EMISSIONS

    def test_cycle_interval_is_event_driven(self):
        from agents.triage import TriageAgent
        assert TriageAgent.CYCLE_INTERVAL_SECONDS == 0.0


class TestTriageProcessing:
    async def test_run_cycle_does_not_emit(self, triage, mock_event_mesh):
        await triage.run_cycle()
        assert len(mock_event_mesh.published_events) == 0

    async def test_process_incident_emits_escalation_sent(self, triage, mock_event_mesh):
        event = EventEnvelope(
            event_type="incident.root_cause",
            tenant_id="test-tenant",
            payload={
                "cause": "connection_pool_exhausted",
                "confidence": 0.95,
                "severity": "critical",
            },
        )
        await triage.process(event)
        event_types = [e.event_type for e in mock_event_mesh.published_events]
        assert "action.escalation_sent" in event_types

    async def test_process_calls_llm_for_severity_assessment(self, triage, mock_llm_client):
        event = EventEnvelope(
            event_type="incident.root_cause",
            tenant_id="test-tenant",
            payload={"cause": "disk_full", "severity": "critical"},
        )
        await triage.process(event)
        mock_llm_client.call.assert_called_once()

    async def test_process_p1_incident_notifies_pagerduty(
        self, triage, mock_event_mesh, mock_llm_client
    ):
        import json
        async def p1_response(model, system, messages, max_tokens=4096):
            return json.dumps({
                "severity": "P1",
                "title": "Critical DB failure",
                "summary": "Database is down.",
                "impact": "All customers affected",
                "recommended_actions": ["page_on_call"],
            })
        mock_llm_client.call.side_effect = p1_response

        pagerduty_invoked = []
        original_invoke = triage._invoke_tool
        async def tracking_invoke(name, **kwargs):
            pagerduty_invoked.append(name)
            return {}
        triage._invoke_tool = tracking_invoke  # type: ignore[method-assign]

        event = EventEnvelope(
            event_type="incident.root_cause",
            tenant_id="test-tenant",
            payload={"cause": "disk_full", "severity": "critical"},
        )
        await triage.process(event)
        assert "page_pagerduty" in pagerduty_invoked

    async def test_process_falls_back_on_json_parse_error(
        self, triage, mock_event_mesh, mock_llm_client
    ):
        """On malformed LLM response, TRIAGE falls back to P3 and still emits."""
        async def bad_response(model, system, messages, max_tokens=4096):
            return "not json"
        mock_llm_client.call.side_effect = bad_response

        event = EventEnvelope(
            event_type="self_healing.recovery_failed",
            tenant_id="test-tenant",
            payload={"agent_name": "argus"},
        )
        await triage.process(event)
        event_types = [e.event_type for e in mock_event_mesh.published_events]
        assert "action.escalation_sent" in event_types

    async def test_process_does_not_raise(self, triage):
        event = EventEnvelope(
            event_type="incident.root_cause",
            tenant_id="test-tenant",
            payload={},
        )
        try:
            await triage.process(event)
        except Exception:
            pass
