# Development Standards Guide

**Version:** 1.0
**Maintained by:** ATLAS (Orchestrator) + SENTRY (Security)
**Applies to:** All agents, all code, all environments

This document is the canonical source of truth for how this team writes software.
Every agent MUST read and follow these standards. ATLAS enforces compliance at the
task level. VIGIL verifies compliance at the test level. SENTRY audits compliance
at the security level.

---

## 1. Code Philosophy

### Core Principles

- **Clarity over cleverness.** Code is read 10x more than written. Optimize for the reader.
- **Explicit over implicit.** State types, handle errors, name things precisely.
- **Simple over complex.** Use established patterns. Save creativity for the product.
- **Ship over perfect.** A working feature in production beats a perfect feature in a branch.
- **Small over large.** Small functions, small files, small PRs, small deploys.

### Design Patterns

- Composition over inheritance. Prefer interfaces and dependency injection.
- Dependency inversion. High-level modules depend on abstractions.
- Single responsibility. One module, one reason to change.
- Fail fast. Validate at boundaries. Reject bad state early.
- Idempotency by default. Retryable operations produce same result.
- Immutability where practical. Default to const/final/readonly.

---

## 2. Language Standards

### Python

| Rule | Standard |
|------|----------|
| Version | 3.11+ |
| Style/Lint | ruff (PEP 8) |
| Type checker | mypy --strict |
| Type hints | Required on ALL function signatures (params + return) |
| Docstrings | Required on public classes and functions (Google style) |
| Imports | stdlib → third-party → local. Absolute imports only. |
| Strings | f-strings inline. .format() for templates. Never % operator. |
| Errors | Catch specific exceptions. Never bare except:. Log before re-raise. |
| Data structures | dataclass or Pydantic BaseModel. No raw dicts for domain objects. |
| Async | async/await for I/O. Never mix sync I/O in async paths. |
| Deps | Pinned in pyproject.toml or requirements.txt. Lock file committed. |

### TypeScript

| Rule | Standard |
|------|----------|
| Version | TypeScript 5.x strict mode |
| Style/Lint | eslint + prettier |
| Strict mode | "strict": true. No any. No @ts-ignore without comment. |
| Components | Functional + hooks only. No class components. |
| Styling | Tailwind utility-first. No inline styles. No !important. |
| Null handling | Optional chaining (?.) + nullish coalescing (??). |
| Async | async/await over .then() chains. Always try/catch. |
| Enums | as const objects over TypeScript enum. |

### SQL

| Rule | Standard |
|------|----------|
| Keywords | UPPERCASE (SELECT, WHERE, JOIN) |
| Tables | snake_case, plural (users, orders) |
| Primary keys | id (bigint auto-increment or UUID per ADR) |
| Foreign keys | {table_singular}_id (user_id) |
| Timestamps | created_at, updated_at on every table. UTC. |
| Constraints | NOT NULL default. CHECK for enums and ranges. |
| Queries | Parameterized ALWAYS. Never concatenate user input. |
| Migrations | Timestamped. Every UP has a DOWN. Idempotent. |

---

## 3. API Design

### REST Conventions

- URL: /api/v{N}/{resource} — plural nouns, no verbs
- Versioning: URL path (/api/v1/). Never break existing versions.
- Content type: application/json
- Dates: ISO 8601, always UTC
- Pagination: Cursor-based preferred. Return total_count, next_cursor.

### Error Response Format (mandatory)

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Human-readable description.",
    "details": [{"field": "email", "issue": "Invalid format"}],
    "request_id": "req_abc123",
    "timestamp": "2026-03-21T14:30:00Z"
  }
}
```

### Auth Standards

- JWT (RS256) in Authorization: Bearer header. Never in URL.
- Access tokens ≤ 15 min. Refresh tokens ≤ 7 days. Rotate on use.
- Password change invalidates ALL sessions.
- Rate limiting: per-user, per-endpoint. 429 with Retry-After.
- CORS: explicit allowlist. Never wildcard in production.

---

## 4. Git Workflow

### Branching

- main — production-ready, always deployable
- feature/{ticket}-{slug} — new features
- fix/{ticket}-{slug} — bug fixes
- hotfix/{ticket}-{slug} — production emergencies
- chore/{slug} — maintenance, deps, tooling

### Commits (Conventional Commits)

Format: {type}({scope}): {description}
Types: feat, fix, docs, style, refactor, perf, test, chore, security
Rules: ≤ 72 char subject, imperative mood, ticket ref in footer

### Merge Strategy

- Feature → main: Squash merge (one commit per feature)
- Hotfix → main: Merge commit (preserves timeline)
- Never force-push to main. Delete branch after merge.

---

## 5. Testing Standards

### Coverage

| Layer | Minimum | Owner |
|-------|---------|-------|
| Unit | ≥ 90% branch | FORGE/PRISM |
| Integration | All service boundaries | VIGIL + FORGE |
| E2E | All critical journeys | VIGIL |
| Security | OWASP Top 10 vectors | SENTRY + VIGIL |

### Principles

- Test behavior, not implementation.
- No test depends on another test or external state.
- Every bug gets a regression test BEFORE the fix.
- Flaky tests are bugs. Fix or quarantine within 24h.
- Test sad paths: errors, timeouts, empty, null, boundary, concurrent.
- Naming: test_{what}_{condition}_{expected}

---

## 6. Security Standards (non-negotiable)

| Practice | Requirement |
|----------|-------------|
| Input validation | ALL external input validated server-side |
| Parameterized queries | Always. String concatenation = CRITICAL finding. |
| Secrets | Env vars or secret manager. Never in code/logs/errors. |
| Dependency scanning | Automated every build. Zero CRITICAL/HIGH in prod. |
| HTTPS | All endpoints. HSTS. No mixed content. |
| Least privilege | Every service/user/token gets minimum permissions. |
| Passwords | bcrypt (≥12) or argon2id. Rate limit auth endpoints. |
| Sessions | Invalidate all on password change. Secure/HttpOnly cookies. |

### SENTRY Review Gates

- Threat model: before implementation of new features/data flows
- Code review: all changes touching auth/crypto/input/data
- Dependency audit: every new dependency or version bump
- Container scan: every image build
- Pre-deploy: before production promotion

---

## 7. Logging & Observability

### Structured Logging (JSON, mandatory fields)

timestamp, level, message, service, request_id — on every log entry.

### Never Log

Passwords, full card numbers, SSNs, API keys, tokens, PII request bodies.

### Monitoring

- Services: RED (Rate, Errors, Duration)
- Infrastructure: USE (Utilization, Saturation, Errors)
- SLOs: 99.9% availability, P99 < 500ms, error rate < 0.1%

---

## 8. Error Handling

- Never swallow exceptions. Catch specific types.
- Every error has a machine-readable UPPER_SNAKE_CASE code.
- User-facing: friendly message. Internal: detailed log + request_id.
- Maintain error code registry in docs/error-codes.md.

---

## 9. Infrastructure & Deployment

- All resources in IaC. No manual creation.
- Containers: minimal base, non-root, read-only rootfs.
- Environments: dev ≈ staging ≈ production (structurally identical).
- Deploy checklist: tests pass → security clean → staging smoke → canary prod → monitor → rollout.
- Auto-rollback on error_rate > 1.5× baseline.

---

## 10. Dependencies

- Pin exact versions. No ^, ~, >=, *.
- Lock files committed (package-lock.json, poetry.lock, go.sum).
- Audit before adding: license, maintenance, CVEs, transitive count.
- Weekly automated update PRs.

---

## 11. Performance Budgets

| Metric | Budget |
|--------|--------|
| API read (P95) | < 200ms |
| API write (P95) | < 500ms |
| Page load (LCP) | < 2.5s |
| JS bundle (per route) | < 100KB gzip |
| DB query (P95) | < 100ms |
| Container startup | < 10s |

---

## 12. Accessibility

- WCAG 2.1 AA compliance
- Semantic HTML, keyboard navigation, screen reader compatible
- Color contrast: 4.5:1 normal text, 3:1 large
- Respect prefers-reduced-motion
- Automated axe-core scan on every component test

---

## Enforcement

| Layer | Enforcer |
|-------|----------|
| Authoring | FORGE/PRISM follow standards |
| Pre-commit | Lint, format, type check, secret scan |
| CI | Tests, SAST, dep audit, coverage gate |
| Review | SENTRY on security-sensitive changes |
| Testing | VIGIL verifies acceptance criteria |
| Docs | SCRIBE maintains completeness |
| Architecture | ATLAS enforces via ADRs |

CRITICAL violations (security, data integrity) block deployment.
Non-critical violations tracked and addressed within one sprint.
