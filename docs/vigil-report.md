# VIGIL Acceptance Criteria Report

**Date:** 2026-03-21
**Auditor:** VIGIL (QA Agent)
**Scope:** Full codebase sweep against STANDARDS.md and DEVELOPMENT-GUIDE.md acceptance criteria
**Project:** GridMind — Assertive Mind

---

## 1. PASS/FAIL Summary Table

### 1.1 File Structure Completeness

| Criterion | Status | Notes |
|-----------|--------|-------|
| `services/cortex/cortex/base_agent.py` | PASS | Present, non-empty |
| `services/cortex/cortex/event_mesh.py` | PASS | Present, non-empty |
| `services/cortex/cortex/runtime.py` | PASS | Present, non-empty |
| `services/cortex/cortex/llm.py` | PASS | Present, non-empty |
| `services/cortex/cortex/approval.py` | PASS | Present, non-empty |
| `services/cortex/cortex/state.py` | PASS | Present, non-empty |
| `services/cortex/cortex/audit.py` | PASS | Present, non-empty |
| `services/cortex/agents/registry.py` | PASS | Present, 24 agents registered |
| `services/cortex/agents/__init__.py` | PASS | Present, all 24 agent classes imported and registered |
| At least 20 agent files in `services/cortex/agents/` | PASS | 24 agent files found (argus, ledger, sentinel, oracle, titan, prism_agent, sherlock, aegis, forge_agent, convoy, vault_agent, tuner, pulse, medic, vitals, triage, gremlin, phoenix, scribe, thrift, harbor, comptroller, herald, steward) |
| `services/cortex/tests/conftest.py` | PASS | Present, non-empty |
| `services/cortex/tests/test_base_agent.py` | PASS | Present, non-empty |
| `services/gateway/gateway/main.py` | PASS | Present, non-empty |
| `services/gateway/gateway/auth.py` | PASS | Present, non-empty |
| `services/gateway/gateway/routes/` — at least 8 route files | PASS | 9 route files: auth, deployments, agents, tenants, billing, users, incidents, chat, onboarding |
| `services/gateway/tests/` — at least 8 test files | PASS | 10 test files found (test_auth, test_deployments, test_agents, test_billing, test_users, test_incidents, test_middleware, test_websocket, test_errors, conftest) |
| `shared/models/__init__.py` | PASS | Present, non-empty |
| `shared/schemas/events.py` | PASS | Present, non-empty |
| `shared/config/settings.py` | PASS | Present, non-empty |
| `migrations/` — at least 10 .sql files | PASS | Exactly 10 SQL migrations found (001–010) |
| `services/admin/src/app/page.tsx` | PASS | Present, non-empty |
| `services/portal/src/app/page.tsx` | PASS | Present, non-empty |
| `services/superadmin/src/app/page.tsx` | PASS | Present, non-empty |
| `gridmind-site/app/page.tsx` | PASS | Present, non-empty |
| `docker-compose.yml` | PASS | Present, non-empty |
| `.github/workflows/ci.yml` | PASS | Present, non-empty |
| `.github/workflows/cd.yml` | PASS | Present, non-empty |
| `Makefile` | PASS | Present, non-empty |

### 1.2 Standards Compliance Spot-Checks — Python

| Criterion | Status | Notes |
|-----------|--------|-------|
| All Python files start with `from __future__ import annotations` | PASS | All 86 Python files across `services/` and `shared/` contain this import |
| No bare `except:` clauses | PASS | Zero bare `except:` clauses found |
| `except Exception:` usage appropriately scoped | PASS WITH NOTE | 8 occurrences of `except Exception:` found in legitimate infrastructure/lifecycle contexts (NATS connect, db pool init, middleware, runtime nak). Each logs before passing or re-raises. Acceptable per STANDARDS.md section 8 guidance. |
| No hardcoded secrets or API keys in source code | PASS | No live or real secret values found in Python source files |
| Type hints on function signatures | PASS (spot-checked) | Verified in `base_agent.py`, `event_mesh.py`, `auth.py`, `approval.py`, `middleware.py` — all use full type hints |

### 1.3 Standards Compliance Spot-Checks — TypeScript

| Criterion | Status | Notes |
|-----------|--------|-------|
| No `any` types without comment | PASS | Zero unqualified `: any` usages in `src/` directories across admin, portal, superadmin |
| Functional components only (no class components) | PASS | Zero `extends Component` / `extends PureComponent` patterns found |
| No inline styles | FAIL (non-blocking) | 11 `style={...}` usages found across 7 files — all are data-driven dynamic width/height values for progress bars and sparklines where Tailwind cannot express runtime-calculated percentages. Each is a justified exception, but none are documented with a comment. See Non-Critical Findings. |

### 1.4 Test Coverage Indicators

| Criterion | Status | Notes |
|-----------|--------|-------|
| Test file for `auth.py` route | PASS | `test_auth.py` present |
| Test file for `deployments.py` route | PASS | `test_deployments.py` present |
| Test file for `agents.py` route | PASS | `test_agents.py` present |
| Test file for `billing.py` route | PASS | `test_billing.py` present |
| Test file for `users.py` route | PASS | `test_users.py` present |
| Test file for `incidents.py` route | PASS | `test_incidents.py` present |
| Test file for `tenants.py` route | FAIL | No `test_tenants.py` in `services/gateway/tests/` |
| Test file for `chat.py` route | FAIL | No `test_chat.py` in `services/gateway/tests/` |
| Test file for `onboarding.py` route | FAIL | No `test_onboarding.py` in `services/gateway/tests/` |
| Tests for `base_agent.py` | PASS | `test_base_agent.py` present |
| Tests for `event_mesh.py` | PASS | `test_event_mesh.py` present |
| Tests for `runtime.py` | PASS | `test_runtime.py` present |
| Tests for `llm.py` | PASS | `test_llm.py` present |
| Tests for `approval.py` | PASS | `test_approval.py` present |
| Tests for `state.py` | PASS | `test_state.py` present |
| Tests for `audit.py` | PASS | `test_audit.py` present |
| Individual agent test files (24 agents) | FAIL | `services/cortex/tests/agents/` directory exists but contains only `__init__.py` — zero individual agent test files (test_argus.py, test_sherlock.py, etc.) are present |
| Admin — at least 4 component tests | PASS | 4 component tests: StatusBadge, AgentCard, IncidentBadge, ApprovalCard |
| Admin — at least 2 store tests | PASS | 2 store tests: agentStore, approvalStore |
| Portal — at least 4 component tests | PASS | 4 component tests: DeploymentCard, IncidentCard, ApprovalCard, ChatMessage |
| Portal — at least 2 store tests | PASS | 2 store tests: authStore, deploymentStore |
| Superadmin — at least 4 component tests | PASS | 4 component tests: GodModeWarningBanner, TenantTableRow, ImpersonateModal, FeatureFlagRow |
| Superadmin — at least 2 store tests | PASS | 2 store tests: platformStore, featureFlagStore |
| Contract tests in `tests/contract/` | FAIL | Directory does not exist — no contract tests present |

### 1.5 Security Spot-Checks

| Criterion | Status | Notes |
|-----------|--------|-------|
| `auth.py` — JWT implementation exists | PASS | `python-jose` JWT used, RS256/HS256 paths, `create_access_token`, `verify_token` implemented |
| `auth.py` — bcrypt referenced | PASS | `CryptContext(schemes=["bcrypt"], bcrypt__rounds=12)` confirmed at line 25 |
| `middleware.py` — tenant isolation middleware exists | PASS | `TenantIsolationMiddleware` present, extracts tenant from JWT, sets on request state |
| No `.env` files committed (only `.env.example`) | PASS | `.env.example` present; no `.env` files found in repo |
| SQL migrations — parameterized queries | PASS | All migrations use DDL only (CREATE TABLE, CREATE INDEX, triggers) — no dynamic SQL string concatenation |
| Hardcoded credentials in `docker-compose.yml` | FAIL | `docker-compose.yml` contains inline plaintext placeholder secrets: `GRIDMIND_ANTHROPIC_API_KEY: sk-ant-mock-key-for-local-dev`, `GRIDMIND_STRIPE_SECRET_KEY: sk_test_placeholder`, `GRIDMIND_JWT_SECRET: dev-jwt-secret-do-not-use-in-production`. These are dev-only values, but they leak Stripe key format and JWT secret into version control. See Critical Findings. |
| Hardcoded API key in `ci.yml` | FAIL | `ci.yml` contains `GRIDMIND_ANTHROPIC_API_KEY: sk-ant-mock-key-for-ci` as a plaintext env var. Should be a GitHub secret reference. |

### 1.6 Migration Completeness

| Criterion | Status | Notes |
|-----------|--------|-------|
| Count: at least 10 SQL migration files | PASS | 10 files: 001–010 |
| All migrations have `==== UP ====` section | PASS | All 10 confirmed |
| All migrations have `==== DOWN ====` section | PASS WITH NOTE | All 10 have `==== DOWN ====` section, but all DOWN sections are commented-out SQL. While the structure is present, the rollback SQL is not executable without uncommenting. This is a functional gap. |
| `001_tenants.sql` exists with RLS policies | FAIL | `001_tenants.sql` exists and has tenant table structure, but contains zero `ROW LEVEL SECURITY` / `CREATE POLICY` statements. No migration in the entire set (001–010) implements RLS. The DEVELOPMENT-GUIDE.md mandates RLS on all tables with `tenant_id`. |
| `audit_log` immutability trigger present | FAIL | `006_audit.sql` creates the partitioned `audit_log` table but does NOT implement the immutability trigger specified in DEVELOPMENT-GUIDE.md Section 6.4. There is no `enforce_audit_immutability` trigger or `REVOKE UPDATE, DELETE, TRUNCATE` grant. |

### 1.7 Docker + CI Completeness

| Criterion | Status | Notes |
|-----------|--------|-------|
| `docker-compose.yml` — all 5 app services defined | PASS | gateway, cortex, admin, portal, superadmin all present |
| `docker-compose.yml` — at least 4 infra services defined | PASS | postgres, redis, nats, vault (exactly 4) |
| `ci.yml` — lint jobs present | PASS | `lint-python` (ruff + mypy) and `lint-typescript` (eslint) both present |
| `ci.yml` — typecheck jobs present | PASS | mypy --strict for Python, tsc --noEmit for TypeScript (via eslint job configuration) |
| `ci.yml` — test jobs with 85% coverage gate | PASS | `test-python` (pytest --cov-fail-under=85) and `test-typescript` (vitest --coverage.thresholds.lines=85) |
| `ci.yml` — Docker image build jobs | PASS | `build-images` job builds all 5 services |
| `ci.yml` — CI gate job | PASS | `ci-gate` job requires all others to pass |
| `ci.yml` — SAST/Semgrep scan | FAIL | No Semgrep or SAST scanning in `ci.yml`. STANDARDS.md Section 8.1 requires Semgrep (python, typescript, secrets, owasp-top-ten) on every PR. |
| `cd.yml` — staging deploy step | PASS | `deploy-staging` job deploys via Helm to EKS staging |
| `cd.yml` — integration tests on staging | PASS | `integration-tests` job runs after staging deploy |
| `cd.yml` — canary production steps | PASS | 4-phase canary: 5% → 25% → 50% → 100% with error-rate rollback |
| `cd.yml` — container Trivy scan | PASS | `security-scan` job runs Trivy with CRITICAL,HIGH exit-code=1 before staging deploy |
| Infrastructure (Helm charts, Terraform) | FAIL | `infrastructure/helm/` and `infrastructure/terraform/` directories are absent. CD pipeline references these paths but they do not exist. This will cause all production deployments to fail. |
| Contract tests in CI | FAIL | `tests/contract/` directory absent; no contract test step in `ci.yml` |
| Dockerfiles — non-root user | PASS | All Dockerfiles create and use non-root `gridmind` user (uid 1001) |
| Dockerfiles — read-only rootfs | FAIL | No `--read-only` or `readOnlyRootFilesystem: true` in any Dockerfile. STANDARDS.md Section 9 requires read-only rootfs for containers. |

---

## 2. Critical Findings

These findings would block deployment or represent significant security/integrity risks.

### CF-001: Infrastructure Artifacts Completely Absent (DEPLOYMENT BLOCKER)

**Severity:** CRITICAL
**Location:** `infrastructure/helm/`, `infrastructure/terraform/`
**Detail:** The entire `infrastructure/` directory does not exist. The CD pipeline (`cd.yml`) references `infrastructure/helm/{service}/values-staging.yaml` and `infrastructure/helm/{service}/values-production.yaml` in every Helm upgrade command. Without these Helm charts, every staging and production deployment will fail immediately. The 9 Terraform modules and 3 environments described in the PRD are also absent.
**Blocked by this:** Every deployment to staging and production.

### CF-002: RLS Policies Missing from All Migrations (DATA ISOLATION RISK)

**Severity:** CRITICAL
**Location:** `migrations/001_tenants.sql` through `migrations/010_communications.sql`
**Detail:** Zero `ENABLE ROW LEVEL SECURITY` or `CREATE POLICY` statements exist in any migration. The DEVELOPMENT-GUIDE.md (Section 6.2) mandates RLS on every table with `tenant_id`. Without RLS, a bug in a route handler that omits a `WHERE tenant_id = $1` clause would expose data across all tenants. This is a fundamental multi-tenant data isolation failure.
**Affected tables:** deployments, users, memberships, agent_registry, agent_state, events_log, audit_log, billing (subscriptions, invoices, usage_records), incidents, approvals, notifications — any table with `tenant_id`.

### CF-003: Hardcoded Placeholder Secrets in docker-compose.yml

**Severity:** HIGH
**Location:** `docker-compose.yml` lines 102–107
**Detail:** The following values are committed to version control in plaintext:
- `GRIDMIND_JWT_SECRET: dev-jwt-secret-do-not-use-in-production`
- `GRIDMIND_ANTHROPIC_API_KEY: sk-ant-mock-key-for-local-dev`
- `GRIDMIND_STRIPE_SECRET_KEY: sk_test_placeholder`
- `GRIDMIND_STRIPE_WEBHOOK_SECRET: whsec_test_placeholder`

While labeled as dev-only, the `sk-ant-` prefix format and `whsec_` format are real Stripe/Anthropic key prefixes that could confuse automated secret scanners into false-negatives, and the practice normalizes committing credentials. The Stripe key format specifically could allow a key accidentally pasted in the future to pass undetected.
**Mitigation required:** Replace with references to `.env` file variables (e.g., `${GRIDMIND_ANTHROPIC_API_KEY}`), sourced from `.env.example`.

### CF-004: Hardcoded API Key in ci.yml

**Severity:** HIGH
**Location:** `.github/workflows/ci.yml` line 126
**Detail:** `GRIDMIND_ANTHROPIC_API_KEY: sk-ant-mock-key-for-ci` is set as a plaintext environment variable in the CI workflow. This should reference a GitHub Actions secret: `${{ secrets.ANTHROPIC_API_KEY_CI }}`.

### CF-005: Audit Log Immutability Trigger Absent

**Severity:** HIGH
**Location:** `migrations/006_audit.sql`
**Detail:** The DEVELOPMENT-GUIDE.md (Section 6.4) explicitly requires an immutability trigger on `audit_log` and REVOKE of UPDATE/DELETE/TRUNCATE privileges. Neither the trigger (`audit_log_immutable`) nor the privilege revocation is present. The audit log can be modified or deleted by any actor with `gridmind_app` database access, defeating its compliance purpose.

### CF-006: All 24 Agent Tests Absent

**Severity:** HIGH
**Location:** `services/cortex/tests/agents/`
**Detail:** The `tests/agents/` directory contains only `__init__.py`. Zero individual agent test files exist (no `test_argus.py`, `test_sherlock.py`, etc.). DEVELOPMENT-GUIDE.md Section 2.4.3 requires each agent to be tested for class declarations, event processing, event emission, tool invocation, LLM interaction, approval gating, and error handling. With 24 agents untested, branch coverage for the `agents/` package is effectively 0%, far below the 85% gate. CI would fail on coverage check for `cortex`.

### CF-007: Contract Tests Directory Absent

**Severity:** HIGH
**Location:** `tests/contract/`
**Detail:** The contract tests directory does not exist. DEVELOPMENT-GUIDE.md Section 2.6 requires contract tests validating shared event schemas across services. The CI pipeline does not include a contract test step. Cross-service schema drift will go undetected.

### CF-008: SAST Scanning Absent from CI

**Severity:** HIGH
**Location:** `.github/workflows/ci.yml`
**Detail:** STANDARDS.md Section 8.1 requires Semgrep with `python`, `typescript`, `secrets`, and `owasp-top-ten` rulesets on every pre-merge CI run. No Semgrep or equivalent SAST step exists in `ci.yml`. Security vulnerabilities in Python and TypeScript code will not be caught before merge.

---

## 3. Non-Critical Findings

These findings are standards gaps that should be addressed within one sprint but do not block deployment.

### NC-001: Migration DOWN Sections Are Commented-Out SQL (Not Executable)

**Location:** All 10 migration files
**Detail:** Every `==== DOWN ====` section contains `-- DROP TABLE IF EXISTS ...` comments rather than executable SQL. While STANDARDS.md states "Every UP has a DOWN", the current implementation requires manual uncommenting to execute a rollback. A migration runner cannot execute these. Recommend either a formal migration tool (Flyway, Alembic, golang-migrate) that separates UP/DOWN files, or removing the comments so the SQL is executable.

### NC-002: Inline Styles in TypeScript Components (Undocumented Exceptions)

**Location:** 7 files across admin, portal, superadmin
- `services/superadmin/src/components/SystemServiceCard.tsx:136`
- `services/admin/src/components/TenantRow.tsx:130`
- `services/admin/src/app/tenants/[id]/page.tsx:131`
- `services/admin/src/components/MetricsChart.tsx:97,111`
- `services/portal/src/components/MetricSparkline.tsx:47`
- `services/portal/src/app/(authenticated)/billing/page.tsx:108`
- `services/portal/src/app/(authenticated)/deployments/[id]/page.tsx:145`
- `services/portal/src/app/(authenticated)/chat/page.tsx:136`
- `services/superadmin/src/app/revenue/page.tsx:107,164`

**Detail:** STANDARDS.md prohibits inline styles. All 11 occurrences are dynamic width/height values for progress bars and sparklines where Tailwind utility classes cannot express runtime-calculated percentages. Each should be annotated with `{/* eslint-disable-next-line react/forbid-component-props -- runtime-calculated percentage width */}` or equivalent comment per the `any`-comment convention.

### NC-003: Missing Gateway Route Test Files — tenants, chat, onboarding

**Location:** `services/gateway/tests/`
**Detail:** Three route modules lack test files:
- `routes/tenants.py` → no `test_tenants.py`
- `routes/chat.py` → no `test_chat.py`
- `routes/onboarding.py` → no `test_onboarding.py`

These route modules contain business logic that should be tested. Without them, coverage for these routes is 0%.

### NC-004: Dockerfile Lacks Read-Only Rootfs Configuration

**Location:** All 5 Dockerfiles
**Detail:** STANDARDS.md Section 9 specifies containers must use `read-only rootfs`. None of the Dockerfiles include read-only filesystem configuration. This is typically enforced at the Kubernetes pod level (`readOnlyRootFilesystem: true` in `securityContext`), but the Helm charts are absent (CF-001), so it cannot be verified.

### NC-005: `docker-compose.yml` — Vault Dev Mode With Root Token

**Location:** `docker-compose.yml` lines 64–65
**Detail:** Vault is configured in dev mode with a hardcoded root token (`VAULT_DEV_ROOT_TOKEN_ID: dev-root-token`). This is acceptable for local development but should be clearly documented as dev-only and the `.env.example` should reference this pattern so developers do not copy it to staging.

### NC-006: Missing `.env.example` References in docker-compose.yml

**Location:** `docker-compose.yml`
**Detail:** Environment variables are inlined in the compose file rather than referencing shell environment variables or an `.env` file. An `.env.example` file exists at the project root but docker-compose does not use it. Recommend changing `docker-compose.yml` to use `${VAR_NAME}` syntax so that `.env` is the single source of truth for local dev credentials.

### NC-007: CI Lacks TypeScript Type-Check Job as a Separate Gate

**Location:** `.github/workflows/ci.yml`
**Detail:** The ESLint job in CI does not explicitly run `tsc --noEmit`. TypeScript type errors would only surface during the build step (if configured). STANDARDS.md requires a dedicated `tsc --strict` gate. DEVELOPMENT-GUIDE.md Section 8.1 lists `tsc --noEmit` as a required pre-merge check. Recommend adding a `typecheck-typescript` job that runs `npm run typecheck` (which maps to `tsc --noEmit`) for all three frontend services.

### NC-008: No `tests/integration/` Directory (Referenced in cd.yml)

**Location:** `tests/integration/`
**Detail:** The CD pipeline (`cd.yml`) at line 184 runs `pytest tests/integration/ -v --tb=short`. This directory does not exist. The integration test step in CD will fail on first deployment attempt.

---

## 4. Overall Verdict

**VERDICT: FAIL — NOT READY TO SHIP**

### Blocker Summary

| ID | Finding | Severity |
|----|---------|---------|
| CF-001 | Infrastructure (Helm/Terraform) absent — deployments impossible | CRITICAL |
| CF-002 | RLS policies absent from all migrations — multi-tenant data exposure | CRITICAL |
| CF-003 | Hardcoded placeholder secrets in docker-compose.yml | HIGH |
| CF-004 | Hardcoded API key in ci.yml | HIGH |
| CF-005 | Audit log immutability trigger absent | HIGH |
| CF-006 | Zero individual agent tests (24 agents, 0% coverage) | HIGH |
| CF-007 | Contract tests directory absent | HIGH |
| CF-008 | SAST scanning absent from CI | HIGH |

### What Passes

The codebase is structurally complete for application code: all 24 agents exist, all 9 gateway route files exist, all three frontends exist with the correct page structure, all Python files follow the `from __future__ import annotations` convention, no bare `except:` clauses were found, JWT + bcrypt are correctly implemented in `auth.py`, tenant isolation middleware is present, no `.env` files are committed, all 10 migrations have UP sections with proper SQL, the CI pipeline correctly enforces 85% coverage gates for both Python and TypeScript, and the CD pipeline implements a proper 4-phase canary deployment with Trivy container scanning.

### Remediation Priority Order

1. **CF-001** — Create `infrastructure/helm/` with 5 charts and `infrastructure/terraform/` — deployment is impossible without this.
2. **CF-002** — Add RLS policies to all migrations with `tenant_id` columns — multi-tenant safety requires this.
3. **CF-006** — Create 24 agent test files in `services/cortex/tests/agents/` — coverage gate will block CI.
4. **CF-005** — Add immutability trigger to `migrations/006_audit.sql`.
5. **CF-008** — Add Semgrep SAST step to `ci.yml`.
6. **CF-003 / CF-004** — Remove hardcoded credentials from docker-compose.yml and ci.yml.
7. **CF-007** — Create `tests/contract/` with schema validation tests.
8. **NC-003** — Add test_tenants.py, test_chat.py, test_onboarding.py to gateway tests.
9. **NC-008** — Create `tests/integration/` with at least a stub test so CD does not fail.
10. **NC-001** — Make migration DOWN sections executable (uncomment or adopt a migration runner).
