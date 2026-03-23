# GridMind Platform Architecture

**Version:** 0.1.0
**Date:** 2026-03-21
**Status:** Initial platform build

---

## 1. System Overview

GridMind is an AI-native agentic database operations platform. Twenty-four autonomous AI agents continuously monitor, optimize, scale, heal, and secure customer database deployments. Agents operate across four functional tiers (Perception, Reasoning, Execution, Self-Healing) plus a Specialized tier. All agents communicate via a NATS JetStream event mesh and expose observable state through a FastAPI gateway.

### High-Level Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          Customer Browsers                                   │
│         admin.gridmindai.dev    app.gridmindai.dev    platform.gridmindai.dev        │
└───────┬──────────────────────────┬─────────────────────┬────────────────────┘
        │                          │                     │
        ▼                          ▼                     ▼
┌───────────────┐    ┌─────────────────────┐    ┌───────────────────┐
│  Admin (3000) │    │  Portal (3001)       │    │ SuperAdmin (3002)  │
│  Next.js 15   │    │  Next.js 15          │    │  Next.js 15        │
│  Operator UI  │    │  Customer UI         │    │  Platform Admin    │
└───────┬───────┘    └──────────┬──────────┘    └────────┬──────────┘
        │                       │                        │
        └───────────────────────┼────────────────────────┘
                                │  REST + WebSocket
                                ▼
                   ┌────────────────────────┐
                   │  Gateway (port 8000)    │
                   │  FastAPI + Python 3.12  │
                   │  66 REST endpoints      │
                   │  4 WebSocket channels   │
                   │  JWT auth, RBAC, RLS    │
                   └──────────┬─────────────┘
                              │
               ┌──────────────┼──────────────┐
               │              │              │
               ▼              ▼              ▼
    ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
    │ PostgreSQL 16 │  │   Redis 7    │  │ NATS JetStream│
    │  AWS Aurora   │  │ ElastiCache  │  │ (dual-cluster)│
    │  (primary DB) │  │  (cache +    │  │ (event mesh)  │
    │               │  │   sessions)  │  │               │
    └──────────────┘  └──────────────┘  └──────┬───────┘
                                                │
                                                │ events / commands
                                                ▼
                               ┌────────────────────────────┐
                               │   Cortex (port 9090)        │
                               │   Python 3.12               │
                               │   24 AI Agents              │
                               │                             │
                               │  Perception (4 agents)      │
                               │  Reasoning  (4 agents)      │
                               │  Execution  (4 agents)      │
                               │  Self-Healing (6 agents)    │
                               │  Specialized  (6 agents)    │
                               └────────────────────────────┘
                                         │
                         ┌───────────────┼───────────────┐
                         ▼               ▼               ▼
              ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
              │  Anthropic   │  │  HashiCorp   │  │  Customer    │
              │  Claude API  │  │  Vault HA    │  │  Databases   │
              │  (Haiku /    │  │  (secrets)   │  │  (PostgreSQL,│
              │  Sonnet /    │  │              │  │  MySQL, Redis│
              │  Opus)       │  │              │  │  MongoDB)    │
              └──────────────┘  └──────────────┘  └──────────────┘
```

---

## 2. Service Descriptions

### 2.1 Cortex (`services/cortex/`) — Agent Runtime

The brain of the platform. Hosts all 24 AI agents as long-running async processes. Each agent subscribes to NATS subjects, processes events, invokes Claude models for reasoning, and emits structured events back to the mesh.

- **Port:** 9090 (Prometheus metrics)
- **Language:** Python 3.12
- **Key modules:** `cortex/base_agent.py`, `cortex/event_mesh.py`, `cortex/llm.py`, `cortex/approval.py`, `cortex/state.py`, `cortex/audit.py`
- **Agent files:** `agents/` directory, one file per agent

### 2.2 Gateway (`services/gateway/`) — API Gateway

The external-facing REST API and WebSocket hub. All three frontend applications communicate exclusively through the gateway. It enforces JWT authentication, RBAC permission checks, tenant isolation, rate limiting, and structured error responses.

- **Port:** 8000
- **Language:** Python 3.12 (FastAPI, Pydantic v2, asyncpg, structlog)
- **Endpoints:** 66 REST + 4 WebSocket channels
- **Auth:** JWT RS256 (HS256 in dev/test), 15-minute access tokens, 7-day refresh tokens
- **Rate limiting:** slowapi, per-IP, configurable default

### 2.3 Admin (`services/admin/`) — Operator Dashboard

Internal operator interface at `admin.gridmindai.dev`. Used by GridMind staff to monitor the fleet, manage tenants, review agent activity, handle HITL approvals, and observe billing.

- **Port:** 3000
- **Framework:** Next.js 15, React 19, TypeScript 5.x strict
- **Styling:** Tailwind CSS, dark-mode only, Electric Blue (`#2563EB`) primary accent
- **State:** Zustand stores
- **Animations:** Framer Motion

### 2.4 Portal (`services/portal/`) — Customer Portal

Customer-facing interface at `app.gridmindai.dev`. Customers connect databases, monitor agent activity, review optimization recommendations, manage incidents, configure approvals, and access billing.

- **Port:** 3001
- **Framework:** Next.js 15, React 19, TypeScript 5.x strict
- **Same design system as Admin** (Electric Blue accent)

### 2.5 SuperAdmin (`services/superadmin/`) — Platform Admin

God-mode platform administration at `platform.gridmindai.dev`. Used for cross-tenant management, platform FinOps, and global configuration.

- **Port:** 3002
- **Framework:** Next.js 15, React 19, TypeScript 5.x strict
- **Distinctive accent:** Amber (`#F59E0B`) — visual indicator of elevated privilege

### 2.6 GridMind Site (`gridmind-site/`) — Marketing Site

Public marketing website (separate repository). Next.js 15, served at `gridmindai.dev`.

---

## 3. Technology Decisions and Rationale

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Agent runtime language | Python 3.12 | Anthropic SDK first-class Python support; asyncio native; ecosystem (asyncpg, nats-py, structlog) |
| Frontend framework | Next.js 15 / React 19 | App Router SSR + streaming; RSC for fast initial load; TypeScript strict for safety |
| Event bus | NATS JetStream | At-least-once delivery, built-in dedup, replay, consumer groups; lowest operational complexity vs Kafka for this scale |
| Primary database | PostgreSQL 16 (Aurora) | JSONB for agent state, pg_stat_statements for workload profiling, native RLS for tenant isolation |
| Cache / session store | Redis 7 (ElastiCache) | Agent context TTL-keyed storage; session token storage; pub/sub for real-time |
| API framework | FastAPI | Native async, Pydantic v2 integration, auto-OpenAPI, dependency injection for RBAC |
| Claude models | Haiku 4.5 / Sonnet 4.6 / Opus 4.6 | Tiered cost/capability: Haiku for fast perception loops, Sonnet for reasoning, Opus for complex root-cause |
| Secrets management | HashiCorp Vault HA | Dynamic secrets, audit trail, PKI for mTLS; necessary for multi-tenant credential isolation |
| Container orchestration | AWS EKS + Helm + ArgoCD | GitOps pattern; Helm for templating; ArgoCD for declarative reconciliation |
| IaC | Terraform | 9 modules covering VPC, EKS, Aurora, ElastiCache, NATS, Vault, ALB, IAM, monitoring |
| Package manager (Python gateway) | uv 0.4.18 | Significantly faster than pip; deterministic lock file |

---

## 4. Data Flow: Customer Database Event Through the System

The following describes the end-to-end path of a workload spike event.

```
1. Customer DB (PostgreSQL)
   │
   │  pg_stat_statements accumulates query metrics
   │
   ▼
2. ARGUS agent (Perception tier, 60-second cycle)
   │  Invokes tool: query_pg_stats(limit=100)
   │  Calls Claude Haiku 4.5 to classify workload
   │  Detects spike vs. rolling 7-day baseline
   │
   │  Emits: perception.workload_shift_detected
   │         → NATS subject: gridmind.events.{tenant_id}.agent.workload_shift_detected
   │
   ▼
3. NATS JetStream (Event Mesh)
   │  Deduplication window: 2 minutes (Nats-Msg-Id = event_id)
   │  Delivers to all subscribers of perception.workload_shift_detected
   │
   ▼
4. TITAN agent (Reasoning tier, event-driven)
   │  Receives WorkloadShiftDetected event
   │  Invokes tools: get_current_replica_count, get_instance_pricing, get_cost_history
   │  Calls Claude Sonnet 4.6 to produce ranked scaling options
   │  Autonomy = SUPERVISED → publishes ApprovalRequest to NATS
   │
   │  Emits: approval.request
   │         → Gateway pushes to WebSocket channel: ws/{tenant_id}/approvals
   │
   ▼
5. Human (via Portal or Admin)
   │  Receives approval push over WebSocket
   │  Reviews TITAN's ranked options and reasoning
   │  Posts decision: POST /api/v1/agents/approvals/{id}/decide
   │
   ▼
6. Gateway → NATS approval.response event
   │
   ▼
7. TITAN agent receives approval response
   │  If APPROVED: emits scaling.decision
   │
   ▼
8. FORGE agent (Execution tier, event-driven)
   │  Receives scaling.decision
   │  Executes IaC change (deterministic — no LLM call)
   │  Emits: execution.provisioning_result
   │
   ▼
9. PULSE / MEDIC / VITALS (Self-Healing tier)
   │  Monitor execution outcome
   │  If anomaly detected: run recovery playbooks
   │
   ▼
10. Gateway WebSocket broadcast
    │  Pushes metric updates to ws/{tenant_id}/metrics
    │  Pushes incident/notification to ws/{tenant_id}/notifications
    │
    ▼
11. Portal / Admin dashboards
    │  Real-time UI update (Zustand store hydrated from WebSocket)
    │  Audit log entry written to PostgreSQL audit_log table (immutable, append-only)
```

---

## 5. Agent Tier Architecture

Agents are organized into five tiers. Each tier has enforced publish permissions — an agent can only emit events whose prefix matches its allowed list.

```
┌──────────────────────────────────────────────────────────────────┐
│                     PERCEPTION TIER                               │
│  ARGUS (workload) · LEDGER (cost) · SENTINEL (drift)             │
│  ORACLE (capacity forecast)                                       │
│  Model: Haiku 4.5 / Sonnet 4.6    Autonomy: AUTONOMOUS           │
│  Emits: perception.*, agent.heartbeat, agent.health              │
└────────────────────────────┬─────────────────────────────────────┘
                             │ events flow down to reasoning
                             ▼
┌──────────────────────────────────────────────────────────────────┐
│                     REASONING TIER                                │
│  TITAN (scaling) · PRISM (query opt) · SHERLOCK (incidents)      │
│  AEGIS (security)                                                 │
│  Model: Sonnet 4.6 / Opus 4.6     Autonomy: SUPERVISED/ADVISORY  │
│  Emits: workload.*, cost.*, action.*, scaling.*, incident.*,     │
│         security.*, approval.*                                    │
└────────────────────────────┬─────────────────────────────────────┘
                             │ decisions flow to execution
                             ▼
┌──────────────────────────────────────────────────────────────────┐
│                     EXECUTION TIER                                │
│  FORGE (provisioning) · CONVOY (migration) · VAULT (backup)      │
│  TUNER (configuration)                                            │
│  Model: deterministic / Sonnet 4.6 / Haiku 4.5                   │
│  Autonomy: SUPERVISED                                             │
│  Emits: scaling.*, action.*, drift.*, tenant.*, approval.*       │
└────────────────────────────┬─────────────────────────────────────┘
                             │ results observed by self-healing
                             ▼
┌──────────────────────────────────────────────────────────────────┐
│                   SELF-HEALING TIER                               │
│  PULSE (heartbeat) · MEDIC (recovery) · VITALS (infra health)    │
│  TRIAGE (escalation) · GREMLIN (chaos) · PHOENIX (updates)       │
│  Model: deterministic / Sonnet 4.6 / Opus 4.6                    │
│  Autonomy: AUTONOMOUS / SUPERVISED                                │
│  Emits: agent.*, infra.*, approval.*, action.*                   │
└──────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│                   SPECIALIZED TIER (cross-cutting)                │
│  SCRIBE (docs) · THRIFT (FinOps) · HARBOR (onboarding)          │
│  COMPTROLLER (billing intel) · HERALD (comms) · STEWARD (CX)    │
│  Model: Sonnet 4.6                                               │
│  Autonomy: AUTONOMOUS / SUPERVISED                               │
└──────────────────────────────────────────────────────────────────┘
```

### Autonomy Levels

| Level | Behavior |
|-------|----------|
| AUTONOMOUS | No human gate required. Actions are self-authorized, audit logged. |
| SUPERVISED | Publishes `approval.request` to NATS before executing. Blocks up to 300s for human response. Auto-denies on timeout. |
| ADVISORY | Cannot execute. Output is advisory only. `AdvisoryOnlyError` raised if execution attempted. |

---

## 6. NATS JetStream Event Mesh Topology

### Subject Convention

All events follow the pattern:
```
gridmind.events.{tenant_id}.{event_type}
```

Tenant ID is embedded in the subject for routing isolation. A subscriber for tenant A cannot receive events for tenant B.

### Event Categories and Subjects

| Category | Subject Prefix | Example |
|----------|---------------|---------|
| Perception | `gridmind.events.{tenant}.perception.*` | `perception.workload_profile` |
| Reasoning | `gridmind.events.{tenant}.reasoning.*` | `reasoning.scaling_decision` |
| Execution | `gridmind.events.{tenant}.execution.*` | `execution.provisioning_result` |
| Self-Healing | `gridmind.events.{tenant}.healing.*` | `healing.agent_heartbeat` |
| Lifecycle | `gridmind.events.{tenant}.lifecycle.*` | `lifecycle.tenant_created` |
| Approval | `gridmind.events.{tenant}.approval.*` | `approval.request` |
| Billing | `gridmind.events.{tenant}.billing.*` | `billing.invoice_generated` |
| Communications | `gridmind.events.{tenant}.comms.*` | `comms.notification_sent` |

### Deduplication

JetStream uses a 2-minute deduplication window. Each event carries a `Nats-Msg-Id` header set to the event's UUID (`event_id`). Duplicate publications within the window are silently dropped.

### 30 Canonical Event Types (defined in `shared/schemas/events.py`)

Perception: `WorkloadProfile`, `WorkloadShiftDetected`, `CostAttribution`, `DriftDetected`, `CapacityForecast`

Reasoning: `ActionPlan`, `ScalingDecision`, `QueryOptimization`, `IncidentAnalysis`, `SecurityAssessment`

Execution: `ProvisioningResult`, `MigrationStatus`, `BackupResult`, `ConfigChangeResult`

Self-Healing: `AgentHeartbeat`, `AgentHealthDegraded`, `AgentDead`, `InfraHealthAlert`

Lifecycle: `TenantCreated`, `TenantPaused`, `TenantActivated`, `TenantDeactivated`

Approval: `ApprovalRequestEvent`, `ApprovalResponseEvent`

Billing: `UsageRecordEvent`, `InvoiceGenerated`, `PaymentFailed`, `MarginAlert`

Communications: `NotificationSent`, `CampaignTriggered`

---

## 7. Database Schema Overview

PostgreSQL 16 (AWS Aurora). All tables use UUID primary keys (except where noted), `created_at`/`updated_at` UTC timestamps, and are protected by Row-Level Security (RLS) policies scoped to `tenant_id`.

### Migration Sequence

| Migration | File | Tables |
|-----------|------|--------|
| 001 | `001_tenants.sql` | `tenants` + RLS policy |
| 002 | `002_users_and_roles.sql` | `users`, `memberships` |
| 003 | `003_deployments.sql` | `deployments` |
| 004 | `004_agents.sql` | `agent_registry`, `agent_state` |
| 005 | `005_events.sql` | `events_log` (partitioned by month) |
| 006 | `006_audit.sql` | `audit_log` (partitioned, immutable) |
| 007 | `007_billing.sql` | `plans`, `subscriptions`, `invoices`, `payment_events`, `usage_records` |
| 008 | `008_incidents.sql` | `incidents` |
| 009 | `009_approvals.sql` | `approval_requests`, `approval_responses` |
| 010 | `010_communications.sql` | `notifications`, `campaigns` |

### ORM Models (shared/models/)

| Model | Table | Key Fields |
|-------|-------|-----------|
| `Tenant` | `tenants` | id, name, slug, state, plan, stripe_customer_id |
| `User` | `users` | id, email, full_name, password_hash, org_id, role |
| `Membership` | `memberships` | user_id, org_id, role |
| `Deployment` | `deployments` | id, tenant_id, name, engine, region, status |
| `AgentRegistration` | `agent_registry` | agent_name, tier, model, visibility |
| `AgentState` | `agent_state` | agent_name, tenant_id, status, last_heartbeat |
| `ApprovalRequest` | `approval_requests` | id, agent_id, tenant_id, action_description, risk_level, status |
| `ApprovalResponse` | `approval_responses` | approval_id, approver_id, decision, decided_at |
| `AuditEntry` | `audit_log` | id, tenant_id, agent_id, action_type, timestamp (immutable) |
| `Plan` | `plans` | id, name, price_monthly, limits |
| `Subscription` | `subscriptions` | tenant_id, plan_id, stripe_subscription_id, status |
| `Invoice` | `invoices` | id, tenant_id, stripe_invoice_id, amount_cents, status |
| `UsageRecord` | `usage_records` | id, tenant_id, deployment_id, metric, quantity, period_start |
| `Incident` | `incidents` | id, tenant_id, title, severity, status, deployment_id, resolved_at |
| `Notification` | `notifications` | id, tenant_id, channel, subject, status |
| `Campaign` | `campaigns` | id, name, trigger, target_cohort, template_id |

### Partitioned Tables

High-volume tables are range-partitioned by month:
- `events_log` — partition by `event_time`
- `audit_log` — partition by `event_time`
- `usage_records` — partition by `period_start`
- `agent_heartbeats` — partition by `ts`

### Immutability

`audit_log` is append-only. `UPDATE` and `DELETE` triggers raise exceptions. The `gridmind_app` role has `INSERT` only.

---

## 8. Security Architecture

### Authentication

- **JWT RS256** in production, HS256 in dev/test
- Access tokens: 15-minute expiry, stateless
- Refresh tokens: 7-day expiry, stored as SHA-256 hash in memory (DB in production), rotated on use
- API keys: `gm_` prefix, HMAC-SHA256 hashed, never stored plaintext
- Passwords: bcrypt (12 rounds minimum)
- Progressive lockout: 5 failures → incremental delay; 10 failures → 30-minute lock

### Authorization (RBAC)

Permissions are declared per endpoint via `require_permission()` or `require_role()` dependency injection. Roles: `owner`, `admin`, `member`. Permissions: `{resource}:read` / `{resource}:write`.

### Tenant Isolation

- All database queries scoped via PostgreSQL RLS policy: `tenant_id = current_setting('app.current_tenant_id')::uuid`
- Every API handler validates `auth.tenant_id` matches requested resource
- WebSocket connections verify `tenant_id` before accepting
- NATS subjects embed `tenant_id` — cross-tenant event leakage is impossible by routing

### Middleware Stack (execution order)

1. `CORSMiddleware` — explicit origin allowlist; no wildcard in production
2. `RequestLoggingMiddleware` — structured JSON log per request with request_id
3. `TenantIsolationMiddleware` — extracts and binds tenant context from JWT

### Secrets

- Production: HashiCorp Vault HA via sidecar injection into `/vault/secrets/`
- Staging: Kubernetes Secrets
- Development: `.env` file (gitignored)
- Never logged, never in source control (`SecretStr` from Pydantic)

### WebSocket Authentication

Accepts JWT via:
1. Query parameter `?token=`
2. `Authorization: Bearer` header

Closes with code `4001` on missing/invalid token, `4003` on tenant mismatch.

---

## 9. Deployment Architecture

### Infrastructure (AWS EKS)

All resources defined in Terraform (`infrastructure/terraform/`), deployed to 3 environments: `dev`, `staging`, `production`.

| Module | Resources |
|--------|-----------|
| VPC | Multi-AZ VPC, subnets, NAT gateways |
| EKS | Managed node groups, IRSA, cluster autoscaler |
| Aurora | PostgreSQL 16 cluster, read replicas, automated backups |
| ElastiCache | Redis 7 cluster mode, multi-AZ |
| NATS | JetStream dual-cluster (2×3 node clusters) |
| Vault | HA Vault with Raft storage, auto-unseal via AWS KMS |
| ALB | Application Load Balancer, ACM certificates, WAF |
| IAM | Per-service roles, least-privilege policies |
| Monitoring | CloudWatch, Prometheus, Grafana |

### Helm Charts (`infrastructure/helm/`)

Six charts covering: `cortex`, `gateway`, `admin`, `portal`, `superadmin`, and `platform-infra` (shared deps).

Each chart has three values files:
- `values.yaml` — dev defaults
- `values-staging.yaml` — staging overrides
- `values-production.yaml` — production overrides

### CI/CD Pipeline (`.github/workflows/`)

| Workflow | File | Triggers |
|----------|------|---------|
| CI | `ci.yml` | Pull request, push to feature branches |
| CD | `cd.yml` | Push to main |
| PR | `pr.yml` | Pull request opened/updated |

**CI gate checklist (all must pass before merge):**
- Ruff lint (zero errors)
- mypy --strict (zero errors)
- ESLint (zero errors)
- tsc --noEmit (zero errors)
- Semgrep SAST (zero HIGH+)
- pytest ≥ 85% coverage
- vitest ≥ 85% coverage
- Contract tests (all pass)
- Trivy container scan (zero CRITICAL/HIGH unfixed)
- Docker build (all 5 services)

### Deploy Flow

`staging → smoke tests → canary production (5%) → monitor → full rollout`

Auto-rollback triggers if error rate exceeds 1.5× baseline during canary window.

### Performance SLOs

| Metric | Target |
|--------|--------|
| Availability | 99.9% |
| API read P99 | < 200ms |
| API write P99 | < 500ms |
| Page LCP | < 2.5s |
| DB query P95 | < 100ms |
| Container startup | < 10s |
| JS bundle (per route) | < 100KB gzip |
