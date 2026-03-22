"""ApprovalGate — human-in-the-loop approval system for supervised agents."""

from __future__ import annotations

import asyncio
from typing import Any

import structlog

from cortex.config import CortexConfig
from cortex.models import (
    ApprovalRequest,
    ApprovalResponse,
    AutonomyLevel,
    EventEnvelope,
)

logger = structlog.get_logger(__name__)


class ApprovalDeniedError(Exception):
    """Raised when a human reviewer denies an approval request."""


class AdvisoryOnlyError(Exception):
    """Raised when an ADVISORY agent attempts to execute an action."""


class ApprovalGate:
    """Manages approval workflows for supervised and advisory agents.

    AUTONOMOUS agents receive synthetic auto-approval.
    SUPERVISED agents block until a human approves or rejects (with timeout).
    ADVISORY agents always raise AdvisoryOnlyError.
    """

    def __init__(self, config: CortexConfig, event_mesh: Any) -> None:
        self._config = config
        self._event_mesh = event_mesh
        self._pending: dict[str, asyncio.Event] = {}
        self._responses: dict[str, ApprovalResponse] = {}

    async def request_approval(
        self,
        agent_id: str,
        tenant_id: str,
        action: str,
        risk_level: str,
        autonomy_level: AutonomyLevel,
    ) -> bool:
        """Request approval for an agent action.

        Args:
            agent_id: The requesting agent's identifier.
            tenant_id: The tenant context.
            action: Human-readable description of the action.
            risk_level: Risk classification (low, medium, high, critical).
            autonomy_level: The agent's autonomy level.

        Returns:
            True if approved.

        Raises:
            AdvisoryOnlyError: If the agent is ADVISORY level.
            ApprovalDeniedError: If the request is denied or times out.
        """
        if autonomy_level == AutonomyLevel.ADVISORY:
            raise AdvisoryOnlyError(
                f"Agent {agent_id} is ADVISORY-only and cannot execute actions"
            )

        if autonomy_level == AutonomyLevel.AUTONOMOUS:
            logger.info(
                "approval.auto_approved",
                agent_id=agent_id,
                tenant_id=tenant_id,
                action=action,
            )
            return True

        # SUPERVISED: publish request and wait for human response
        request = ApprovalRequest(
            agent_id=agent_id,
            tenant_id=tenant_id,
            action_description=action,
            risk_level=risk_level,
        )

        wait_event = asyncio.Event()
        self._pending[request.approval_id] = wait_event

        # Publish approval request event
        envelope = EventEnvelope(
            event_type="approval.request",
            tenant_id=tenant_id,
            source_agent=agent_id,
            payload=request.model_dump(mode="json"),
        )
        await self._event_mesh.publish(envelope)

        logger.info(
            "approval.requested",
            approval_id=request.approval_id,
            agent_id=agent_id,
            action=action,
            risk_level=risk_level,
        )

        # Wait for response with timeout
        try:
            await asyncio.wait_for(wait_event.wait(), timeout=self._config.approval_timeout)
        except asyncio.TimeoutError:
            self._pending.pop(request.approval_id, None)
            raise ApprovalDeniedError(
                f"Approval request {request.approval_id} timed out after "
                f"{self._config.approval_timeout}s"
            ) from None

        response = self._responses.pop(request.approval_id, None)
        self._pending.pop(request.approval_id, None)

        if response is None or not response.approved:
            reason = response.reason if response else "No response received"
            raise ApprovalDeniedError(
                f"Approval denied for {agent_id}: {reason}"
            )

        logger.info(
            "approval.granted",
            approval_id=request.approval_id,
            agent_id=agent_id,
            approver=response.approver,
        )
        return True

    async def handle_response(self, event: EventEnvelope) -> None:
        """Handle an incoming approval response event.

        Args:
            event: Event envelope containing an ApprovalResponse payload.
        """
        response = ApprovalResponse(**event.payload)
        approval_id = response.approval_id

        if approval_id in self._pending:
            self._responses[approval_id] = response
            self._pending[approval_id].set()
            logger.info(
                "approval.response_received",
                approval_id=approval_id,
                approved=response.approved,
            )
        else:
            logger.warning(
                "approval.response_orphaned",
                approval_id=approval_id,
            )
