"""Tests for cortex.runtime — CortexRuntime lifecycle manager."""

from __future__ import annotations

import asyncio
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from cortex.base_agent import AgentContext, BaseAgent
from cortex.config import CortexConfig
from cortex.models import AgentTier, AutonomyLevel, EventEnvelope, ToolDefinition
from cortex.runtime import CortexRuntime


class DummyAgent(BaseAgent):
    """Minimal agent for runtime testing."""

    AGENT_NAME = "dummy"
    TIER = AgentTier.PERCEPTION
    AUTONOMY_LEVEL = AutonomyLevel.AUTONOMOUS
    MODEL_ASSIGNMENT = "deterministic"
    VISIBILITY = "Internal"
    DESCRIPTION = "Dummy agent for tests"
    CYCLE_INTERVAL_SECONDS = 0.0
    TOOLS: list[ToolDefinition] = []
    SUBSCRIPTIONS: list[str] = []
    EMISSIONS: list[str] = []

    async def process(self, event: EventEnvelope) -> None:
        pass

    async def run_cycle(self) -> None:
        pass


class TestCortexRuntimeFromEnv:
    """Tests for CortexRuntime.from_env()."""

    def test_from_env_creates_instance(self):
        """from_env() should return a CortexRuntime with default config."""
        runtime = CortexRuntime.from_env()
        assert isinstance(runtime, CortexRuntime)

    def test_from_env_uses_default_config(self):
        """from_env() should use CortexConfig defaults."""
        runtime = CortexRuntime.from_env()
        assert runtime._config.environment == "development"


class TestCortexRuntimeRegister:
    """Tests for CortexRuntime.register()."""

    def test_register_adds_agent_class(self):
        """register() should add the agent class to the registry."""
        config = CortexConfig(
            nats_url="nats://localhost:4222",
            database_url="postgresql://test@localhost/test",
            redis_url="redis://localhost:6379/0",
        )
        runtime = CortexRuntime(config)
        result = runtime.register(DummyAgent)

        assert DummyAgent in runtime._agent_classes
        assert result is runtime  # Fluent API

    def test_register_fluent_chaining(self):
        """register() should return self for fluent chaining."""
        config = CortexConfig(
            nats_url="nats://localhost:4222",
            database_url="postgresql://test@localhost/test",
            redis_url="redis://localhost:6379/0",
        )
        runtime = CortexRuntime(config)
        result = runtime.register(DummyAgent).register(DummyAgent)

        assert len(runtime._agent_classes) == 2


class TestCortexRuntimeSetTenants:
    """Tests for CortexRuntime.set_tenants()."""

    def test_set_tenants_stores_ids(self):
        """set_tenants() should store the tenant IDs."""
        config = CortexConfig(
            nats_url="nats://localhost:4222",
            database_url="postgresql://test@localhost/test",
            redis_url="redis://localhost:6379/0",
        )
        runtime = CortexRuntime(config)
        runtime.set_tenants(["t1", "t2", "t3"])

        assert runtime._tenant_ids == ["t1", "t2", "t3"]


class TestCortexRuntimeListAgents:
    """Tests for CortexRuntime.list_agents()."""

    def test_list_agents_empty_initially(self):
        """list_agents() should return empty list before run."""
        config = CortexConfig(
            nats_url="nats://localhost:4222",
            database_url="postgresql://test@localhost/test",
            redis_url="redis://localhost:6379/0",
        )
        runtime = CortexRuntime(config)
        assert runtime.list_agents() == []


class TestCortexRuntimeGracefulShutdown:
    """Tests for graceful shutdown."""

    async def test_graceful_shutdown_stops_agents(self):
        """_graceful_shutdown should stop all running agents."""
        config = CortexConfig(
            nats_url="nats://localhost:4222",
            database_url="postgresql://test@localhost/test",
            redis_url="redis://localhost:6379/0",
        )
        runtime = CortexRuntime(config)

        # Mock the event mesh and state manager
        runtime._event_mesh = AsyncMock()
        runtime._state_manager = AsyncMock()
        runtime._audit_logger = AsyncMock()

        # Create mock agents
        mock_agent = AsyncMock(spec=BaseAgent)
        runtime._agents = [mock_agent]

        await runtime._graceful_shutdown()

        mock_agent.stop.assert_called_once()
        runtime._event_mesh.close.assert_called_once()
        runtime._state_manager.close.assert_called_once()
