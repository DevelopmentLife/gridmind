"""Pydantic v2 event schemas for the GridMind NATS JetStream event bus.

Defines the canonical EventEnvelope and all 30 domain event types referenced
in PRD section 10.2.  Each event model inherits from EventEnvelope and sets
a default ``event_type`` string.  The ``EVENT_TYPE_MAP`` dictionary maps
event_type strings to their corresponding model classes for deserialization.
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any
from uuid import uuid4

from pydantic import BaseModel, Field


def _utcnow() -> datetime:
    """Return the current UTC time as a timezone-aware datetime."""
    return datetime.now(tz=timezone.utc)


# ---------------------------------------------------------------------------
# Base envelope
# ---------------------------------------------------------------------------


class EventEnvelope(BaseModel):
    """Base class for all GridMind NATS events.

    Every event carries a unique ID, type discriminator, tenant/agent context,
    a UTC timestamp, optional correlation ID, and a freeform payload dict.
    """

    event_id: str = Field(default_factory=lambda: str(uuid4()))
    event_type: str
    tenant_id: str
    agent_id: str
    timestamp: datetime = Field(default_factory=_utcnow)
    correlation_id: str | None = None
    payload: dict[str, Any] | None = None


# ---------------------------------------------------------------------------
# Perception events
# ---------------------------------------------------------------------------


class WorkloadProfile(EventEnvelope):
    """Emitted by ARGUS — periodic workload classification snapshot."""

    event_type: str = "perception.workload_profile"


class WorkloadShiftDetected(EventEnvelope):
    """Emitted by ARGUS — significant change in workload pattern."""

    event_type: str = "perception.workload_shift_detected"


class CostAttribution(EventEnvelope):
    """Emitted by LEDGER — per-query/tenant cost attribution."""

    event_type: str = "perception.cost_attribution"


class DriftDetected(EventEnvelope):
    """Emitted by SENTINEL — schema, config, or security drift."""

    event_type: str = "perception.drift_detected"


class CapacityForecast(EventEnvelope):
    """Emitted by ORACLE — 1h/6h/24h/7d capacity prediction."""

    event_type: str = "perception.capacity_forecast"


# ---------------------------------------------------------------------------
# Reasoning events
# ---------------------------------------------------------------------------


class ActionPlan(EventEnvelope):
    """Emitted by reasoning agents — proposed action plan."""

    event_type: str = "reasoning.action_plan"


class ScalingDecision(EventEnvelope):
    """Emitted by TITAN — scaling recommendation with ranked options."""

    event_type: str = "reasoning.scaling_decision"


class QueryOptimization(EventEnvelope):
    """Emitted by PRISM — index, MV, or rewrite recommendation."""

    event_type: str = "reasoning.query_optimization"


class IncidentAnalysis(EventEnvelope):
    """Emitted by SHERLOCK — root cause hypotheses with evidence."""

    event_type: str = "reasoning.incident_analysis"


class SecurityAssessment(EventEnvelope):
    """Emitted by AEGIS — security posture assessment."""

    event_type: str = "reasoning.security_assessment"


# ---------------------------------------------------------------------------
# Execution events
# ---------------------------------------------------------------------------


class ProvisioningResult(EventEnvelope):
    """Emitted by FORGE — deployment provisioning outcome."""

    event_type: str = "execution.provisioning_result"


class MigrationStatus(EventEnvelope):
    """Emitted by CONVOY — migration phase progress."""

    event_type: str = "execution.migration_status"


class BackupResult(EventEnvelope):
    """Emitted by VAULT — backup/restore operation result."""

    event_type: str = "execution.backup_result"


class ConfigChangeResult(EventEnvelope):
    """Emitted by TUNER — configuration change outcome."""

    event_type: str = "execution.config_change_result"


# ---------------------------------------------------------------------------
# Self-healing events
# ---------------------------------------------------------------------------


class AgentHeartbeat(EventEnvelope):
    """Emitted by PULSE — periodic agent liveness check."""

    event_type: str = "healing.agent_heartbeat"


class AgentHealthDegraded(EventEnvelope):
    """Emitted by PULSE — agent health has degraded (3 missed beats)."""

    event_type: str = "healing.agent_health_degraded"


class AgentDead(EventEnvelope):
    """Emitted by PULSE — agent declared dead (6 missed beats)."""

    event_type: str = "healing.agent_dead"


class InfraHealthAlert(EventEnvelope):
    """Emitted by VITALS — infrastructure component health alert."""

    event_type: str = "healing.infra_health_alert"


# ---------------------------------------------------------------------------
# Lifecycle events
# ---------------------------------------------------------------------------


class TenantCreated(EventEnvelope):
    """Emitted on new tenant/organization creation."""

    event_type: str = "lifecycle.tenant_created"


class TenantPaused(EventEnvelope):
    """Emitted when a tenant is suspended/paused."""

    event_type: str = "lifecycle.tenant_paused"


class TenantActivated(EventEnvelope):
    """Emitted when a tenant transitions to active."""

    event_type: str = "lifecycle.tenant_activated"


class TenantDeactivated(EventEnvelope):
    """Emitted when a tenant is fully deactivated."""

    event_type: str = "lifecycle.tenant_deactivated"


# ---------------------------------------------------------------------------
# Approval events
# ---------------------------------------------------------------------------


class ApprovalRequestEvent(EventEnvelope):
    """Emitted by SUPERVISED agents requesting human approval."""

    event_type: str = "approval.request"


class ApprovalResponseEvent(EventEnvelope):
    """Emitted when a human approves or rejects an agent action."""

    event_type: str = "approval.response"


# ---------------------------------------------------------------------------
# Billing events
# ---------------------------------------------------------------------------


class UsageRecordEvent(EventEnvelope):
    """Emitted by LEDGER — metered usage data point."""

    event_type: str = "billing.usage_record"


class InvoiceGenerated(EventEnvelope):
    """Emitted when a Stripe invoice is finalized."""

    event_type: str = "billing.invoice_generated"


class PaymentFailed(EventEnvelope):
    """Emitted on Stripe payment failure."""

    event_type: str = "billing.payment_failed"


class MarginAlert(EventEnvelope):
    """Emitted by COMPTROLLER — margin anomaly detected."""

    event_type: str = "billing.margin_alert"


# ---------------------------------------------------------------------------
# Communication events
# ---------------------------------------------------------------------------


class NotificationSent(EventEnvelope):
    """Emitted by HERALD — notification dispatched."""

    event_type: str = "comms.notification_sent"


class CampaignTriggered(EventEnvelope):
    """Emitted by HERALD — campaign triggered for a cohort."""

    event_type: str = "comms.campaign_triggered"


# ---------------------------------------------------------------------------
# Event type map — used for deserialization routing
# ---------------------------------------------------------------------------

EVENT_TYPE_MAP: dict[str, type[EventEnvelope]] = {
    "perception.workload_profile": WorkloadProfile,
    "perception.workload_shift_detected": WorkloadShiftDetected,
    "perception.cost_attribution": CostAttribution,
    "perception.drift_detected": DriftDetected,
    "perception.capacity_forecast": CapacityForecast,
    "reasoning.action_plan": ActionPlan,
    "reasoning.scaling_decision": ScalingDecision,
    "reasoning.query_optimization": QueryOptimization,
    "reasoning.incident_analysis": IncidentAnalysis,
    "reasoning.security_assessment": SecurityAssessment,
    "execution.provisioning_result": ProvisioningResult,
    "execution.migration_status": MigrationStatus,
    "execution.backup_result": BackupResult,
    "execution.config_change_result": ConfigChangeResult,
    "healing.agent_heartbeat": AgentHeartbeat,
    "healing.agent_health_degraded": AgentHealthDegraded,
    "healing.agent_dead": AgentDead,
    "healing.infra_health_alert": InfraHealthAlert,
    "lifecycle.tenant_created": TenantCreated,
    "lifecycle.tenant_paused": TenantPaused,
    "lifecycle.tenant_activated": TenantActivated,
    "lifecycle.tenant_deactivated": TenantDeactivated,
    "approval.request": ApprovalRequestEvent,
    "approval.response": ApprovalResponseEvent,
    "billing.usage_record": UsageRecordEvent,
    "billing.invoice_generated": InvoiceGenerated,
    "billing.payment_failed": PaymentFailed,
    "billing.margin_alert": MarginAlert,
    "comms.notification_sent": NotificationSent,
    "comms.campaign_triggered": CampaignTriggered,
}
