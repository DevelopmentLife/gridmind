"""Tests for cortex.audit — AuditLogger async batch writer."""

from __future__ import annotations

import asyncio
from unittest.mock import AsyncMock, MagicMock

import pytest

from cortex.audit import AuditLogger


@pytest.fixture
def mock_state_with_pool():
    """Mock state manager with a mock pool."""
    state = MagicMock()
    pool = AsyncMock()
    conn = AsyncMock()
    pool.acquire.return_value.__aenter__ = AsyncMock(return_value=conn)
    pool.acquire.return_value.__aexit__ = AsyncMock(return_value=None)
    conn.executemany.return_value = None
    state.pool = pool
    return state, conn


class TestAuditLoggerEnqueue:
    """Tests for log() enqueueing."""

    def test_log_enqueues_entry(self, mock_state_with_pool):
        """log() should add an entry to the internal queue."""
        state, _ = mock_state_with_pool
        logger = AuditLogger(state)

        logger.log("tenant-1", "argus", "event_emitted", "event", "evt-123")

        assert not logger._queue.empty()

    def test_log_multiple_entries(self, mock_state_with_pool):
        """Multiple log() calls should accumulate entries."""
        state, _ = mock_state_with_pool
        logger = AuditLogger(state)

        for i in range(5):
            logger.log(f"tenant-{i}", "agent", "action")

        assert logger._queue.qsize() == 5


class TestAuditLoggerFlush:
    """Tests for batch flush."""

    async def test_flush_writes_to_database(self, mock_state_with_pool):
        """_flush() should batch-insert entries into the database."""
        state, conn = mock_state_with_pool
        logger = AuditLogger(state)

        logger.log("tenant-1", "argus", "cycle_completed")
        logger.log("tenant-1", "argus", "event_emitted")

        await logger._flush()

        conn.executemany.assert_called_once()
        # Verify the correct number of entries were written
        call_args = conn.executemany.call_args
        entries = call_args.args[1]
        assert len(entries) == 2

    async def test_flush_empty_queue_is_noop(self, mock_state_with_pool):
        """_flush() with empty queue should not hit the database."""
        state, conn = mock_state_with_pool
        logger = AuditLogger(state)

        await logger._flush()

        conn.executemany.assert_not_called()

    async def test_flush_requeues_on_no_pool(self):
        """_flush() should re-enqueue entries when pool is None."""
        state = MagicMock()
        state.pool = None
        logger = AuditLogger(state)

        logger.log("t1", "agent", "action")
        await logger._flush()

        # Entry should still be in the queue
        assert not logger._queue.empty()


class TestAuditLoggerLifecycle:
    """Tests for start/stop lifecycle."""

    async def test_start_creates_task(self, mock_state_with_pool):
        """start() should create a background task."""
        state, _ = mock_state_with_pool
        logger = AuditLogger(state)

        await logger.start()
        assert logger._task is not None
        await logger.stop()

    async def test_stop_flushes_remaining(self, mock_state_with_pool):
        """stop() should flush remaining entries."""
        state, conn = mock_state_with_pool
        logger = AuditLogger(state)

        await logger.start()
        logger.log("t1", "agent", "action")
        await logger.stop()

        # The final flush should have been called
        conn.executemany.assert_called_once()
