"""Billing ORM models — plans, subscriptions, invoices, usage, and payment events."""

from __future__ import annotations

import enum
from datetime import datetime
from uuid import uuid4

from sqlalchemy import (
    CheckConstraint,
    Float,
    ForeignKey,
    Index,
    Integer,
    String,
    func,
    text,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from shared.models.base import Base, TimestampMixin


class SubscriptionStatus(str, enum.Enum):
    """Stripe-aligned subscription status."""

    TRIALING = "trialing"
    ACTIVE = "active"
    PAST_DUE = "past_due"
    SUSPENDED = "suspended"
    CANCELED = "canceled"


class Plan(Base):
    """Defines a pricing plan with Stripe linkage and resource limits.

    Plans are seeded during deployment — typically four rows
    (Starter, Growth, Scale, Enterprise).
    """

    __tablename__ = "plans"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False, unique=True)
    stripe_price_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    monthly_price_cents: Mapped[int] = mapped_column(Integer, nullable=False)
    annual_price_cents: Mapped[int] = mapped_column(Integer, nullable=False)
    max_deployments: Mapped[int] = mapped_column(Integer, nullable=False)
    max_agents: Mapped[int] = mapped_column(Integer, nullable=False)
    max_team_members: Mapped[int] = mapped_column(Integer, nullable=False)
    features: Mapped[dict | None] = mapped_column(JSONB, nullable=True)


class Subscription(Base, TimestampMixin):
    """A tenant's active subscription to a plan, synced with Stripe.

    Tracks the current billing period and subscription lifecycle status.
    """

    __tablename__ = "subscriptions"

    id: Mapped[str] = mapped_column(
        UUID(as_uuid=False),
        primary_key=True,
        default=uuid4,
        server_default=text("gen_random_uuid()"),
    )
    org_id: Mapped[str] = mapped_column(
        UUID(as_uuid=False),
        ForeignKey("tenants.tenant_id", ondelete="CASCADE"),
        nullable=False,
    )
    plan_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("plans.id", ondelete="RESTRICT"),
        nullable=False,
    )
    stripe_subscription_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    status: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default=SubscriptionStatus.TRIALING.value,
    )
    current_period_start: Mapped[datetime | None] = mapped_column(nullable=True)
    current_period_end: Mapped[datetime | None] = mapped_column(nullable=True)

    __table_args__ = (
        CheckConstraint(
            "status IN ('trialing','active','past_due','suspended','canceled')",
            name="ck_subscriptions_status",
        ),
        Index("ix_subscriptions_org_id", "org_id"),
        Index("ix_subscriptions_plan_id", "plan_id"),
        Index("ix_subscriptions_status", "status"),
    )


class Invoice(Base):
    """A billing invoice for a tenant, mirrored from Stripe.

    Invoices are append-only records — no updated_at column.
    """

    __tablename__ = "invoices"

    id: Mapped[str] = mapped_column(
        UUID(as_uuid=False),
        primary_key=True,
        default=uuid4,
        server_default=text("gen_random_uuid()"),
    )
    org_id: Mapped[str] = mapped_column(
        UUID(as_uuid=False),
        ForeignKey("tenants.tenant_id", ondelete="CASCADE"),
        nullable=False,
    )
    stripe_invoice_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    amount_due_cents: Mapped[int] = mapped_column(Integer, nullable=False)
    amount_paid_cents: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    status: Mapped[str] = mapped_column(String(50), nullable=False)
    period_start: Mapped[datetime] = mapped_column(nullable=False)
    period_end: Mapped[datetime] = mapped_column(nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        default=func.now(),
        server_default=func.now(),
        nullable=False,
    )

    __table_args__ = (
        Index("ix_invoices_org_id", "org_id"),
        Index("ix_invoices_status", "status"),
    )


class UsageRecord(Base):
    """A metered usage data point for billing calculation.

    Recorded hourly by the LEDGER agent; aggregated for Stripe usage reports.
    """

    __tablename__ = "usage_records"

    id: Mapped[str] = mapped_column(
        UUID(as_uuid=False),
        primary_key=True,
        default=uuid4,
        server_default=text("gen_random_uuid()"),
    )
    org_id: Mapped[str] = mapped_column(
        UUID(as_uuid=False),
        ForeignKey("tenants.tenant_id", ondelete="CASCADE"),
        nullable=False,
    )
    deployment_id: Mapped[str] = mapped_column(
        UUID(as_uuid=False),
        ForeignKey("deployments.deployment_id", ondelete="CASCADE"),
        nullable=False,
    )
    metric: Mapped[str] = mapped_column(String(100), nullable=False)
    quantity: Mapped[float] = mapped_column(Float, nullable=False)
    recorded_at: Mapped[datetime] = mapped_column(nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        default=func.now(),
        server_default=func.now(),
        nullable=False,
    )

    __table_args__ = (
        Index("ix_usage_records_org_id", "org_id"),
        Index("ix_usage_records_deployment_id", "deployment_id"),
        Index("ix_usage_records_recorded_at", "recorded_at"),
    )


class PaymentEvent(Base):
    """A Stripe webhook payment event record.

    Append-only log of payment lifecycle events (succeeded, failed, etc.).
    """

    __tablename__ = "payment_events"

    id: Mapped[str] = mapped_column(
        UUID(as_uuid=False),
        primary_key=True,
        default=uuid4,
        server_default=text("gen_random_uuid()"),
    )
    org_id: Mapped[str] = mapped_column(
        UUID(as_uuid=False),
        ForeignKey("tenants.tenant_id", ondelete="CASCADE"),
        nullable=False,
    )
    stripe_event_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    event_type: Mapped[str] = mapped_column(String(100), nullable=False)
    amount_cents: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    status: Mapped[str] = mapped_column(String(50), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        default=func.now(),
        server_default=func.now(),
        nullable=False,
    )

    __table_args__ = (
        Index("ix_payment_events_org_id", "org_id"),
        Index("ix_payment_events_event_type", "event_type"),
    )
