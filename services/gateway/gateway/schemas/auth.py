"""Auth endpoint schemas."""

from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, EmailStr, Field


class LoginRequest(BaseModel):
    """Login request body."""

    email: EmailStr
    password: str = Field(min_length=1)


class TokenResponse(BaseModel):
    """JWT token pair response."""

    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int = Field(description="Access token TTL in seconds")


class RefreshRequest(BaseModel):
    """Refresh token request body."""

    refresh_token: str


class RegisterRequest(BaseModel):
    """Account registration request."""

    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    full_name: str = Field(min_length=1, max_length=255)
    organization_name: str = Field(min_length=1, max_length=255)


class RegisterResponse(BaseModel):
    """Account registration response."""

    user_id: str
    org_id: str
    email: str
    message: str = "Account created. Please verify your email."


class ApiKeyCreate(BaseModel):
    """API key creation request."""

    name: str = Field(min_length=1, max_length=100)
    expires_at: datetime | None = None


class ApiKeyResponse(BaseModel):
    """API key response (masked)."""

    id: str
    name: str
    key_preview: str = Field(description="Last 4 characters of the key, e.g. '...abcd'")
    created_at: datetime
    expires_at: datetime | None = None
    last_used_at: datetime | None = None


class ApiKeyCreatedResponse(BaseModel):
    """API key creation response — contains the full key (shown once)."""

    id: str
    name: str
    key: str = Field(description="Full API key — store securely, shown only once")
    created_at: datetime
