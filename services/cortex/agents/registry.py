"""Agent registry metadata for all 24 Cortex agents."""

from __future__ import annotations

from cortex.models import AgentTier, AutonomyLevel

AGENT_REGISTRY_METADATA: list[dict[str, str]] = [
    # Perception Tier
    {"name": "argus", "tier": "perception", "model": "claude-haiku-4-5", "visibility": "Customer", "description": "Workload Profiler: classifies queries and builds rolling workload models"},
    {"name": "ledger", "tier": "perception", "model": "claude-haiku-4-5", "visibility": "Internal", "description": "Cost Telemetry: real-time cost attribution per query/tenant/class"},
    {"name": "sentinel", "tier": "perception", "model": "claude-haiku-4-5", "visibility": "Internal", "description": "Drift Detection: schema/config/security/perf/compliance drift scoring"},
    {"name": "oracle", "tier": "perception", "model": "claude-sonnet-4-6", "visibility": "Customer", "description": "Capacity Forecast: 1h/6h/24h/7d Holt-Winters exponential smoothing"},
    # Reasoning Tier
    {"name": "titan", "tier": "reasoning", "model": "claude-sonnet-4-6", "visibility": "Customer", "description": "Scaling Arbiter: ranked option sets, 6-phase retraction protocol"},
    {"name": "prism", "tier": "reasoning", "model": "claude-sonnet-4-6", "visibility": "Customer", "description": "Query Optimizer: index recs, MVs, rewrites, HNSW tuning"},
    {"name": "sherlock", "tier": "reasoning", "model": "claude-opus-4-6", "visibility": "Customer", "description": "Incident Reasoning: ranked root cause hypotheses with evidence chains"},
    {"name": "aegis", "tier": "reasoning", "model": "claude-sonnet-4-6", "visibility": "Customer", "description": "Security Posture: continuous red-team, credentials, encryption, compliance"},
    # Execution Tier
    {"name": "forge", "tier": "execution", "model": "deterministic", "visibility": "Customer", "description": "Provisioning: IaC execution with scoped IAM + auto-rollback"},
    {"name": "convoy", "tier": "execution", "model": "claude-sonnet-4-6", "visibility": "Customer", "description": "Migration: pre-checks, snapshots, canary validation"},
    {"name": "vault", "tier": "execution", "model": "claude-haiku-4-5", "visibility": "Customer", "description": "Backup & Recovery: PITR, cross-region, recovery drills"},
    {"name": "tuner", "tier": "execution", "model": "claude-sonnet-4-6", "visibility": "Customer", "description": "Configuration: staged rollout, dry-run, canary test, auto-rollback"},
    # Self-Healing Tier
    {"name": "pulse", "tier": "self_healing", "model": "deterministic", "visibility": "Internal", "description": "Heartbeat Monitor: 3 missed = degraded, 6 missed = dead"},
    {"name": "medic", "tier": "self_healing", "model": "claude-sonnet-4-6", "visibility": "Internal", "description": "Agent Recovery: 5 playbooks (crash, degradation, corruption, cascade, OOM)"},
    {"name": "vitals", "tier": "self_healing", "model": "deterministic", "visibility": "Internal", "description": "Infrastructure Health: NATS, PG, Redis, K8s 30s probes"},
    {"name": "triage", "tier": "self_healing", "model": "claude-opus-4-6", "visibility": "Internal", "description": "Human Escalation: P1-P4 with context-rich summaries"},
    {"name": "gremlin", "tier": "self_healing", "model": "claude-sonnet-4-6", "visibility": "Internal", "description": "Chaos Testing: requires CHAOS_ENABLED=true"},
    {"name": "phoenix", "tier": "self_healing", "model": "claude-sonnet-4-6", "visibility": "Internal", "description": "Platform Updates: blue-green agent mesh deploys"},
    # Specialized Tier
    {"name": "scribe", "tier": "specialized", "model": "claude-sonnet-4-6", "visibility": "Internal", "description": "Documentation: auto-generates from diffs/events"},
    {"name": "thrift", "tier": "specialized", "model": "claude-sonnet-4-6", "visibility": "Internal", "description": "Platform FinOps: internal costs, staging auto-scale, LLM budgets"},
    {"name": "harbor", "tier": "specialized", "model": "claude-sonnet-4-6", "visibility": "Customer", "description": "Onboarding: 7-phase conversational deployment"},
    {"name": "comptroller", "tier": "specialized", "model": "claude-sonnet-4-6", "visibility": "Internal", "description": "Billing Intelligence: margin monitoring, anomaly detection"},
    {"name": "herald", "tier": "specialized", "model": "claude-sonnet-4-6", "visibility": "Internal", "description": "Communications: SendGrid/Twilio, drip campaigns"},
    {"name": "steward", "tier": "specialized", "model": "claude-sonnet-4-6", "visibility": "Internal", "description": "Customer Intelligence: health scoring (0-100), churn prediction"},
]
