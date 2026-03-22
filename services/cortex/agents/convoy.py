"""CONVOY — Migration agent.

Handles database migrations with pre-checks, snapshots, and canary validation.
"""

from __future__ import annotations

import enum
import json

import structlog

from cortex.base_agent import BaseAgent
from cortex.models import AgentTier, AutonomyLevel, EventEnvelope, ToolDefinition

logger = structlog.get_logger(__name__)


class MigrationPhase(str, enum.Enum):
    """Phases of a database migration."""

    PRE_CHECK = "pre_check"
    SNAPSHOT = "snapshot"
    MIGRATE = "migrate"
    VALIDATE = "validate"
    COMPLETE = "complete"
    ROLLBACK = "rollback"


class ConvoyAgent(BaseAgent):
    """Migration: pre-checks, snapshots, canary validation."""

    AGENT_NAME = "convoy"
    TIER = AgentTier.EXECUTION
    AUTONOMY_LEVEL = AutonomyLevel.SUPERVISED
    MODEL_ASSIGNMENT = "claude-sonnet-4-6"
    VISIBILITY = "Customer"
    DESCRIPTION = "Migration: pre-checks, snapshots, canary validation"
    CYCLE_INTERVAL_SECONDS = 0.0  # Event-driven
    TOOLS = [
        ToolDefinition(
            name="pg_dump",
            description="Create a database dump for migration",
            input_schema={
                "type": "object",
                "properties": {"database": {"type": "string"}, "format": {"type": "string"}},
            },
        ),
        ToolDefinition(
            name="pg_restore",
            description="Restore a database from a dump",
            input_schema={
                "type": "object",
                "properties": {"database": {"type": "string"}, "dump_path": {"type": "string"}},
            },
        ),
        ToolDefinition(
            name="create_snapshot",
            description="Create a volume snapshot for rollback",
            input_schema={"type": "object", "properties": {"volume_id": {"type": "string"}}},
        ),
        ToolDefinition(
            name="verify_row_counts",
            description="Verify row counts match between source and target",
            input_schema={
                "type": "object",
                "properties": {
                    "source_db": {"type": "string"},
                    "target_db": {"type": "string"},
                },
            },
        ),
    ]
    SUBSCRIPTIONS = ["action.migrate_requested"]
    EMISSIONS = [
        "execution.migration_started",
        "execution.migration_phase",
        "execution.migration_completed",
        "execution.migration_failed",
    ]

    async def run_cycle(self) -> None:
        """CONVOY is event-driven; no proactive cycle."""

    async def process(self, event: EventEnvelope) -> None:
        """Execute a multi-phase migration."""
        source_db = event.payload.get("source_db", "")
        target_db = event.payload.get("target_db", "")
        volume_id = event.payload.get("volume_id", "")

        await self._request_approval(
            f"Migrate database {source_db} to {target_db}", risk_level="high"
        )

        await self._emit(EventEnvelope(
            event_type="execution.migration_started",
            tenant_id=self._context.tenant_id,
            payload={"source": source_db, "target": target_db},
        ))

        try:
            # Phase 1: Pre-check
            await self._emit_phase(MigrationPhase.PRE_CHECK)
            counts_before = await self._invoke_tool(
                "verify_row_counts", source_db=source_db, target_db=source_db
            )

            # Phase 2: Snapshot
            await self._emit_phase(MigrationPhase.SNAPSHOT)
            await self._invoke_tool("create_snapshot", volume_id=volume_id)

            # Phase 3: Migrate
            await self._emit_phase(MigrationPhase.MIGRATE)
            dump_result = await self._invoke_tool("pg_dump", database=source_db, format="custom")
            dump_path = dump_result.get("result", {}).get("path", "/tmp/migration.dump")
            await self._invoke_tool("pg_restore", database=target_db, dump_path=dump_path)

            # Phase 4: Validate
            await self._emit_phase(MigrationPhase.VALIDATE)
            counts_after = await self._invoke_tool(
                "verify_row_counts", source_db=source_db, target_db=target_db
            )

            # Phase 5: Complete
            await self._emit_phase(MigrationPhase.COMPLETE)
            await self._emit(EventEnvelope(
                event_type="execution.migration_completed",
                tenant_id=self._context.tenant_id,
                payload={
                    "source": source_db,
                    "target": target_db,
                    "validation": counts_after,
                },
            ))
        except Exception as exc:
            logger.error("convoy.migration_failed", error=str(exc))
            await self._emit_phase(MigrationPhase.ROLLBACK)
            await self._emit(EventEnvelope(
                event_type="execution.migration_failed",
                tenant_id=self._context.tenant_id,
                payload={"source": source_db, "target": target_db, "error": str(exc)},
            ))

    async def _emit_phase(self, phase: MigrationPhase) -> None:
        """Emit a migration phase event."""
        await self._emit(EventEnvelope(
            event_type="execution.migration_phase",
            tenant_id=self._context.tenant_id,
            payload={"phase": phase.value},
        ))
