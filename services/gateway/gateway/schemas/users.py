"""User endpoint schemas."""

from __future__ import annotations

from datetime import datetime
from enum import StrEnum

from pydantic import BaseModel, EmailStr, Field


class UserRole(StrEnum):
    """User role in an organization."""

    OWNER = "owner"
    ADMIN = "admin"
    MEMBER = "member"
    VIEWER = "viewer"


class UserCreate(BaseModel):
    """Create a user (internal)."""

    email: EmailStr
    full_name: str = Field(min_length=1, max_length=255)
    role: UserRole = UserRole.MEMBER


class UserUpdate(BaseModel):
    """Update a user."""

    full_name: str | None = None
    avatar_url: str | None = None


class UserResponse(BaseModel):
    """User details."""

    id: str
    email: str
    full_name: str
    role: UserRole
    org_id: str
    avatar_url: str | None = None
    email_verified: bool = False
    is_active: bool = True
    last_login_at: datetime | None = None
    created_at: datetime
    updated_at: datetime


class InviteRequest(BaseModel):
    """Send an invitation to join the organization."""

    email: EmailStr
    role: UserRole = UserRole.MEMBER
    message: str | None = None


class InviteResponse(BaseModel):
    """Invitation response."""

    id: str
    email: str
    role: UserRole
    status: str = "pending"
    invited_by: str
    created_at: datetime
    expires_at: datetime


class InviteAcceptRequest(BaseModel):
    """Accept an invitation."""

    token: str
    full_name: str = Field(min_length=1, max_length=255)
    password: str = Field(min_length=8, max_length=128)


class RoleChange(BaseModel):
    """Change a user's role."""

    user_id: str
    new_role: UserRole
