"""Onboarding routes — session management, phase transitions, checklist."""

from __future__ import annotations

from datetime import UTC, datetime
from uuid import uuid4

import structlog
from fastapi import APIRouter, Depends

from gateway.auth import TokenPayload, get_current_user
from gateway.errors import NotFoundError, ValidationError
from gateway.schemas.onboarding import (
    ChecklistItem,
    ChecklistResponse,
    OnboardingPhase,
    OnboardingStart,
    OnboardingStatus,
    PhaseTransition,
)

logger = structlog.get_logger()

router = APIRouter(prefix="/api/v1/onboarding", tags=["onboarding"])

# In-memory store
_sessions: dict[str, dict] = {}

# Phase ordering for validation
_PHASE_ORDER = list(OnboardingPhase)

# Checklist items per phase
_PHASE_CHECKLISTS: dict[OnboardingPhase, list[dict[str, str | bool]]] = {
    OnboardingPhase.WELCOME: [
        {"id": "welcome-1", "label": "Review platform overview", "required": True},
        {"id": "welcome-2", "label": "Accept terms of service", "required": True},
    ],
    OnboardingPhase.CONNECT_DATABASE: [
        {"id": "db-1", "label": "Provide database connection string", "required": True},
        {"id": "db-2", "label": "Verify connectivity", "required": True},
        {"id": "db-3", "label": "Configure SSL/TLS", "required": False},
    ],
    OnboardingPhase.CONFIGURE_AGENTS: [
        {"id": "agent-1", "label": "Select agent autonomy levels", "required": True},
        {"id": "agent-2", "label": "Configure approval gates", "required": True},
        {"id": "agent-3", "label": "Set notification preferences", "required": False},
    ],
    OnboardingPhase.VERIFY_MONITORING: [
        {"id": "mon-1", "label": "Verify metrics collection", "required": True},
        {"id": "mon-2", "label": "Confirm agent heartbeats", "required": True},
        {"id": "mon-3", "label": "Review initial health check", "required": True},
    ],
    OnboardingPhase.COMPLETE: [
        {"id": "done-1", "label": "Onboarding complete", "required": False},
    ],
}


# ---------------------------------------------------------------------------
# POST /api/v1/onboarding — Start session
# ---------------------------------------------------------------------------

@router.post("", response_model=OnboardingStatus, status_code=201)
async def start_onboarding(
    body: OnboardingStart,
    user: TokenPayload = Depends(get_current_user),
) -> OnboardingStatus:
    """Start a new onboarding session."""
    now = datetime.now(UTC)
    session_id = str(uuid4())

    session = {
        "session_id": session_id,
        "tenant_id": user.org_id,
        "current_phase": OnboardingPhase.WELCOME,
        "completed_phases": [],
        "deployment_id": body.deployment_id,
        "started_at": now,
        "updated_at": now,
        "abandoned": False,
    }
    _sessions[session_id] = session

    logger.info("onboarding_started", session_id=session_id, tenant_id=user.org_id)
    return OnboardingStatus(**session)


# ---------------------------------------------------------------------------
# GET /api/v1/onboarding/{session_id} — Status
# ---------------------------------------------------------------------------

@router.get("/{session_id}", response_model=OnboardingStatus)
async def get_onboarding_status(
    session_id: str,
    user: TokenPayload = Depends(get_current_user),
) -> OnboardingStatus:
    """Get onboarding session status."""
    session = _sessions.get(session_id)
    if not session or session.get("tenant_id") != user.org_id:
        raise NotFoundError("Onboarding session not found.")
    return OnboardingStatus(**session)


# ---------------------------------------------------------------------------
# POST /api/v1/onboarding/{session_id}/transition — Advance phase
# ---------------------------------------------------------------------------

@router.post("/{session_id}/transition", response_model=OnboardingStatus)
async def transition_phase(
    session_id: str,
    body: PhaseTransition,
    user: TokenPayload = Depends(get_current_user),
) -> OnboardingStatus:
    """Advance the onboarding session to the next phase."""
    session = _sessions.get(session_id)
    if not session or session.get("tenant_id") != user.org_id:
        raise NotFoundError("Onboarding session not found.")

    if session["abandoned"]:
        raise ValidationError("Cannot transition an abandoned session.")

    current_idx = _PHASE_ORDER.index(session["current_phase"])
    target_idx = _PHASE_ORDER.index(body.target_phase)

    if target_idx != current_idx + 1:
        raise ValidationError(
            f"Can only advance to the next phase. Current: {session['current_phase']}, "
            f"expected next: {_PHASE_ORDER[current_idx + 1] if current_idx + 1 < len(_PHASE_ORDER) else 'none'}.",
        )

    # Mark current phase as completed
    if session["current_phase"] not in session["completed_phases"]:
        session["completed_phases"].append(session["current_phase"])

    session["current_phase"] = body.target_phase
    session["updated_at"] = datetime.now(UTC)

    logger.info(
        "onboarding_phase_transition",
        session_id=session_id,
        new_phase=body.target_phase,
    )
    return OnboardingStatus(**session)


# ---------------------------------------------------------------------------
# POST /api/v1/onboarding/{session_id}/abandon — Abandon
# ---------------------------------------------------------------------------

@router.post("/{session_id}/abandon", response_model=OnboardingStatus)
async def abandon_onboarding(
    session_id: str,
    user: TokenPayload = Depends(get_current_user),
) -> OnboardingStatus:
    """Abandon an onboarding session."""
    session = _sessions.get(session_id)
    if not session or session.get("tenant_id") != user.org_id:
        raise NotFoundError("Onboarding session not found.")

    session["abandoned"] = True
    session["updated_at"] = datetime.now(UTC)

    logger.info("onboarding_abandoned", session_id=session_id)
    return OnboardingStatus(**session)


# ---------------------------------------------------------------------------
# GET /api/v1/onboarding/{session_id}/checklist — Phase checklist
# ---------------------------------------------------------------------------

@router.get("/{session_id}/checklist", response_model=ChecklistResponse)
async def get_checklist(
    session_id: str,
    user: TokenPayload = Depends(get_current_user),
) -> ChecklistResponse:
    """Get the checklist for the current onboarding phase."""
    session = _sessions.get(session_id)
    if not session or session.get("tenant_id") != user.org_id:
        raise NotFoundError("Onboarding session not found.")

    phase = OnboardingPhase(session["current_phase"])
    checklist_data = _PHASE_CHECKLISTS.get(phase, [])

    items = [
        ChecklistItem(
            id=str(item["id"]),
            label=str(item["label"]),
            completed=phase in session["completed_phases"],
            required=bool(item.get("required", True)),
        )
        for item in checklist_data
    ]

    completed_count = sum(1 for i in items if i.completed)
    total_count = len(items)
    progress = (completed_count / total_count * 100) if total_count > 0 else 0.0

    return ChecklistResponse(
        session_id=session_id,
        phase=phase,
        items=items,
        progress_percent=round(progress, 1),
    )
