"""Incident routes — CRUD + resolve, timeline, Sherlock analysis."""

from __future__ import annotations

from datetime import UTC, datetime
from uuid import uuid4

import structlog
from fastapi import APIRouter, Depends, Query

from gateway.auth import TokenPayload, require_permission
from gateway.errors import NotFoundError
from gateway.schemas.common import PaginatedResponse
from gateway.schemas.incidents import (
    AnalysisResponse,
    IncidentCreate,
    IncidentResponse,
    IncidentSeverity,
    IncidentStatus,
    IncidentTimelineEntry,
    IncidentUpdate,
)

logger = structlog.get_logger()

router = APIRouter(prefix="/api/v1/incidents", tags=["incidents"])

# In-memory stores
_incidents: dict[str, dict] = {}
_incident_timeline: dict[str, list[dict]] = {}
_incident_analysis: dict[str, dict] = {}


# ---------------------------------------------------------------------------
# GET /api/v1/incidents — List
# ---------------------------------------------------------------------------

@router.get("", response_model=PaginatedResponse)
async def list_incidents(
    cursor: str | None = Query(default=None),
    limit: int = Query(default=20, ge=1, le=100),
    user: TokenPayload = Depends(require_permission("incidents:read")),
) -> PaginatedResponse:
    """List incidents for the current tenant."""
    tenant_incidents = [
        i for i in _incidents.values() if i.get("tenant_id") == user.org_id
    ]
    return PaginatedResponse(
        items=[IncidentResponse(**i) for i in tenant_incidents[:limit]],
        total_count=len(tenant_incidents),
        has_more=len(tenant_incidents) > limit,
    )


# ---------------------------------------------------------------------------
# POST /api/v1/incidents — Create
# ---------------------------------------------------------------------------

@router.post("", response_model=IncidentResponse, status_code=201)
async def create_incident(
    body: IncidentCreate,
    user: TokenPayload = Depends(require_permission("incidents:write")),
) -> IncidentResponse:
    """Create a new incident."""
    now = datetime.now(UTC)
    incident_id = str(uuid4())
    incident = {
        "id": incident_id,
        "tenant_id": user.org_id,
        "title": body.title,
        "description": body.description,
        "severity": body.severity,
        "status": IncidentStatus.OPEN,
        "deployment_id": body.deployment_id,
        "assigned_agent": None,
        "metadata": body.metadata,
        "created_at": now,
        "updated_at": now,
        "resolved_at": None,
    }
    _incidents[incident_id] = incident

    # Create initial timeline entry
    _incident_timeline[incident_id] = [{
        "id": str(uuid4()),
        "incident_id": incident_id,
        "event_type": "created",
        "description": f"Incident created: {body.title}",
        "actor": user.sub,
        "timestamp": now,
        "metadata": {},
    }]

    logger.info("incident_created", incident_id=incident_id, severity=body.severity)
    return IncidentResponse(**incident)


# ---------------------------------------------------------------------------
# GET /api/v1/incidents/{id} — Get
# ---------------------------------------------------------------------------

@router.get("/{incident_id}", response_model=IncidentResponse)
async def get_incident(
    incident_id: str,
    user: TokenPayload = Depends(require_permission("incidents:read")),
) -> IncidentResponse:
    """Get incident details."""
    incident = _incidents.get(incident_id)
    if not incident or incident.get("tenant_id") != user.org_id:
        raise NotFoundError("Incident not found.")
    return IncidentResponse(**incident)


# ---------------------------------------------------------------------------
# PATCH /api/v1/incidents/{id} — Update
# ---------------------------------------------------------------------------

@router.patch("/{incident_id}", response_model=IncidentResponse)
async def update_incident(
    incident_id: str,
    body: IncidentUpdate,
    user: TokenPayload = Depends(require_permission("incidents:write")),
) -> IncidentResponse:
    """Update an incident."""
    incident = _incidents.get(incident_id)
    if not incident or incident.get("tenant_id") != user.org_id:
        raise NotFoundError("Incident not found.")

    update_data = body.model_dump(exclude_unset=True)
    incident.update(update_data)
    incident["updated_at"] = datetime.now(UTC)

    # Add timeline entry
    _incident_timeline.setdefault(incident_id, []).append({
        "id": str(uuid4()),
        "incident_id": incident_id,
        "event_type": "updated",
        "description": f"Incident updated: {', '.join(update_data.keys())}",
        "actor": user.sub,
        "timestamp": datetime.now(UTC),
        "metadata": {},
    })

    logger.info("incident_updated", incident_id=incident_id)
    return IncidentResponse(**incident)


# ---------------------------------------------------------------------------
# POST /api/v1/incidents/{id}/resolve — Resolve
# ---------------------------------------------------------------------------

@router.post("/{incident_id}/resolve", response_model=IncidentResponse)
async def resolve_incident(
    incident_id: str,
    user: TokenPayload = Depends(require_permission("incidents:write")),
) -> IncidentResponse:
    """Resolve an incident."""
    incident = _incidents.get(incident_id)
    if not incident or incident.get("tenant_id") != user.org_id:
        raise NotFoundError("Incident not found.")

    now = datetime.now(UTC)
    incident["status"] = IncidentStatus.RESOLVED
    incident["resolved_at"] = now
    incident["updated_at"] = now

    _incident_timeline.setdefault(incident_id, []).append({
        "id": str(uuid4()),
        "incident_id": incident_id,
        "event_type": "resolved",
        "description": "Incident resolved",
        "actor": user.sub,
        "timestamp": now,
        "metadata": {},
    })

    logger.info("incident_resolved", incident_id=incident_id)
    return IncidentResponse(**incident)


# ---------------------------------------------------------------------------
# GET /api/v1/incidents/{id}/timeline — Timeline
# ---------------------------------------------------------------------------

@router.get("/{incident_id}/timeline", response_model=list[IncidentTimelineEntry])
async def get_incident_timeline(
    incident_id: str,
    user: TokenPayload = Depends(require_permission("incidents:read")),
) -> list[IncidentTimelineEntry]:
    """Get incident timeline."""
    incident = _incidents.get(incident_id)
    if not incident or incident.get("tenant_id") != user.org_id:
        raise NotFoundError("Incident not found.")

    entries = _incident_timeline.get(incident_id, [])
    return [IncidentTimelineEntry(**e) for e in entries]


# ---------------------------------------------------------------------------
# GET /api/v1/incidents/{id}/analysis — Sherlock analysis
# ---------------------------------------------------------------------------

@router.get("/{incident_id}/analysis", response_model=AnalysisResponse)
async def get_analysis(
    incident_id: str,
    user: TokenPayload = Depends(require_permission("incidents:read")),
) -> AnalysisResponse:
    """Get Sherlock AI analysis for an incident."""
    incident = _incidents.get(incident_id)
    if not incident or incident.get("tenant_id") != user.org_id:
        raise NotFoundError("Incident not found.")

    analysis = _incident_analysis.get(incident_id)
    if analysis:
        return AnalysisResponse(**analysis)

    # Return mock analysis when no Anthropic key is available
    now = datetime.now(UTC)
    return AnalysisResponse(
        incident_id=incident_id,
        status="completed",
        root_cause="Elevated query latency due to missing index on frequently accessed table.",
        contributing_factors=[
            "Table scan on users.email without B-tree index",
            "Connection pool saturation at 95% capacity",
            "Concurrent long-running analytical queries",
        ],
        recommended_actions=[
            "CREATE INDEX CONCURRENTLY idx_users_email ON users(email)",
            "Increase connection pool max_size from 20 to 50",
            "Configure query timeout for analytical workloads",
        ],
        confidence=0.87,
        analyzed_at=now,
    )


# ---------------------------------------------------------------------------
# POST /api/v1/incidents/{id}/analysis/trigger — Trigger analysis
# ---------------------------------------------------------------------------

@router.post("/{incident_id}/analysis/trigger", status_code=202)
async def trigger_analysis(
    incident_id: str,
    user: TokenPayload = Depends(require_permission("incidents:write")),
) -> dict[str, str]:
    """Trigger Sherlock AI analysis for an incident."""
    incident = _incidents.get(incident_id)
    if not incident or incident.get("tenant_id") != user.org_id:
        raise NotFoundError("Incident not found.")

    now = datetime.now(UTC)
    _incident_analysis[incident_id] = {
        "incident_id": incident_id,
        "status": "completed",
        "root_cause": "Analysis triggered — mock result for development.",
        "contributing_factors": ["Mock factor 1", "Mock factor 2"],
        "recommended_actions": ["Mock action 1", "Mock action 2"],
        "confidence": 0.75,
        "analyzed_at": now,
    }

    logger.info("analysis_triggered", incident_id=incident_id)
    return {"incident_id": incident_id, "status": "analysis_started"}
