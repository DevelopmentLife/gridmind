"""VAULT — Backup & Recovery agent.

Manages PITR, cross-region backups, recovery drills, and backup pruning.
"""

from __future__ import annotations

import enum
import json
from datetime import UTC, datetime

import structlog

from cortex.base_agent import BaseAgent
from cortex.models import AgentTier, AutonomyLevel, EventEnvelope, ToolDefinition

logger = structlog.get_logger(__name__)


class BackupType(str, enum.Enum):
    """Types of database backups."""

    FULL = "full"
    INCREMENTAL = "incremental"
    WAL = "wal"
    SNAPSHOT = "snapshot"


class VaultAgent(BaseAgent):
    """Backup & Recovery: PITR, cross-region, recovery drills."""

    AGENT_NAME = "vault"
    TIER = AgentTier.EXECUTION
    AUTONOMY_LEVEL = AutonomyLevel.AUTONOMOUS
    MODEL_ASSIGNMENT = "claude-haiku-4-5"
    VISIBILITY = "Customer"
    DESCRIPTION = "Backup & Recovery: PITR, cross-region, recovery drills"
    CYCLE_INTERVAL_SECONDS = 900.0
    TOOLS = [
        ToolDefinition(
            name="pg_basebackup",
            description="Take a full PostgreSQL base backup",
            input_schema={"type": "object", "properties": {"label": {"type": "string"}}},
        ),
        ToolDefinition(
            name="wal_archive",
            description="Archive WAL segments to object storage",
            input_schema={"type": "object", "properties": {}},
        ),
        ToolDefinition(
            name="copy_to_region",
            description="Copy backup to a secondary region",
            input_schema={
                "type": "object",
                "properties": {
                    "backup_id": {"type": "string"},
                    "target_region": {"type": "string"},
                },
            },
        ),
        ToolDefinition(
            name="restore_to_sandbox",
            description="Restore a backup to a sandbox environment for verification",
            input_schema={
                "type": "object",
                "properties": {"backup_id": {"type": "string"}},
            },
        ),
        ToolDefinition(
            name="prune_old_backups",
            description="Remove backups older than retention policy",
            input_schema={
                "type": "object",
                "properties": {"retention_days": {"type": "integer"}},
            },
        ),
    ]
    SUBSCRIPTIONS: list[str] = []
    EMISSIONS = [
        "execution.backup_completed",
        "execution.backup_failed",
        "execution.recovery_drill_result",
    ]

    async def run_cycle(self) -> None:
        """Run backup cycle: WAL archive, periodic full backup, cross-region copy, prune."""
        # Archive WAL segments
        await self._invoke_tool("wal_archive")

        # Check if full backup is due (every 24 hours)
        last_full = await self.get_context("last_full_backup_ts")
        now = datetime.now(UTC)
        need_full = True

        if last_full is not None:
            try:
                last_dt = datetime.fromisoformat(str(last_full))
                hours_since = (now - last_dt).total_seconds() / 3600
                need_full = hours_since >= 24
            except (ValueError, TypeError):
                need_full = True

        if need_full:
            label = f"full-{now.strftime('%Y%m%d-%H%M%S')}"
            try:
                result = await self._invoke_tool("pg_basebackup", label=label)
                backup_id = result.get("result", {}).get("backup_id", label)

                # Cross-region copy
                await self._invoke_tool(
                    "copy_to_region",
                    backup_id=backup_id,
                    target_region="us-west-2",
                )

                await self.set_context("last_full_backup_ts", now.isoformat(), ttl=172800)
                await self.set_context("last_backup_id", backup_id, ttl=172800)

                await self._emit(EventEnvelope(
                    event_type="execution.backup_completed",
                    tenant_id=self._context.tenant_id,
                    payload={
                        "backup_type": BackupType.FULL.value,
                        "backup_id": backup_id,
                        "cross_region": True,
                    },
                ))
            except Exception as exc:
                logger.error("vault.backup_failed", error=str(exc))
                await self._emit(EventEnvelope(
                    event_type="execution.backup_failed",
                    tenant_id=self._context.tenant_id,
                    payload={"error": str(exc), "backup_type": BackupType.FULL.value},
                ))

        # Prune old backups
        await self._invoke_tool("prune_old_backups", retention_days=30)

        # Monthly recovery drill
        last_drill = await self.get_context("last_recovery_drill_ts")
        need_drill = True
        if last_drill is not None:
            try:
                drill_dt = datetime.fromisoformat(str(last_drill))
                days_since = (now - drill_dt).total_seconds() / 86400
                need_drill = days_since >= 30
            except (ValueError, TypeError):
                need_drill = True

        if need_drill:
            backup_id = await self.get_context("last_backup_id")
            if backup_id:
                try:
                    drill_result = await self._invoke_tool(
                        "restore_to_sandbox", backup_id=str(backup_id)
                    )
                    await self.set_context(
                        "last_recovery_drill_ts", now.isoformat(), ttl=2678400
                    )
                    await self._emit(EventEnvelope(
                        event_type="execution.recovery_drill_result",
                        tenant_id=self._context.tenant_id,
                        payload={"backup_id": str(backup_id), "result": drill_result},
                    ))
                except Exception as exc:
                    logger.error("vault.recovery_drill_failed", error=str(exc))

    async def process(self, event: EventEnvelope) -> None:
        """Handle inbound events."""
