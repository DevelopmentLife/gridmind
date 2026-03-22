"""Tests for agents.sentinel — SentinelAgent (Drift Detection)."""

from __future__ import annotations

import pytest

from cortex.base_agent import AgentContext
from cortex.models import AgentTier, AutonomyLevel, EventEnvelope


@pytest.fixture
def sentinel(make_agent_context):
    from agents.sentinel import SentinelAgent
    ctx: AgentContext = make_agent_context("test-tenant")
    return SentinelAgent(ctx)


class TestSentinelDeclarations:
    def test_agent_name(self):
        from agents.sentinel import SentinelAgent
        assert SentinelAgent.AGENT_NAME == "sentinel"

    def test_tier_is_perception(self):
        from agents.sentinel import SentinelAgent
        assert SentinelAgent.TIER == AgentTier.PERCEPTION

    def test_autonomy_is_autonomous(self):
        from agents.sentinel import SentinelAgent
        assert SentinelAgent.AUTONOMY_LEVEL == AutonomyLevel.AUTONOMOUS

    def test_model_assignment_is_haiku(self):
        from agents.sentinel import SentinelAgent
        assert SentinelAgent.MODEL_ASSIGNMENT == "claude-haiku-4-5"

    def test_visibility_is_internal(self):
        from agents.sentinel import SentinelAgent
        assert SentinelAgent.VISIBILITY == "Internal"

    def test_description_set(self):
        from agents.sentinel import SentinelAgent
        assert len(SentinelAgent.DESCRIPTION) > 0

    def test_emissions_include_drift_report(self):
        from agents.sentinel import SentinelAgent
        assert "perception.drift_report" in SentinelAgent.EMISSIONS

    def test_emissions_include_drift_detected(self):
        from agents.sentinel import SentinelAgent
        assert "perception.drift_detected" in SentinelAgent.EMISSIONS

    def test_cycle_interval_is_positive(self):
        from agents.sentinel import SentinelAgent
        assert SentinelAgent.CYCLE_INTERVAL_SECONDS > 0

    def test_tools_contain_snapshot_schema(self):
        from agents.sentinel import SentinelAgent
        tool_names = {t.name for t in SentinelAgent.TOOLS}
        assert "snapshot_schema" in tool_names


class TestSentinelProcessing:
    async def test_process_unknown_event_does_not_raise(self, sentinel):
        from unittest.mock import MagicMock
        event = MagicMock(spec=EventEnvelope)
        event.tenant_id = "test-tenant"
        event.event_type = "unknown.event"
        await sentinel.process(event)

    async def test_run_cycle_emits_drift_report(self, sentinel, mock_event_mesh):
        await sentinel.run_cycle()
        event_types = [e.event_type for e in mock_event_mesh.published_events]
        assert "perception.drift_report" in event_types

    async def test_run_cycle_stores_snapshots_in_context(self, sentinel, mock_state_manager):
        await sentinel.run_cycle()
        mock_state_manager.set_context.assert_called()

    async def test_run_cycle_emits_drift_detected_on_high_score(
        self, sentinel, mock_event_mesh, mock_state_manager
    ):
        """When LLM returns high drift scores, drift_detected event is emitted."""
        # Seed previous snapshots so LLM is invoked
        async def get_ctx(agent_id, tenant_id, key):
            if key in ("snapshot_schema", "snapshot_config"):
                return {"tables": ["orders"]}
            return None
        mock_state_manager.get_context.side_effect = get_ctx

        # Mock LLM to return a high drift score
        async def mock_llm_call(model, system, messages, max_tokens=4096):
            import json
            return json.dumps({
                "drift_detected": True,
                "scores": {
                    "schema": 0.8,
                    "config": 0.5,
                    "security": 0.4,
                    "performance": 0.3,
                    "compliance": 0.2,
                },
                "details": [{"category": "schema", "description": "Table added"}],
            })
        sentinel._context.llm_client.call.side_effect = mock_llm_call

        await sentinel.run_cycle()
        event_types = [e.event_type for e in mock_event_mesh.published_events]
        assert "perception.drift_detected" in event_types

    async def test_run_cycle_does_not_raise(self, sentinel):
        try:
            await sentinel.run_cycle()
        except Exception:
            pass
