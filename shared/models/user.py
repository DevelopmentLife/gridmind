"""User ORM model and related enums."""

from __future__ import annotations

import enum
from datetime import datetime
from uuid import uuid4

from sqlalchemy import Boolean, CheckConstraint, Index, Integer, String, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from shared.models.base import Base, TimestampMixin


class UserStatus(str, enum.Enum):
    """Lifecycle status of a user account."""

    PENDING_VERIFICATION = "pending_verification"
    ACTIVE = "active"
    SUSPENDED = "suspended"
    LOCKED = "locked"
    DELETED = "deleted"


class User(Base, TimestampMixin):
    """Represents an individual user account in the GridMind platform.

    Supports soft-delete via the deleted_at column, MFA with encrypted
    secrets, and progressive login lockout via failed_login_count.
    """

    __tablename__ = "users"

    user_id: Mapped[str] = mapped_column(
        UUID(as_uuid=False),
        primary_key=True,
        default=uuid4,
        server_default=text("gen_random_uuid()"),
    )
    email: Mapped[str] = mapped_column(String(320), unique=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    status: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default=UserStatus.PENDING_VERIFICATION.value,
    )
    mfa_enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    mfa_secret_encrypted: Mapped[str | None] = mapped_column(String(512), nullable=True)
    last_login_at: Mapped[datetime | None] = mapped_column(nullable=True)
    failed_login_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    locked_until: Mapped[datetime | None] = mapped_column(nullable=True)
    deleted_at: Mapped[datetime | None] = mapped_column(nullable=True)

    __table_args__ = (
        CheckConstraint(
            "status IN ('pending_verification','active','suspended','locked','deleted')",
            name="ck_users_status",
        ),
        Index("ix_users_email", "email"),
        Index("ix_users_status", "status"),
    )
