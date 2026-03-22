"""Incident ORM model — tracks operational incidents per deployment."""

from __future__ import annotations

import enum
from datetime import datetime
from uuid import uuid4

from sqlalchemy import CheckConstraint, ForeignKey, Index, String, Text, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from shared.models.base import Base, TimestampMixin


class IncidentSeverity(str, enum.Enum):
    """Severity classification for incidents (PagerDuty-aligned)."""

    P1 = "P1"
    P2 = "P2"
    P3 = "P3"
    P4 = "P4"


class IncidentStatus(str, enum.Enum):
    """Lifecycle status of an incident."""

    DETECTED = "detected"
    INVESTIGATING = "investigating"
    MITIGATING = "mitigating"
    RESOLVED = "resolved"
    POSTMORTEM = "postmortem"


class Incident(Base, TimestampMixin):
    """An operational incident associated with a tenant deployment.

    Tracks the full incident lifecycle from detection through postmortem,
    including optional root cause analysis populated by SHERLOCK.
    """

    __tablename__ = "incidents"

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
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    severity: Mapped[str] = mapped_column(String(10), nullable=False)
    status: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default=IncidentStatus.DETECTED.value,
    )
    root_cause: Mapped[str | None] = mapped_column(Text, nullable=True)
    resolved_at: Mapped[datetime | None] = mapped_column(nullable=True)

    __table_args__ = (
        CheckConstraint(
            "severity IN ('P1','P2','P3','P4')",
            name="ck_incidents_severity",
        ),
        CheckConstraint(
            "status IN ('detected','investigating','mitigating','resolved','postmortem')",
            name="ck_incidents_status",
        ),
        Index("ix_incidents_tenant_id", "tenant_id"),
        Index("ix_incidents_deployment_id", "deployment_id"),
        Index("ix_incidents_severity", "severity"),
        Index("ix_incidents_status", "status"),
    )
