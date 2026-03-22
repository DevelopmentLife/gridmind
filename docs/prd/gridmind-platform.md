# PRD: GridMind — Full Platform Build

## Metadata

| Field | Value |
|-------|-------|
| **PRD ID** | PRD-001 |
| **Status** | `in_progress` |
| **Author** | HERALD |
| **Created** | 2026-03-21 |
| **Priority** | `critical` |
| **Source** | `docs/prd/incoming/PRD-gridmind-unified.md` (authoritative detail), `docs/prd/incoming/DEVELOPMENT-GUIDE.md` (coding standards) |

---

## 1. Problem Statement

Teams running PostgreSQL workloads need DBA-level expertise around the clock but cannot afford or hire dedicated DBAs. Manual database administration is expensive, error-prone, and reactive. GridMind deploys 24 autonomous AI agents that continuously monitor, optimize, scale, heal, and secure customer database deployments — eliminating manual DBA work entirely.

## 2. Objective

Deliver a production-ready, multi-tenant AI-native database operations SaaS platform: agent runtime, API gateway, three operator/customer/admin frontends, marketing site, full infrastructure-as-code, and CI/CD pipelines — all from scratch, with no existing code.

## 3. Users & Personas

| Persona | Description | Key Need |
|---------|-------------|----------|
| Customer (org_owner / admin) | Startup/mid-market engineering team running PostgreSQL | Self-service onboarding, visibility into agent activity, billing control |
| Customer (operator / developer) | Engineers using the platform daily | Real-time metrics, agent approvals, chat interface |
| GridMind Operator | Internal staff managing the platform | Fleet visibility, tenant management, GOD MODE controls |
| GridMind Super Admin | Platform administrators | Revenue analytics, audit logs, feature flags, infra oversight |

## 4. Requirements

### 4.1 Functional Requirements

See `docs/prd/incoming/PRD-gridmind-unified.md` for full implementation detail per service. Summary:

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-01 | cortex: 24 AI agents (BaseAgent ABC, EventMesh/NATS, LLMClient/Anthropic, ApprovalGate, StateManager, AuditLogger) running as CortexRuntime | must-have |
| FR-02 | gateway: 66 REST endpoints + 4 WebSocket channels (FastAPI, JWT RS256, RBAC, Stripe, multi-tenant) | must-have |
| FR-03 | shared: SQLAlchemy 2.0 models, 26 Pydantic v2 NATS event schemas, pydantic-settings config | must-have |
| FR-04 | migrations: 10 PostgreSQL migration files (001–010), UP+DOWN, idempotent | must-have |
| FR-05 | admin: Next.js 15 operator dashboard (7 pages, dark theme, Zustand, Framer Motion, WebSocket) | must-have |
| FR-06 | portal: Next.js 15 customer portal (10 pages, 7-phase onboarding wizard, Stripe Elements) | must-have |
| FR-07 | superadmin: Next.js 15 platform admin (9 pages, amber theme, GOD MODE controls) | must-have |
| FR-08 | gridmind-site: Next.js 15 marketing site (single-page, neural mesh canvas animation, pricing) | must-have |
| FR-09 | infrastructure: Terraform (9 modules, 3 envs: dev/staging/prod), 6 Helm charts, Docker Compose for local dev | must-have |
| FR-10 | CI/CD: GitHub Actions (ci.yml, pr.yml, cd.yml) with lint, test, SAST, canary deploy, auto-rollback | must-have |

### 4.2 Non-Functional Requirements

| ID | Requirement | Target |
|----|-------------|--------|
| NFR-01 | API response P95 (reads) | < 200ms |
| NFR-02 | API response P95 (writes) | < 500ms |
| NFR-03 | Test coverage (all services) | ≥ 85% line coverage |
| NFR-04 | Type safety | mypy --strict (Python), tsc --strict (TypeScript), zero errors |
| NFR-05 | Lint | ruff (line-length 100) + mypy for Python; eslint + prettier for TypeScript; zero warnings |
| NFR-06 | Auth token lifetime | Access: 15 min (JWT RS256); Refresh: 7 days (opaque, hashed) |
| NFR-07 | WCAG accessibility | 2.1 AA on all frontends |
| NFR-08 | Container security | Non-root, read-only rootfs, distroless/slim base |

## 5. Acceptance Criteria

| AC | Criteria | Test Type |
|----|----------|-----------|
| AC-01 | **Given** CortexRuntime starts, **When** all 24 agents are registered, **Then** all agents emit heartbeats within 30s and are visible in agent_state table | integration |
| AC-02 | **Given** a valid JWT, **When** `GET /api/v1/deployments` is called, **Then** only deployments belonging to the caller's tenant are returned | integration |
| AC-03 | **Given** an agent publishes an ApprovalRequest, **When** a human approves via `POST /api/v1/agents/approvals/{id}/decide`, **Then** the SUPERVISED agent unblocks within 5s | e2e |
| AC-04 | **Given** a new user registers, **When** email is verified, **Then** the 7-phase onboarding wizard is accessible and HARBOR agent is activated | e2e |
| AC-05 | **Given** a Stripe webhook arrives, **When** `invoice.payment_failed` fires, **Then** subscription status transitions to past_due and dunning email is queued | integration |
| AC-06 | **Given** PULSE detects 6 missed heartbeats, **When** AgentDead event fires, **Then** MEDIC applies a recovery playbook within 60s | integration |
| AC-07 | **Given** any API request, **When** no valid JWT is present, **Then** response is 401 with `AUTHENTICATION_REQUIRED` error code | unit |
| AC-08 | **Given** the Docker Compose stack starts, **When** `docker compose up`, **Then** all services are healthy within 120s | integration |

## 6. Scope

### In Scope

- All 6 services: cortex, gateway, admin, portal, superadmin, gridmind-site
- shared/ models, schemas, config (consumed by cortex + gateway)
- migrations/ (10 SQL files, UP+DOWN)
- infrastructure/ Terraform (9 modules, 3 envs), 6 Helm charts
- Docker Compose for local development (all services + PG + Redis + NATS)
- GitHub Actions CI/CD (ci.yml, pr.yml, cd.yml)
- All 24 agents with full implementations per PRD section 12
- All 66 REST endpoints + 4 WebSocket channels per PRD section 5
- All frontend pages per PRD sections 6–9

### Out of Scope

- OAuth / SSO (Section 14.7 — Phase 2, deferred)
- MySQL, MongoDB, Redis, CockroachDB engine support (PostgreSQL only for Phase 1)
- SAML 2.0 (Enterprise tier, Phase 2)
- Disaster recovery region (us-west-2) — infrastructure scaffolded but not provisioned
- Live API key integration (Anthropic, Stripe, SendGrid, reCAPTCHA all mocked behind feature flags)

## 7. Data Model

See `docs/prd/incoming/PRD-gridmind-unified.md` sections 10–11 for full schema.

Key entities: `tenants`, `users`, `memberships`, `deployments`, `agent_registry`, `agent_state`, `events` (partitioned), `audit_log` (partitioned, append-only), `plans`, `subscriptions`, `invoices`, `usage_records`, `incidents`, `approval_requests`, `approval_responses`, `notifications`, `campaigns`.

## 8. API Design

See `docs/prd/incoming/PRD-gridmind-unified.md` section 5 for full endpoint list.
Base URL: `/api/v1/`. All errors use standard GridMind error envelope (code, message, details, request_id, timestamp).

## 9. Build Order (ATLAS execution plan)

Build all workstreams in parallel. Dependency order within each:

```
Wave 1 (no dependencies — start immediately, in parallel):
  ├── shared/ models + schemas + config
  ├── migrations/ 001–010 SQL files
  ├── Docker Compose (local dev environment)
  ├── GitHub Actions CI/CD scaffolding
  └── gridmind-site/ (fully independent)

Wave 2 (depends on Wave 1 shared/ and migrations/):
  ├── services/cortex/ (BaseAgent, EventMesh, LLMClient, etc.)
  └── services/gateway/ (FastAPI app, auth, all routes)

Wave 3 (depends on gateway API contract):
  ├── services/admin/
  ├── services/portal/
  └── services/superadmin/

Wave 4 (all services done):
  ├── infrastructure/terraform/ (9 modules)
  ├── infrastructure/helm/ (6 charts)
  └── tests/contract/ (cross-service contract tests)
```

## 10. Security Considerations

- All secrets via environment variables (mock values in .env.example; real values via Vault at runtime)
- JWT RS256 in production; HS256 fallback in dev/test only
- reCAPTCHA disabled in test env (`RECAPTCHA_ENABLED=false`)
- Stripe + Anthropic + SendGrid mocked in test env (env var presence gates real calls)
- Rate limiting: SlowAPI + Redis (stub with in-memory in tests)
- RLS enforced on all DB queries via `SET LOCAL app.current_org_id`
- Security headers per PRD section 18.3 (FastAPI middleware)

## 11. Dependencies

### External (all mocked — no keys required to build)

| Service | Env Var Gate | Mock Strategy |
|---------|-------------|---------------|
| Anthropic API | `ANTHROPIC_API_KEY` | Return fixture responses in test |
| Stripe | `STRIPE_SECRET_KEY` | `stripe-mock` Docker container in dev |
| SendGrid | `SENDGRID_API_KEY` | Log emails to stdout in dev |
| reCAPTCHA v3 | `RECAPTCHA_ENABLED=false` | Skip verification |
| HashiCorp Vault | `VAULT_ADDR` | Dev mode Vault in Docker Compose |

### Internal

- PostgreSQL 16 (Docker Compose: `postgres:16-alpine`)
- Redis 7 (Docker Compose: `redis:7-alpine`)
- NATS JetStream (Docker Compose: `nats:2.10-alpine`)

## 12. Assumptions (HERALD defaults applied)

1. Monorepo structure: `gridmind-io/gridmind` (single repo for all services except gridmind-site)
2. Terraform state: S3 bucket `gridmind-terraform-state`, DynamoDB lock `gridmind-terraform-locks`
3. Primary domain: `gridmind.io`
4. Initial superadmin: configured via `SUPERADMIN_EMAIL` + `SUPERADMIN_PASSWORD` env vars
5. Local dev ports: gateway:8000, admin:3000, portal:3001, superadmin:3002, cortex metrics:9090
6. Coverage gate: 85% minimum (per DEVELOPMENT-GUIDE.md, overrides STANDARDS.md 90%)
7. Python package manager: `uv` for gateway, `hatch` for cortex
8. All external integrations mocked; real keys wired via env vars when available
9. TDD enforced: every file built RED → GREEN → REFACTOR → COMMIT per DEVELOPMENT-GUIDE.md

## 13. Definition of Done

- [ ] All 24 agents implemented with unit tests ≥ 85% coverage
- [ ] All 66 REST endpoints + 4 WebSocket channels implemented and tested
- [ ] All frontend pages built and accessible via local Docker Compose
- [ ] All 10 migration files with tested UP + DOWN
- [ ] All AC-01 through AC-08 passing
- [ ] mypy --strict: zero errors on cortex + gateway
- [ ] tsc --strict: zero errors on admin + portal + superadmin + gridmind-site
- [ ] ruff + eslint: zero warnings
- [ ] Docker Compose: `docker compose up` brings all services to healthy within 120s
- [ ] GitHub Actions CI passes on main branch
- [ ] .env.example documents every required environment variable
- [ ] OpenAPI spec auto-generated from FastAPI and accessible at `/docs`
- [ ] SENTRY threat model complete (zero CRITICAL/HIGH unresolved)
- [ ] SCRIBE: README.md, docs/architecture/, docs/api/, docs/runbooks/ complete
