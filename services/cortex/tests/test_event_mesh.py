"""Tests for cortex.event_mesh — NATS JetStream wrapper."""

from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from cortex.config import CortexConfig
from cortex.event_mesh import EventMesh, STREAM_NAME
from cortex.models import EventEnvelope


@pytest.fixture
def config() -> CortexConfig:
    """Test config."""
    return CortexConfig(
        nats_url="nats://localhost:4222",
        database_url="postgresql://test:test@localhost:5432/test",
        redis_url="redis://localhost:6379/0",
        environment="test",
    )


@pytest.fixture
def mock_nats_js() -> tuple[AsyncMock, AsyncMock]:
    """Mock NATS client and JetStream."""
    nc = AsyncMock()
    js = AsyncMock()
    nc.jetstream.return_value = js
    return nc, js


class TestEventMeshPublish:
    """Tests for EventMesh.publish()."""

    async def test_publish_sets_dedup_header(self, config, mock_nats_js):
        """Publishing an event includes Nats-Msg-Id for deduplication."""
        mesh = EventMesh(config)
        mesh._nc, mesh._js = mock_nats_js

        event = EventEnvelope(
            event_type="perception.workload_profile",
            tenant_id="tenant-1",
            payload={"qps": 100},
        )

        await mesh.publish(event)

        mock_nats_js[1].publish.assert_called_once()
        call_kwargs = mock_nats_js[1].publish.call_args
        assert call_kwargs.kwargs["headers"]["Nats-Msg-Id"] == event.event_id

    async def test_publish_uses_correct_subject(self, config, mock_nats_js):
        """Published events should use gridmind.events.{tenant_id}.{event_type}."""
        mesh = EventMesh(config)
        mesh._nc, mesh._js = mock_nats_js

        event = EventEnvelope(
            event_type="perception.cost_snapshot",
            tenant_id="acme",
        )

        await mesh.publish(event)

        call_args = mock_nats_js[1].publish.call_args
        assert call_args.args[0] == "gridmind.events.acme.perception.cost_snapshot"

    async def test_publish_raises_when_not_connected(self, config):
        """Publishing before connect() raises AssertionError."""
        mesh = EventMesh(config)
        event = EventEnvelope(event_type="test", tenant_id="t1")

        with pytest.raises(AssertionError, match="not connected"):
            await mesh.publish(event)


class TestEventMeshSubscribe:
    """Tests for EventMesh.subscribe()."""

    async def test_subscribe_creates_subscription(self, config, mock_nats_js):
        """subscribe() should create a JetStream subscription."""
        mesh = EventMesh(config)
        mesh._nc, mesh._js = mock_nats_js

        callback = AsyncMock()
        await mesh.subscribe("gridmind.events.>", callback, durable_name="test-sub")

        mock_nats_js[1].subscribe.assert_called_once()
        call_kwargs = mock_nats_js[1].subscribe.call_args
        assert call_kwargs.args[0] == "gridmind.events.>"
        assert call_kwargs.kwargs["durable"] == "test-sub"
        assert call_kwargs.kwargs["manual_ack"] is True
        assert call_kwargs.kwargs["max_deliver"] == 5

    async def test_subscribe_raises_when_not_connected(self, config):
        """subscribe() before connect() raises AssertionError."""
        mesh = EventMesh(config)
        with pytest.raises(AssertionError, match="not connected"):
            await mesh.subscribe("test.>", AsyncMock())


class TestEventMeshConnection:
    """Tests for EventMesh connection state."""

    def test_is_connected_false_initially(self, config):
        """New EventMesh should not be connected."""
        mesh = EventMesh(config)
        assert mesh.is_connected is False

    async def test_close_resets_state(self, config, mock_nats_js):
        """close() should reset connection state."""
        mesh = EventMesh(config)
        mesh._nc, mesh._js = mock_nats_js

        assert mesh.is_connected is True
        await mesh.close()
        assert mesh.is_connected is False
