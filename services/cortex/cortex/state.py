"""StateManager — asyncpg + Redis state management for Cortex agents."""

from __future__ import annotations

import json
from typing import Any

import structlog

logger = structlog.get_logger(__name__)


class StateManager:
    """Manages agent state via Redis and database queries via asyncpg.

    Provides key-value context storage (Redis) and SQL query execution (asyncpg)
    for agent runtime needs.
    """

    def __init__(self) -> None:
        self.pool: Any | None = None
        self.redis: Any | None = None

    async def connect(self, database_url: str, redis_url: str) -> None:
        """Connect to PostgreSQL and Redis.

        Args:
            database_url: PostgreSQL connection string.
            redis_url: Redis connection string.
        """
        import asyncpg
        import redis.asyncio as aioredis

        self.pool = await asyncpg.create_pool(database_url, min_size=2, max_size=10)
        self.redis = aioredis.from_url(redis_url, decode_responses=True)
        logger.info("state_manager.connected")

    async def set_context(
        self,
        agent_id: str,
        tenant_id: str,
        key: str,
        value: Any,
        ttl: int | None = None,
    ) -> None:
        """Store a context value in Redis.

        Args:
            agent_id: The agent identifier.
            tenant_id: The tenant identifier.
            key: Context key.
            value: Value to store (will be JSON-serialized).
            ttl: Optional TTL in seconds.
        """
        redis_key = f"ctx:{agent_id}:{tenant_id}:{key}"
        serialized = json.dumps(value) if not isinstance(value, str) else value

        if ttl is not None:
            await self.redis.setex(redis_key, ttl, serialized)
        else:
            await self.redis.set(redis_key, serialized)

        logger.debug("state.set_context", agent_id=agent_id, tenant_id=tenant_id, key=key)

    async def get_context(self, agent_id: str, tenant_id: str, key: str) -> Any | None:
        """Retrieve a context value from Redis.

        Args:
            agent_id: The agent identifier.
            tenant_id: The tenant identifier.
            key: Context key.

        Returns:
            The stored value, or None if not found.
        """
        redis_key = f"ctx:{agent_id}:{tenant_id}:{key}"
        raw = await self.redis.get(redis_key)
        if raw is None:
            return None

        try:
            return json.loads(raw)
        except (json.JSONDecodeError, TypeError):
            return raw

    async def delete_context(self, agent_id: str, tenant_id: str, key: str) -> None:
        """Delete a context value from Redis.

        Args:
            agent_id: The agent identifier.
            tenant_id: The tenant identifier.
            key: Context key.
        """
        redis_key = f"ctx:{agent_id}:{tenant_id}:{key}"
        await self.redis.delete(redis_key)
        logger.debug("state.delete_context", agent_id=agent_id, tenant_id=tenant_id, key=key)

    async def execute_query(self, sql: str, *args: Any) -> list[Any]:
        """Execute a SQL query via asyncpg and return results.

        Args:
            sql: Parameterized SQL query string.
            *args: Query parameters.

        Returns:
            List of result records.
        """
        assert self.pool is not None, "StateManager not connected — call connect() first"
        async with self.pool.acquire() as conn:
            return await conn.fetch(sql, *args)

    async def close(self) -> None:
        """Close PostgreSQL pool and Redis connection."""
        if self.pool is not None:
            await self.pool.close()
            self.pool = None
        if self.redis is not None:
            await self.redis.close()
            self.redis = None
        logger.info("state_manager.closed")
