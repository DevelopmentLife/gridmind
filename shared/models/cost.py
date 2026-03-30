"""Cost attribution ORM models — agent decisions and cost rollups."""

from __future__ import annotations

from datetime import datetime
from uuid import uuid4

from sqlalchemy import (
    BigInteger,
    CheckConstraint,
    Computed,
    ForeignKey,
    Index,
    Integer,
    Numeric,
    String,
    UniqueConstraint,
    func,
    text,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from shared.models.base import Base


class AgentDecision(Base):
    """Records an individual agent LLM decision with full cost breakdown.

    Partitioned by ``created_at`` (monthly). Each row captures token usage,
    compute time, and tool-call costs for a single agent invocation.
    """

    __tablename__ = "agent_decisions"

    id: Mapped[str] = mapped_column(
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
    deployment_id: Mapped[str] = mapped_column(
        UUID(as_uuid=False),
        ForeignKey("deployments.deployment_id", ondelete="CASCADE"),
        nullable=False,
    )
    agent_name: Mapped[str] = mapped_column(String(100), nullable=False)
    decision_type: Mapped[str] = mapped_column(String(100), nullable=False)
    model_used: Mapped[str] = mapped_column(String(100), nullable=False)
    input_tokens: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    output_tokens: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    model_cost_usd: Mapped[float] = mapped_column(
        Numeric(12, 8), nullable=False, default=0.0,
    )
    compute_ms: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    compute_cost_usd: Mapped[float] = mapped_column(
        Numeric(12, 8), nullable=False, default=0.0,
    )
    tool_calls: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    tool_cost_usd: Mapped[float] = mapped_column(
        Numeric(12, 8), nullable=False, default=0.0,
    )
    total_cost_usd: Mapped[float] = mapped_column(
        Numeric(12, 8),
        Computed("model_cost_usd + compute_cost_usd + tool_cost_usd"),
    )
    session_id: Mapped[str | None] = mapped_column(
        UUID(as_uuid=False), nullable=True,
    )
    correlation_id: Mapped[str | None] = mapped_column(
        UUID(as_uuid=False), nullable=True,
    )
    metadata: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        primary_key=True,
        default=func.now(),
        server_default=func.now(),
        nullable=False,
    )

    __table_args__ = (
        Index("ix_agent_decisions_tenant_id", "tenant_id"),
        Index("ix_agent_decisions_deployment_id", "deployment_id"),
        Index("ix_agent_decisions_agent_name", "agent_name"),
        Index("ix_agent_decisions_model_used", "model_used"),
        Index("ix_agent_decisions_created_at", "created_at"),
    )


class CostRollup(Base):
    """Aggregated cost data per tenant/deployment/agent per time period.

    Unique on ``(tenant_id, deployment_id, agent_name, period_start, period_type)``
    to allow upsert-based rollup aggregation.
    """

    __tablename__ = "cost_rollups"

    id: Mapped[str] = mapped_column(
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
    deployment_id: Mapped[str] = mapped_column(
        UUID(as_uuid=False),
        ForeignKey("deployments.deployment_id", ondelete="CASCADE"),
        nullable=False,
    )
    agent_name: Mapped[str] = mapped_column(String(100), nullable=False)
    period_start: Mapped[datetime] = mapped_column(nullable=False)
    period_end: Mapped[datetime] = mapped_column(nullable=False)
    period_type: Mapped[str] = mapped_column(String(20), nullable=False)
    total_decisions: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    total_tokens: Mapped[int] = mapped_column(BigInteger, nullable=False, default=0)
    total_cost_usd: Mapped[float] = mapped_column(
        Numeric(12, 8), nullable=False, default=0.0,
    )
    model_breakdown: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        default=func.now(), server_default=func.now(), nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        default=func.now(), server_default=func.now(), onupdate=func.now(), nullable=False,
    )

    __table_args__ = (
        CheckConstraint(
            "period_type IN ('hourly', 'daily', 'monthly')",
            name="ck_cost_rollups_period_type",
        ),
        UniqueConstraint(
            "tenant_id", "deployment_id", "agent_name", "period_start", "period_type",
            name="uq_cost_rollups_unique_period",
        ),
        Index("ix_cost_rollups_tenant_id", "tenant_id"),
        Index("ix_cost_rollups_deployment_id", "deployment_id"),
        Index("ix_cost_rollups_period_start", "period_start"),
        Index("ix_cost_rollups_period_type", "period_type"),
    )
