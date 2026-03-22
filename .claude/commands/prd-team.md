---
description: Read a PRD (any format) and build it using a parallel Agent Team.
---
Read the PRD file and build it using a parallel Agent Team.

## Step 1: Read and Normalize

Read the entire file. If it's not in internal template format, normalize it:
- Extract requirements, acceptance criteria, data model, API, UI, security, scope.
- For gaps and ambiguities: choose simpler interpretation, log as ADR. Do NOT ask.
- This is the autonomous path. For interactive intake, use /prd-intake first.

## Step 2: Spawn Agent Team

1. Read STANDARDS.md — include reference in every teammate spawn prompt.
2. Update PRD metadata status to "in_progress".
3. Spawn specialized teammates:

   **BASTION** (if PRD has data model or implies persistent data):
   Spawn prompt: "You are BASTION, database engineer. Read STANDARDS.md Section 2 (SQL). Design schema and migrations for: {PRD data requirements}. Every UP has a DOWN. Index all FKs. created_at/updated_at on all tables."

   **FORGE** (if PRD has API design or backend logic):
   Spawn prompt: "You are FORGE, backend engineer. Read STANDARDS.md. Implement: {PRD API + functional requirements}. Type hints on everything. ≥90% test coverage. Structured errors. OpenAPI spec."

   **PRISM** (if PRD has UI/UX requirements):
   Spawn prompt: "You are PRISM, frontend engineer. Read STANDARDS.md Section 2 (TypeScript). Build: {PRD UI requirements}. Strict TS, Tailwind, WCAG 2.1 AA. Handle loading/error/empty states."

   **SENTRY** (always — use Opus):
   Spawn prompt: "You are SENTRY, security engineer. Read STANDARDS.md Section 6. Threat model this PRD using STRIDE: {PRD summary}. Review all code from teammates. Report findings with severity + CWE + remediation."

   **VIGIL** (always):
   Spawn prompt: "You are VIGIL, QA engineer. Read STANDARDS.md Section 5. Write tests for every acceptance criterion in this PRD: {PRD Section 5}. E2E for critical flows. Regression suite. Bug reports with repro steps."

6. As team lead, coordinate but delegate ALL implementation.
7. When all teammates complete, synthesize results.
8. Run full quality gates. Fix any failures.
9. Have SCRIBE update documentation.
10. Commit, deploy staging, smoke test, deploy production (canary).
11. Update PRD status to "complete".

All teammates execute autonomously. No approval gates.

PRD file path: $ARGUMENTS
