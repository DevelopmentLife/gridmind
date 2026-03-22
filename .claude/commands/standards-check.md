Audit the codebase against STANDARDS.md. Report compliance status.

1. Read STANDARDS.md completely.
2. Check each standard area:
   - Code style: lint, formatting, type checking
   - Testing: coverage thresholds, test naming, sad path coverage
   - Security: parameterized queries, secret handling, input validation
   - API: error format, auth implementation, OpenAPI spec completeness
   - Git: commit message format, branch naming
   - Logging: structured JSON, required fields, no PII
   - Docs: API docs, ADRs, changelog, runbooks
   - Dependencies: pinned versions, lock files, license compliance
3. For each area, report: PASS / FAIL / PARTIAL with specifics.
4. Create fix tasks for failures. Execute them autonomously.

Scope: $ARGUMENTS
