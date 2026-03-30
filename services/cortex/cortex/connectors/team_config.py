"""Normalized team configuration models — framework-agnostic Pydantic v2 specs."""

from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field


class ModelRoutingConfig(BaseModel):
    """Configuration for routing decisions to different Claude models.

    Attributes:
        default_model: Model used when no specific routing rule matches.
        perception_model: Model for perception-tier agents.
        reasoning_model: Model for reasoning-tier agents.
        critical_model: Model for critical/executive decisions.
    """

    default_model: str = Field(default="claude-sonnet-4-6")
    perception_model: str = Field(default="claude-haiku-4-5")
    reasoning_model: str = Field(default="claude-sonnet-4-6")
    critical_model: str = Field(default="claude-opus-4-6")


class ScalingConfig(BaseModel):
    """Scaling parameters for agent team deployment.

    Attributes:
        min_instances: Minimum number of agent instances.
        max_instances: Maximum number of agent instances.
        scale_on_queue_depth: Scale up when event queue exceeds this depth.
        cooldown_seconds: Seconds to wait before scaling down.
    """

    min_instances: int = Field(default=1, ge=1)
    max_instances: int = Field(default=10, ge=1)
    scale_on_queue_depth: int = Field(default=100, ge=1)
    cooldown_seconds: int = Field(default=300, ge=0)


class AgentSpec(BaseModel):
    """Specification for a single agent within a team.

    Attributes:
        name: Unique agent identifier (snake_case).
        display_name: Human-readable name (UPPER).
        tier: Agent tier (perception, reasoning, execution, self_healing).
        model: Claude model assignment.
        autonomy: Autonomy level (autonomous, supervised, advisory).
        tools: List of tool names this agent may invoke.
        subscriptions: NATS event patterns to subscribe to.
        emissions: Event types this agent may publish.
        cycle_seconds: Tick-driven cycle interval (0 = event-driven only).
        description: One-line description of the agent's purpose.
        extra: Additional framework-specific configuration.
    """

    name: str = Field(..., min_length=1, max_length=100)
    display_name: str = Field(default="")
    tier: str = Field(default="reasoning")
    model: str = Field(default="claude-sonnet-4-6")
    autonomy: str = Field(default="supervised")
    tools: list[str] = Field(default_factory=list)
    subscriptions: list[str] = Field(default_factory=list)
    emissions: list[str] = Field(default_factory=list)
    cycle_seconds: float = Field(default=0.0, ge=0.0)
    description: str = Field(default="")
    extra: dict[str, Any] = Field(default_factory=dict)


class AgentTeamSpec(BaseModel):
    """Complete team configuration — the normalized interchange format.

    All framework connectors import into and export from this model.

    Attributes:
        team_name: Unique team identifier.
        version: Spec version for forward compatibility.
        description: Human-readable team description.
        agents: List of agent specifications.
        model_routing: Default model routing configuration.
        scaling: Scaling parameters for the team deployment.
        metadata: Arbitrary key-value metadata.
        source_framework: The framework this spec was imported from.
    """

    team_name: str = Field(..., min_length=1, max_length=255)
    version: str = Field(default="1.0")
    description: str = Field(default="")
    agents: list[AgentSpec] = Field(default_factory=list)
    model_routing: ModelRoutingConfig = Field(default_factory=ModelRoutingConfig)
    scaling: ScalingConfig = Field(default_factory=ScalingConfig)
    metadata: dict[str, Any] = Field(default_factory=dict)
    source_framework: str = Field(default="nullclaw")
