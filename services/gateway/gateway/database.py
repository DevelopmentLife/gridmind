"""Database and cache connection utilities."""

from __future__ import annotations

from contextlib import asynccontextmanager
from typing import TYPE_CHECKING, AsyncGenerator

import structlog

if TYPE_CHECKING:
    import asyncpg
    import redis.asyncio as redis_async

logger = structlog.get_logger()

_db_pool: asyncpg.Pool | None = None
_redis_client: redis_async.Redis | None = None  # type: ignore[type-arg]


async def init_db_pool(database_url: str, min_size: int = 5, max_size: int = 20) -> asyncpg.Pool:
    """Create and cache the asyncpg connection pool.

    Args:
        database_url: PostgreSQL connection string.
        min_size: Minimum pool connections.
        max_size: Maximum pool connections.

    Returns:
        The asyncpg connection pool.
    """
    import asyncpg

    global _db_pool  # noqa: PLW0603
    if _db_pool is None:
        _db_pool = await asyncpg.create_pool(
            database_url, min_size=min_size, max_size=max_size
        )
        logger.info("database_pool_created", min_size=min_size, max_size=max_size)
    return _db_pool


async def close_db_pool() -> None:
    """Close the database pool."""
    global _db_pool  # noqa: PLW0603
    if _db_pool is not None:
        await _db_pool.close()
        _db_pool = None
        logger.info("database_pool_closed")


def get_db_pool() -> asyncpg.Pool:
    """Return the current database pool.

    Raises:
        RuntimeError: If the pool has not been initialized.
    """
    if _db_pool is None:
        raise RuntimeError("Database pool not initialized. Call init_db_pool() first.")
    return _db_pool


@asynccontextmanager
async def get_connection(tenant_id: str | None = None) -> AsyncGenerator[asyncpg.Connection, None]:
    """Acquire a connection from the pool and optionally set RLS tenant context.

    Sets the session-local GUC ``app.current_tenant_id`` so that all
    row-level security policies on tenant-scoped tables filter correctly.
    The GUC is reset unconditionally in the finally block so that the
    connection is clean when it is returned to the pool.

    Args:
        tenant_id: Tenant UUID string for row-level security context.
                   When None, no GUC is set and RLS policies that reference
                   ``current_tenant_id()`` will see NULL, blocking all rows
                   for the gridmind_app role (fail-closed behaviour).

    Yields:
        An asyncpg connection with tenant context applied.
    """
    pool = get_db_pool()
    async with pool.acquire() as conn:
        if tenant_id:
            await conn.execute("SELECT set_config('app.current_tenant_id', $1, true)", tenant_id)
        try:
            yield conn
        finally:
            if tenant_id:
                await conn.execute("SELECT set_config('app.current_tenant_id', '', true)")


async def init_redis(redis_url: str) -> redis_async.Redis:  # type: ignore[type-arg]
    """Create and cache the Redis async client.

    Args:
        redis_url: Redis connection string.

    Returns:
        The async Redis client.
    """
    import redis.asyncio as redis_async

    global _redis_client  # noqa: PLW0603
    if _redis_client is None:
        _redis_client = redis_async.from_url(redis_url, decode_responses=True)
        logger.info("redis_client_created")
    return _redis_client


async def close_redis() -> None:
    """Close the Redis client."""
    global _redis_client  # noqa: PLW0603
    if _redis_client is not None:
        await _redis_client.aclose()  # type: ignore[union-attr]
        _redis_client = None
        logger.info("redis_client_closed")


def get_redis() -> redis_async.Redis:  # type: ignore[type-arg]
    """Return the current Redis client.

    Raises:
        RuntimeError: If the client has not been initialized.
    """
    if _redis_client is None:
        raise RuntimeError("Redis client not initialized. Call init_redis() first.")
    return _redis_client
