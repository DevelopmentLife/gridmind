"""Deployment ORM model — managed database deployments per tenant."""

from __future__ import annotations

import enum
from uuid import uuid4

from sqlalchemy import CheckConstraint, ForeignKey, Index, Integer, String, text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from shared.models.base import Base, TimestampMixin


class DeploymentEngine(str, enum.Enum):
    """Supported database engine types."""

    POSTGRESQL = "postgresql"


class DeploymentStatus(str, enum.Enum):
    """Lifecycle status of a database deployment."""

    PROVISIONING = "provisioning"
    ACTIVE = "active"
    MAINTENANCE = "maintenance"
    DEGRADED = "degraded"
    FAILED = "failed"
    DECOMMISSIONING = "decommissioning"
    DECOMMISSIONED = "decommissioned"


class Deployment(Base, TimestampMixin):
    """Represents a managed database deployment owned by a tenant.

    Stores connection details (encrypted), infrastructure sizing, and
    deployment-specific configuration as JSONB.
    """

    __tablename__ = "deployments"

    deployment_id: Mapped[str] = mapped_column(
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
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    engine: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default=DeploymentEngine.POSTGRESQL.value,
    )
    version: Mapped[str] = mapped_column(String(50), nullable=False)
    status: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default=DeploymentStatus.PROVISIONING.value,
    )
    region: Mapped[str] = mapped_column(String(50), nullable=False)
    instance_type: Mapped[str] = mapped_column(String(50), nullable=False)
    node_count: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    storage_gb: Mapped[int] = mapped_column(Integer, nullable=False)
    connection_string_encrypted: Mapped[str | None] = mapped_column(
        String(1024), nullable=True
    )
    config: Mapped[dict | None] = mapped_column(JSONB, nullable=True)

    __table_args__ = (
        CheckConstraint(
            "engine IN ('postgresql')",
            name="ck_deployments_engine",
        ),
        CheckConstraint(
            "status IN ('provisioning','active','maintenance','degraded',"
            "'failed','decommissioning','decommissioned')",
            name="ck_deployments_status",
        ),
        Index("ix_deployments_tenant_id", "tenant_id"),
        Index("ix_deployments_status", "status"),
    )
