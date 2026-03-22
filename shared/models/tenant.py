"""Tenant ORM model and related enums."""

from __future__ import annotations

import enum
from datetime import datetime
from uuid import uuid4

from sqlalchemy import CheckConstraint, Float, Index, String, Text, text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from shared.models.base import Base, TimestampMixin


class TenantStatus(str, enum.Enum):
    """Lifecycle status of a tenant organization."""

    PROVISIONING = "provisioning"
    TRIAL = "trial"
    ACTIVE = "active"
    SUSPENDED = "suspended"
    DEACTIVATING = "deactivating"
    DEACTIVATED = "deactivated"
    ARCHIVED = "archived"


class TenantTier(str, enum.Enum):
    """Pricing tier for a tenant."""

    STARTER = "STARTER"
    GROWTH = "GROWTH"
    SCALE = "SCALE"
    ENTERPRISE = "ENTERPRISE"
    STRATEGIC = "STRATEGIC"


class BillingModel(str, enum.Enum):
    """Billing model for a tenant."""

    BYOC = "BYOC"
    DEDICATED = "DEDICATED"
    ENTERPRISE_LICENSE = "ENTERPRISE_LICENSE"


class Tenant(Base, TimestampMixin):
    """Represents a customer organization (tenant) in the GridMind platform.

    Each tenant has a unique slug, a pricing tier, a billing model, and
    health/churn scoring metadata used by the STEWARD agent.
    """

    __tablename__ = "tenants"

    tenant_id: Mapped[str] = mapped_column(
        UUID(as_uuid=False),
        primary_key=True,
        default=uuid4,
        server_default=text("gen_random_uuid()"),
    )
    org_name: Mapped[str] = mapped_column(String(255), nullable=False)
    slug: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    status: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default=TenantStatus.PROVISIONING.value,
    )
    tier: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default=TenantTier.STARTER.value,
    )
    billing_model: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default=BillingModel.BYOC.value,
    )
    stripe_customer_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    health_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    churn_risk: Mapped[float | None] = mapped_column(Float, nullable=True)
    trial_ends_at: Mapped[datetime | None] = mapped_column(nullable=True)
    settings: Mapped[dict | None] = mapped_column(JSONB, nullable=True)

    __table_args__ = (
        CheckConstraint(
            "status IN ('provisioning','trial','active','suspended',"
            "'deactivating','deactivated','archived')",
            name="ck_tenants_status",
        ),
        CheckConstraint(
            "tier IN ('STARTER','GROWTH','SCALE','ENTERPRISE','STRATEGIC')",
            name="ck_tenants_tier",
        ),
        CheckConstraint(
            "billing_model IN ('BYOC','DEDICATED','ENTERPRISE_LICENSE')",
            name="ck_tenants_billing_model",
        ),
        Index("ix_tenants_slug", "slug"),
        Index("ix_tenants_status", "status"),
    )
