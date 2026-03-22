# PRD: {Feature Name}

## Metadata

| Field | Value |
|-------|-------|
| **PRD ID** | PRD-{NNN} |
| **Status** | `draft` / `ready` / `in_progress` / `complete` |
| **Author** | {name} |
| **Created** | {YYYY-MM-DD} |
| **Priority** | `critical` / `high` / `medium` / `low` |

---

## 1. Problem Statement (required)

{What problem? Who has it? Why does it matter? 2-4 sentences.}

## 2. Objective (required)

{What does success look like? State outcome, not solution. 1-2 sentences.}

## 3. Users & Personas (required)

| Persona | Description | Key Need |
|---------|-------------|----------|
| | | |

## 4. Requirements (required)

### Functional Requirements

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-01 | The system shall... | must-have |
| FR-02 | The system shall... | must-have |
| FR-03 | The system shall... | should-have |

### Non-Functional Requirements

| ID | Requirement | Target |
|----|-------------|--------|
| NFR-01 | Response time (P95) | < Nms |
| NFR-02 | Concurrent users | N |
| NFR-03 | Accessibility | WCAG 2.1 AA |

## 5. Acceptance Criteria (required — VIGIL tests against these)

| AC | Criteria | Test Type |
|----|----------|-----------|
| AC-01 | **Given** ..., **When** ..., **Then** ... | e2e |
| AC-02 | **Given** ..., **When** ..., **Then** ... | integration |
| AC-03 | **Given** ..., **When** ..., **Then** ... | unit |

## 6. Scope (required)

### In Scope
- {What IS included}

### Out of Scope
- {What is NOT included and why}

## 7. Data Model (optional — helps BASTION)

| Entity | Key Fields | Relationships |
|--------|-----------|---------------|
| | | |

## 8. API Design (optional — helps FORGE)

| Method | Endpoint | Purpose | Auth |
|--------|----------|---------|------|
| | | | |

## 9. UI/UX (optional — helps PRISM)

| Screen | Purpose | Key Elements |
|--------|---------|--------------|
| | | |

## 10. Security Considerations (optional — helps SENTRY)

- {Known concerns, data sensitivity, compliance}

## 11. Dependencies (optional)

- Internal: {other features/services needed}
- External: {third-party services/APIs}

## 12. Definition of Done

- [ ] All FR-* implemented
- [ ] All AC-* passing
- [ ] All NFR-* verified
- [ ] Unit tests ≥ 90% branch coverage
- [ ] E2E tests for critical journeys
- [ ] SENTRY review complete (zero CRITICAL/HIGH)
- [ ] API docs updated
- [ ] Changelog updated
- [ ] Deployed to staging + smoke tested
- [ ] Deployed to production (canary)
