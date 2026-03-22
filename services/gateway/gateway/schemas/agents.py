"""Agent endpoint schemas."""

from __future__ import annotations

from datetime import datetime
from enum import StrEnum

from pydantic import BaseModel, Field


class AgentStatus(StrEnum):
    """Agent operational status."""

    RUNNING = "running"
    IDLE = "idle"
    PAUSED = "paused"
    ERROR = "error"
    STOPPED = "stopped"


class AgentResponse(BaseModel):
    """Agent status and details."""

    id: str
    name: str
    display_name: str
    tier: str
    autonomy_level: str
    model: str
    status: AgentStatus
    deployment_id: str | None = None
    tenant_id: str
    last_action: str | None = None
    last_heartbeat: datetime | None = None
    cycle_count: int = 0
    error_count: int = 0
    created_at: datetime


class AgentCommand(BaseModel):
    """Send a command to an agent."""

    command: str = Field(description="Command name (e.g. 'pause', 'resume', 'restart', 'run_cycle')")
    parameters: dict[str, str] = Field(default_factory=dict)


class AgentCommandResponse(BaseModel):
    """Response after issuing a command."""

    agent_id: str
    command: str
    status: str = "accepted"
    message: str = "Command published to agent."


class ApprovalStatus(StrEnum):
    """Approval request status."""

    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    EXPIRED = "expired"


class ApprovalResponse(BaseModel):
    """Human-in-the-loop approval request."""

    id: str
    agent_name: str
    action_type: str
    description: str
    risk_level: str
    status: ApprovalStatus
    deployment_id: str | None = None
    tenant_id: str
    requested_at: datetime
    decided_at: datetime | None = None
    decided_by: str | None = None
    parameters: dict[str, str] = Field(default_factory=dict)


class ApprovalDecision(BaseModel):
    """Approve or reject a pending approval."""

    decision: str = Field(description="'approve' or 'reject'")
    reason: str | None = None


class TimelineEntry(BaseModel):
    """Agent activity timeline entry."""

    id: str
    agent_name: str
    event_type: str
    description: str
    severity: str = "info"
    deployment_id: str | None = None
    tenant_id: str
    timestamp: datetime
    metadata: dict[str, str] = Field(default_factory=dict)
