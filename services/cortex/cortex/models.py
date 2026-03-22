"""Core data models, enums, and type definitions for the Cortex agent runtime."""

from __future__ import annotations

import enum
import uuid
from datetime import UTC, datetime
from typing import Any

from pydantic import BaseModel, Field


class AgentTier(str, enum.Enum):
    """Classification tier for agent capabilities and permissions."""

    PERCEPTION = "perception"
    REASONING = "reasoning"
    EXECUTION = "execution"
    SELF_HEALING = "self_healing"
    SPECIALIZED = "specialized"


class AutonomyLevel(str, enum.Enum):
    """Autonomy level controlling approval requirements."""

    AUTONOMOUS = "autonomous"
    SUPERVISED = "supervised"
    ADVISORY = "advisory"


class ToolDefinition(BaseModel):
    """Schema for a tool that an agent is allowed to invoke."""

    name: str
    description: str
    input_schema: dict[str, Any] = Field(default_factory=dict)


class AgentMetrics(BaseModel):
    """Runtime metrics for an agent instance."""

    events_processed: int = 0
    cycles_completed: int = 0
    errors: int = 0
    avg_cycle_duration_ms: float = 0.0


class EventEnvelope(BaseModel):
    """Base envelope for all events flowing through the NATS event mesh."""

    event_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    event_type: str
    tenant_id: str
    source_agent: str = ""
    timestamp: datetime = Field(default_factory=lambda: datetime.now(UTC))
    payload: dict[str, Any] = Field(default_factory=dict)
    correlation_id: str | None = None


class ApprovalRequest(BaseModel):
    """Event requesting human-in-the-loop approval."""

    approval_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    agent_id: str
    tenant_id: str
    action_description: str
    risk_level: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(UTC))


class ApprovalResponse(BaseModel):
    """Event containing an approval decision."""

    approval_id: str
    approved: bool
    approver: str = ""
    reason: str = ""
    timestamp: datetime = Field(default_factory=lambda: datetime.now(UTC))


class AgentStatus(str, enum.Enum):
    """Runtime status of an agent instance."""

    STARTING = "starting"
    HEALTHY = "healthy"
    DEGRADED = "degraded"
    DEAD = "dead"
    STOPPED = "stopped"


class AgentInfo(BaseModel):
    """Metadata about a running agent instance."""

    agent_name: str
    tenant_id: str
    tier: AgentTier
    autonomy_level: AutonomyLevel
    model_assignment: str
    visibility: str
    description: str
    status: AgentStatus = AgentStatus.STARTING
    metrics: AgentMetrics = Field(default_factory=AgentMetrics)


# Tier-based publish permission enforcement.
# Maps each AgentTier to the event type prefixes it is allowed to publish.
TIER_PUBLISH_PERMISSIONS: dict[AgentTier, list[str]] = {
    AgentTier.PERCEPTION: [
        "perception.",
        "workload.",
        "infra.",
        "agent.heartbeat",
        "agent.health",
    ],
    AgentTier.REASONING: [
        "perception.",
        "reasoning.",
        "workload.",
        "cost.",
        "drift.",
        "capacity.",
        "action.",
        "scaling.",
        "incident.",
        "security.",
        "agent.heartbeat",
        "agent.health",
        "approval.",
    ],
    AgentTier.EXECUTION: [
        "execution.",
        "scaling.",
        "action.",
        "drift.",
        "tenant.",
        "agent.heartbeat",
        "agent.health",
        "approval.",
    ],
    AgentTier.SELF_HEALING: [
        "self_healing.",
        "agent.",
        "infra.",
        "approval.",
        "action.",
    ],
    AgentTier.SPECIALIZED: [
        "specialized.",
        "agent.heartbeat",
        "agent.health",
        "billing.",
        "onboarding.",
        "communication.",
        "documentation.",
        "finops.",
        "customer.",
    ],
}
