# Changelog

All notable changes to GridMind are documented in this file.
Format: [Semantic Version] - Date — Description

---

## [0.1.0] - 2026-03-21 — Initial Platform Build

This release represents the complete greenfield build of the GridMind platform, implementing all components described in `docs/prd/incoming/PRD-gridmind-unified.md`. The platform build is complete.

---

### Infrastructure

- **Terraform modules (9):** `vpc`, `eks`, `aurora`, `elasticache`, `nats`, `vault`, `alb`, `iam`, `monitoring` across three environments (`dev`, `staging`, `production`)
- **Helm charts (6):** `cortex`, `gateway`, `admin`, `portal`, `superadmin`, `platform-infra` with per-environment values overrides
- **Docker multi-stage builds:** Non-root user, minimal base images, health checks for all Python services
- **GitHub Actions CI/CD:** `ci.yml` (pre-merge gate), `cd.yml` (deploy on main), `pr.yml` (PR-specific checks)
- **CI quality gate:** Ruff, mypy --strict, ESLint, tsc --noEmit, Semgrep SAST, pytest 85% coverage, vitest 85% coverage, contract tests, Trivy container scan, Docker build for all 5 services
- **NATS JetStream:** Dual-cluster configuration with 2-minute deduplication window, tenant-scoped subjects (`gridmind.events.{tenant_id}.{event_type}`)
- **HashiCorp Vault HA:** Raft storage backend, AWS KMS auto-unseal, dynamic secrets for all services
- **AWS EKS:** Managed node groups, IRSA for per-service IAM roles, cluster autoscaler

---

### Shared Libraries

**`shared/models/` — SQLAlchemy 2.0 ORM (14 models)**
- `Tenant` — Tenant organization with lifecycle state machine (onboarding → trial → active → suspended → churned)
- `User` — User accounts with bcrypt-hashed passwords
- `Membership` — User-to-organization role assignments
- `Deployment` — Customer database deployment records
- `AgentRegistration` — Agent metadata registry
- `AgentState` — Per-tenant agent liveness state
- `ApprovalRequest` / `ApprovalResponse` — HITL approval workflow records
- `AuditEntry` — Immutable append-only audit log (trigger-enforced)
- `Plan` / `Subscription` / `Invoice` / `PaymentEvent` / `UsageRecord` — Billing domain models
- `Incident` — Database incident tracking
- `Notification` / `Campaign` — Communications records

**`shared/schemas/events.py` — 30 Pydantic v2 NATS event schemas**
- `EventEnvelope` base class (event_id UUID, event_type, tenant_id, agent_id, timestamp, correlation_id, payload)
- Perception events: `WorkloadProfile`, `WorkloadShiftDetected`, `CostAttribution`, `DriftDetected`, `CapacityForecast`
- Reasoning events: `ActionPlan`, `ScalingDecision`, `QueryOptimization`, `IncidentAnalysis`, `SecurityAssessment`
- Execution events: `ProvisioningResult`, `MigrationStatus`, `BackupResult`, `ConfigChangeResult`
- Self-healing events: `AgentHeartbeat`, `AgentHealthDegraded`, `AgentDead`, `InfraHealthAlert`
- Lifecycle events: `TenantCreated`, `TenantPaused`, `TenantActivated`, `TenantDeactivated`
- Approval events: `ApprovalRequestEvent`, `ApprovalResponseEvent`
- Billing events: `UsageRecordEvent`, `InvoiceGenerated`, `PaymentFailed`, `MarginAlert`
- Communication events: `NotificationSent`, `CampaignTriggered`
- `EVENT_TYPE_MAP` dictionary for event-type-to-class deserialization routing

**`shared/config/` — Pydantic-settings configuration**
- Shared environment variable configuration for cortex and gateway services

---

### Database Migrations (10 migrations, `migrations/`)

| Migration | Tables Created |
|-----------|---------------|
| `001_tenants.sql` | `tenants` + RLS tenant isolation policy |
| `002_users_and_roles.sql` | `users`, `memberships` |
| `003_deployments.sql` | `deployments` |
| `004_agents.sql` | `agent_registry`, `agent_state` |
| `005_events.sql` | `events_log` (monthly range partitioned) |
| `006_audit.sql` | `audit_log` (monthly range partitioned, immutable trigger) |
| `007_billing.sql` | `plans`, `subscriptions`, `invoices`, `payment_events`, `usage_records` |
| `008_incidents.sql` | `incidents` |
| `009_approvals.sql` | `approval_requests`, `approval_responses` |
| `010_communications.sql` | `notifications`, `campaigns` |

All migrations include reversible DOWN procedures. All tenant-scoped tables have RLS policies. Partitioned tables have auto-partition creation functions.

---

### Gateway API (`services/gateway/`)

**FastAPI application (`gateway/main.py`)**
- Application factory pattern (`create_app()`) with lifespan context manager
- asyncpg PostgreSQL connection pool with configurable min/max size
- Redis connection for cache and session storage
- Prometheus metrics endpoint (`/metrics`)
- Liveness probe (`/health`) and readiness probe (`/readyz`) with dependency checks
- Rate limiting via slowapi (per-IP, configurable default limit)
- Structured JSON logging via structlog with configurable log level
- CORS middleware with explicit origin allowlist
- Request logging middleware (request_id on every log entry)
- Tenant isolation middleware (JWT → tenant context binding)
- Custom exception hierarchy with machine-readable error codes

**Auth routes (`/api/v1/auth`) — 7 endpoints**
- `POST /token` — JWT login with progressive lockout (5 failures → incremental delay, 10 failures → 30-minute lock)
- `POST /refresh` — Refresh token rotation (old token consumed on use)
- `POST /logout` — Refresh token revocation
- `POST /register` — Account + organization creation with password strength validation and disposable email rejection
- `POST /api-keys` — API key creation (`gm_` prefix, HMAC-SHA256 hashed)
- `GET /api-keys` — List keys (masked, last 4 chars shown)
- `DELETE /api-keys/{key_id}` — Key revocation

**Deployment routes (`/api/v1/deployments`) — 8 endpoints**
- Full CRUD: list (cursor-paginated), create, get, patch, delete (soft)
- `GET /{id}/health` — Health status (connections, replication lag, uptime)
- `GET /{id}/metrics` — Resource utilization (CPU, memory, storage, IOPS, QPS)
- `POST /{id}/restart` — Async restart initiation (202 Accepted)

**Agent routes (`/api/v1/agents`) — 6 endpoints**
- `GET /` — List all agents with current status
- `GET /{id}` — Agent detail and status
- `POST /{id}/command` — Send command (published to NATS)
- `GET /approvals` — List pending HITL approvals
- `POST /approvals/{id}/decide` — Approve or reject pending approval
- `GET /{id}/timeline` — Agent activity timeline

**Tenant routes (`/api/v1/tenants`) — 6 endpoints**
- Full CRUD: list, create, get, patch
- `POST /{id}/lifecycle` — State machine transition with validation
- `GET /{id}/usage` — Usage statistics for billing period

**Billing routes (`/api/v1/billing`) — 14 endpoints**
- Stripe customer management: create, get
- Payment methods: setup-intent, attach, list
- Subscriptions: create, update, cancel
- Usage-based billing: `POST /usage-records`
- Invoices: list, get
- `POST /test-charge` — $0.01 card validation charge
- `POST /margin-calculator` — Cost-to-price margin calculation
- `POST /webhook` — Stripe webhook receiver with HMAC-SHA256 signature verification

**User routes (`/api/v1/users`) — 8 endpoints**
- `GET /` — List org users
- `GET /me` — Current user profile
- `GET /{id}`, `PATCH /{id}`, `DELETE /{id}` (soft) — User CRUD
- `POST /invite` — Send email invitation (7-day expiry)
- `POST /invite/accept` — Accept invitation token and create account
- `POST /roles` — Role change (owner only)

**Incident routes (`/api/v1/incidents`) — 8 endpoints**
- Full CRUD: list, create, get, patch
- `POST /{id}/resolve` — Mark resolved with timestamp
- `GET /{id}/timeline` — Immutable incident event timeline
- `GET /{id}/analysis` — SHERLOCK AI root-cause analysis result
- `POST /{id}/analysis/trigger` — Trigger SHERLOCK analysis (async, 202)

**Chat routes (`/api/v1/chat`) — 4 endpoints**
- `POST /` — Send message with optional SSE streaming (`stream: true`)
- `GET /conversations` — List user conversations
- `GET /conversations/{id}` — Get conversation with full message history
- `DELETE /conversations/{id}` — Delete conversation

**Onboarding routes (`/api/v1/onboarding`) — 5 endpoints**
- `POST /` — Start onboarding session
- `GET /{session_id}` — Session status
- `POST /{session_id}/transition` — Advance to next phase (sequential only)
- `POST /{session_id}/abandon` — Abandon session
- `GET /{session_id}/checklist` — Phase checklist with progress percentage

**WebSocket endpoints (`gateway/websocket.py`) — 4 channels**
- `WS /ws/{tenant_id}/agents` — Real-time agent heartbeats and status
- `WS /ws/{tenant_id}/metrics` — Aggregated deployment metrics stream
- `WS /ws/{tenant_id}/notifications` — Alerts, incidents, system messages
- `WS /ws/{tenant_id}/approvals` — HITL approval push and inline decisions

**Supporting modules**
- `gateway/auth.py` — JWT creation/verification, bcrypt password hashing, API key generation, RBAC dependency injection
- `gateway/database.py` — asyncpg pool and Redis connection lifecycle management
- `gateway/errors.py` — Custom exception hierarchy with standardized JSON error format
- `gateway/middleware.py` — RequestLoggingMiddleware, TenantIsolationMiddleware
- `gateway/stripe_service.py` — Stripe API wrapper with async client, margin calculator
- `gateway/schemas/` — Pydantic v2 request/response schemas for all 9 route modules

---

### Cortex Agent Runtime (`services/cortex/`)

**Core runtime (`cortex/`)**
- `base_agent.py` — Abstract `BaseAgent` with tick-driven cycle, event-driven processing, tier-enforced publish permissions, LLM integration, tool invocation allowlist, approval gating, heartbeat emission, checkpoint/restore
- `event_mesh.py` — NATS JetStream wrapper with deduplication headers, tenant-scoped subject routing, at-least-once delivery
- `llm.py` — `LLMClient` with single-turn and tool-use loop patterns; supports Haiku 4.5, Sonnet 4.6, Opus 4.6
- `approval.py` — `ApprovalGate` implementing SUPERVISED/AUTONOMOUS/ADVISORY autonomy levels; 300-second timeout with auto-deny
- `state.py` — `StateManager` for Redis context (TTL-keyed per-agent per-tenant) and PostgreSQL checkpoint persistence
- `audit.py` — `AuditLogger` writing structured entries to the immutable `audit_log` table
- `runtime.py` — `CortexRuntime` orchestrating agent lifecycle: instantiation, event subscription, tick scheduling, graceful shutdown
- `models.py` — Core domain models: `AgentTier`, `AutonomyLevel`, `AgentStatus`, `ToolDefinition`, `EventEnvelope`, `ApprovalResponse`

**24 AI Agents (`agents/`)**

Perception tier (4):
- `argus.py` — ARGUS: Workload Profiler (Haiku 4.5, AUTONOMOUS, 60s cycle)
- `ledger.py` — LEDGER: Cost Telemetry (Haiku 4.5, AUTONOMOUS, periodic cycle)
- `sentinel.py` — SENTINEL: Drift Detection (Haiku 4.5, AUTONOMOUS, periodic cycle)
- `oracle.py` — ORACLE: Capacity Forecasting with Holt-Winters smoothing (Sonnet 4.6, AUTONOMOUS, periodic cycle)

Reasoning tier (4):
- `titan.py` — TITAN: Scaling Arbiter with 6-phase retraction protocol (Sonnet 4.6, SUPERVISED, event-driven)
- `prism_agent.py` — PRISM: Query Optimizer for indexes, MVs, rewrites, HNSW (Sonnet 4.6, ADVISORY, event-driven)
- `sherlock.py` — SHERLOCK: Incident Reasoner with evidence chains (Opus 4.6, AUTONOMOUS, event-driven)
- `aegis.py` — AEGIS: Security Posture with continuous red-team (Sonnet 4.6, SUPERVISED, event-driven)

Execution tier (4):
- `forge_agent.py` — FORGE: IaC Provisioner with Terraform and kubectl tooling (Deterministic, SUPERVISED, event-driven)
- `convoy.py` — CONVOY: Migration Agent with snapshot and canary validation (Sonnet 4.6, SUPERVISED, event-driven)
- `vault_agent.py` — VAULT: Backup and Recovery with PITR and recovery drills (Haiku 4.5, SUPERVISED, periodic)
- `tuner.py` — TUNER: Configuration Manager with staged rollout (Sonnet 4.6, SUPERVISED, event-driven)

Self-Healing tier (6):
- `pulse.py` — PULSE: Heartbeat Monitor (Deterministic, AUTONOMOUS, 15s cycle; 3 missed = degraded, 6 missed = dead)
- `medic.py` — MEDIC: Agent Recovery with 5 playbooks — crash, degradation, corruption, cascade, OOM (Sonnet 4.6, AUTONOMOUS, event-driven)
- `vitals.py` — VITALS: Infrastructure Health probing NATS/PG/Redis/K8s every 30s (Deterministic, AUTONOMOUS, 30s cycle)
- `triage.py` — TRIAGE: Human Escalation P1-P4 with context-rich summaries (Opus 4.6, SUPERVISED, event-driven)
- `gremlin.py` — GREMLIN: Chaos Testing (requires CHAOS_ENABLED=true) (Sonnet 4.6, SUPERVISED, manual trigger)
- `phoenix.py` — PHOENIX: Blue-Green Agent Mesh Deployments (Sonnet 4.6, SUPERVISED, manual trigger)

Specialized tier (6):
- `scribe.py` — SCRIBE: Documentation auto-generation from diffs and events (Sonnet 4.6, AUTONOMOUS, event-driven)
- `thrift.py` — THRIFT: Platform FinOps — internal costs, staging auto-scale, LLM budgets (Sonnet 4.6, AUTONOMOUS, periodic)
- `harbor.py` — HARBOR: Onboarding — 7-phase conversational deployment flow (Sonnet 4.6, SUPERVISED, event-driven)
- `comptroller.py` — COMPTROLLER: Billing Intelligence — margin monitoring, anomaly detection (Sonnet 4.6, AUTONOMOUS, periodic)
- `herald.py` — HERALD: Communications — SendGrid/Twilio, drip campaigns (Sonnet 4.6, AUTONOMOUS, hourly cycle)
- `steward.py` — STEWARD: Customer Intelligence — health scoring (0-100), churn prediction (Sonnet 4.6, AUTONOMOUS, periodic)

**Agent registry (`agents/registry.py`, `agents/__init__.py`)**
- `AGENT_REGISTRY_METADATA` — 24-entry list with name, tier, model, visibility, description for each agent
- `AGENT_REGISTRY` — Dict mapping agent names to agent classes
- `ALL_AGENT_CLASSES` — Ordered list of all agent classes for runtime instantiation

**Test suite (`tests/`)**
- Unit tests for all 24 agents verifying class-level metadata, event processing, event emission, LLM interaction, tool invocation, approval gating, and error handling
- Shared fixtures (`conftest.py`): `mock_event_mesh`, `mock_state_manager`, `mock_llm_client`, `mock_audit_logger`, `mock_approval_gate`
- Coverage gate: 85% minimum (enforced by pytest --cov-fail-under=85)

---

### Admin Dashboard (`services/admin/`)

- Next.js 15 App Router application for `admin.gridmind.io`
- Fleet overview with real-time agent status cards (WebSocket-hydrated)
- Tenant management interface (list, detail, lifecycle transitions, usage)
- HITL approval queue with real-time push via WebSocket approval channel
- Incident management and SHERLOCK analysis viewer
- Billing and subscription management views
- Zustand stores for agent state, deployment state, tenant state
- Framer Motion animations for status transitions and agent activity
- Dark mode only, Electric Blue (`#2563EB`) primary accent, JetBrains Mono for metrics

---

### Customer Portal (`services/portal/`)

- Next.js 15 App Router application for `app.gridmind.io`
- Dashboard with live metrics charts (WebSocket metrics channel)
- Deployment cards with health, metrics, and action buttons
- Agent fleet view (customer-visible agents only: ARGUS, ORACLE, TITAN, PRISM, SHERLOCK, AEGIS, FORGE, CONVOY, VAULT, TUNER, HARBOR)
- Incident tracker with SHERLOCK analysis and timeline
- Chat interface with SSE streaming support
- Onboarding flow (7 phases, driven by HARBOR agent)
- Approval request interface (WebSocket-pushed, inline decision)
- Billing and subscription self-service
- Same design system as Admin (dark mode, Electric Blue accent)

---

### SuperAdmin Platform (`services/superadmin/`)

- Next.js 15 App Router application for `platform.gridmind.io`
- Cross-tenant management (all tenants visible)
- Platform FinOps dashboard (internal cost data from THRIFT)
- Agent mesh global health view
- Billing intelligence dashboard (COMPTROLLER margin data)
- Customer health scoring dashboard (STEWARD data)
- Distinctive Amber (`#F59E0B`) primary accent for visual god-mode indicator
- Additional RBAC layer restricting access to internal-only agents and platform-level data

---

### Documentation

- `docs/architecture.md` — Comprehensive system architecture document with ASCII diagrams, data flow walkthrough, tier architecture, NATS topology, database schema overview, security architecture, and deployment architecture
- `docs/api-reference.md` — Complete REST API reference for all 66 endpoints and 4 WebSocket channels with request/response examples
- `docs/agent-catalog.md` — Full catalog of all 24 agents with per-agent: description, model, autonomy level, visibility, cycle interval, tools, subscriptions, and emissions
- `CHANGELOG.md` — This file

### PRD Status

The full platform PRD (`docs/prd/incoming/PRD-gridmind-unified.md`) has been fully implemented in this release. All acceptance criteria from the PRD have been addressed in the initial build.
