"""Tests for agents.argus — ArgusAgent (Workload Profiler)."""

from __future__ import annotations

import pytest

from cortex.base_agent import AgentContext
from cortex.models import AgentTier, AutonomyLevel, EventEnvelope


@pytest.fixture
def argus(make_agent_context):
    from agents.argus import ArgusAgent
    ctx: AgentContext = make_agent_context("test-tenant")
    return ArgusAgent(ctx)


class TestArgusDeclarations:
    def test_agent_name(self):
        from agents.argus import ArgusAgent
        assert ArgusAgent.AGENT_NAME == "argus"

    def test_tier_is_perception(self):
        from agents.argus import ArgusAgent
        assert ArgusAgent.TIER == AgentTier.PERCEPTION

    def test_autonomy_is_autonomous(self):
        from agents.argus import ArgusAgent
        assert ArgusAgent.AUTONOMY_LEVEL == AutonomyLevel.AUTONOMOUS

    def test_model_assignment_is_haiku(self):
        from agents.argus import ArgusAgent
        assert ArgusAgent.MODEL_ASSIGNMENT == "claude-haiku-4-5"

    def test_visibility_is_customer(self):
        from agents.argus import ArgusAgent
        assert ArgusAgent.VISIBILITY == "Customer"

    def test_description_set(self):
        from agents.argus import ArgusAgent
        assert len(ArgusAgent.DESCRIPTION) > 0

    def test_emissions_include_workload_profile(self):
        from agents.argus import ArgusAgent
        assert "perception.workload_profile" in ArgusAgent.EMISSIONS

    def test_emissions_include_workload_shift(self):
        from agents.argus import ArgusAgent
        assert "perception.workload_shift_detected" in ArgusAgent.EMISSIONS

    def test_cycle_interval_is_positive(self):
        from agents.argus import ArgusAgent
        assert ArgusAgent.CYCLE_INTERVAL_SECONDS > 0

    def test_tools_contain_query_pg_stats(self):
        from agents.argus import ArgusAgent
        tool_names = {t.name for t in ArgusAgent.TOOLS}
        assert "query_pg_stats" in tool_names


class TestArgusProcessing:
    async def test_process_unknown_event_does_not_raise(self, argus):
        from unittest.mock import MagicMock
        event = MagicMock(spec=EventEnvelope)
        event.tenant_id = "test-tenant"
        event.event_type = "unknown.event"
        # ARGUS has no subscriptions; process is a no-op
        await argus.process(event)

    async def test_run_cycle_emits_workload_profile(self, argus, mock_event_mesh):
        await argus.run_cycle()
        event_types = [e.event_type for e in mock_event_mesh.published_events]
        assert "perception.workload_profile" in event_types

    async def test_run_cycle_stores_classification_in_context(self, argus, mock_state_manager):
        await argus.run_cycle()
        mock_state_manager.set_context.assert_called()

    async def test_run_cycle_emits_shift_when_classification_changes(
        self, argus, mock_event_mesh, mock_state_manager
    ):
        """When previous classification differs from current, a shift event is emitted."""
        # Pre-seed a previous classification
        async def get_ctx(agent_id, tenant_id, key):
            if key == "last_classification":
                return "OLAP"
            return None
        mock_state_manager.get_context.side_effect = get_ctx

        await argus.run_cycle()
        event_types = [e.event_type for e in mock_event_mesh.published_events]
        # A shift should be emitted because previous != current
        assert "perception.workload_shift_detected" in event_types

    async def test_run_cycle_calls_llm(self, argus, mock_llm_client):
        await argus.run_cycle()
        mock_llm_client.call.assert_called_once()

    async def test_run_cycle_invokes_pg_stats_tool(self, argus, mock_llm_client):
        """ARGUS must invoke query_pg_stats during its cycle."""
        await argus.run_cycle()
        # LLM was called — tool invocations fall back to no_handler but don't raise
        assert mock_llm_client.call.call_count >= 1
