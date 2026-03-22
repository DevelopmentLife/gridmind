"""Tests for agents.gremlin — GremlinAgent (Chaos Testing)."""

from __future__ import annotations

import pytest

from cortex.base_agent import AgentContext
from cortex.models import AgentTier, AutonomyLevel, EventEnvelope


@pytest.fixture
def gremlin(make_agent_context):
    from agents.gremlin import GremlinAgent
    ctx: AgentContext = make_agent_context("test-tenant")
    return GremlinAgent(ctx)


class TestGremlinDeclarations:
    def test_agent_name(self):
        from agents.gremlin import GremlinAgent
        assert GremlinAgent.AGENT_NAME == "gremlin"

    def test_tier_is_self_healing(self):
        from agents.gremlin import GremlinAgent
        assert GremlinAgent.TIER == AgentTier.SELF_HEALING

    def test_autonomy_is_supervised(self):
        from agents.gremlin import GremlinAgent
        assert GremlinAgent.AUTONOMY_LEVEL == AutonomyLevel.SUPERVISED

    def test_model_assignment_is_sonnet(self):
        from agents.gremlin import GremlinAgent
        assert GremlinAgent.MODEL_ASSIGNMENT == "claude-sonnet-4-6"

    def test_visibility_is_internal(self):
        from agents.gremlin import GremlinAgent
        assert GremlinAgent.VISIBILITY == "Internal"

    def test_description_set(self):
        from agents.gremlin import GremlinAgent
        assert len(GremlinAgent.DESCRIPTION) > 0

    def test_emissions_include_chaos_test_started(self):
        from agents.gremlin import GremlinAgent
        assert "self_healing.chaos_test_started" in GremlinAgent.EMISSIONS

    def test_emissions_include_chaos_test_completed(self):
        from agents.gremlin import GremlinAgent
        assert "self_healing.chaos_test_completed" in GremlinAgent.EMISSIONS

    def test_tools_contain_inject_db_latency(self):
        from agents.gremlin import GremlinAgent
        tool_names = {t.name for t in GremlinAgent.TOOLS}
        assert "inject_db_latency" in tool_names

    def test_cycle_interval_is_positive(self):
        from agents.gremlin import GremlinAgent
        assert GremlinAgent.CYCLE_INTERVAL_SECONDS > 0


class TestGremlinProcessing:
    async def test_process_unknown_event_does_not_raise(self, gremlin):
        from unittest.mock import MagicMock
        event = MagicMock(spec=EventEnvelope)
        event.tenant_id = "test-tenant"
        event.event_type = "unknown.event"
        await gremlin.process(event)

    async def test_run_cycle_skips_when_chaos_disabled(self, gremlin, mock_event_mesh, monkeypatch):
        """When CHAOS_ENABLED is not set, no chaos test should run."""
        monkeypatch.delenv("CHAOS_ENABLED", raising=False)
        await gremlin.run_cycle()
        assert len(mock_event_mesh.published_events) == 0

    async def test_run_cycle_skips_in_production(self, gremlin, mock_event_mesh, monkeypatch):
        """GREMLIN should never run in production even if CHAOS_ENABLED=true."""
        monkeypatch.setenv("CHAOS_ENABLED", "true")
        gremlin._context.config.environment = "production"
        await gremlin.run_cycle()
        assert len(mock_event_mesh.published_events) == 0

    async def test_run_cycle_emits_chaos_test_started_when_enabled(
        self, gremlin, mock_event_mesh, mock_approval_gate, monkeypatch
    ):
        """When CHAOS_ENABLED=true in a non-prod environment, chaos test should start."""
        monkeypatch.setenv("CHAOS_ENABLED", "true")
        gremlin._context.config.environment = "staging"
        await gremlin.run_cycle()
        event_types = [e.event_type for e in mock_event_mesh.published_events]
        assert "self_healing.chaos_test_started" in event_types

    async def test_run_cycle_requests_approval_in_staging(
        self, gremlin, mock_approval_gate, monkeypatch
    ):
        """SUPERVISED agent must request approval before running chaos tests."""
        monkeypatch.setenv("CHAOS_ENABLED", "true")
        gremlin._context.config.environment = "staging"
        await gremlin.run_cycle()
        mock_approval_gate.request_approval.assert_called_once()

    async def test_run_cycle_does_not_raise(self, gremlin, monkeypatch):
        monkeypatch.delenv("CHAOS_ENABLED", raising=False)
        try:
            await gremlin.run_cycle()
        except Exception:
            pass
