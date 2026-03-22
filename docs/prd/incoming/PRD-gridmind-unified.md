# GridMind — Unified Product Requirements Document

## Status: Draft
## Version: 1.0
## Last Updated: 2026-03-21

---

## Table of Contents

1. [Product Vision](#1-product-vision)
2. [Platform Architecture](#2-platform-architecture)
3. [Services Overview](#3-services-overview)
4. [Cortex — Agent Runtime](#4-cortex--agent-runtime)
5. [Gateway — API Layer](#5-gateway--api-layer)
6. [Admin — Operator Panel](#6-admin--operator-panel)
7. [Portal — Customer Portal](#7-portal--customer-portal)
8. [Super Admin — Platform Control](#8-super-admin--platform-control)
9. [Marketing Site](#9-marketing-site)
10. [Shared Models & Events](#10-shared-models--events)
11. [Database Schema & Migrations](#11-database-schema--migrations)
12. [Agent Architecture](#12-agent-architecture)
13. [Event System (NATS JetStream)](#13-event-system-nats-jetstream)
14. [Authentication & Identity](#14-authentication--identity)
15. [Permission System (RBAC)](#15-permission-system-rbac)
16. [Billing & Payments](#16-billing--payments)
17. [Email & Communications](#17-email--communications)
18. [Security](#18-security)
19. [Infrastructure (Terraform)](#19-infrastructure-terraform)
20. [CI/CD & Deployment](#20-cicd--deployment)
21. [Observability & Monitoring](#21-observability--monitoring)
22. [Production Readiness Tasks](#22-production-readiness-tasks)
23. [Cost Estimates](#23-cost-estimates)
24. [Timeline](#24-timeline)

---

## 1. Product Vision

GridMind is an AI-native agentic database operations platform. It deploys 24 autonomous AI agents that continuously monitor, optimize, scale, heal, and secure customer database deployments — eliminating manual DBA work.

**Core value proposition:** Replace expensive, error-prone manual database administration with an always-on swarm of specialized AI agents that perceive workload patterns, reason about optimal configurations, execute changes with approval gates, and self-heal when things go wrong.

**Target customers:**
- Startups and mid-market companies running PostgreSQL workloads
- Teams that need DBA-level expertise without hiring a DBA
- Organizations seeking AI-driven infrastructure automation

**Supported database engines:** PostgreSQL (primary), with planned support for MySQL, MongoDB, Redis, CockroachDB, TimescaleDB, and ClickHouse.

---

## 2. Platform Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        External Traffic                                 │
│   gridmind.io (marketing)  │  app.gridmind.io (portal)                 │
│   admin.gridmind.io (ops)  │  platform.gridmind.io (superadmin)        │
│   api.gridmind.io (gateway)                                            │
└──────────────────────────────┬──────────────────────────────────────────┘
                               │
                    ┌──────────▼──────────┐
                    │   AWS ALB / Ingress  │
                    └──────────┬──────────┘
                               │
          ┌────────────────────┼────────────────────┐
          ▼                    ▼                     ▼
   ┌─────────────┐   ┌──────────────┐   ┌────────────────┐
   │   Gateway    │   │   Portal     │   │   Admin        │
   │   (FastAPI)  │   │   (Next.js)  │   │   (Next.js)    │
   └──────┬──────┘   └──────────────┘   └────────────────┘
          │                                      │
          ├──────────────┬───────────────────────┘
          ▼              ▼
   ┌─────────────┐   ┌──────────────┐
   │   Cortex    │   │   NATS       │
   │   (24 agents│◄──►  JetStream   │
   │   runtime)  │   │   (events)   │
   └──────┬──────┘   └──────────────┘
          │
     ┌────┼────┐
     ▼    ▼    ▼
   ┌───┐┌───┐┌─────┐
   │PG ││Redis││Vault│
   └───┘└───┘└─────┘
```

**Technology stack:**
- **Backend:** Python 3.12, FastAPI, asyncpg, nats-py, Anthropic SDK
- **Frontend:** Next.js 15, React 19, TypeScript, Tailwind CSS, Zustand, Framer Motion
- **Database:** PostgreSQL 16 (Aurora), Redis 7 (ElastiCache)
- **Messaging:** NATS JetStream (dual-cluster)
- **Secrets:** HashiCorp Vault HA
- **AI:** Claude (Haiku 4.5, Sonnet 4.6, Opus 4.6) via Anthropic API
- **Infrastructure:** AWS EKS, Terraform, Helm, ArgoCD
- **CI/CD:** GitHub Actions, progressive canary deployment

---

## 3. Services Overview

| Service | Language | Port | Purpose | Repo Path |
|---------|----------|------|---------|-----------|
| **cortex** | Python 3.12 | 9090 (metrics) | Agent runtime — 24 AI agents | `services/cortex/` |
| **gateway** | Python 3.12 (FastAPI) | 8000 | API gateway — REST + WebSocket | `services/gateway/` |
| **admin** | Next.js 15 / TypeScript | 3000 | Operator dashboard | `services/admin/` |
| **portal** | Next.js 15 / TypeScript | 3001 | Customer-facing portal | `services/portal/` |
| **superadmin** | Next.js 15 / TypeScript | 3002 | Platform administration | `services/superadmin/` |
| **gridmind-site** | Next.js 15 / TypeScript | 3000 | Marketing site | `gridmind-site/` (separate repo) |

---

## 4. Cortex — Agent Runtime

### 4.1 File Structure

```
services/cortex/
├── pyproject.toml              # Package: gridmind-cortex 0.1.0
├── cortex/
│   ├── __init__.py             # Exports: CortexRuntime, BaseAgent, AgentTier, etc.
│   ├── config.py               # CortexConfig (pydantic-settings)
│   ├── runtime.py              # CortexRuntime — process lifecycle manager
│   ├── base_agent.py           # BaseAgent ABC + AgentContext
│   ├── models.py               # All Pydantic v2 event models + enums
│   ├── event_mesh.py           # EventMesh — NATS JetStream wrapper
│   ├── llm.py                  # LLMClient, ModelID, ToolDefinition, _TokenWindow
│   ├── approval.py             # ApprovalGate, ApprovalDeniedError, AdvisoryOnlyError
│   ├── state.py                # StateManager — asyncpg + Redis
│   └── audit.py                # AuditLogger — async queue → PG batch writer
└── agents/
    ├── __init__.py             # AGENT_REGISTRY dict + ALL_AGENT_CLASSES list
    ├── registry.py             # AGENT_REGISTRY_METADATA (24 agents)
    ├── argus.py                # ARGUS — Workload Profiler
    ├── ledger.py               # LEDGER — Cost Telemetry
    ├── sentinel.py             # SENTINEL — Drift Detection
    ├── oracle.py               # ORACLE — Capacity Forecast (+_HoltWinters)
    ├── titan.py                # TITAN — Scaling Arbiter
    ├── prism.py                # PRISM — Query Optimizer
    ├── sherlock.py             # SHERLOCK — Incident Reasoning
    ├── aegis.py                # AEGIS — Security Posture
    ├── forge.py                # FORGE — Provisioning
    ├── convoy.py               # CONVOY — Migration (+MigrationPhase)
    ├── vault_agent.py          # VAULT — Backup & Recovery (+BackupType)
    ├── tuner.py                # TUNER — Configuration
    ├── pulse.py                # PULSE — Heartbeat Monitor (+_AgentRecord)
    ├── medic.py                # MEDIC — Agent Recovery (+RecoveryPlaybook)
    ├── vitals.py               # VITALS — Infrastructure Health
    ├── triage.py               # TRIAGE — Human Escalation
    ├── gremlin.py              # GREMLIN — Chaos Testing (+FaultType)
    ├── phoenix.py              # PHOENIX — Platform Updates (+DeploymentPhase)
    ├── scribe.py               # SCRIBE — Documentation
    ├── thrift.py               # THRIFT — Platform FinOps
    ├── harbor.py               # HARBOR — Onboarding (+OnboardingPhase)
    ├── comptroller.py          # COMPTROLLER — Billing Intelligence
    ├── herald.py               # HERALD — Communications (+MessageChannel, MessageCategory)
    └── steward.py              # STEWARD — Customer Intelligence
```

### 4.2 CortexRuntime

The process-level lifecycle manager. One per process.

**Startup sequence:**
1. Read config from environment (`CortexConfig`)
2. Connect to NATS JetStream, PostgreSQL, Redis
3. Bootstrap shared services: EventMesh, StateManager, LLMClient, AuditLogger, ApprovalGate
4. Accept agent class registrations
5. Instantiate each agent once per tenant
6. Start all agents concurrently
7. Subscribe to `approval.response` events (routes back to ApprovalGate)
8. Expose Prometheus metrics on port 9090
9. Block on `SIGINT`/`SIGTERM` → graceful shutdown

**Key methods:**
- `CortexRuntime.from_env()` — factory from env vars
- `runtime.register(AgentClass)` — register agent (fluent API)
- `runtime.set_tenants(["tenant-a", "tenant-b"])` — multi-tenant
- `runtime.run_until_shutdown()` — canonical entry point
- `runtime.list_agents()` — introspection

### 4.3 BaseAgent Abstract Class

Every agent inherits `BaseAgent` and declares:

| Class Variable | Type | Purpose |
|---------------|------|---------|
| `AGENT_NAME` | `str` | Unique snake_case identifier |
| `TIER` | `AgentTier` | perception / reasoning / execution / self_healing / specialized |
| `AUTONOMY_LEVEL` | `AutonomyLevel` | autonomous / supervised / advisory |
| `MODEL_ASSIGNMENT` | `str` | Claude model ID or "deterministic" |
| `VISIBILITY` | `str` | "Customer" or "Internal" |
| `DESCRIPTION` | `str` | One-sentence description |
| `TOOLS` | `list[ToolDefinition]` | Allowed tool calls |
| `SUBSCRIPTIONS` | `list[str]` | NATS event patterns to subscribe to |
| `EMISSIONS` | `list[str]` | Event types this agent may publish |
| `CYCLE_INTERVAL_SECONDS` | `float` | Tick interval (0 = event-driven only) |

**Override methods:**
- `async process(event)` — handle inbound events
- `async run_cycle()` — proactive tick-driven logic
- `async on_start()` / `async on_stop()` — lifecycle hooks

**Built-in capabilities:**
- `_emit(event)` — publish with tier-enforced permissions
- `_invoke_tool(name, **kwargs)` — allowlist-enforced tool dispatch
- `_llm(system, messages)` — single-turn LLM call
- `_llm_with_tools(system, message, tools)` — agentic tool-use loop (max 10 iterations)
- `_request_approval(action_description, risk_level)` — approval gate
- `set_context/get_context/delete_context` — Redis state
- `emit_heartbeat()` — every 10 seconds automatically

### 4.4 Dependencies

```toml
[project]
requires-python = ">=3.12"
dependencies = [
    "nats-py>=2.7.0",
    "asyncpg>=0.29.0",
    "redis>=5.0.0",
    "anthropic>=0.40.0",
    "pydantic>=2.7.0",
    "pydantic-settings>=2.3.0",
    "structlog>=24.1.0",
    "prometheus-client>=0.20.0",
    "uvloop>=0.19.0",
]
```

---

## 5. Gateway — API Layer

### 5.1 File Structure

```
services/gateway/
├── pyproject.toml              # Package: gridmind-gateway 0.1.0
├── Dockerfile                  # Multi-stage: python:3.12-slim, uv 0.4.18, non-root
├── gateway/
│   ├── __init__.py
│   ├── main.py                 # FastAPI app factory, system endpoints, WebSocket registration
│   ├── config.py               # Settings (pydantic-settings from .env)
│   ├── auth.py                 # JWT RS256/HS256, RBAC, API key HMAC auth
│   ├── middleware.py           # RequestLoggingMiddleware, TenantIsolationMiddleware
│   ├── stripe_service.py       # StripeService singleton (17 methods)
│   ├── websocket.py            # ConnectionManager, channel helpers, WS auth
│   └── routes/
│       ├── __init__.py
│       ├── auth.py             # 7 endpoints: login, refresh, logout, register, API keys
│       ├── deployments.py      # 8 endpoints: CRUD + health, metrics, restart
│       ├── agents.py           # 6 endpoints: list, status, command, approvals, timeline
│       ├── tenants.py          # 6 endpoints: CRUD + lifecycle, usage
│       ├── billing.py          # 14 endpoints: customers, payments, subscriptions, invoices, webhook
│       ├── users.py            # 8 endpoints: CRUD + invite, accept, role change
│       ├── incidents.py        # 8 endpoints: CRUD + resolve, timeline, Sherlock analysis
│       ├── chat.py             # 4 endpoints: SSE streaming chat, conversations CRUD
│       └── onboarding.py       # 5 endpoints: start, status, transition, abandon, checklist
```

### 5.2 HTTP Endpoints (66 total)

**System (3):**
- `GET /health` — liveness probe
- `GET /readyz` — readiness probe (checks DB, Redis, NATS)
- `GET /metrics` — Prometheus scrape endpoint

**Auth (7):**
- `POST /api/v1/auth/token` — login (JWT issuance)
- `POST /api/v1/auth/refresh` — rotate access token
- `POST /api/v1/auth/logout` — revoke session
- `POST /api/v1/auth/register` — create account
- `POST /api/v1/auth/api-keys` — create API key
- `GET /api/v1/auth/api-keys` — list keys (masked)
- `DELETE /api/v1/auth/api-keys/{key_id}` — revoke key

**Deployments (8):**
- `GET /api/v1/deployments` — list
- `POST /api/v1/deployments` — create
- `GET /api/v1/deployments/{id}` — get
- `PATCH /api/v1/deployments/{id}` — update
- `DELETE /api/v1/deployments/{id}` — delete
- `GET /api/v1/deployments/{id}/health` — health status
- `GET /api/v1/deployments/{id}/metrics` — metrics
- `POST /api/v1/deployments/{id}/restart` — restart

**Agents (6):**
- `GET /api/v1/agents` — list all agents
- `GET /api/v1/agents/{id}` — agent status
- `POST /api/v1/agents/{id}/command` — send command
- `GET /api/v1/agents/approvals` — list pending approvals
- `POST /api/v1/agents/approvals/{id}/decide` — approve/reject
- `GET /api/v1/agents/{id}/timeline` — activity timeline

**Tenants (6):**
- `GET /api/v1/tenants` — list
- `POST /api/v1/tenants` — create
- `GET /api/v1/tenants/{id}` — get
- `PATCH /api/v1/tenants/{id}` — update
- `POST /api/v1/tenants/{id}/lifecycle` — transition state
- `GET /api/v1/tenants/{id}/usage` — usage stats

**Billing (14):**
- `POST /api/v1/billing/customers` — create Stripe customer
- `GET /api/v1/billing/customers/{id}` — get customer
- `POST /api/v1/billing/setup-intent` — create SetupIntent
- `POST /api/v1/billing/payment-methods/attach` — attach payment method
- `GET /api/v1/billing/payment-methods` — list methods
- `POST /api/v1/billing/subscriptions` — create subscription
- `PATCH /api/v1/billing/subscriptions/{id}` — update
- `DELETE /api/v1/billing/subscriptions/{id}` — cancel
- `POST /api/v1/billing/usage-records` — report metered usage
- `GET /api/v1/billing/invoices` — list invoices
- `GET /api/v1/billing/invoices/{id}` — get invoice
- `POST /api/v1/billing/test-charge` — verify card ($0.01)
- `POST /api/v1/billing/margin-calculator` — compute margin
- `POST /api/v1/billing/webhook` — Stripe webhook receiver

**Users (8):**
- `GET /api/v1/users` — list
- `GET /api/v1/users/me` — current user profile
- `GET /api/v1/users/{id}` — get user
- `PATCH /api/v1/users/{id}` — update
- `DELETE /api/v1/users/{id}` — remove
- `POST /api/v1/users/invite` — send invitation
- `POST /api/v1/users/invite/accept` — accept invitation
- `POST /api/v1/users/roles` — change role

**Incidents (8):**
- `GET /api/v1/incidents` — list
- `POST /api/v1/incidents` — create
- `GET /api/v1/incidents/{id}` — get
- `PATCH /api/v1/incidents/{id}` — update
- `POST /api/v1/incidents/{id}/resolve` — resolve
- `GET /api/v1/incidents/{id}/timeline` — timeline
- `GET /api/v1/incidents/{id}/analysis` — Sherlock analysis
- `POST /api/v1/incidents/{id}/analysis/trigger` — trigger analysis

**Chat (4):**
- `POST /api/v1/chat` — chat message (SSE streaming when `stream=true`)
- `GET /api/v1/chat/conversations` — list conversations
- `GET /api/v1/chat/conversations/{id}` — get conversation
- `DELETE /api/v1/chat/conversations/{id}` — delete

**Onboarding (5):**
- `POST /api/v1/onboarding` — start session
- `GET /api/v1/onboarding/{session_id}` — status
- `POST /api/v1/onboarding/{session_id}/transition` — advance phase
- `POST /api/v1/onboarding/{session_id}/abandon` — abandon
- `GET /api/v1/onboarding/{session_id}/checklist` — phase checklist

### 5.3 WebSocket Endpoints (4)

| Path | Channel | Purpose |
|------|---------|---------|
| `WS /ws/{tenant_id}/agents` | `agent:{tenant_id}:*` | Real-time agent heartbeats and status |
| `WS /ws/{tenant_id}/metrics` | `metrics:{tenant_id}` | Aggregated metrics stream |
| `WS /ws/{tenant_id}/notifications` | `notifications:{tenant_id}` | Alerts, incidents, system messages |
| `WS /ws/{tenant_id}/approvals` | `approvals:{tenant_id}` | HITL approval request push + inline decisions |

All WebSocket connections authenticate via JWT in `?token=` query param or `Authorization` header and enforce tenant scope.

### 5.4 Middleware Stack

1. **SlowAPIMiddleware** — Redis-backed rate limiting (`100/minute` default, `10/minute` auth)
2. **CORSMiddleware** — origins: `localhost:3000`, `localhost:5173`, `https://app.gridmind.ai`
3. **RequestLoggingMiddleware** — UUID request_id, structlog context, Prometheus metrics (requests_total, duration_seconds, errors_total), `X-Request-ID` header
4. **TenantIsolationMiddleware** — skips public paths, emits tenant_access audit log

### 5.5 Stripe Service

The `StripeService` singleton provides 17 methods: `create_customer`, `retrieve_customer`, `update_customer`, `delete_customer`, `attach_payment_method`, `detach_payment_method`, `list_payment_methods`, `create_subscription`, `update_subscription`, `cancel_subscription`, `retrieve_subscription`, `create_usage_record`, `list_invoices`, `retrieve_invoice`, `finalize_invoice`, `run_test_charge`, `construct_webhook_event`, `create_setup_intent`.

**Margin formula:**
```
margin_target = max(0.55, 0.75 - 0.035 * ln(monthly_cost / 100))
customer_price = cost / (1 - margin_target)
```

### 5.6 Dockerfile

- Multi-stage: `builder` (python:3.12-slim + build-essential + libpq-dev) → `production` (python:3.12-slim + libpq5)
- Dependency manager: `uv` 0.4.18
- Non-root user: `gridmind` (uid/gid 1001)
- Healthcheck: `curl -f http://localhost:8000/health` every 30s
- Entrypoint: `uvicorn gateway.main:create_app --factory --host 0.0.0.0 --port 8000`

---

## 6. Admin — Operator Panel

### 6.1 Overview

The admin panel is the internal operator dashboard for managing the GridMind fleet. Built with Next.js 15, React 19, TypeScript, Tailwind CSS, and Zustand.

### 6.2 Design System

- **Theme:** Dark (black backgrounds, slate grays)
- **Primary color:** Electric Blue `#2563EB`
- **Accent:** Emerald `#10B981` (success), Amber `#F59E0B` (warning), Red `#EF4444` (error)
- **Fonts:** Outfit (headings), JetBrains Mono (code/metrics)
- **State management:** Zustand v4.5.6
- **Animations:** Framer Motion

### 6.3 Pages

| Route | Page | Description |
|-------|------|-------------|
| `/` | Fleet Overview | Summary dashboard with deployment cards, agent health, metrics |
| `/agents` | Agent Fleet | All 24 agents with status, tier, model, last action |
| `/deployments/[id]` | Deployment Detail | Deep-dive into a single deployment |
| `/finops` | FinOps | Cost analytics, margin tracking, usage breakdown |
| `/incidents` | Incidents | Active/resolved incidents, Sherlock analysis links |
| `/chat` | Chat | Conversational interface to agents |
| `/settings` | Settings | Feature flags, agent configuration, alerting |

### 6.4 Zustand Stores

- **agentStore** — agent list, filters, selected agent, WebSocket state
- **deploymentStore** — deployments list, metrics, health data
- **fleetStore** — aggregate fleet stats, cost rollups

### 6.5 Mock Data

Extensive mock data for development: 10 deployments, 12 agents with full state, 3 incidents, cost timeseries, workload profiles.

---

## 7. Portal — Customer Portal

### 7.1 Overview

The customer-facing portal where users register, onboard, manage deployments, and access billing. Built with Next.js 15, React 19, TypeScript, Tailwind CSS, Zustand, Framer Motion.

### 7.2 Design System

Same dark theme as admin but customer-oriented. Electric Blue primary, full Framer Motion page transitions and micro-animations.

### 7.3 Pages

| Route | Page | Description |
|-------|------|-------------|
| `/login` | Login | Email/password login form |
| `/register` | Register | Account registration |
| `/onboard` | Onboarding Wizard | 7-phase guided onboarding |
| `/dashboard` | Dashboard | Main customer dashboard |
| `/deployments` | Deployments | Customer deployment list |
| `/deployments/[id]` | Deployment Detail | Single deployment view |
| `/agents` | Agents | Customer-visible agents (ARGUS, ORACLE, TITAN, etc.) |
| `/billing` | Billing | Subscription, payment methods, invoices |
| `/settings` | Settings | Profile, team, API keys |
| `/chat` | Chat | Conversational AI assistant |

### 7.4 Onboarding Wizard (7 Phases)

| Phase | Name | Description |
|-------|------|-------------|
| 1 | Intent Discovery | What engine, use case, workload pattern |
| 2 | Cloud Credentials | AWS/GCP/Azure credential entry and validation |
| 3 | Engine Selection | Choose database engine and version |
| 4 | Topology Design | Node count, instance type, region, HA settings |
| 5 | Billing Setup | Stripe Elements card collection, plan selection |
| 6 | Provisioning | Real-time progress display (WebSocket-driven) |
| 7 | Go Live | Connection strings, first health check, agent activation |

### 7.5 Zustand Stores

- **authStore** — user, token, login/logout actions
- **onboardingStore** — current phase, form data per phase, validation state
- **dashboardStore** — deployments, metrics, notifications

### 7.6 Auth Middleware

Next.js middleware intercepts requests: redirects unauthenticated users to `/login`, redirects logged-in users away from login/register to `/dashboard`.

---

## 8. Super Admin — Platform Control

### 8.1 Overview

The internal platform administration panel for GridMind operators. Provides god-mode access to all tenants, users, agents, revenue, and infrastructure. Amber accent theme (`#F59E0B`) to visually distinguish from customer-facing UIs.

### 8.2 Pages

| Route | Page | Description |
|-------|------|-------------|
| `/` | Dashboard | Platform-wide KPIs: MRR, tenant count, agent health, alerts |
| `/tenants` | Tenants | All tenants with status, tier, health score, churn risk |
| `/users` | Users | All users across all tenants with role, last login |
| `/agents` | Agents | GOD MODE agent controls: restart, reassign, force-approve |
| `/revenue` | Revenue | MRR/ARR charts, plan distribution, revenue per engine |
| `/audit` | Audit Log | Searchable, filterable audit trail (53+ mock entries) |
| `/config` | Configuration | Feature flags, global limits, maintenance mode |
| `/infrastructure` | Infrastructure | Cluster health, node status, resource utilization |
| `/settings` | Settings | Platform settings, admin user management |

### 8.3 Mock Data

17 mock tenants, 31 mock users, 53 audit log entries, revenue charts, infrastructure metrics.

### 8.4 GOD MODE Controls

Super admin can:
- Force-approve any pending agent action
- Restart any agent across any tenant
- Override feature flags per tenant
- Trigger maintenance mode (read-only for all customers)
- Manage platform-wide billing and pricing
- View/export audit logs with full detail

---

## 9. Marketing Site

### 9.1 Overview

Separate repository (`gridmind-site/`). Single-page Next.js 15 application deployed on AWS ECS Fargate.

### 9.2 Key Sections

- **Hero:** Tagline + neural mesh Canvas animation + CTA
- **Agents:** 12 customer-facing agent cards with descriptions
- **Engines:** 7 supported database engine logos with feature grids
- **Pricing:** 4 tiers (Starter $299/mo, Growth $799/mo, Scale $1,999/mo, Enterprise custom)
- **How It Works:** 3-step visual flow
- **Testimonials / Social proof**
- **Footer:** Navigation, legal links, newsletter signup

### 9.3 Neural Mesh Animation

Custom `<canvas>` element with:
- 60+ animated particles representing agents
- Proximity-based connection lines (< 200px distance)
- Particle color-coding by agent tier
- Responsive sizing, 60fps animation loop

### 9.4 Deployment

Terraform module at `gridmind-site/terraform/` deploys to ECS Fargate with ALB, ACM cert, CloudWatch logging.

---

## 10. Shared Models & Events

### 10.1 Location

```
shared/
├── models/
│   ├── __init__.py
│   ├── tenant.py         # Tenant, TenantStatus, TenantTier, BillingModel
│   ├── user.py           # User, UserRole
│   ├── agent.py          # AgentRegistration, AgentState
│   ├── deployment.py     # Deployment model
│   ├── billing.py        # Subscription, Invoice, PaymentMethod, UsageRecord
│   ├── incident.py       # Incident model
│   └── audit.py          # AuditEntry model
├── schemas/
│   ├── __init__.py
│   └── events.py         # 26 Pydantic v2 event types + EVENT_TYPE_MAP
└── config/
    ├── __init__.py
    └── settings.py       # Root Settings (Pydantic BaseSettings)
```

### 10.2 Event Types (26)

| Category | Event Type | Pydantic Model |
|----------|-----------|----------------|
| **Perception** | `perception.workload_profile` | `WorkloadProfile` |
| | `perception.workload_shift_detected` | `WorkloadShiftDetected` |
| | `perception.cost_attribution` | `CostAttribution` |
| | `perception.drift_detected` | `DriftDetected` |
| | `perception.capacity_forecast` | `CapacityForecast` |
| **Reasoning** | `reasoning.action_plan` | `ActionPlan` |
| | `reasoning.scaling_decision` | `ScalingDecision` |
| | `reasoning.query_optimization` | `QueryOptimization` |
| | `reasoning.incident_analysis` | `IncidentAnalysis` |
| | `reasoning.security_assessment` | `SecurityAssessment` |
| **Execution** | `execution.provisioning_result` | `ProvisioningResult` |
| | `execution.migration_status` | `MigrationStatus` |
| | `execution.backup_result` | `BackupResult` |
| | `execution.config_change_result` | `ConfigChangeResult` |
| **Self-Healing** | `healing.agent_heartbeat` | `AgentHeartbeat` |
| | `healing.agent_health_degraded` | `AgentHealthDegraded` |
| | `healing.agent_dead` | `AgentDead` |
| | `healing.infra_health_alert` | `InfraHealthAlert` |
| **Lifecycle** | `lifecycle.tenant_created` | `TenantCreated` |
| | `lifecycle.tenant_paused` | `TenantPaused` |
| | `lifecycle.tenant_activated` | `TenantActivated` |
| | `lifecycle.tenant_deactivated` | `TenantDeactivated` |
| **Approval** | `approval.request` | `ApprovalRequest` |
| | `approval.response` | `ApprovalResponse` |
| **Billing** | `billing.usage_record` | `UsageRecord` |
| | `billing.invoice_generated` | `InvoiceGenerated` |
| | `billing.payment_failed` | `PaymentFailed` |
| | `billing.margin_alert` | `MarginAlert` |
| **Communications** | `comms.notification_sent` | `NotificationSent` |
| | `comms.campaign_triggered` | `CampaignTriggered` |

### 10.3 Event Envelope

Every event wraps in `EventEnvelope` with: `event_id` (UUIDv4), `event_type`, `tenant_id`, `agent_id`, `timestamp`, `correlation_id`, `payload`.

### 10.4 Shared Configuration

Root `Settings` class with nested sub-settings:
- `NATSSettings` (env prefix: `GRIDMIND_NATS_`)
- `PostgresSettings` (env prefix: `GRIDMIND_PG_`)
- `RedisSettings` (env prefix: `GRIDMIND_REDIS_`)
- `VaultSettings` (env prefix: `GRIDMIND_VAULT_`)
- `AnthropicSettings` (env prefix: `GRIDMIND_ANTHROPIC_`) — default model: `claude-opus-4-5`
- `StripeSettings` (env prefix: `GRIDMIND_STRIPE_`)
- `ObservabilitySettings` (env prefix: `GRIDMIND_OBS_`)
- `SecuritySettings` (env prefix: `GRIDMIND_SECURITY_`)
- `AgentSettings` (env prefix: `GRIDMIND_AGENT_`)

Feature flags: `enable_auto_scaling`, `enable_auto_remediation`, `enable_predictive_scaling`, `enable_cost_optimisation`, `enable_multi_region`.

---

## 11. Database Schema & Migrations

### 11.1 Migration Files

```
migrations/
├── apply.sh                    # Sequential migration runner
├── 001_tenants.sql             # tenants table
├── 002_users_and_roles.sql     # users, roles, memberships
├── 003_deployments.sql         # deployments table
├── 004_agents.sql              # agent_registry, agent_state
├── 005_events.sql              # events (partitioned)
├── 006_audit.sql               # audit_log (append-only, partitioned)
├── 007_billing.sql             # plans, subscriptions, invoices, usage_records, payment_events
├── 008_incidents.sql           # incidents table
├── 009_approvals.sql           # approval_requests, approval_responses
└── 010_communications.sql      # notifications, campaigns
```

### 11.2 Key Tables

| Table | Key Columns | Notes |
|-------|-------------|-------|
| `tenants` | tenant_id, org_name, slug, status, tier, billing_model, stripe_customer_id, health_score, churn_risk | RLS on tenant_id |
| `users` | user_id, email, password_hash, full_name, status, mfa_enabled | Soft-delete |
| `memberships` | user_id, organization_id, role | Many-to-many |
| `deployments` | deployment_id, tenant_id, name, engine, status, region | Per-tenant |
| `agent_registry` | agent_id, tenant_id, agent_type, version, status | Per-agent-instance |
| `agent_state` | agent_id, status, cpu_pct, memory_pct, tasks_in_flight | Updated per heartbeat |
| `events` | event_id, tenant_id, event_type, payload | Partitioned by timestamp |
| `audit_log` | id, tenant_id, actor_id, action, resource_type | Append-only, partitioned |
| `plans` | id, name, stripe_price_id, monthly_price_cents | Starter/Growth/Scale/Enterprise |
| `subscriptions` | id, org_id, plan_id, stripe_subscription_id, status | Stripe-synced |
| `invoices` | id, org_id, stripe_invoice_id, amount_due_cents | Stripe-synced |
| `usage_records` | id, org_id, deployment_id, metric, quantity | Partitioned by month |
| `incidents` | id, tenant_id, deployment_id, severity, status | With timeline |
| `approval_requests` | id, tenant_id, agent_id, action_description, status | Expire after timeout |
| `notifications` | id, tenant_id, channel, template_id, status | Email/Slack/PagerDuty |

### 11.3 SQLAlchemy Models

All models use SQLAlchemy 2.0 style with `mapped_column`. Base class defined in `shared/models/tenant.py`. Key enums: `TenantStatus` (7 values), `TenantTier` (5: STARTER, GROWTH, SCALE, ENTERPRISE, STRATEGIC), `BillingModel` (3: BYOC, DEDICATED, ENTERPRISE_LICENSE).

---

## 12. Agent Architecture

### 12.1 All 24 Agents

#### Perception Tier (data collection, always-on)

| Agent | Model | Vis | Cycle | Tools | Description |
|-------|-------|-----|-------|-------|-------------|
| ARGUS | Haiku 4.5 | Customer | 60s | query_pg_stats, query_redis_metrics | Workload Profiler: classifies queries (OLTP, OLAP, AI_INFERENCE, AI_TRAINING, ETL_BATCH, STREAMING, IDLE), 7-day rolling model |
| LEDGER | det+Haiku | Internal | 30s | get_pg_query_stats, get_cloud_billing_snapshot | Cost Telemetry: real-time cost attribution per query/tenant/class |
| SENTINEL | Haiku 4.5 | Internal | 120s | snapshot_schema, snapshot_config, snapshot_security | Drift Detection: schema/config/security/perf/compliance drift scoring |
| ORACLE | Sonnet 4.6 | Customer | 300s | get_historical_metrics | Capacity Forecast: 1h/6h/24h/7d Holt-Winters exponential smoothing |

#### Reasoning Tier (decision-making)

| Agent | Model | Vis | Cycle | Tools | Description |
|-------|-------|-----|-------|-------|-------------|
| TITAN | Sonnet 4.6 | Customer | event | get_current_replica_count, get_instance_pricing, get_cost_history | Scaling Arbiter: ranked option sets, 6-phase retraction protocol |
| PRISM | Sonnet 4.6 | Customer | 600s | explain_query, get_index_bloat, get_table_stats | Query Optimizer: index recs, MVs, rewrites, HNSW tuning |
| SHERLOCK | Opus 4.6 | Customer | event | get_blocking_queries, get_pg_logs, get_replication_lag, get_recent_events | Incident Reasoning: ranked root cause hypotheses with evidence chains |
| AEGIS | Sonnet 4.6 | Customer | 300s | scan_pg_hba, scan_pg_roles, check_ssl_config, check_network_exposure | Security Posture: continuous red-team, credentials, encryption, compliance |

#### Execution Tier (take action)

| Agent | Model | Vis | Cycle | Tools | Description |
|-------|-------|-----|-------|-------|-------------|
| FORGE | deterministic | Customer | event | terraform_plan/apply, kubectl_scale/apply, tag_resources | Provisioning: IaC execution with scoped IAM + auto-rollback |
| CONVOY | Sonnet 4.6 | Customer | event | pg_dump, pg_restore, create_snapshot, verify_row_counts | Migration: pre-checks, snapshots, canary validation |
| VAULT | Haiku 4.5 | Customer | 900s | pg_basebackup, wal_archive, copy_to_region, restore_to_sandbox, prune_old_backups | Backup & Recovery: PITR, cross-region, recovery drills |
| TUNER | Sonnet 4.6 | Customer | event | pg_reload_conf, alter_system, get_current_config, run_test_queries | Configuration: staged rollout, dry-run, canary test, auto-rollback |

#### Self-Healing Tier (agent + infra health)

| Agent | Model | Vis | Cycle | Tools | Description |
|-------|-------|-----|-------|-------|-------------|
| PULSE | deterministic | Internal | 15s | — | Heartbeat Monitor: 3 missed = degraded, 6 missed = dead |
| MEDIC | Sonnet 4.6 | Internal | event | restart_agent_pod, clear_agent_state, get_agent_logs, scale_agent_resources | Agent Recovery: 5 playbooks (crash, degradation, corruption, cascade, OOM) |
| VITALS | det+Haiku | Internal | 30s | — | Infrastructure Health: NATS, PG, Redis, K8s 30s probes |
| TRIAGE | Opus 4.6 | Internal | event | page_pagerduty, post_slack, send_push_notification | Human Escalation: P1-P4 with context-rich summaries |
| GREMLIN | Sonnet 4.6 | Internal | 3600s | kill_pod, inject_db_latency, exhaust_db_connections | Chaos Testing: requires `CHAOS_ENABLED=true` |
| PHOENIX | Sonnet 4.6 | Internal | 1800s | check_new_image, scan_image, deploy_green, shift_traffic, delete_deployment | Platform Updates: blue-green agent mesh deploys |

#### Specialized Tier (business-level)

| Agent | Model | Vis | Cycle | Tools | Description |
|-------|-------|-----|-------|-------|-------------|
| SCRIBE | Sonnet 4.6 | Internal | 3600s | get_git_diff, write_file, get_schema_diff | Documentation: auto-generates from diffs/events |
| THRIFT | Sonnet 4.6 | Internal | 900s | get_pod_resource_usage, scale_staging_deployment, get_llm_spend | Platform FinOps: internal costs, staging auto-scale, LLM budgets |
| HARBOR | Sonnet 4.6 | Customer | event | validate_cloud_credentials, create_stripe_checkout, trigger_provision | Onboarding: 7-phase conversational deployment |
| COMPTROLLER | Sonnet 4.6 | Internal | 300s | get_stripe_invoices, get_cost_history, update_billing_alert | Billing Intelligence: margin monitoring, anomaly detection (SPIKE/EROSION/SHOCK) |
| HERALD | Sonnet 4.6 | Internal | 3600s | send_email, send_sms, get_customer_profile | Communications: SendGrid/Twilio, drip campaigns |
| STEWARD | Sonnet 4.6 | Internal | 3600s | get_customer_usage, get_payment_history, get_support_tickets | Customer Intelligence: health scoring (0-100), churn prediction |

### 12.2 Autonomy Levels

| Level | Behavior |
|-------|----------|
| **AUTONOMOUS** | Acts immediately. Synthetic auto-approval. Audit logged. |
| **SUPERVISED** | Publishes ApprovalRequest, blocks until human approves/rejects or timeout (300s default). |
| **ADVISORY** | Cannot execute. Emits recommendation events only. Raises `AdvisoryOnlyError` if execution attempted. |

### 12.3 LLM Model Assignment

| Model | Usage |
|-------|-------|
| `claude-haiku-4-5` | Fast perception tasks (ARGUS, SENTINEL, VAULT) |
| `claude-sonnet-4-6` | Most reasoning and execution agents |
| `claude-opus-4-6` | Complex reasoning: SHERLOCK (incident), TRIAGE (escalation) |
| `deterministic` | No LLM needed: FORGE (IaC), PULSE (heartbeat), some data-only agents |

---

## 13. Event System (NATS JetStream)

### 13.1 Subject Convention

```
gridmind.events.{tenant_id}.{event_type}
```

Example: `gridmind.events.acme-corp.agent.heartbeat`

### 13.2 Stream Configuration

- **Stream name:** `GRIDMIND_EVENTS`
- **Subjects:** `["gridmind.events.>"]`
- **Retention:** LIMITS
- **Storage:** FILE
- **Max age:** 72 hours
- **Dedup window:** 2 minutes (keyed on `Nats-Msg-Id` = `event.event_id`)
- **Replicas:** 1

### 13.3 Consumer Configuration

- **Ack policy:** EXPLICIT
- **Max deliver:** 5 retries
- **Ack wait:** 30 seconds
- **Deliver policy:** NEW (no replay)
- **On failure:** `nak_delay(5s)` — requeue after 5 seconds

### 13.4 Tier Publish Permissions

| Tier | Allowed Prefixes |
|------|-----------------|
| PERCEPTION | `workload.*`, `infra.*`, `agent.heartbeat`, `agent.health` |
| REASONING | `workload.*`, `cost.*`, `drift.*`, `capacity.*`, `action.*`, `scaling.*`, `incident.*`, `security.*`, `agent.heartbeat`, `agent.health`, `approval.*` |
| EXECUTION | `scaling.*`, `action.*`, `drift.*`, `tenant.*`, `agent.heartbeat`, `agent.health`, `approval.*` |
| SELF_HEALING | `agent.*`, `infra.*`, `approval.*`, `action.*` |

---

## 14. Authentication & Identity

### 14.1 Current State (Mocked)

Auth, sessions, and users are currently mocked with localStorage tokens and hardcoded data. The sections below define the production implementation.

### 14.2 Registration Flow

1. User fills form (name, email, company, password)
2. reCAPTCHA v3 validated (score >= 0.5)
3. Validate: email format + not disposable, password strength (min 10 chars, zxcvbn >= 3)
4. Create: `users` (pending_verification), `organizations` (trial, 14 days), `memberships` (owner)
5. SendGrid sends verification email (24h expiry)
6. User clicks link → verified → redirect to `/onboard`
7. If not verified: reminder at 24h, soft-delete at 72h

### 14.3 Login Flow

1. Email + password submitted
2. reCAPTCHA v3 validated (score >= 0.3)
3. Check: user exists, not locked, email verified, bcrypt.compare
4. On failure: increment counter, progressive delay after 5, lock after 10
5. On success: if MFA → return mfa_required; else → issue session
6. MFA: TOTP ±1 time step tolerance; backup codes as fallback
7. Tokens: JWT RS256 15-min access + 7-day refresh (opaque, hashed in sessions table)
8. Cookies: HttpOnly, Secure, SameSite=Strict

### 14.4 JWT Configuration

- Algorithm: RS256 (PEM keys from Vault); HS256 fallback in dev
- Access token: 15-minute expiry, contains user_id, org_id, role
- Refresh token: 7-day expiry, opaque 256-bit, stored hashed
- API keys: format `gm_<urlsafe>`, HMAC-SHA256 hashed secret, request signing

### 14.5 Password Reset

Standard flow: rate-limited request → crypto token → SHA-256 stored → 1h expiry → new password → invalidate all sessions → confirmation email.

### 14.6 MFA (Phase 1)

TOTP (RFC 6238): SHA-1, 30s period, 6 digits, ±1 time step tolerance. 10 backup codes (8-char alphanumeric). MFA secret encrypted via Vault transit engine.

### 14.7 OAuth / SSO (Phase 2)

Google, GitHub, Microsoft (OIDC). Enterprise SAML 2.0 (Scale + Enterprise plans).

---

## 15. Permission System (RBAC)

### 15.1 Roles (7)

| Role | Scope |
|------|-------|
| `org_owner` | Full org control, billing, can delete org |
| `org_admin` | Manage users, deployments, agents, settings |
| `operator` | Manage deployments, run agent commands, view billing |
| `developer` | View deployments, agents; use chat |
| `viewer` | Read-only access |
| `billing_admin` | Manage billing/payments (no infra access) |
| `api_service` | Machine-to-machine (deployment:read, agent:read/status, metrics:write) |

### 15.2 Permission Matrix

| Permission | Owner | Admin | Operator | Developer | Viewer | Billing |
|-----------|-------|-------|----------|-----------|--------|---------|
| tenant:* | W | - | - | - | - | - |
| user:* | W | W | - | - | - | - |
| deployment:* | W | W | R/W | R | R | R |
| agent:* | W | W | R/cmd/approve | R | R | - |
| billing:* | W | - | - | - | - | W |
| incident:* | W | W | R/W | R | R | - |
| onboarding:* | W | W | - | - | - | - |
| chat:* | W | W | W | R | - | - |

### 15.3 Enforcement Points

1. **API Gateway middleware** — `require_permission()` / `require_role()` FastAPI depends
2. **Database RLS** — `SET LOCAL app.current_org_id` on every query
3. **Frontend** — hide/disable UI elements based on role
4. **Agent commands** — validate permission before publishing to NATS

---

## 16. Billing & Payments

### 16.1 Pricing Tiers

| Plan | Monthly | Annual | Deployments | Agents | Team |
|------|---------|--------|-------------|--------|------|
| Starter | $299 | $2,990 | 3 | 12 | 5 |
| Growth | $799 | $7,990 | 10 | 24 | 15 |
| Scale | $1,999 | $19,990 | 50 | 24 | unlimited |
| Enterprise | Custom | Custom | unlimited | 24 | unlimited |

### 16.2 Stripe Integration

- **Customer** created on org registration
- **Subscription** created when plan selected
- **PaymentMethod** attached via Stripe Elements (PCI-compliant)
- **UsageRecord** reported hourly for metered billing
- **Webhook** at `POST /api/v1/billing/webhook` with HMAC-SHA256 verification

### 16.3 Subscription Lifecycle

Trial (14 days, no card) → Active → past_due (3 retries over 7 days) → suspended (day 14) → final warning (day 30) → deletion (day 45).

### 16.4 Usage-Based Components

Compute hours, storage GB, network GB, LLM tokens, agent hours. Reported by LEDGER agent → aggregated → Stripe usage records.

### 16.5 Webhook Events Handled

`checkout.session.completed`, `customer.subscription.created/updated/deleted`, `invoice.payment_succeeded/failed/finalized`, `customer.updated`, `payment_method.attached/detached`.

### 16.6 Margin Formula

```
margin_target = max(0.55, 0.75 - 0.035 * ln(monthly_cost / 100))
customer_price = cost / (1 - margin_target)
```

---

## 17. Email & Communications

### 17.1 SendGrid Templates

**Authentication:** verify-email, welcome, password-reset, password-changed, account-locked, login-new-device, mfa-enabled

**Team:** invitation, role-changed, removed-from-org

**Billing:** trial-ending (day 7/11/13), payment-succeeded, payment-failed (dunning), subscription-cancelled, plan-upgraded, invoice-ready

**Operations:** incident-alert, deployment-ready, weekly-digest

### 17.2 Email Configuration

- From: `notifications@gridmind.io`
- Reply-to: `support@gridmind.io`
- Unsubscribe links on non-critical emails
- Track opens/clicks via SendGrid

---

## 18. Security

### 18.1 CAPTCHA

reCAPTCHA v3 (invisible, score-based). Registration: 0.5 threshold. Login/reset: 0.3 threshold.

### 18.2 Rate Limiting

| Endpoint | Limit |
|----------|-------|
| POST /auth/register | 5/hour/IP |
| POST /auth/login | 10/minute/IP |
| POST /auth/forgot-password | 3/hour/email |
| GET /api/* (authenticated) | 1000/minute/key |
| POST /api/* (authenticated) | 200/minute/key |
| WebSocket connections | 5/user |

### 18.3 Security Headers

```
Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
Content-Security-Policy: default-src 'self'; script-src 'self' https://js.stripe.com https://www.google.com/recaptcha/
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=()
```

### 18.4 Secrets Management

All secrets in HashiCorp Vault. Vault Agent sidecar injects at runtime as files in `/vault/secrets/`. Vault policies enforce least-privilege per service:
- `gridmind-cortex`: read DB, Redis, NATS, transit encrypt/decrypt
- `gridmind-gateway`: read DB, Redis, Stripe, SendGrid, reCAPTCHA, JWT, NATS
- Frontend services: no Vault access (talk to gateway API only)

### 18.5 Compliance

**SOC 2 Type II:** Access controls, encryption at rest/transit, change management, incident response, vendor risk assessment, annual pen test.

**GDPR:** DPA template, right to erasure, right to export, cookie consent, privacy policy, data retention policies.

**PCI DSS Level 4:** Never store card numbers; Stripe Elements only; annual SAQ-A.

---

## 19. Infrastructure (Terraform)

### 19.1 Module Structure

```
infrastructure/terraform/
├── main.tf                         # Root: providers, KMS, module wiring
├── variables.tf                    # All configurable inputs
├── outputs.tf                      # Cluster endpoints, RDS, Redis, Vault
├── modules/
│   ├── vpc/                        # VPC, 3 AZs, 4 subnet tiers (public/private/data/vault)
│   ├── eks/                        # EKS cluster, 3 node groups, OIDC, autoscaler
│   ├── rds/                        # Aurora PostgreSQL 16, multi-AZ, encrypted
│   ├── elasticache/                # Redis cluster, encrypted, auth token
│   ├── ecr/                        # Container registries (5 services), KMS-encrypted
│   ├── nats/                       # NATS JetStream cluster (Helm)
│   ├── vault/                      # HashiCorp Vault HA (Helm)
│   ├── monitoring/                 # Prometheus + Grafana (Helm)
│   └── argocd/                     # ArgoCD App-of-Apps
└── environments/
    ├── dev/                        # Minimal, single AZ
    ├── staging/                    # Production-like, smaller instances
    └── production/                 # Full HA: multi-AZ, multi-region DR
```

### 19.2 EKS Node Groups

| Group | Purpose | Instance | Min/Max |
|-------|---------|----------|---------|
| general | gateway, admin, portal, superadmin | m7i.2xlarge | 3/15 |
| agent | cortex AI agent workloads | c7i.4xlarge (tainted) | 3/30 |
| self-healing | isolated self-healing agents | m7i.xlarge (tainted) | 2/8 |

### 19.3 Provider Configuration

- Primary region: `us-east-1`
- Secondary (DR): `us-west-2`
- KMS key: multi-region in production, 30-day deletion window, auto-rotation
- Terraform state: S3 with DynamoDB lock, encrypted

### 19.4 Helm Charts (6)

```
infrastructure/helm/
├── cortex/       # 3 replicas, agent node toleration, PDB
├── gateway/      # 3 replicas, HPA 3-10 on CPU/RPS
├── admin/        # 2 replicas, internal-only ingress
├── portal/       # 3 replicas, public ingress
├── superadmin/   # 1 replica, VPN-restricted NetworkPolicy
└── nats/         # 3 replicas, PV for JetStream
```

Each chart includes: Deployment, Service, Ingress, HPA, PDB, NetworkPolicy, ServiceAccount (IRSA), ConfigMap, ExternalSecret, and per-environment values files.

---

## 20. CI/CD & Deployment

### 20.1 Pipeline Overview

```
feature branch → PR → preview deploy → review → merge to main → CD pipeline

CD stages:
  Build → Security Scan + SBOM → Staging → Integration Tests →
  Canary 5% → Rollout 25% → 50% → 100% (with auto-rollback at any stage)
```

### 20.2 GitHub Actions Workflows

**ci.yml** — Triggers on every push. Jobs: lint-python (3.11+3.12), lint-typescript (Node 20+22), semgrep SAST, test-python (cortex+gateway with PG+Redis), test-typescript (admin/portal/superadmin), agent-contract-tests, build-images (5 services), trivy-scan, ci-gate.

**pr.yml** — Triggers on PR events. Same checks as CI plus: auto-labeling, PR-tagged images (`pr-{N}`), preview deployment to `gridmind-pr-{N}` namespace, preview URL comment on PR, cleanup on close, pr-gate.

**cd.yml** — Triggers on push to main. Single deploy at a time. Stages: build+push, security scan + SBOM, staging deploy (helm upgrade --atomic), integration tests, canary 5% → 25% → 50% → 100%, auto-rollback on failure, Slack alerts.

### 20.3 Environment Strategy

| Environment | Cluster | Purpose |
|-------------|---------|---------|
| dev | local Docker Compose | Developer workstation |
| preview | gridmind-staging | Per-PR ephemeral namespace |
| staging | gridmind-staging | Pre-production validation |
| production | gridmind-production | Live customer traffic |
| dr | gridmind-dr (us-west-2) | Disaster recovery standby |

### 20.4 Canary Deployment

Progressive weight: 5% → 25% → 50% → 100%. Each stage monitors error rate for 5 minutes via Prometheus. Threshold: < 0.1%. NGINX ingress weight-based routing.

### 20.5 Rollback

**Automated:** triggers on failure at any canary/rollout stage. Uninstalls canary releases, rolls back stable releases, Slack alert.

**Manual:** `helm rollback gridmind-{service} 0 --namespace gridmind-production --wait`

### 20.6 Database Migrations

Alembic migrations run as Helm pre-install/pre-upgrade hook Jobs. Safety rules: never drop columns in same deploy, all migrations reversible, batched large migrations, statement_timeout for DDL.

### 20.7 Disaster Recovery

Active-passive multi-region (us-east-1 primary, us-west-2 standby). Route53 failover routing. RTO < 15 minutes. RDS cross-region replica, ElastiCache Global Datastore, Vault Raft replication. Quarterly full failover drills.

---

## 21. Observability & Monitoring

### 21.1 Metrics (Prometheus)

- `cortex_agent_count`, `cortex_runtime_up`
- `cortex_llm_requests_total`, `cortex_llm_tokens_total`, `cortex_llm_latency_seconds`
- `gridmind_gateway_requests_total`, `gridmind_gateway_request_duration_seconds`, `gridmind_gateway_request_errors_total`
- `gridmind_deploy_timestamp`, `gridmind_canary_weight`, `gridmind_error_rate_5m`

### 21.2 Logging

Structured JSON logging via structlog. Bound context: request_id, agent_id, tenant_id, trace_id.

### 21.3 Grafana Dashboards

- Deployment Overview: current versions, last deploy time
- Canary Analysis: side-by-side error rate/latency
- Agent Fleet: per-agent health, heartbeat status, task counts
- FinOps: cost per tenant, margin trends

### 21.4 Alerting

| Alert | Threshold | Destination |
|-------|-----------|-------------|
| deploy_error_rate_spike | > 0.5% within 5 min | PagerDuty |
| deploy_latency_regression | p99 > 2x baseline | Slack |
| deploy_pod_crash_loop | > 3 restarts in 5 min | PagerDuty |
| canary_error_rate | > 0.1% during canary | auto-rollback |
| migration_failed | hook job failed | PagerDuty |

### 21.5 Slack Channels

- `#gridmind-deploys` — deploy start/finish/rollback
- `#gridmind-incidents` — rollback triggers, error spikes
- `#gridmind-infra` — Terraform plan/apply, node scaling

---

## 22. Production Readiness Tasks

### Phase 1: Core Identity (Weeks 1-3)

- [ ] PostgreSQL migrations for users, organizations, memberships, sessions
- [ ] Registration endpoint with bcrypt + email validation
- [ ] Login endpoint with JWT RS256 (access + refresh)
- [ ] Session management in Redis
- [ ] Email verification via SendGrid
- [ ] Password reset flow
- [ ] reCAPTCHA v3 on registration/login
- [ ] Rate limiting on auth endpoints
- [ ] Audit logging for auth events
- [ ] Wire portal to real auth endpoints

### Phase 2: Billing & Payments (Weeks 3-5)

- [ ] Stripe Customer creation on registration
- [ ] Stripe Elements integration (card collection)
- [ ] Plan selection + Subscription creation
- [ ] Webhook handler for all billing events
- [ ] Invoice display in portal
- [ ] Usage tracking pipeline (LEDGER → Stripe)
- [ ] Dunning email flow
- [ ] Trial-to-paid conversion
- [ ] Upgrade/downgrade with proration
- [ ] Wire portal billing page to real data

### Phase 3: Permissions & Team (Weeks 5-7)

- [ ] RBAC middleware enforcement in gateway
- [ ] Permission checks on every endpoint
- [ ] Team invitation flow
- [ ] Role management UI
- [ ] API key generation, hashing, scoping
- [ ] Row-level security policies
- [ ] Frontend permission-based rendering
- [ ] Audit trail for permission changes

### Phase 4: Security Hardening (Weeks 7-9)

- [ ] MFA setup/verification (TOTP + backup codes)
- [ ] Account lockout policy
- [ ] Suspicious login detection
- [ ] Security headers on all responses
- [ ] WAF rules on ALB
- [ ] VPN restriction on super admin
- [ ] Vault integration (remove env vars)
- [ ] Penetration test + fix findings

### Phase 5: Compliance & Polish (Weeks 9-12)

- [ ] Cookie consent banner
- [ ] Privacy policy + Terms of Service
- [ ] Data export API (GDPR)
- [ ] Account deletion cascade (GDPR)
- [ ] SOC 2 evidence collection
- [ ] SSO/SAML integration (Enterprise)
- [ ] Advanced audit log with export
- [ ] On-call escalation wiring (PagerDuty)

### Phase 6: First Deploy (Week 12)

- [ ] AWS account + IAM Identity Center
- [ ] S3/DynamoDB for Terraform state
- [ ] Domain registration (gridmind.io) + ACM wildcard cert
- [ ] GitHub OIDC provider + deploy IAM roles
- [ ] Branch protection + repository secrets
- [ ] Terraform apply: dev → staging → production
- [ ] Vault init + Kubernetes auth + secrets
- [ ] Database migrations (staging → production)
- [ ] Seed plans table
- [ ] First CD pipeline run
- [ ] DNS cutover
- [ ] Full end-to-end smoke test

---

## 23. Cost Estimates

| Service | Monthly (Starter) | Monthly (Scale) |
|---------|-------------------|-----------------|
| AWS EKS | $73 | $73 |
| EC2 (nodes) | ~$150 | ~$600 |
| RDS Aurora | ~$100 | ~$800 |
| ElastiCache | ~$50 | ~$200 |
| NATS (on EKS) | $0 | $0 |
| Vault (on EKS) | $0 | $0 |
| ALB | ~$25 | ~$50 |
| CloudFront | ~$10 | ~$50 |
| Route 53 | ~$5 | ~$5 |
| SendGrid | $0 | $20 |
| Stripe | 2.9% + $0.30/txn | 2.9% + $0.30/txn |
| Sentry | $0 | $26 |
| **Total infra** | **~$413/mo** | **~$1,824/mo** |

---

## 24. Timeline

| Phase | Duration | Milestone |
|-------|----------|-----------|
| Phase 1: Core Identity | Weeks 1-3 | Users can register, verify, log in |
| Phase 2: Billing | Weeks 3-5 | Users can subscribe and pay |
| Phase 3: Permissions | Weeks 5-7 | Multi-user orgs with RBAC |
| Phase 4: Security | Weeks 7-9 | MFA, lockout, WAF, Vault — pen-test ready |
| Phase 5: Compliance | Weeks 9-12 | SOC 2, GDPR, SSO — enterprise ready |
| Phase 6: Deploy | Week 12 | Infrastructure + first production deploy |
| **Launch** | **Week 12** | **Public GA** |

---

## Appendix A: Environment Variables

### Cortex (CortexConfig)

| Variable | Default |
|----------|---------|
| `NATS_URL` | `nats://localhost:4222` |
| `DATABASE_URL` | `postgresql://gridmind:gridmind@localhost:5432/gridmind` |
| `REDIS_URL` | `redis://localhost:6379/0` |
| `ANTHROPIC_API_KEY` | (required) |
| `HEARTBEAT_INTERVAL_SECONDS` | 10 |
| `APPROVAL_TIMEOUT_SECONDS` | 300 |
| `PROMETHEUS_PORT` | 9090 |
| `ENVIRONMENT` | development |

### Gateway (Settings)

| Variable | Default |
|----------|---------|
| `APP_ENV` | development |
| `HOST` / `PORT` | 0.0.0.0 / 8000 |
| `JWT_PRIVATE_KEY` / `JWT_PUBLIC_KEY` | (PEM, required in production) |
| `HMAC_SECRET` | (min 32 chars) |
| `DATABASE_URL` | `postgresql://gridmind:gridmind@localhost:5432/gridmind` |
| `REDIS_URL` | `redis://localhost:6379/0` |
| `NATS_URL` | `nats://localhost:4222` |
| `STRIPE_SECRET_KEY` | (required) |
| `STRIPE_WEBHOOK_SECRET` | (required) |
| `RATE_LIMIT_DEFAULT` | 100/minute |

### Shared (Root Settings)

| Variable | Default |
|----------|---------|
| `GRIDMIND_ENVIRONMENT` | development |
| `GRIDMIND_NATS_URL` | `nats://localhost:4222` |
| `GRIDMIND_PG_URL` | `postgresql+asyncpg://gridmind:gridmind@localhost:5432/gridmind` |
| `GRIDMIND_REDIS_URL` | `redis://localhost:6379/0` |
| `GRIDMIND_ANTHROPIC_API_KEY` | (required) |
| `GRIDMIND_STRIPE_SECRET_KEY` | (required) |
| `GRIDMIND_SECURITY_JWT_SECRET` | (required in production) |

---

## Appendix B: Domain Routing

| Domain | Target | Access |
|--------|--------|--------|
| `gridmind.io` | Marketing site (CloudFront/ECS) | Public |
| `app.gridmind.io` | Portal (EKS/ALB) | Public |
| `admin.gridmind.io` | Admin panel (EKS/ALB) | IP-restricted |
| `platform.gridmind.io` | Super admin (EKS/ALB) | VPN-only |
| `api.gridmind.io` | Gateway (EKS/ALB) | Public |
