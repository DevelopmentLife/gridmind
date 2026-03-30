"""Pydantic v2 schemas for cost attribution endpoints."""

from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from typing import Any

from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# Request schemas
# ---------------------------------------------------------------------------

class DecisionFilter(BaseModel):
    """Query filters for the decisions endpoint."""

    agent_name: str | None = Field(default=None, description="Filter by agent name.")
    deployment_id: str | None = Field(default=None, description="Filter by deployment ID.")
    model_used: str | None = Field(default=None, description="Filter by model.")
    start_date: datetime | None = Field(default=None, description="Start of date range (UTC).")
    end_date: datetime | None = Field(default=None, description="End of date range (UTC).")
    cursor: str | None = Field(default=None, description="Pagination cursor.")
    limit: int = Field(default=20, ge=1, le=100, description="Items per page.")


class CostSummaryParams(BaseModel):
    """Query parameters for the cost summary endpoint."""

    period: str = Field(default="daily", description="Period type: hourly, daily, monthly.")
    group_by: str = Field(default="agent", description="Group by: agent, deployment, model.")
    start_date: datetime | None = Field(default=None)
    end_date: datetime | None = Field(default=None)


class BudgetSetRequest(BaseModel):
    """Request body for setting budget limits."""

    monthly_limit_usd: Decimal = Field(..., gt=0, description="Monthly spending cap in USD.")
    alert_threshold_percent: int = Field(
        default=80, ge=1, le=100,
        description="Alert when spend reaches this percentage of the limit.",
    )
    critical_threshold_percent: int = Field(
        default=95, ge=1, le=100,
        description="Critical alert threshold percentage.",
    )


# ---------------------------------------------------------------------------
# Response schemas
# ---------------------------------------------------------------------------

class DecisionResponse(BaseModel):
    """A single agent decision record."""

    id: str
    tenant_id: str
    deployment_id: str
    agent_name: str
    decision_type: str
    model_used: str
    input_tokens: int
    output_tokens: int
    model_cost_usd: Decimal
    compute_ms: int
    compute_cost_usd: Decimal
    tool_calls: int
    tool_cost_usd: Decimal
    total_cost_usd: Decimal
    session_id: str | None = None
    correlation_id: str | None = None
    metadata: dict[str, Any] | None = None
    created_at: datetime


class DecisionListResponse(BaseModel):
    """Paginated list of decisions."""

    items: list[DecisionResponse] = Field(default_factory=list)
    total_count: int = 0
    next_cursor: str | None = None
    has_more: bool = False


class CostSummaryItem(BaseModel):
    """A single row in a cost summary aggregation."""

    group: str
    total_decisions: int = 0
    total_tokens: int = 0
    total_cost_usd: Decimal = Decimal("0")
    model_breakdown: dict[str, Any] | None = None


class CostSummaryResponse(BaseModel):
    """Aggregated cost summary response."""

    items: list[CostSummaryItem] = Field(default_factory=list)
    period: str
    start_date: datetime | None = None
    end_date: datetime | None = None


class RealtimeDecision(BaseModel):
    """A recent decision for the realtime endpoint."""

    id: str
    agent_name: str
    model_used: str
    total_cost_usd: Decimal
    created_at: datetime


class RealtimeResponse(BaseModel):
    """Realtime cost data — last 30 minutes."""

    decisions: list[RealtimeDecision] = Field(default_factory=list)
    running_total_usd: Decimal = Decimal("0")
    decision_count: int = 0


class BudgetResponse(BaseModel):
    """Current budget status."""

    monthly_limit_usd: Decimal | None = None
    alert_threshold_percent: int = 80
    critical_threshold_percent: int = 95
    current_spend_usd: Decimal = Decimal("0")
    projected_monthly_usd: Decimal = Decimal("0")
    percent_used: Decimal = Decimal("0")
    status: str = "ok"  # ok | warning | critical | exceeded
