Execute a full autonomous sprint. Read STANDARDS.md first.

**Phase 1 — HERALD (Plan):**
- Check docs/prd/ for PRDs with status "ready" → these are the sprint items.
- If no PRDs exist, analyze codebase and propose 3-5 items:
  - Title, type, user story, acceptance criteria
  - Score: (Impact × 3) - (Effort × 1) - (Risk × 2) + (Readiness × 1)
  - At least 20% tech debt items

**Phase 2 — ATLAS (Build):**
- Take items in priority order.
- For each: decompose → implement → test → security review → document → commit.
- Use subagents for parallel work.
- After each item, immediately start the next.

**Phase 3 — Report:**
- What shipped (with test results)
- ADRs created
- Security findings resolved
- What's next (HERALD proposal for N+1)

All code MUST comply with STANDARDS.md.

Focus area: $ARGUMENTS
