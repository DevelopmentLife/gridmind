"""AuditLogger — async queue to PostgreSQL batch writer for audit trail."""

from __future__ import annotations

import asyncio
from datetime import UTC, datetime
from typing import Any

import structlog

logger = structlog.get_logger(__name__)

FLUSH_INTERVAL_SECONDS = 5.0
FLUSH_BATCH_SIZE = 100


class AuditLogger:
    """Asynchronous audit logger that batches entries and flushes to PostgreSQL.

    Entries are enqueued via `log()` and periodically flushed to the `audit_log`
    table in batches of up to 100 entries or every 5 seconds.
    """

    def __init__(self, state_manager: Any) -> None:
        self._state_manager = state_manager
        self._queue: asyncio.Queue[dict[str, Any]] = asyncio.Queue()
        self._task: asyncio.Task[None] | None = None
        self._running = False

    async def start(self) -> None:
        """Start the background flush task."""
        self._running = True
        self._task = asyncio.create_task(self._flush_loop())
        logger.info("audit_logger.started")

    async def stop(self) -> None:
        """Stop the background flush task and flush remaining entries."""
        self._running = False
        if self._task is not None:
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass
        # Final flush of remaining entries
        await self._flush()
        logger.info("audit_logger.stopped")

    def log(
        self,
        tenant_id: str,
        agent_id: str,
        action: str,
        resource_type: str = "",
        resource_id: str = "",
        details: dict[str, Any] | None = None,
    ) -> None:
        """Enqueue an audit log entry for batch writing.

        Args:
            tenant_id: The tenant identifier.
            agent_id: The agent that performed the action.
            action: Description of the action taken.
            resource_type: Type of resource affected.
            resource_id: Identifier of the resource affected.
            details: Optional additional details.
        """
        entry = {
            "tenant_id": tenant_id,
            "agent_id": agent_id,
            "action": action,
            "resource_type": resource_type,
            "resource_id": resource_id,
            "details": details or {},
            "timestamp": datetime.now(UTC).isoformat(),
        }
        self._queue.put_nowait(entry)

    async def _flush_loop(self) -> None:
        """Background loop that flushes entries periodically."""
        while self._running:
            await asyncio.sleep(FLUSH_INTERVAL_SECONDS)
            await self._flush()

    async def _flush(self) -> None:
        """Batch-insert queued entries into the audit_log table."""
        entries: list[dict[str, Any]] = []
        while not self._queue.empty() and len(entries) < FLUSH_BATCH_SIZE:
            try:
                entries.append(self._queue.get_nowait())
            except asyncio.QueueEmpty:
                break

        if not entries:
            return

        try:
            pool = self._state_manager.pool
            if pool is None:
                logger.warning("audit_logger.flush_skipped", reason="no_database_pool")
                # Re-enqueue entries
                for entry in entries:
                    self._queue.put_nowait(entry)
                return

            async with pool.acquire() as conn:
                await conn.executemany(
                    """
                    INSERT INTO audit_log (tenant_id, agent_id, action, resource_type,
                                           resource_id, details, created_at)
                    VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7::timestamptz)
                    """,
                    [
                        (
                            e["tenant_id"],
                            e["agent_id"],
                            e["action"],
                            e["resource_type"],
                            e["resource_id"],
                            str(e["details"]),
                            e["timestamp"],
                        )
                        for e in entries
                    ],
                )
            logger.debug("audit_logger.flushed", count=len(entries))
        except Exception as exc:
            logger.error("audit_logger.flush_error", error=str(exc), count=len(entries))
            # Re-enqueue failed entries
            for entry in entries:
                self._queue.put_nowait(entry)
