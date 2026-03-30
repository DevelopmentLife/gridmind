"""Cost attribution routes — decisions, summaries, realtime, and budget management."""

from __future__ import annotations

from datetime import UTC, datetime, timedelta
from decimal import Decimal

import structlog
from fastapi import APIRouter, Depends, Query

from gateway.auth import TokenPayload, require_permission
from gateway.schemas.cost import (
    BudgetResponse,
    BudgetSetRequest,
    CostSummaryItem,
    CostSummaryResponse,
    DecisionListResponse,
    DecisionResponse,
    RealtimeDecision,
    RealtimeResponse,
)

logger = structlog.get_logger()

router = APIRouter(prefix="/api/v1/cost", tags=["cost"])


# ---------------------------------------------------------------------------
# GET /api/v1/cost/decisions — paginated, filterable decision log
# ---------------------------------------------------------------------------

@router.get(
    "/decisions",
    response_model=DecisionListResponse,
    dependencies=[Depends(require_permission("cost:read"))],
)
async def list_decisions(
    agent_name: str | None = Query(default=None),
    deployment_id: str | None = Query(default=None),
    model_used: str | None = Query(default=None),
    start_date: datetime | None = Query(default=None),
    end_date: datetime | None = Query(default=None),
    cursor: str | None = Query(default=None),
    limit: int = Query(default=20, ge=1, le=100),
    user: TokenPayload = Depends(require_permission("cost:read")),
) -> DecisionListResponse:
    """List agent decisions with optional filters.

    Supports filtering by agent, deployment, model, and date range.
    Results are cursor-paginated.
    """
    logger.info(
        "cost_decisions_list",
        tenant_id=user.org_id,
        agent_name=agent_name,
        deployment_id=deployment_id,
    )
    # Placeholder — database query would go here.
    # Parameterized queries only: SELECT * FROM agent_decisions WHERE tenant_id = $1 ...
    return DecisionListResponse(items=[], total_count=0, has_more=False)


# ---------------------------------------------------------------------------
# GET /api/v1/cost/summary — aggregated by period
# ---------------------------------------------------------------------------

@router.get(
    "/summary",
    response_model=CostSummaryResponse,
    dependencies=[Depends(require_permission("cost:read"))],
)
async def cost_summary(
    period: str = Query(default="daily", regex="^(hourly|daily|monthly)$"),
    group_by: str = Query(default="agent", regex="^(agent|deployment|model)$"),
    start_date: datetime | None = Query(default=None),
    end_date: datetime | None = Query(default=None),
    user: TokenPayload = Depends(require_permission("cost:read")),
) -> CostSummaryResponse:
    """Return aggregated cost summary grouped by agent, deployment, or model.

    Aggregation period can be hourly, daily, or monthly.
    """
    logger.info(
        "cost_summary",
        tenant_id=user.org_id,
        period=period,
        group_by=group_by,
    )
    # Placeholder — aggregation query via cost_rollups table.
    return CostSummaryResponse(items=[], period=period, start_date=start_date, end_date=end_date)


# ---------------------------------------------------------------------------
# GET /api/v1/cost/realtime — last 30 min decisions with running total
# ---------------------------------------------------------------------------

@router.get(
    "/realtime",
    response_model=RealtimeResponse,
    dependencies=[Depends(require_permission("cost:read"))],
)
async def cost_realtime(
    user: TokenPayload = Depends(require_permission("cost:read")),
) -> RealtimeResponse:
    """Return decisions from the last 30 minutes with a running total.

    Useful for live cost monitoring dashboards.
    """
    logger.info("cost_realtime", tenant_id=user.org_id)
    # Placeholder — query agent_decisions WHERE created_at > now() - interval '30 minutes'
    return RealtimeResponse(decisions=[], running_total_usd=Decimal("0"), decision_count=0)


# ---------------------------------------------------------------------------
# GET /api/v1/cost/budget — current spend vs budget
# ---------------------------------------------------------------------------

@router.get(
    "/budget",
    response_model=BudgetResponse,
    dependencies=[Depends(require_permission("cost:read"))],
)
async def get_budget(
    user: TokenPayload = Depends(require_permission("cost:read")),
) -> BudgetResponse:
    """Return current spend vs configured budget limits."""
    logger.info("cost_budget_get", tenant_id=user.org_id)
    # Placeholder — read budget config from tenant settings + sum current month spend.
    return BudgetResponse()


# ---------------------------------------------------------------------------
# POST /api/v1/cost/budget — set budget limits
# ---------------------------------------------------------------------------

@router.post(
    "/budget",
    response_model=BudgetResponse,
    dependencies=[Depends(require_permission("cost:write"))],
)
async def set_budget(
    body: BudgetSetRequest,
    user: TokenPayload = Depends(require_permission("cost:write")),
) -> BudgetResponse:
    """Set or update monthly budget limits and alert thresholds.

    Args:
        body: Budget configuration with monthly limit and alert thresholds.
    """
    logger.info(
        "cost_budget_set",
        tenant_id=user.org_id,
        monthly_limit=str(body.monthly_limit_usd),
    )
    # Placeholder — persist budget config to tenant settings.
    return BudgetResponse(
        monthly_limit_usd=body.monthly_limit_usd,
        alert_threshold_percent=body.alert_threshold_percent,
        critical_threshold_percent=body.critical_threshold_percent,
        status="ok",
    )
