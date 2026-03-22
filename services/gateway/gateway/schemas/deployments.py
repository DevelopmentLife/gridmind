"""Deployment endpoint schemas."""

from __future__ import annotations

from datetime import datetime
from enum import StrEnum
from typing import Any

from pydantic import BaseModel, Field


class DeploymentStatus(StrEnum):
    """Deployment lifecycle status."""

    PROVISIONING = "provisioning"
    ACTIVE = "active"
    DEGRADED = "degraded"
    MAINTENANCE = "maintenance"
    SUSPENDED = "suspended"
    DELETED = "deleted"


class DeploymentCreate(BaseModel):
    """Create a new deployment."""

    name: str = Field(min_length=1, max_length=100)
    engine: str = Field(default="postgresql", description="Database engine")
    engine_version: str = Field(default="16")
    region: str = Field(default="us-east-1")
    instance_size: str = Field(default="db.t3.medium")
    storage_gb: int = Field(default=100, ge=10, le=10000)
    connection_string: str | None = None
    metadata: dict[str, Any] = Field(default_factory=dict)


class DeploymentUpdate(BaseModel):
    """Update an existing deployment."""

    name: str | None = None
    instance_size: str | None = None
    storage_gb: int | None = Field(default=None, ge=10, le=10000)
    metadata: dict[str, Any] | None = None


class DeploymentResponse(BaseModel):
    """Deployment details."""

    id: str
    tenant_id: str
    name: str
    engine: str
    engine_version: str
    region: str
    instance_size: str
    storage_gb: int
    status: DeploymentStatus
    connection_string: str | None = None
    metadata: dict[str, Any] = Field(default_factory=dict)
    created_at: datetime
    updated_at: datetime


class DeploymentHealth(BaseModel):
    """Deployment health status."""

    deployment_id: str
    status: str = "healthy"
    uptime_seconds: float = 0.0
    connections_active: int = 0
    connections_max: int = 100
    replication_lag_ms: float | None = None
    last_check: datetime


class DeploymentMetrics(BaseModel):
    """Deployment resource metrics."""

    deployment_id: str
    cpu_percent: float = 0.0
    memory_percent: float = 0.0
    storage_used_gb: float = 0.0
    storage_total_gb: float = 100.0
    iops_read: float = 0.0
    iops_write: float = 0.0
    queries_per_second: float = 0.0
    active_connections: int = 0
    collected_at: datetime
