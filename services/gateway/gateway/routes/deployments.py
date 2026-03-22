"""Deployment routes — CRUD + health, metrics, restart."""

from __future__ import annotations

from datetime import UTC, datetime
from uuid import uuid4

import structlog
from fastapi import APIRouter, Depends, Query

from gateway.auth import TokenPayload, get_current_user, require_permission
from gateway.errors import NotFoundError
from gateway.schemas.common import PaginatedResponse
from gateway.schemas.deployments import (
    DeploymentCreate,
    DeploymentHealth,
    DeploymentMetrics,
    DeploymentResponse,
    DeploymentStatus,
    DeploymentUpdate,
)

logger = structlog.get_logger()

router = APIRouter(prefix="/api/v1/deployments", tags=["deployments"])

# In-memory store (replaced by DB in production)
_deployments: dict[str, dict] = {}


# ---------------------------------------------------------------------------
# GET /api/v1/deployments — List
# ---------------------------------------------------------------------------

@router.get("", response_model=PaginatedResponse)
async def list_deployments(
    cursor: str | None = Query(default=None),
    limit: int = Query(default=20, ge=1, le=100),
    user: TokenPayload = Depends(require_permission("deployments:read")),
) -> PaginatedResponse:
    """List deployments for the current tenant, cursor-paginated."""
    tenant_deployments = [
        d for d in _deployments.values()
        if d["tenant_id"] == user.org_id and d["status"] != "deleted"
    ]
    # Simple cursor pagination by index
    start = 0
    if cursor:
        for i, d in enumerate(tenant_deployments):
            if d["id"] == cursor:
                start = i + 1
                break

    page = tenant_deployments[start : start + limit]
    has_more = start + limit < len(tenant_deployments)
    next_cursor = page[-1]["id"] if has_more and page else None

    return PaginatedResponse(
        items=[DeploymentResponse(**d) for d in page],
        total_count=len(tenant_deployments),
        next_cursor=next_cursor,
        has_more=has_more,
    )


# ---------------------------------------------------------------------------
# POST /api/v1/deployments — Create
# ---------------------------------------------------------------------------

@router.post("", response_model=DeploymentResponse, status_code=201)
async def create_deployment(
    body: DeploymentCreate,
    user: TokenPayload = Depends(require_permission("deployments:write")),
) -> DeploymentResponse:
    """Create a new deployment."""
    now = datetime.now(UTC)
    deployment = {
        "id": str(uuid4()),
        "tenant_id": user.org_id,
        "name": body.name,
        "engine": body.engine,
        "engine_version": body.engine_version,
        "region": body.region,
        "instance_size": body.instance_size,
        "storage_gb": body.storage_gb,
        "status": DeploymentStatus.PROVISIONING,
        "connection_string": body.connection_string,
        "metadata": body.metadata,
        "created_at": now,
        "updated_at": now,
    }
    _deployments[deployment["id"]] = deployment
    logger.info("deployment_created", deployment_id=deployment["id"])
    return DeploymentResponse(**deployment)


# ---------------------------------------------------------------------------
# GET /api/v1/deployments/{id} — Get
# ---------------------------------------------------------------------------

@router.get("/{deployment_id}", response_model=DeploymentResponse)
async def get_deployment(
    deployment_id: str,
    user: TokenPayload = Depends(require_permission("deployments:read")),
) -> DeploymentResponse:
    """Get deployment details."""
    dep = _deployments.get(deployment_id)
    if not dep or dep["tenant_id"] != user.org_id:
        raise NotFoundError("Deployment not found.")
    return DeploymentResponse(**dep)


# ---------------------------------------------------------------------------
# PATCH /api/v1/deployments/{id} — Update
# ---------------------------------------------------------------------------

@router.patch("/{deployment_id}", response_model=DeploymentResponse)
async def update_deployment(
    deployment_id: str,
    body: DeploymentUpdate,
    user: TokenPayload = Depends(require_permission("deployments:write")),
) -> DeploymentResponse:
    """Update an existing deployment."""
    dep = _deployments.get(deployment_id)
    if not dep or dep["tenant_id"] != user.org_id:
        raise NotFoundError("Deployment not found.")

    update_data = body.model_dump(exclude_unset=True)
    dep.update(update_data)
    dep["updated_at"] = datetime.now(UTC)
    logger.info("deployment_updated", deployment_id=deployment_id)
    return DeploymentResponse(**dep)


# ---------------------------------------------------------------------------
# DELETE /api/v1/deployments/{id} — Soft delete
# ---------------------------------------------------------------------------

@router.delete("/{deployment_id}", status_code=204)
async def delete_deployment(
    deployment_id: str,
    user: TokenPayload = Depends(require_permission("deployments:write")),
) -> None:
    """Soft-delete a deployment."""
    dep = _deployments.get(deployment_id)
    if not dep or dep["tenant_id"] != user.org_id:
        raise NotFoundError("Deployment not found.")
    dep["status"] = DeploymentStatus.DELETED
    dep["updated_at"] = datetime.now(UTC)
    logger.info("deployment_deleted", deployment_id=deployment_id)


# ---------------------------------------------------------------------------
# GET /api/v1/deployments/{id}/health — Health status
# ---------------------------------------------------------------------------

@router.get("/{deployment_id}/health", response_model=DeploymentHealth)
async def get_deployment_health(
    deployment_id: str,
    user: TokenPayload = Depends(require_permission("deployments:read")),
) -> DeploymentHealth:
    """Get deployment health status."""
    dep = _deployments.get(deployment_id)
    if not dep or dep["tenant_id"] != user.org_id:
        raise NotFoundError("Deployment not found.")

    return DeploymentHealth(
        deployment_id=deployment_id,
        status="healthy" if dep["status"] == DeploymentStatus.ACTIVE else "degraded",
        uptime_seconds=3600.0,
        connections_active=12,
        connections_max=100,
        replication_lag_ms=0.5,
        last_check=datetime.now(UTC),
    )


# ---------------------------------------------------------------------------
# GET /api/v1/deployments/{id}/metrics — Metrics
# ---------------------------------------------------------------------------

@router.get("/{deployment_id}/metrics", response_model=DeploymentMetrics)
async def get_deployment_metrics(
    deployment_id: str,
    user: TokenPayload = Depends(require_permission("deployments:read")),
) -> DeploymentMetrics:
    """Get deployment resource metrics."""
    dep = _deployments.get(deployment_id)
    if not dep or dep["tenant_id"] != user.org_id:
        raise NotFoundError("Deployment not found.")

    return DeploymentMetrics(
        deployment_id=deployment_id,
        cpu_percent=23.5,
        memory_percent=45.2,
        storage_used_gb=42.0,
        storage_total_gb=float(dep["storage_gb"]),
        iops_read=150.0,
        iops_write=75.0,
        queries_per_second=120.0,
        active_connections=12,
        collected_at=datetime.now(UTC),
    )


# ---------------------------------------------------------------------------
# POST /api/v1/deployments/{id}/restart — Restart
# ---------------------------------------------------------------------------

@router.post("/{deployment_id}/restart", status_code=202)
async def restart_deployment(
    deployment_id: str,
    user: TokenPayload = Depends(require_permission("deployments:write")),
) -> dict[str, str]:
    """Restart a deployment."""
    dep = _deployments.get(deployment_id)
    if not dep or dep["tenant_id"] != user.org_id:
        raise NotFoundError("Deployment not found.")

    logger.info("deployment_restart_requested", deployment_id=deployment_id)
    return {"deployment_id": deployment_id, "status": "restart_initiated"}
