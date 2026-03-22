"""Tests for cortex.state — StateManager."""

from __future__ import annotations

from unittest.mock import AsyncMock

import pytest

from cortex.state import StateManager


class TestStateManagerContext:
    """Tests for context get/set/delete operations."""

    async def test_set_and_get_context(self, mock_redis):
        """set_context followed by get_context should return the stored value."""
        sm = StateManager()
        sm.redis = mock_redis

        await sm.set_context("agent1", "tenant1", "key1", "value1")
        result = await sm.get_context("agent1", "tenant1", "key1")

        assert result == "value1"

    async def test_set_context_with_ttl(self, mock_redis):
        """set_context with TTL should call setex."""
        sm = StateManager()
        sm.redis = mock_redis

        await sm.set_context("agent1", "tenant1", "key1", "value1", ttl=300)
        mock_redis.setex.assert_called_once()

    async def test_delete_context(self, mock_redis):
        """delete_context should remove the key."""
        sm = StateManager()
        sm.redis = mock_redis

        await sm.set_context("agent1", "tenant1", "key1", "value1")
        await sm.delete_context("agent1", "tenant1", "key1")

        result = await sm.get_context("agent1", "tenant1", "key1")
        assert result is None

    async def test_get_context_returns_none_for_missing(self, mock_redis):
        """get_context should return None for nonexistent keys."""
        sm = StateManager()
        sm.redis = mock_redis

        result = await sm.get_context("agent1", "tenant1", "missing")
        assert result is None

    async def test_set_context_json_serializes_dicts(self, mock_redis):
        """set_context should JSON-serialize dict values."""
        sm = StateManager()
        sm.redis = mock_redis

        await sm.set_context("agent1", "tenant1", "data", {"count": 42})
        result = await sm.get_context("agent1", "tenant1", "data")

        # The mock stores JSON-serialized, and get_context deserializes
        assert result == {"count": 42}


class TestStateManagerQuery:
    """Tests for execute_query."""

    async def test_execute_query_raises_when_not_connected(self):
        """execute_query should raise when pool is None."""
        sm = StateManager()

        with pytest.raises(AssertionError, match="not connected"):
            await sm.execute_query("SELECT 1")

    async def test_execute_query_delegates_to_pool(self, mock_pg):
        """execute_query should delegate to the asyncpg pool."""
        sm = StateManager()
        sm.pool = mock_pg

        await sm.execute_query("SELECT 1")


class TestStateManagerClose:
    """Tests for close()."""

    async def test_close_clears_connections(self, mock_pg, mock_redis):
        """close() should set pool and redis to None."""
        sm = StateManager()
        sm.pool = mock_pg
        sm.redis = mock_redis

        await sm.close()

        assert sm.pool is None
        assert sm.redis is None
