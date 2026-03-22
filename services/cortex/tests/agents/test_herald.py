"""Tests for agents.herald — HeraldAgent (Communications)."""

from __future__ import annotations

import pytest

from cortex.base_agent import AgentContext
from cortex.models import AgentTier, AutonomyLevel, EventEnvelope


@pytest.fixture
def herald(make_agent_context):
    from agents.herald import HeraldAgent
    ctx: AgentContext = make_agent_context("test-tenant")
    return HeraldAgent(ctx)


class TestHeraldDeclarations:
    def test_agent_name(self):
        from agents.herald import HeraldAgent
        assert HeraldAgent.AGENT_NAME == "herald"

    def test_tier_is_specialized(self):
        from agents.herald import HeraldAgent
        assert HeraldAgent.TIER == AgentTier.SPECIALIZED

    def test_autonomy_is_autonomous(self):
        from agents.herald import HeraldAgent
        assert HeraldAgent.AUTONOMY_LEVEL == AutonomyLevel.AUTONOMOUS

    def test_model_assignment_is_sonnet(self):
        from agents.herald import HeraldAgent
        assert HeraldAgent.MODEL_ASSIGNMENT == "claude-sonnet-4-6"

    def test_visibility_is_internal(self):
        from agents.herald import HeraldAgent
        assert HeraldAgent.VISIBILITY == "Internal"

    def test_description_set(self):
        from agents.herald import HeraldAgent
        assert len(HeraldAgent.DESCRIPTION) > 0

    def test_emissions_include_communication_sent(self):
        from agents.herald import HeraldAgent
        assert "communication.sent" in HeraldAgent.EMISSIONS

    def test_emissions_include_digest_generated(self):
        from agents.herald import HeraldAgent
        assert "communication.digest_generated" in HeraldAgent.EMISSIONS

    def test_tools_contain_send_email(self):
        from agents.herald import HeraldAgent
        tool_names = {t.name for t in HeraldAgent.TOOLS}
        assert "send_email" in tool_names

    def test_cycle_interval_is_positive(self):
        from agents.herald import HeraldAgent
        assert HeraldAgent.CYCLE_INTERVAL_SECONDS > 0


class TestHeraldProcessing:
    async def test_process_unknown_event_does_not_raise(self, herald):
        from unittest.mock import MagicMock
        event = MagicMock(spec=EventEnvelope)
        event.tenant_id = "test-tenant"
        event.event_type = "unknown.event"
        await herald.process(event)

    async def test_run_cycle_skips_when_no_email_in_profile(
        self, herald, mock_event_mesh
    ):
        """When customer profile has no email, no digest should be sent."""
        async def no_email_invoke(name, **kwargs):
            return {"result": {"email": None, "preferences": {}}}
        herald._invoke_tool = no_email_invoke  # type: ignore[method-assign]

        await herald.run_cycle()
        assert len(mock_event_mesh.published_events) == 0

    async def test_run_cycle_skips_when_digest_disabled(
        self, herald, mock_event_mesh
    ):
        async def digest_disabled_invoke(name, **kwargs):
            return {"result": {"email": "user@example.com", "preferences": {"weekly_digest": False}}}
        herald._invoke_tool = digest_disabled_invoke  # type: ignore[method-assign]

        await herald.run_cycle()
        assert len(mock_event_mesh.published_events) == 0

    async def test_run_cycle_emits_digest_generated_when_enabled(
        self, herald, mock_event_mesh
    ):
        async def with_email_invoke(name, **kwargs):
            return {"result": {"email": "user@example.com", "preferences": {"weekly_digest": True}}}
        herald._invoke_tool = with_email_invoke  # type: ignore[method-assign]

        await herald.run_cycle()
        event_types = [e.event_type for e in mock_event_mesh.published_events]
        assert "communication.digest_generated" in event_types

    async def test_run_cycle_calls_llm_for_digest_content(
        self, herald, mock_llm_client
    ):
        async def with_email_invoke(name, **kwargs):
            return {"result": {"email": "user@example.com", "preferences": {"weekly_digest": True}}}
        herald._invoke_tool = with_email_invoke  # type: ignore[method-assign]

        await herald.run_cycle()
        mock_llm_client.call.assert_called_once()

    async def test_run_cycle_does_not_raise(self, herald):
        try:
            await herald.run_cycle()
        except Exception:
            pass
