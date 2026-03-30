"""Pydantic schemas for the waitlist signup endpoint."""

from __future__ import annotations

from pydantic import BaseModel, EmailStr, Field


class WaitlistSignupRequest(BaseModel):
    """Request body for POST /api/v1/waitlist.

    Only ``email`` is required.  ``source`` defaults to ``homepage`` and
    ``referral_code`` is optional for tracking referral campaigns.
    """

    email: EmailStr = Field(..., description="Email address to join the waitlist.")
    source: str = Field(
        default="homepage",
        max_length=100,
        description="Acquisition source (e.g. homepage, twitter, producthunt).",
    )
    referral_code: str | None = Field(
        default=None,
        max_length=50,
        description="Optional referral code.",
    )


class WaitlistSignupResponse(BaseModel):
    """Response body for a successful waitlist signup."""

    message: str = Field(..., description="Confirmation message.")
    position: int = Field(..., description="Approximate position in the waitlist.")
