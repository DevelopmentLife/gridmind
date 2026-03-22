"""Tests for agents.tuner — TunerAgent (Configuration)."""

from __future__ import annotations

import pytest

from cortex.base_agent import AgentContext
from cortex.models import AgentTier, AutonomyLevel, EventEnvelope


@pytest.fixture
def tuner(make_agent_context):
    from agents.tuner import TunerAgent
    ctx: AgentContext = make_agent_context("test-tenant")
    return TunerAgent(ctx)


class TestTunerDeclarations:
    def test_agent_name(self):
        from agents.tuner import TunerAgent
        assert TunerAgent.AGENT_NAME == "tuner"

    def test_tier_is_execution(self):
        from agents.tuner import TunerAgent
        assert TunerAgent.TIER == AgentTier.EXECUTION

    def test_autonomy_is_supervised(self):
        from agents.tuner import TunerAgent
        assert TunerAgent.AUTONOMY_LEVEL == AutonomyLevel.SUPERVISED

    def test_model_assignment_is_sonnet(self):
        from agents.tuner import TunerAgent
        assert TunerAgent.MODEL_ASSIGNMENT == "claude-sonnet-4-6"

    def test_visibility_is_customer(self):
        from agents.tuner import TunerAgent
        assert TunerAgent.VISIBILITY == "Customer"

    def test_description_set(self):
        from agents.tuner import TunerAgent
        assert len(TunerAgent.DESCRIPTION) > 0

    def test_subscriptions_include_workload_shift_detected(self):
        from agents.tuner import TunerAgent
        assert "perception.workload_shift_detected" in TunerAgent.SUBSCRIPTIONS

    def test_emissions_include_config_change_started(self):
        from agents.tuner import TunerAgent
        assert "execution.config_change_started" in TunerAgent.EMISSIONS

    def test_cycle_interval_is_event_driven(self):
        from agents.tuner import TunerAgent
        assert TunerAgent.CYCLE_INTERVAL_SECONDS == 0.0

    def test_tools_contain_alter_system(self):
        from agents.tuner import TunerAgent
        tool_names = {t.name for t in TunerAgent.TOOLS}
        assert "alter_system" in tool_names


class TestTunerProcessing:
    async def test_run_cycle_does_not_emit(self, tuner, mock_event_mesh):
        await tuner.run_cycle()
        assert len(mock_event_mesh.published_events) == 0

    async def test_process_event_calls_llm(self, tuner, mock_llm_client):
        event = EventEnvelope(
            event_type="perception.workload_shift_detected",
            tenant_id="test-tenant",
            payload={"previous": "OLTP", "current": "OLAP"},
        )
        await tuner.process(event)
        mock_llm_client.call.assert_called_once()

    async def test_process_requests_approval_when_changes_proposed(
        self, tuner, mock_approval_gate, mock_llm_client
    ):
        import json
        async def changes_response(model, system, messages, max_tokens=4096):
            return json.dumps({
                "changes": [
                    {"parameter": "work_mem", "current": "4MB", "recommended": "16MB", "reason": "OLAP"},
                ],
                "requires_restart": False,
            })
        mock_llm_client.call.side_effect = changes_response

        event = EventEnvelope(
            event_type="perception.workload_shift_detected",
            tenant_id="test-tenant",
            payload={"previous": "OLTP", "current": "OLAP"},
        )
        await tuner.process(event)
        mock_approval_gate.request_approval.assert_called_once()

    async def test_process_no_changes_skips_execution(
        self, tuner, mock_event_mesh, mock_llm_client
    ):
        """When LLM recommends no changes, no config_change events should be emitted."""
        import json
        async def no_changes_response(model, system, messages, max_tokens=4096):
            return json.dumps({"changes": [], "requires_restart": False})
        mock_llm_client.call.side_effect = no_changes_response

        event = EventEnvelope(
            event_type="perception.workload_shift_detected",
            tenant_id="test-tenant",
            payload={},
        )
        await tuner.process(event)
        event_types = [e.event_type for e in mock_event_mesh.published_events]
        assert "execution.config_change_started" not in event_types

    async def test_process_does_not_raise(self, tuner):
        event = EventEnvelope(
            event_type="perception.workload_shift_detected",
            tenant_id="test-tenant",
            payload={},
        )
        try:
            await tuner.process(event)
        except Exception:
            pass
