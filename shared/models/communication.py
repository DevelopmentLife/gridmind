"""Communication ORM models — notifications and campaigns."""

from __future__ import annotations

import enum
from datetime import datetime
from uuid import uuid4

from sqlalchemy import CheckConstraint, ForeignKey, Index, String, Text, func, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from shared.models.base import Base, TimestampMixin


class NotificationChannel(str, enum.Enum):
    """Delivery channel for a notification."""

    EMAIL = "email"
    SLACK = "slack"
    PAGERDUTY = "pagerduty"
    PUSH = "push"


class NotificationStatus(str, enum.Enum):
    """Delivery status of a notification."""

    PENDING = "pending"
    SENT = "sent"
    FAILED = "failed"
    DELIVERED = "delivered"


class CampaignStatus(str, enum.Enum):
    """Lifecycle status of a communication campaign."""

    ACTIVE = "active"
    PAUSED = "paused"
    COMPLETED = "completed"


class Notification(Base):
    """An outbound notification to a user via email, Slack, PagerDuty, or push.

    Managed by the HERALD agent. Tracks delivery status and supports
    template-based rendering.
    """

    __tablename__ = "notifications"

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
    user_id: Mapped[str | None] = mapped_column(
        UUID(as_uuid=False),
        ForeignKey("users.user_id", ondelete="SET NULL"),
        nullable=True,
    )
    channel: Mapped[str] = mapped_column(String(50), nullable=False)
    template_id: Mapped[str] = mapped_column(String(255), nullable=False)
    subject: Mapped[str] = mapped_column(String(500), nullable=False)
    body: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default=NotificationStatus.PENDING.value,
    )
    sent_at: Mapped[datetime | None] = mapped_column(nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        default=func.now(),
        server_default=func.now(),
        nullable=False,
    )

    __table_args__ = (
        CheckConstraint(
            "channel IN ('email','slack','pagerduty','push')",
            name="ck_notifications_channel",
        ),
        CheckConstraint(
            "status IN ('pending','sent','failed','delivered')",
            name="ck_notifications_status",
        ),
        Index("ix_notifications_tenant_id", "tenant_id"),
        Index("ix_notifications_user_id", "user_id"),
        Index("ix_notifications_status", "status"),
    )


class Campaign(Base, TimestampMixin):
    """A communication campaign that triggers notifications based on events.

    Campaigns are configured by the HERALD agent and can be paused or
    completed. Each campaign references a template and trigger type.
    """

    __tablename__ = "campaigns"

    id: Mapped[str] = mapped_column(
        UUID(as_uuid=False),
        primary_key=True,
        default=uuid4,
        server_default=text("gen_random_uuid()"),
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    trigger_type: Mapped[str] = mapped_column(String(100), nullable=False)
    template_id: Mapped[str] = mapped_column(String(255), nullable=False)
    status: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default=CampaignStatus.ACTIVE.value,
    )

    __table_args__ = (
        CheckConstraint(
            "status IN ('active','paused','completed')",
            name="ck_campaigns_status",
        ),
        Index("ix_campaigns_status", "status"),
    )
