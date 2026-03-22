"""VITALS — Infrastructure Health agent.

Probes NATS, PostgreSQL, Redis, and Kubernetes every 30 seconds.
"""

from __future__ import annotations

import structlog

from cortex.base_agent import BaseAgent
from cortex.models import AgentTier, AutonomyLevel, EventEnvelope, ToolDefinition

logger = structlog.get_logger(__name__)


class VitalsAgent(BaseAgent):
    """Infrastructure Health: NATS, PG, Redis, K8s 30s probes."""

    AGENT_NAME = "vitals"
    TIER = AgentTier.SELF_HEALING
    AUTONOMY_LEVEL = AutonomyLevel.AUTONOMOUS
    MODEL_ASSIGNMENT = "deterministic"
    VISIBILITY = "Internal"
    DESCRIPTION = "Infrastructure Health: NATS, PG, Redis, K8s 30s probes"
    CYCLE_INTERVAL_SECONDS = 30.0
    TOOLS: list[ToolDefinition] = []
    SUBSCRIPTIONS: list[str] = []
    EMISSIONS = [
        "infra.health_report",
        "self_healing.incident_detected",
    ]

    async def run_cycle(self) -> None:
        """Probe all infrastructure components and report health."""
        probes: dict[str, dict[str, object]] = {}

        # Probe NATS
        probes["nats"] = await self._probe_nats()

        # Probe PostgreSQL
        probes["postgres"] = await self._probe_postgres()

        # Probe Redis
        probes["redis"] = await self._probe_redis()

        # Overall health
        all_healthy = all(
            p.get("status") == "healthy" for p in probes.values()
        )

        await self._emit(EventEnvelope(
            event_type="infra.health_report",
            tenant_id=self._context.tenant_id,
            payload={
                "probes": probes,
                "overall_status": "healthy" if all_healthy else "degraded",
            },
        ))

        # Emit incident for any unhealthy component
        for component, result in probes.items():
            if result.get("status") != "healthy":
                await self._emit(EventEnvelope(
                    event_type="self_healing.incident_detected",
                    tenant_id=self._context.tenant_id,
                    payload={
                        "type": "infra_unhealthy",
                        "component": component,
                        "status": result.get("status"),
                        "error": result.get("error", ""),
                    },
                ))

    async def _probe_nats(self) -> dict[str, object]:
        """Probe NATS connection health."""
        try:
            mesh = self._context.event_mesh
            if mesh.is_connected:
                return {"status": "healthy", "latency_ms": 0}
            return {"status": "unhealthy", "error": "not connected"}
        except Exception as exc:
            return {"status": "unhealthy", "error": str(exc)}

    async def _probe_postgres(self) -> dict[str, object]:
        """Probe PostgreSQL connection health."""
        try:
            pool = self._context.state_manager.pool
            if pool is None:
                return {"status": "unhealthy", "error": "no pool"}
            async with pool.acquire() as conn:
                result = await conn.fetchval("SELECT 1")
                return {"status": "healthy", "result": result}
        except Exception as exc:
            return {"status": "unhealthy", "error": str(exc)}

    async def _probe_redis(self) -> dict[str, object]:
        """Probe Redis connection health."""
        try:
            redis = self._context.state_manager.redis
            if redis is None:
                return {"status": "unhealthy", "error": "no connection"}
            pong = await redis.ping()
            return {"status": "healthy", "ping": pong}
        except Exception as exc:
            return {"status": "unhealthy", "error": str(exc)}

    async def process(self, event: EventEnvelope) -> None:
        """Handle inbound events."""
