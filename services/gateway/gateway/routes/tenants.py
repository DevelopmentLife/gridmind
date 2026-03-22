"""Tenant routes — CRUD + lifecycle, usage."""

from __future__ import annotations

from datetime import UTC, datetime
from uuid import uuid4

import structlog
from fastapi import APIRouter, Depends, Query

from gateway.auth import TokenPayload, require_permission, require_role
from gateway.errors import ConflictError, NotFoundError, ValidationError
from gateway.schemas.common import PaginatedResponse
from gateway.schemas.tenants import (
    LifecycleTransition,
    TenantCreate,
    TenantResponse,
    TenantState,
    TenantUpdate,
    UsageStats,
)

logger = structlog.get_logger()

router = APIRouter(prefix="/api/v1/tenants", tags=["tenants"])

# In-memory store
_tenants: dict[str, dict] = {}

# Valid state transitions
_VALID_TRANSITIONS: dict[TenantState, set[TenantState]] = {
    TenantState.ONBOARDING: {TenantState.TRIAL, TenantState.ACTIVE},
    TenantState.TRIAL: {TenantState.ACTIVE, TenantState.CHURNED},
    TenantState.ACTIVE: {TenantState.SUSPENDED, TenantState.CHURNED},
    TenantState.SUSPENDED: {TenantState.ACTIVE, TenantState.CHURNED},
    TenantState.CHURNED: set(),
}


# ---------------------------------------------------------------------------
# GET /api/v1/tenants — List
# ---------------------------------------------------------------------------

@router.get("", response_model=PaginatedResponse)
async def list_tenants(
    cursor: str | None = Query(default=None),
    limit: int = Query(default=20, ge=1, le=100),
    user: TokenPayload = Depends(require_role("owner", "admin")),
) -> PaginatedResponse:
    """List tenants (admin/owner only)."""
    all_tenants = list(_tenants.values())
    return PaginatedResponse(
        items=[TenantResponse(**t) for t in all_tenants[:limit]],
        total_count=len(all_tenants),
        has_more=len(all_tenants) > limit,
    )


# ---------------------------------------------------------------------------
# POST /api/v1/tenants — Create
# ---------------------------------------------------------------------------

@router.post("", response_model=TenantResponse, status_code=201)
async def create_tenant(
    body: TenantCreate,
    user: TokenPayload = Depends(require_role("owner", "admin")),
) -> TenantResponse:
    """Create a new tenant."""
    # Check slug uniqueness
    for t in _tenants.values():
        if t["slug"] == body.slug:
            raise ConflictError(f"Tenant with slug '{body.slug}' already exists.")

    now = datetime.now(UTC)
    tenant = {
        "id": str(uuid4()),
        "name": body.name,
        "slug": body.slug,
        "state": TenantState.ONBOARDING,
        "plan": body.plan,
        "stripe_customer_id": None,
        "metadata": body.metadata,
        "created_at": now,
        "updated_at": now,
    }
    _tenants[tenant["id"]] = tenant
    logger.info("tenant_created", tenant_id=tenant["id"], slug=body.slug)
    return TenantResponse(**tenant)


# ---------------------------------------------------------------------------
# GET /api/v1/tenants/{id} — Get
# ---------------------------------------------------------------------------

@router.get("/{tenant_id}", response_model=TenantResponse)
async def get_tenant(
    tenant_id: str,
    user: TokenPayload = Depends(require_permission("tenants:read")),
) -> TenantResponse:
    """Get tenant details."""
    tenant = _tenants.get(tenant_id)
    if not tenant:
        raise NotFoundError("Tenant not found.")
    return TenantResponse(**tenant)


# ---------------------------------------------------------------------------
# PATCH /api/v1/tenants/{id} — Update
# ---------------------------------------------------------------------------

@router.patch("/{tenant_id}", response_model=TenantResponse)
async def update_tenant(
    tenant_id: str,
    body: TenantUpdate,
    user: TokenPayload = Depends(require_role("owner", "admin")),
) -> TenantResponse:
    """Update a tenant."""
    tenant = _tenants.get(tenant_id)
    if not tenant:
        raise NotFoundError("Tenant not found.")

    update_data = body.model_dump(exclude_unset=True)
    tenant.update(update_data)
    tenant["updated_at"] = datetime.now(UTC)
    logger.info("tenant_updated", tenant_id=tenant_id)
    return TenantResponse(**tenant)


# ---------------------------------------------------------------------------
# POST /api/v1/tenants/{id}/lifecycle — Transition state
# ---------------------------------------------------------------------------

@router.post("/{tenant_id}/lifecycle", response_model=TenantResponse)
async def transition_tenant(
    tenant_id: str,
    body: LifecycleTransition,
    user: TokenPayload = Depends(require_role("owner", "admin")),
) -> TenantResponse:
    """Transition tenant lifecycle state."""
    tenant = _tenants.get(tenant_id)
    if not tenant:
        raise NotFoundError("Tenant not found.")

    current_state = TenantState(tenant["state"])
    valid_targets = _VALID_TRANSITIONS.get(current_state, set())

    if body.target_state not in valid_targets:
        raise ValidationError(
            f"Cannot transition from '{current_state}' to '{body.target_state}'.",
            [{"field": "target_state", "issue": f"Valid targets: {', '.join(str(s) for s in valid_targets)}"}],
        )

    tenant["state"] = body.target_state
    tenant["updated_at"] = datetime.now(UTC)
    logger.info(
        "tenant_lifecycle_transition",
        tenant_id=tenant_id,
        from_state=current_state,
        to_state=body.target_state,
    )
    return TenantResponse(**tenant)


# ---------------------------------------------------------------------------
# GET /api/v1/tenants/{id}/usage — Usage stats
# ---------------------------------------------------------------------------

@router.get("/{tenant_id}/usage", response_model=UsageStats)
async def get_usage(
    tenant_id: str,
    user: TokenPayload = Depends(require_permission("tenants:read")),
) -> UsageStats:
    """Get tenant usage statistics."""
    tenant = _tenants.get(tenant_id)
    if not tenant:
        raise NotFoundError("Tenant not found.")

    now = datetime.now(UTC)
    return UsageStats(
        tenant_id=tenant_id,
        deployment_count=3,
        active_agents=8,
        total_queries=125000,
        total_events=45000,
        storage_used_gb=42.5,
        monthly_cost=299.00,
        period_start=now.replace(day=1, hour=0, minute=0, second=0, microsecond=0),
        period_end=now,
    )
