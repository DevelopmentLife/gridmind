"""Agent ORM models — registration and runtime state."""

from __future__ import annotations

import enum
from datetime import datetime
from uuid import uuid4

from sqlalchemy import CheckConstraint, Float, ForeignKey, Index, Integer, String, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from shared.models.base import Base, TimestampMixin


class AgentStatus(str, enum.Enum):
    """Runtime status of an agent instance."""

    RUNNING = "running"
    DEGRADED = "degraded"
    STOPPED = "stopped"
    DEAD = "dead"
    RESTARTING = "restarting"


class AgentRegistration(Base, TimestampMixin):
    """Registry entry for a deployed agent instance.

    Each agent is uniquely identified by agent_id and bound to a tenant.
    The agent_type field stores the snake_case agent name (e.g. 'argus').
    """

    __tablename__ = "agent_registry"

    agent_id: Mapped[str] = mapped_column(
        UUID(as_uuid=False),
        primary_key=True,
        default=uuid4,
        server_default=text("gen_random_uuid()"),
    )
    tenant_id: Mapped[str] = mapped_column(
        UUID(as_uuid=False),
        ForeignKey("tenants.tenant_id", ondelete="CASCADE"),
        nullable=False,
    )
    agent_type: Mapped[str] = mapped_column(String(100), nullable=False)
    version: Mapped[str] = mapped_column(String(50), nullable=False)
    status: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default=AgentStatus.STOPPED.value,
    )

    __table_args__ = (
        CheckConstraint(
            "status IN ('running','degraded','stopped','dead','restarting')",
            name="ck_agent_registry_status",
        ),
        Index("ix_agent_registry_tenant_id", "tenant_id"),
        Index("ix_agent_registry_status", "status"),
    )


class AgentState(Base):
    """Real-time state snapshot for an agent, updated on every heartbeat.

    Uses agent_id as the primary key — one state row per registered agent.
    No created_at because it is always overwritten; updated_at tracks
    the last heartbeat time.
    """

    __tablename__ = "agent_state"

    agent_id: Mapped[str] = mapped_column(
        UUID(as_uuid=False),
        ForeignKey("agent_registry.agent_id", ondelete="CASCADE"),
        primary_key=True,
    )
    status: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default=AgentStatus.STOPPED.value,
    )
    cpu_pct: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    memory_pct: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    tasks_in_flight: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    last_heartbeat_at: Mapped[datetime | None] = mapped_column(nullable=True)
    error_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    uptime_seconds: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    updated_at: Mapped[datetime] = mapped_column(
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        nullable=False,
    )

    __table_args__ = (
        CheckConstraint(
            "status IN ('running','degraded','stopped','dead','restarting')",
            name="ck_agent_state_status",
        ),
    )
