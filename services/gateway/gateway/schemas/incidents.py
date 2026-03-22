"""Incident endpoint schemas."""

from __future__ import annotations

from datetime import datetime
from enum import StrEnum
from typing import Any

from pydantic import BaseModel, Field


class IncidentSeverity(StrEnum):
    """Incident severity level."""

    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"


class IncidentStatus(StrEnum):
    """Incident status."""

    OPEN = "open"
    INVESTIGATING = "investigating"
    MITIGATING = "mitigating"
    RESOLVED = "resolved"


class IncidentCreate(BaseModel):
    """Create an incident."""

    title: str = Field(min_length=1, max_length=255)
    description: str = Field(default="")
    severity: IncidentSeverity = IncidentSeverity.MEDIUM
    deployment_id: str | None = None
    metadata: dict[str, Any] = Field(default_factory=dict)


class IncidentUpdate(BaseModel):
    """Update an incident."""

    title: str | None = None
    description: str | None = None
    severity: IncidentSeverity | None = None
    status: IncidentStatus | None = None


class IncidentResponse(BaseModel):
    """Incident details."""

    id: str
    tenant_id: str
    title: str
    description: str
    severity: IncidentSeverity
    status: IncidentStatus
    deployment_id: str | None = None
    assigned_agent: str | None = None
    metadata: dict[str, Any] = Field(default_factory=dict)
    created_at: datetime
    updated_at: datetime
    resolved_at: datetime | None = None


class IncidentTimelineEntry(BaseModel):
    """Incident timeline entry."""

    id: str
    incident_id: str
    event_type: str
    description: str
    actor: str
    timestamp: datetime
    metadata: dict[str, Any] = Field(default_factory=dict)


class AnalysisResponse(BaseModel):
    """Sherlock analysis result."""

    incident_id: str
    status: str = "completed"
    root_cause: str = ""
    contributing_factors: list[str] = Field(default_factory=list)
    recommended_actions: list[str] = Field(default_factory=list)
    confidence: float = 0.0
    analyzed_at: datetime
