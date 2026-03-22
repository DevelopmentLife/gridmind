"""Agent routes — list, status, command, approvals, timeline."""

from __future__ import annotations

from datetime import UTC, datetime
from uuid import uuid4

import structlog
from fastapi import APIRouter, Depends, Query

from gateway.auth import TokenPayload, get_current_user, require_permission
from gateway.errors import NotFoundError
from gateway.schemas.agents import (
    AgentCommand,
    AgentCommandResponse,
    AgentResponse,
    AgentStatus,
    ApprovalDecision,
    ApprovalResponse,
    ApprovalStatus,
    TimelineEntry,
)
from gateway.schemas.common import PaginatedResponse

logger = structlog.get_logger()

router = APIRouter(prefix="/api/v1/agents", tags=["agents"])

# In-memory stores
_agents: dict[str, dict] = {}
_approvals: dict[str, dict] = {}
_timeline: list[dict] = []

# Seed some mock agents
_MOCK_AGENTS = [
    ("argus", "ARGUS", "perception", "autonomous", "haiku-4.5"),
    ("sentinel", "SENTINEL", "perception", "autonomous", "haiku-4.5"),
    ("sherlock", "SHERLOCK", "reasoning", "supervised", "sonnet-4.6"),
    ("prism", "PRISM", "reasoning", "supervised", "sonnet-4.6"),
    ("titan", "TITAN", "execution", "supervised", "sonnet-4.6"),
    ("forge", "FORGE", "execution", "supervised", "sonnet-4.6"),
    ("pulse", "PULSE", "self_healing", "autonomous", "haiku-4.5"),
    ("medic", "MEDIC", "self_healing", "autonomous", "sonnet-4.6"),
]


# ---------------------------------------------------------------------------
# GET /api/v1/agents — List
# ---------------------------------------------------------------------------

@router.get("", response_model=PaginatedResponse)
async def list_agents(
    cursor: str | None = Query(default=None),
    limit: int = Query(default=20, ge=1, le=100),
    user: TokenPayload = Depends(require_permission("agents:read")),
) -> PaginatedResponse:
    """List all agents for the current tenant."""
    now = datetime.now(UTC)
    agents = [
        AgentResponse(
            id=f"agent-{name}",
            name=name,
            display_name=display,
            tier=tier,
            autonomy_level=autonomy,
            model=model,
            status=AgentStatus.RUNNING,
            tenant_id=user.org_id,
            last_heartbeat=now,
            created_at=now,
        )
        for name, display, tier, autonomy, model in _MOCK_AGENTS
    ]

    # Add any dynamically created agents
    for a in _agents.values():
        if a.get("tenant_id") == user.org_id:
            agents.append(AgentResponse(**a))

    return PaginatedResponse(
        items=agents[:limit],
        total_count=len(agents),
        has_more=len(agents) > limit,
    )


# ---------------------------------------------------------------------------
# GET /api/v1/agents/{id} — Status
# ---------------------------------------------------------------------------

@router.get("/{agent_id}", response_model=AgentResponse)
async def get_agent(
    agent_id: str,
    user: TokenPayload = Depends(require_permission("agents:read")),
) -> AgentResponse:
    """Get agent status and details."""
    now = datetime.now(UTC)
    # Check mock agents
    for name, display, tier, autonomy, model in _MOCK_AGENTS:
        if agent_id == f"agent-{name}":
            return AgentResponse(
                id=agent_id,
                name=name,
                display_name=display,
                tier=tier,
                autonomy_level=autonomy,
                model=model,
                status=AgentStatus.RUNNING,
                tenant_id=user.org_id,
                last_heartbeat=now,
                created_at=now,
            )

    agent = _agents.get(agent_id)
    if not agent or agent.get("tenant_id") != user.org_id:
        raise NotFoundError("Agent not found.")
    return AgentResponse(**agent)


# ---------------------------------------------------------------------------
# POST /api/v1/agents/{id}/command — Send command
# ---------------------------------------------------------------------------

@router.post("/{agent_id}/command", response_model=AgentCommandResponse)
async def send_command(
    agent_id: str,
    body: AgentCommand,
    user: TokenPayload = Depends(require_permission("agents:write")),
) -> AgentCommandResponse:
    """Send a command to an agent (published to NATS)."""
    logger.info(
        "agent_command_sent",
        agent_id=agent_id,
        command=body.command,
        tenant_id=user.org_id,
    )
    # In production, publish to NATS: gridmind.commands.{tenant_id}.{agent_id}
    return AgentCommandResponse(
        agent_id=agent_id,
        command=body.command,
    )


# ---------------------------------------------------------------------------
# GET /api/v1/agents/approvals — List pending
# ---------------------------------------------------------------------------

@router.get("/approvals", response_model=PaginatedResponse)
async def list_approvals(
    cursor: str | None = Query(default=None),
    limit: int = Query(default=20, ge=1, le=100),
    user: TokenPayload = Depends(require_permission("agents:read")),
) -> PaginatedResponse:
    """List pending approval requests for the tenant."""
    tenant_approvals = [
        ApprovalResponse(**a)
        for a in _approvals.values()
        if a.get("tenant_id") == user.org_id
    ]
    return PaginatedResponse(
        items=tenant_approvals[:limit],
        total_count=len(tenant_approvals),
        has_more=len(tenant_approvals) > limit,
    )


# ---------------------------------------------------------------------------
# POST /api/v1/agents/approvals/{id}/decide — Approve/Reject
# ---------------------------------------------------------------------------

@router.post("/approvals/{approval_id}/decide", response_model=ApprovalResponse)
async def decide_approval(
    approval_id: str,
    body: ApprovalDecision,
    user: TokenPayload = Depends(require_permission("agents:write")),
) -> ApprovalResponse:
    """Approve or reject a pending approval request."""
    approval = _approvals.get(approval_id)
    if not approval or approval.get("tenant_id") != user.org_id:
        raise NotFoundError("Approval not found.")

    if approval["status"] != ApprovalStatus.PENDING:
        raise NotFoundError("Approval is no longer pending.")

    now = datetime.now(UTC)
    approval["status"] = ApprovalStatus.APPROVED if body.decision == "approve" else ApprovalStatus.REJECTED
    approval["decided_at"] = now
    approval["decided_by"] = user.sub

    logger.info(
        "approval_decided",
        approval_id=approval_id,
        decision=body.decision,
        user_id=user.sub,
    )

    return ApprovalResponse(**approval)


# ---------------------------------------------------------------------------
# GET /api/v1/agents/{id}/timeline — Activity timeline
# ---------------------------------------------------------------------------

@router.get("/{agent_id}/timeline", response_model=PaginatedResponse)
async def get_timeline(
    agent_id: str,
    cursor: str | None = Query(default=None),
    limit: int = Query(default=20, ge=1, le=100),
    user: TokenPayload = Depends(require_permission("agents:read")),
) -> PaginatedResponse:
    """Get agent activity timeline."""
    entries = [
        TimelineEntry(**e)
        for e in _timeline
        if e.get("agent_name") == agent_id.replace("agent-", "")
        and e.get("tenant_id") == user.org_id
    ]
    return PaginatedResponse(
        items=entries[:limit],
        total_count=len(entries),
        has_more=len(entries) > limit,
    )
