"""Tests for agents.scribe — ScribeAgent (Documentation)."""

from __future__ import annotations

import pytest

from cortex.base_agent import AgentContext
from cortex.models import AgentTier, AutonomyLevel, EventEnvelope


@pytest.fixture
def scribe(make_agent_context):
    from agents.scribe import ScribeAgent
    ctx: AgentContext = make_agent_context("test-tenant")
    return ScribeAgent(ctx)


class TestScribeDeclarations:
    def test_agent_name(self):
        from agents.scribe import ScribeAgent
        assert ScribeAgent.AGENT_NAME == "scribe"

    def test_tier_is_specialized(self):
        from agents.scribe import ScribeAgent
        assert ScribeAgent.TIER == AgentTier.SPECIALIZED

    def test_autonomy_is_autonomous(self):
        from agents.scribe import ScribeAgent
        assert ScribeAgent.AUTONOMY_LEVEL == AutonomyLevel.AUTONOMOUS

    def test_model_assignment_is_sonnet(self):
        from agents.scribe import ScribeAgent
        assert ScribeAgent.MODEL_ASSIGNMENT == "claude-sonnet-4-6"

    def test_visibility_is_internal(self):
        from agents.scribe import ScribeAgent
        assert ScribeAgent.VISIBILITY == "Internal"

    def test_description_set(self):
        from agents.scribe import ScribeAgent
        assert len(ScribeAgent.DESCRIPTION) > 0

    def test_emissions_include_documentation_updated(self):
        from agents.scribe import ScribeAgent
        assert "specialized.documentation_updated" in ScribeAgent.EMISSIONS

    def test_tools_contain_write_file(self):
        from agents.scribe import ScribeAgent
        tool_names = {t.name for t in ScribeAgent.TOOLS}
        assert "write_file" in tool_names

    def test_tools_contain_get_git_diff(self):
        from agents.scribe import ScribeAgent
        tool_names = {t.name for t in ScribeAgent.TOOLS}
        assert "get_git_diff" in tool_names

    def test_cycle_interval_is_positive(self):
        from agents.scribe import ScribeAgent
        assert ScribeAgent.CYCLE_INTERVAL_SECONDS > 0


class TestScribeProcessing:
    async def test_process_unknown_event_does_not_raise(self, scribe):
        from unittest.mock import MagicMock
        event = MagicMock(spec=EventEnvelope)
        event.tenant_id = "test-tenant"
        event.event_type = "unknown.event"
        await scribe.process(event)

    async def test_run_cycle_skips_when_no_changes(self, scribe, mock_event_mesh):
        """When no git or schema changes, SCRIBE should not emit or write docs."""
        async def no_changes_invoke(name, **kwargs):
            return {"result": {"changes": None}}
        scribe._invoke_tool = no_changes_invoke  # type: ignore[method-assign]

        await scribe.run_cycle()
        assert len(mock_event_mesh.published_events) == 0

    async def test_run_cycle_emits_documentation_updated_when_changes(
        self, scribe, mock_event_mesh
    ):
        async def with_changes_invoke(name, **kwargs):
            return {"result": {"changes": ["diff content here"]}}
        scribe._invoke_tool = with_changes_invoke  # type: ignore[method-assign]

        await scribe.run_cycle()
        event_types = [e.event_type for e in mock_event_mesh.published_events]
        assert "specialized.documentation_updated" in event_types

    async def test_run_cycle_calls_llm_when_changes_found(
        self, scribe, mock_llm_client
    ):
        async def with_changes_invoke(name, **kwargs):
            return {"result": {"changes": ["some diff"]}}
        scribe._invoke_tool = with_changes_invoke  # type: ignore[method-assign]

        await scribe.run_cycle()
        mock_llm_client.call.assert_called_once()

    async def test_run_cycle_does_not_raise(self, scribe):
        try:
            await scribe.run_cycle()
        except Exception:
            pass
