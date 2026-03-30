"""Waitlist signup ORM model for pre-launch email capture."""

from __future__ import annotations

from datetime import datetime
from uuid import uuid4

from sqlalchemy import Index, String, Text, func, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from shared.models.base import Base


class WaitlistSignup(Base):
    """Represents a waitlist email signup before product launch.

    This table is NOT tenant-scoped because signups happen before users
    have accounts.  No RLS policies are applied.
    """

    __tablename__ = "waitlist_signups"

    id: Mapped[str] = mapped_column(
        UUID(as_uuid=False),
        primary_key=True,
        default=uuid4,
        server_default=text("gen_random_uuid()"),
    )
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    source: Mapped[str] = mapped_column(
        String(100), nullable=False, server_default="homepage"
    )
    referral_code: Mapped[str | None] = mapped_column(String(50), nullable=True)
    ip_address: Mapped[str | None] = mapped_column(String(45), nullable=True)
    user_agent: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        default=func.now(),
        server_default=func.now(),
        nullable=False,
    )

    __table_args__ = (
        Index("ix_waitlist_signups_email", "email"),
        Index("ix_waitlist_signups_created_at", "created_at"),
    )
