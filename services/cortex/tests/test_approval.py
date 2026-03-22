"""Tests for cortex.approval — ApprovalGate, ApprovalDeniedError, AdvisoryOnlyError."""

from __future__ import annotations

import asyncio
from unittest.mock import AsyncMock

import pytest

from cortex.approval import AdvisoryOnlyError, ApprovalDeniedError, ApprovalGate
from cortex.config import CortexConfig
from cortex.models import ApprovalResponse, AutonomyLevel, EventEnvelope


@pytest.fixture
def config() -> CortexConfig:
    """Config with short approval timeout for testing."""
    return CortexConfig(
        nats_url="nats://localhost:4222",
        database_url="postgresql://test@localhost/test",
        redis_url="redis://localhost:6379/0",
        approval_timeout=1,  # 1 second for fast tests
    )


@pytest.fixture
def mock_mesh() -> AsyncMock:
    """Mock event mesh for approval publishing."""
    return AsyncMock()


class TestAutonomousApproval:
    """Tests for AUTONOMOUS autonomy level."""

    async def test_autonomous_auto_approves(self, config, mock_mesh):
        """AUTONOMOUS agents should receive instant auto-approval."""
        gate = ApprovalGate(config, mock_mesh)
        result = await gate.request_approval(
            agent_id="test-agent",
            tenant_id="test-tenant",
            action="test action",
            risk_level="low",
            autonomy_level=AutonomyLevel.AUTONOMOUS,
        )

        assert result is True
        mock_mesh.publish.assert_not_called()

    async def test_autonomous_does_not_publish_event(self, config, mock_mesh):
        """AUTONOMOUS approval should not publish an approval request event."""
        gate = ApprovalGate(config, mock_mesh)
        await gate.request_approval(
            agent_id="test",
            tenant_id="t1",
            action="test",
            risk_level="low",
            autonomy_level=AutonomyLevel.AUTONOMOUS,
        )

        mock_mesh.publish.assert_not_called()


class TestAdvisoryApproval:
    """Tests for ADVISORY autonomy level."""

    async def test_advisory_raises_error(self, config, mock_mesh):
        """ADVISORY agents should always raise AdvisoryOnlyError."""
        gate = ApprovalGate(config, mock_mesh)

        with pytest.raises(AdvisoryOnlyError, match="ADVISORY-only"):
            await gate.request_approval(
                agent_id="advisory-agent",
                tenant_id="test",
                action="test",
                risk_level="low",
                autonomy_level=AutonomyLevel.ADVISORY,
            )


class TestSupervisedApproval:
    """Tests for SUPERVISED autonomy level."""

    async def test_supervised_publishes_request(self, config, mock_mesh):
        """SUPERVISED should publish an approval request and block."""
        gate = ApprovalGate(config, mock_mesh)

        # This will timeout since no response comes
        with pytest.raises(ApprovalDeniedError, match="timed out"):
            await gate.request_approval(
                agent_id="supervised-agent",
                tenant_id="test",
                action="scale database",
                risk_level="medium",
                autonomy_level=AutonomyLevel.SUPERVISED,
            )

        mock_mesh.publish.assert_called_once()

    async def test_supervised_approves_on_response(self, config, mock_mesh):
        """SUPERVISED should approve when a positive response arrives."""
        gate = ApprovalGate(config, mock_mesh)

        async def send_approval():
            """Send approval after a short delay."""
            await asyncio.sleep(0.1)
            # Find the pending approval ID
            for approval_id in list(gate._pending.keys()):
                response = EventEnvelope(
                    event_type="approval.response",
                    tenant_id="test",
                    payload={
                        "approval_id": approval_id,
                        "approved": True,
                        "approver": "admin",
                        "reason": "approved",
                    },
                )
                await gate.handle_response(response)

        asyncio.create_task(send_approval())

        result = await gate.request_approval(
            agent_id="supervised-agent",
            tenant_id="test",
            action="scale database",
            risk_level="medium",
            autonomy_level=AutonomyLevel.SUPERVISED,
        )

        assert result is True

    async def test_supervised_denies_on_rejection(self, config, mock_mesh):
        """SUPERVISED should raise ApprovalDeniedError on rejection."""
        gate = ApprovalGate(config, mock_mesh)

        async def send_denial():
            await asyncio.sleep(0.1)
            for approval_id in list(gate._pending.keys()):
                response = EventEnvelope(
                    event_type="approval.response",
                    tenant_id="test",
                    payload={
                        "approval_id": approval_id,
                        "approved": False,
                        "approver": "admin",
                        "reason": "too risky",
                    },
                )
                await gate.handle_response(response)

        asyncio.create_task(send_denial())

        with pytest.raises(ApprovalDeniedError, match="denied"):
            await gate.request_approval(
                agent_id="supervised-agent",
                tenant_id="test",
                action="dangerous action",
                risk_level="critical",
                autonomy_level=AutonomyLevel.SUPERVISED,
            )


class TestApprovalGateHandleResponse:
    """Tests for handle_response()."""

    async def test_orphaned_response_handled_gracefully(self, config, mock_mesh):
        """Responses for unknown approval IDs should not raise."""
        gate = ApprovalGate(config, mock_mesh)

        response = EventEnvelope(
            event_type="approval.response",
            tenant_id="test",
            payload={
                "approval_id": "nonexistent-id",
                "approved": True,
                "approver": "admin",
            },
        )
        # Should not raise
        await gate.handle_response(response)
