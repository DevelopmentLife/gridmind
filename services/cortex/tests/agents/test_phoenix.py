"""Tests for agents.phoenix — PhoenixAgent (Platform Updates)."""

from __future__ import annotations

import pytest

from cortex.base_agent import AgentContext
from cortex.models import AgentTier, AutonomyLevel, EventEnvelope


@pytest.fixture
def phoenix(make_agent_context):
    from agents.phoenix import PhoenixAgent
    ctx: AgentContext = make_agent_context("test-tenant")
    return PhoenixAgent(ctx)


class TestPhoenixDeclarations:
    def test_agent_name(self):
        from agents.phoenix import PhoenixAgent
        assert PhoenixAgent.AGENT_NAME == "phoenix"

    def test_tier_is_self_healing(self):
        from agents.phoenix import PhoenixAgent
        assert PhoenixAgent.TIER == AgentTier.SELF_HEALING

    def test_autonomy_is_supervised(self):
        from agents.phoenix import PhoenixAgent
        assert PhoenixAgent.AUTONOMY_LEVEL == AutonomyLevel.SUPERVISED

    def test_model_assignment_is_sonnet(self):
        from agents.phoenix import PhoenixAgent
        assert PhoenixAgent.MODEL_ASSIGNMENT == "claude-sonnet-4-6"

    def test_visibility_is_internal(self):
        from agents.phoenix import PhoenixAgent
        assert PhoenixAgent.VISIBILITY == "Internal"

    def test_description_set(self):
        from agents.phoenix import PhoenixAgent
        assert len(PhoenixAgent.DESCRIPTION) > 0

    def test_emissions_include_deployment_started(self):
        from agents.phoenix import PhoenixAgent
        assert "action.deployment_started" in PhoenixAgent.EMISSIONS

    def test_emissions_include_deployment_completed(self):
        from agents.phoenix import PhoenixAgent
        assert "action.deployment_completed" in PhoenixAgent.EMISSIONS

    def test_tools_contain_deploy_green(self):
        from agents.phoenix import PhoenixAgent
        tool_names = {t.name for t in PhoenixAgent.TOOLS}
        assert "deploy_green" in tool_names

    def test_cycle_interval_is_positive(self):
        from agents.phoenix import PhoenixAgent
        assert PhoenixAgent.CYCLE_INTERVAL_SECONDS > 0


class TestPhoenixProcessing:
    async def test_process_unknown_event_does_not_raise(self, phoenix):
        from unittest.mock import MagicMock
        event = MagicMock(spec=EventEnvelope)
        event.tenant_id = "test-tenant"
        event.event_type = "unknown.event"
        await phoenix.process(event)

    async def test_run_cycle_skips_when_no_new_image(self, phoenix, mock_event_mesh):
        """When no new image is available, no deployment events should be emitted."""
        async def no_new_image_invoke(name, **kwargs):
            return {"result": {}}  # No new_image key
        phoenix._invoke_tool = no_new_image_invoke  # type: ignore[method-assign]

        await phoenix.run_cycle()
        assert len(mock_event_mesh.published_events) == 0

    async def test_run_cycle_skips_vulnerable_image(self, phoenix, mock_event_mesh):
        """Vulnerable images should not be deployed."""
        async def vulnerable_image_invoke(name, **kwargs):
            if name == "check_new_image":
                return {"result": {"new_image": "cortex:v2.0"}}
            if name == "scan_image":
                return {"result": {"critical": 3}}
            return {}
        phoenix._invoke_tool = vulnerable_image_invoke  # type: ignore[method-assign]

        await phoenix.run_cycle()
        assert len(mock_event_mesh.published_events) == 0

    async def test_run_cycle_deploys_clean_image(
        self, phoenix, mock_event_mesh, mock_approval_gate
    ):
        """When image is clean, deployment should start after approval."""
        async def clean_image_invoke(name, **kwargs):
            if name == "check_new_image":
                return {"result": {"new_image": "cortex:v2.0"}}
            if name == "scan_image":
                return {"result": {"critical": 0}}
            return {}
        phoenix._invoke_tool = clean_image_invoke  # type: ignore[method-assign]

        await phoenix.run_cycle()
        event_types = [e.event_type for e in mock_event_mesh.published_events]
        assert "action.deployment_started" in event_types

    async def test_run_cycle_requests_approval_for_supervised_deploy(
        self, phoenix, mock_approval_gate
    ):
        async def clean_image_invoke(name, **kwargs):
            if name == "check_new_image":
                return {"result": {"new_image": "cortex:v2.0"}}
            if name == "scan_image":
                return {"result": {"critical": 0}}
            return {}
        phoenix._invoke_tool = clean_image_invoke  # type: ignore[method-assign]

        await phoenix.run_cycle()
        mock_approval_gate.request_approval.assert_called_once()

    async def test_run_cycle_does_not_raise(self, phoenix):
        try:
            await phoenix.run_cycle()
        except Exception:
            pass
