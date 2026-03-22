"""Membership ORM model — maps users to organizations with roles."""

from __future__ import annotations

import enum

from sqlalchemy import CheckConstraint, ForeignKey, Index, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from shared.models.base import Base, TimestampMixin


class MembershipRole(str, enum.Enum):
    """RBAC roles assignable to a user within an organization."""

    ORG_OWNER = "org_owner"
    ORG_ADMIN = "org_admin"
    OPERATOR = "operator"
    DEVELOPER = "developer"
    VIEWER = "viewer"
    BILLING_ADMIN = "billing_admin"
    API_SERVICE = "api_service"


class Membership(Base, TimestampMixin):
    """Many-to-many relationship between users and organizations.

    A composite primary key of (user_id, organization_id) ensures each user
    has exactly one role per organization.
    """

    __tablename__ = "memberships"

    user_id: Mapped[str] = mapped_column(
        UUID(as_uuid=False),
        ForeignKey("users.user_id", ondelete="CASCADE"),
        primary_key=True,
    )
    organization_id: Mapped[str] = mapped_column(
        UUID(as_uuid=False),
        ForeignKey("tenants.tenant_id", ondelete="CASCADE"),
        primary_key=True,
    )
    role: Mapped[str] = mapped_column(String(50), nullable=False)

    __table_args__ = (
        CheckConstraint(
            "role IN ('org_owner','org_admin','operator','developer',"
            "'viewer','billing_admin','api_service')",
            name="ck_memberships_role",
        ),
        Index("ix_memberships_user_id", "user_id"),
        Index("ix_memberships_organization_id", "organization_id"),
    )
