"""Approval ORM models — human-in-the-loop gates for agent actions."""

from __future__ import annotations

import enum
from datetime import datetime
from uuid import uuid4

from sqlalchemy import CheckConstraint, ForeignKey, Index, String, Text, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from shared.models.base import Base


class ApprovalRiskLevel(str, enum.Enum):
    """Risk classification for an approval request."""

    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class ApprovalStatus(str, enum.Enum):
    """Lifecycle status of an approval request."""

    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    EXPIRED = "expired"
    AUTO_APPROVED = "auto_approved"


class ApprovalDecision(str, enum.Enum):
    """Decision choices for an approval response."""

    APPROVE = "approve"
    REJECT = "reject"


class ApprovalRequest(Base):
    """A request from an agent for human approval before executing an action.

    SUPERVISED agents emit these when their autonomy level requires human
    sign-off. The request expires after a configurable timeout (default 300s).
    """

    __tablename__ = "approval_requests"

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
    agent_id: Mapped[str] = mapped_column(String(255), nullable=False)
    action_description: Mapped[str] = mapped_column(Text, nullable=False)
    risk_level: Mapped[str] = mapped_column(String(50), nullable=False)
    status: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default=ApprovalStatus.PENDING.value,
    )
    decided_by: Mapped[str | None] = mapped_column(
        UUID(as_uuid=False),
        ForeignKey("users.user_id", ondelete="SET NULL"),
        nullable=True,
    )
    decided_at: Mapped[datetime | None] = mapped_column(nullable=True)
    expires_at: Mapped[datetime] = mapped_column(nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        default=datetime.utcnow,
        nullable=False,
    )

    __table_args__ = (
        CheckConstraint(
            "risk_level IN ('low','medium','high','critical')",
            name="ck_approval_requests_risk_level",
        ),
        CheckConstraint(
            "status IN ('pending','approved','rejected','expired','auto_approved')",
            name="ck_approval_requests_status",
        ),
        Index("ix_approval_requests_tenant_id", "tenant_id"),
        Index("ix_approval_requests_status", "status"),
        Index("ix_approval_requests_decided_by", "decided_by"),
    )


class ApprovalResponse(Base):
    """A human decision on an approval request.

    Each response records who made the decision, what they decided,
    and an optional reason. Append-only — no updated_at.
    """

    __tablename__ = "approval_responses"

    id: Mapped[str] = mapped_column(
        UUID(as_uuid=False),
        primary_key=True,
        default=uuid4,
        server_default=text("gen_random_uuid()"),
    )
    request_id: Mapped[str] = mapped_column(
        UUID(as_uuid=False),
        ForeignKey("approval_requests.id", ondelete="CASCADE"),
        nullable=False,
    )
    decision: Mapped[str] = mapped_column(String(50), nullable=False)
    reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    decided_by: Mapped[str] = mapped_column(
        UUID(as_uuid=False),
        ForeignKey("users.user_id", ondelete="SET NULL"),
        nullable=False,
    )
    created_at: Mapped[datetime] = mapped_column(
        default=datetime.utcnow,
        nullable=False,
    )

    __table_args__ = (
        CheckConstraint(
            "decision IN ('approve','reject')",
            name="ck_approval_responses_decision",
        ),
        Index("ix_approval_responses_request_id", "request_id"),
        Index("ix_approval_responses_decided_by", "decided_by"),
    )
