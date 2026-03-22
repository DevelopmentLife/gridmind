"""PULSE — Heartbeat Monitor agent.

Monitors agent heartbeats: 3 missed = degraded, 6 missed = dead.
"""

from __future__ import annotations

import time
from dataclasses import dataclass, field

import structlog

from cortex.base_agent import BaseAgent
from cortex.models import AgentStatus, AgentTier, AutonomyLevel, EventEnvelope, ToolDefinition

logger = structlog.get_logger(__name__)

DEGRADED_THRESHOLD = 3
DEAD_THRESHOLD = 6


@dataclass
class _AgentRecord:
    """Tracks heartbeat state for a monitored agent."""

    agent_name: str
    last_heartbeat: float = 0.0
    missed_count: int = 0
    status: AgentStatus = AgentStatus.HEALTHY
    heartbeat_interval: float = 10.0


class PulseAgent(BaseAgent):
    """Heartbeat Monitor: 3 missed = degraded, 6 missed = dead."""

    AGENT_NAME = "pulse"
    TIER = AgentTier.SELF_HEALING
    AUTONOMY_LEVEL = AutonomyLevel.AUTONOMOUS
    MODEL_ASSIGNMENT = "deterministic"
    VISIBILITY = "Internal"
    DESCRIPTION = "Heartbeat Monitor: 3 missed = degraded, 6 missed = dead"
    CYCLE_INTERVAL_SECONDS = 15.0
    TOOLS: list[ToolDefinition] = []
    SUBSCRIPTIONS = ["agent.heartbeat"]
    EMISSIONS = [
        "agent.status_changed",
        "self_healing.incident_detected",
    ]

    def __init__(self, *args: object, **kwargs: object) -> None:
        super().__init__(*args, **kwargs)  # type: ignore[arg-type]
        self._records: dict[str, _AgentRecord] = {}

    async def run_cycle(self) -> None:
        """Check all monitored agents for missed heartbeats."""
        now = time.monotonic()

        for agent_name, record in self._records.items():
            if record.last_heartbeat == 0.0:
                continue

            elapsed = now - record.last_heartbeat
            expected_beats = elapsed / record.heartbeat_interval
            missed = int(max(0, expected_beats - 1))

            previous_status = record.status

            if missed >= DEAD_THRESHOLD:
                record.status = AgentStatus.DEAD
                record.missed_count = missed
            elif missed >= DEGRADED_THRESHOLD:
                record.status = AgentStatus.DEGRADED
                record.missed_count = missed
            else:
                record.status = AgentStatus.HEALTHY
                record.missed_count = 0

            # Emit status change if it changed
            if record.status != previous_status:
                await self._emit(EventEnvelope(
                    event_type="agent.status_changed",
                    tenant_id=self._context.tenant_id,
                    payload={
                        "agent_name": agent_name,
                        "previous_status": previous_status.value,
                        "new_status": record.status.value,
                        "missed_heartbeats": record.missed_count,
                    },
                ))

                # Trigger incident for dead agents
                if record.status == AgentStatus.DEAD:
                    await self._emit(EventEnvelope(
                        event_type="self_healing.incident_detected",
                        tenant_id=self._context.tenant_id,
                        payload={
                            "type": "agent_dead",
                            "agent_name": agent_name,
                            "missed_heartbeats": record.missed_count,
                            "last_heartbeat_seconds_ago": round(elapsed, 1),
                        },
                    ))
                    logger.warning(
                        "pulse.agent_dead",
                        agent_name=agent_name,
                        missed=record.missed_count,
                    )

    async def process(self, event: EventEnvelope) -> None:
        """Record an incoming heartbeat from an agent."""
        if event.event_type != "agent.heartbeat":
            return

        agent_name = event.payload.get("agent_name", event.source_agent)
        if not agent_name:
            return

        now = time.monotonic()
        if agent_name not in self._records:
            self._records[agent_name] = _AgentRecord(
                agent_name=agent_name,
                last_heartbeat=now,
            )
        else:
            record = self._records[agent_name]
            record.last_heartbeat = now
            # Reset if recovering
            if record.status != AgentStatus.HEALTHY:
                previous = record.status
                record.status = AgentStatus.HEALTHY
                record.missed_count = 0
                await self._emit(EventEnvelope(
                    event_type="agent.status_changed",
                    tenant_id=self._context.tenant_id,
                    payload={
                        "agent_name": agent_name,
                        "previous_status": previous.value,
                        "new_status": AgentStatus.HEALTHY.value,
                        "missed_heartbeats": 0,
                    },
                ))
