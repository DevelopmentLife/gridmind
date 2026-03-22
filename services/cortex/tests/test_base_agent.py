"""Tests for cortex.base_agent — BaseAgent ABC and AgentContext."""

from __future__ import annotations

import asyncio
from unittest.mock import AsyncMock, MagicMock

import pytest

from cortex.base_agent import AgentContext, BaseAgent
from cortex.models import AgentTier, AutonomyLevel, EventEnvelope, ToolDefinition


class StubAgent(BaseAgent):
    """Concrete agent stub for testing BaseAgent functionality."""

    AGENT_NAME = "stub"
    TIER = AgentTier.PERCEPTION
    AUTONOMY_LEVEL = AutonomyLevel.AUTONOMOUS
    MODEL_ASSIGNMENT = "deterministic"
    VISIBILITY = "Internal"
    DESCRIPTION = "Test stub agent"
    CYCLE_INTERVAL_SECONDS = 0.0
    TOOLS = [
        ToolDefinition(name="allowed_tool", description="An allowed tool", input_schema={}),
    ]
    SUBSCRIPTIONS = []
    EMISSIONS = ["perception.test_event"]

    async def process(self, event: EventEnvelope) -> None:
        pass

    async def run_cycle(self) -> None:
        pass


class TestBaseAgentHeartbeat:
    """Tests for heartbeat emission."""

    async def test_emit_heartbeat_publishes_event(self, make_agent_context, mock_event_mesh):
        """emit_heartbeat should publish an agent.heartbeat event."""
        ctx = make_agent_context()
        agent = StubAgent(ctx)
        await agent.emit_heartbeat()

        assert len(mock_event_mesh.published_events) == 1
        event = mock_event_mesh.published_events[0]
        assert event.event_type == "agent.heartbeat"
        assert event.source_agent == "stub"
        assert event.payload["agent_name"] == "stub"

    async def test_heartbeat_contains_metrics(self, make_agent_context, mock_event_mesh):
        """Heartbeat payload should include agent metrics."""
        ctx = make_agent_context()
        agent = StubAgent(ctx)
        await agent.emit_heartbeat()

        payload = mock_event_mesh.published_events[0].payload
        assert "metrics" in payload
        assert payload["metrics"]["events_processed"] == 0


class TestBaseAgentTierPermissions:
    """Tests for tier-based publish permission enforcement."""

    async def test_emit_allowed_event_type(self, make_agent_context, mock_event_mesh):
        """Agent should be able to emit events matching its tier permissions."""
        ctx = make_agent_context()
        agent = StubAgent(ctx)

        event = EventEnvelope(
            event_type="perception.test_event",
            tenant_id="test-tenant",
        )
        await agent._emit(event)

        assert len(mock_event_mesh.published_events) == 1

    async def test_emit_disallowed_event_type_raises(self, make_agent_context):
        """Agent should raise PermissionError for disallowed event types."""
        ctx = make_agent_context()
        agent = StubAgent(ctx)

        event = EventEnvelope(
            event_type="execution.forbidden_event",
            tenant_id="test-tenant",
        )
        with pytest.raises(PermissionError, match="cannot publish"):
            await agent._emit(event)

    async def test_emit_sets_source_agent(self, make_agent_context, mock_event_mesh):
        """_emit should set the source_agent field on the event."""
        ctx = make_agent_context()
        agent = StubAgent(ctx)

        event = EventEnvelope(
            event_type="perception.test_event",
            tenant_id="test-tenant",
        )
        await agent._emit(event)

        assert mock_event_mesh.published_events[0].source_agent == "stub"


class TestBaseAgentToolAllowlist:
    """Tests for tool invocation allowlist enforcement."""

    async def test_invoke_allowed_tool(self, make_agent_context):
        """Agent should be able to invoke tools in its allowlist."""
        ctx = make_agent_context()
        agent = StubAgent(ctx)

        # Register a handler for the allowed tool
        async def handler(**kwargs):
            return {"result": "ok"}

        agent._tool_handlers["allowed_tool"] = handler
        result = await agent._invoke_tool("allowed_tool")
        assert result == {"result": "ok"}

    async def test_invoke_disallowed_tool_raises(self, make_agent_context):
        """Agent should raise PermissionError for tools not in its allowlist."""
        ctx = make_agent_context()
        agent = StubAgent(ctx)

        with pytest.raises(PermissionError, match="not allowed"):
            await agent._invoke_tool("forbidden_tool")


class TestBaseAgentContext:
    """Tests for context get/set/delete via StateManager."""

    async def test_set_and_get_context(self, make_agent_context, mock_state_manager):
        """set_context followed by get_context should return the stored value."""
        ctx = make_agent_context()
        agent = StubAgent(ctx)

        await agent.set_context("key1", "value1")
        result = await agent.get_context("key1")
        assert result == "value1"

    async def test_delete_context(self, make_agent_context, mock_state_manager):
        """delete_context should remove the stored value."""
        ctx = make_agent_context()
        agent = StubAgent(ctx)

        await agent.set_context("key1", "value1")
        await agent.delete_context("key1")
        result = await agent.get_context("key1")
        assert result is None

    async def test_get_context_returns_none_for_missing(self, make_agent_context):
        """get_context should return None for keys that don't exist."""
        ctx = make_agent_context()
        agent = StubAgent(ctx)

        result = await agent.get_context("nonexistent")
        assert result is None


class TestBaseAgentApproval:
    """Tests for approval flow at each autonomy level."""

    async def test_autonomous_auto_approves(self, make_agent_context):
        """AUTONOMOUS agents should auto-approve without blocking."""
        ctx = make_agent_context()
        agent = StubAgent(ctx)
        agent.AUTONOMY_LEVEL = AutonomyLevel.AUTONOMOUS

        result = await agent._request_approval("test action", "low")
        assert result is True

    async def test_supervised_calls_approval_gate(self, make_agent_context, mock_approval_gate):
        """SUPERVISED agents should call the approval gate."""
        ctx = make_agent_context()
        agent = StubAgent(ctx)
        agent.AUTONOMY_LEVEL = AutonomyLevel.SUPERVISED

        result = await agent._request_approval("test action", "medium")
        assert result is True
        mock_approval_gate.request_approval.assert_called_once()

    async def test_advisory_raises_error(self, make_agent_context):
        """ADVISORY agents should raise AdvisoryOnlyError."""
        from cortex.approval import AdvisoryOnlyError

        ctx = make_agent_context()
        agent = StubAgent(ctx)
        agent.AUTONOMY_LEVEL = AutonomyLevel.ADVISORY

        with pytest.raises(AdvisoryOnlyError):
            await agent._request_approval("test action", "low")


class TestBaseAgentLifecycle:
    """Tests for agent start/stop lifecycle."""

    async def test_start_sets_running(self, make_agent_context):
        """start() should set _running to True."""
        ctx = make_agent_context()
        agent = StubAgent(ctx)

        await agent.start()
        assert agent._running is True
        await agent.stop()

    async def test_stop_sets_not_running(self, make_agent_context):
        """stop() should set _running to False."""
        ctx = make_agent_context()
        agent = StubAgent(ctx)

        await agent.start()
        await agent.stop()
        assert agent._running is False

    async def test_agent_id_includes_tenant(self, make_agent_context):
        """agent_id should combine agent name and tenant."""
        ctx = make_agent_context(tenant_id="acme")
        agent = StubAgent(ctx)
        assert agent.agent_id == "stub:acme"
