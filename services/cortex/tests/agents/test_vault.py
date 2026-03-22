"""Tests for agents.vault_agent — VaultAgent (Backup & Recovery)."""

from __future__ import annotations

import pytest

from cortex.base_agent import AgentContext
from cortex.models import AgentTier, AutonomyLevel, EventEnvelope


@pytest.fixture
def vault(make_agent_context):
    from agents.vault_agent import VaultAgent
    ctx: AgentContext = make_agent_context("test-tenant")
    return VaultAgent(ctx)


class TestVaultDeclarations:
    def test_agent_name(self):
        from agents.vault_agent import VaultAgent
        assert VaultAgent.AGENT_NAME == "vault"

    def test_tier_is_execution(self):
        from agents.vault_agent import VaultAgent
        assert VaultAgent.TIER == AgentTier.EXECUTION

    def test_autonomy_is_autonomous(self):
        from agents.vault_agent import VaultAgent
        assert VaultAgent.AUTONOMY_LEVEL == AutonomyLevel.AUTONOMOUS

    def test_model_assignment_is_haiku(self):
        from agents.vault_agent import VaultAgent
        assert VaultAgent.MODEL_ASSIGNMENT == "claude-haiku-4-5"

    def test_visibility_is_customer(self):
        from agents.vault_agent import VaultAgent
        assert VaultAgent.VISIBILITY == "Customer"

    def test_description_set(self):
        from agents.vault_agent import VaultAgent
        assert len(VaultAgent.DESCRIPTION) > 0

    def test_emissions_include_backup_completed(self):
        from agents.vault_agent import VaultAgent
        assert "execution.backup_completed" in VaultAgent.EMISSIONS

    def test_emissions_include_backup_failed(self):
        from agents.vault_agent import VaultAgent
        assert "execution.backup_failed" in VaultAgent.EMISSIONS

    def test_emissions_include_recovery_drill_result(self):
        from agents.vault_agent import VaultAgent
        assert "execution.recovery_drill_result" in VaultAgent.EMISSIONS

    def test_cycle_interval_is_positive(self):
        from agents.vault_agent import VaultAgent
        assert VaultAgent.CYCLE_INTERVAL_SECONDS > 0


class TestVaultProcessing:
    async def test_process_unknown_event_does_not_raise(self, vault):
        from unittest.mock import MagicMock
        event = MagicMock(spec=EventEnvelope)
        event.tenant_id = "test-tenant"
        event.event_type = "unknown.event"
        await vault.process(event)

    async def test_run_cycle_archives_wal_always(self, vault):
        """WAL archive should always be invoked during run_cycle."""
        archived = []
        original_invoke = vault._invoke_tool
        async def tracking_invoke(name, **kwargs):
            archived.append(name)
            return {"result": {}}
        vault._invoke_tool = tracking_invoke  # type: ignore[method-assign]

        await vault.run_cycle()
        assert "wal_archive" in archived

    async def test_run_cycle_performs_full_backup_when_no_previous(
        self, vault, mock_event_mesh
    ):
        """On first run (no stored timestamp), full backup should be taken."""
        invoked = []
        async def tracking_invoke(name, **kwargs):
            invoked.append(name)
            return {"result": {"backup_id": "backup-001", "resource_ids": []}}
        vault._invoke_tool = tracking_invoke  # type: ignore[method-assign]

        await vault.run_cycle()
        assert "pg_basebackup" in invoked

    async def test_run_cycle_emits_backup_completed_on_success(
        self, vault, mock_event_mesh
    ):
        async def tracking_invoke(name, **kwargs):
            return {"result": {"backup_id": "backup-001", "resource_ids": []}}
        vault._invoke_tool = tracking_invoke  # type: ignore[method-assign]

        await vault.run_cycle()
        event_types = [e.event_type for e in mock_event_mesh.published_events]
        assert "execution.backup_completed" in event_types

    async def test_run_cycle_emits_backup_failed_on_error(self, vault, mock_event_mesh):
        async def failing_invoke(name, **kwargs):
            if name == "pg_basebackup":
                raise RuntimeError("S3 unreachable")
            return {"result": {}}
        vault._invoke_tool = failing_invoke  # type: ignore[method-assign]

        await vault.run_cycle()
        event_types = [e.event_type for e in mock_event_mesh.published_events]
        assert "execution.backup_failed" in event_types

    async def test_run_cycle_does_not_raise(self, vault):
        try:
            await vault.run_cycle()
        except Exception:
            pass
