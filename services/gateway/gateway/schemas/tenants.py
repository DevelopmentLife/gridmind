"""Tenant endpoint schemas."""

from __future__ import annotations

from datetime import datetime
from enum import StrEnum
from typing import Any

from pydantic import BaseModel, Field


class TenantState(StrEnum):
    """Tenant lifecycle state."""

    ONBOARDING = "onboarding"
    TRIAL = "trial"
    ACTIVE = "active"
    SUSPENDED = "suspended"
    CHURNED = "churned"


class TenantCreate(BaseModel):
    """Create a new tenant."""

    name: str = Field(min_length=1, max_length=255)
    slug: str = Field(min_length=1, max_length=100, pattern=r"^[a-z0-9-]+$")
    plan: str = Field(default="trial")
    metadata: dict[str, Any] = Field(default_factory=dict)


class TenantUpdate(BaseModel):
    """Update a tenant."""

    name: str | None = None
    plan: str | None = None
    metadata: dict[str, Any] | None = None


class TenantResponse(BaseModel):
    """Tenant details."""

    id: str
    name: str
    slug: str
    state: TenantState
    plan: str
    stripe_customer_id: str | None = None
    metadata: dict[str, Any] = Field(default_factory=dict)
    created_at: datetime
    updated_at: datetime


class LifecycleTransition(BaseModel):
    """Request a tenant state transition."""

    target_state: TenantState
    reason: str | None = None


class UsageStats(BaseModel):
    """Tenant usage statistics."""

    tenant_id: str
    deployment_count: int = 0
    active_agents: int = 0
    total_queries: int = 0
    total_events: int = 0
    storage_used_gb: float = 0.0
    monthly_cost: float = 0.0
    period_start: datetime
    period_end: datetime
