"""EventMesh — NATS JetStream wrapper for the GridMind event system."""

from __future__ import annotations

import json
from collections.abc import Callable
from typing import Any

import structlog

from cortex.config import CortexConfig
from cortex.models import EventEnvelope

logger = structlog.get_logger(__name__)

STREAM_NAME = "GRIDMIND_EVENTS"
STREAM_SUBJECTS = ["gridmind.events.>"]
MAX_AGE_NS = 72 * 60 * 60 * 1_000_000_000  # 72 hours in nanoseconds
DEDUP_WINDOW_NS = 2 * 60 * 1_000_000_000  # 2 minutes in nanoseconds


class EventMesh:
    """NATS JetStream wrapper for publishing and subscribing to GridMind events.

    Manages connection lifecycle, stream creation, and message routing with
    built-in deduplication via Nats-Msg-Id headers.
    """

    def __init__(self, config: CortexConfig) -> None:
        self._config = config
        self._nc: Any | None = None
        self._js: Any | None = None
        self._subscriptions: list[Any] = []

    @property
    def is_connected(self) -> bool:
        """Return True if the NATS connection is active."""
        return self._nc is not None and self._js is not None

    async def connect(self) -> None:
        """Connect to NATS and create JetStream context with the GRIDMIND_EVENTS stream."""
        import nats

        self._nc = await nats.connect(self._config.nats_url)
        self._js = self._nc.jetstream()

        # Ensure stream exists with correct configuration
        try:
            await self._js.find_stream_name_by_subject("gridmind.events.>")
            logger.info("event_mesh.stream_exists", stream=STREAM_NAME)
        except Exception:
            await self._js.add_stream(
                name=STREAM_NAME,
                subjects=STREAM_SUBJECTS,
                retention="limits",
                max_age=MAX_AGE_NS,
                storage="file",
                duplicate_window=DEDUP_WINDOW_NS,
            )
            logger.info("event_mesh.stream_created", stream=STREAM_NAME)

    async def publish(self, event: EventEnvelope) -> None:
        """Publish an event to the NATS JetStream with deduplication.

        Args:
            event: The event envelope to publish.

        Raises:
            AssertionError: If not connected to NATS.
        """
        assert self._js is not None, "EventMesh not connected — call connect() first"

        subject = f"gridmind.events.{event.tenant_id}.{event.event_type}"
        data = json.dumps(event.model_dump(mode="json")).encode()
        headers = {"Nats-Msg-Id": event.event_id}

        await self._js.publish(subject, data, headers=headers)
        logger.debug(
            "event_mesh.published",
            event_type=event.event_type,
            tenant_id=event.tenant_id,
            event_id=event.event_id,
        )

    async def subscribe(
        self,
        subject_pattern: str,
        callback: Callable[..., Any],
        durable_name: str | None = None,
    ) -> Any:
        """Create a push subscription with EXPLICIT ack policy.

        Args:
            subject_pattern: NATS subject pattern to subscribe to.
            callback: Async callback function to handle messages.
            durable_name: Optional durable consumer name.

        Returns:
            The subscription object.
        """
        assert self._js is not None, "EventMesh not connected — call connect() first"

        sub = await self._js.subscribe(
            subject_pattern,
            cb=callback,
            durable=durable_name,
            ack_wait=30,
            max_deliver=5,
            deliver_policy="new",
            manual_ack=True,
        )
        self._subscriptions.append(sub)
        logger.info("event_mesh.subscribed", subject=subject_pattern, durable=durable_name)
        return sub

    async def close(self) -> None:
        """Drain subscriptions and close the NATS connection."""
        if self._nc is not None:
            try:
                await self._nc.drain()
            except Exception as exc:
                logger.warning("event_mesh.drain_error", error=str(exc))
            finally:
                self._nc = None
                self._js = None
                self._subscriptions.clear()
                logger.info("event_mesh.closed")
