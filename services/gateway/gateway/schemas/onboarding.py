"""Onboarding endpoint schemas."""

from __future__ import annotations

from datetime import datetime
from enum import StrEnum

from pydantic import BaseModel, Field


class OnboardingPhase(StrEnum):
    """Onboarding phase."""

    WELCOME = "welcome"
    CONNECT_DATABASE = "connect_database"
    CONFIGURE_AGENTS = "configure_agents"
    VERIFY_MONITORING = "verify_monitoring"
    COMPLETE = "complete"


class OnboardingStart(BaseModel):
    """Start an onboarding session."""

    deployment_id: str | None = None
    metadata: dict[str, str] = Field(default_factory=dict)


class OnboardingStatus(BaseModel):
    """Onboarding session status."""

    session_id: str
    tenant_id: str
    current_phase: OnboardingPhase
    completed_phases: list[OnboardingPhase] = Field(default_factory=list)
    deployment_id: str | None = None
    started_at: datetime
    updated_at: datetime
    abandoned: bool = False


class PhaseTransition(BaseModel):
    """Advance to next onboarding phase."""

    target_phase: OnboardingPhase
    data: dict[str, str] = Field(default_factory=dict)


class ChecklistItem(BaseModel):
    """A single checklist item for an onboarding phase."""

    id: str
    label: str
    completed: bool = False
    required: bool = True


class ChecklistResponse(BaseModel):
    """Phase checklist."""

    session_id: str
    phase: OnboardingPhase
    items: list[ChecklistItem] = Field(default_factory=list)
    progress_percent: float = 0.0
