---
description: Read a PRD and autonomously build everything it describes. Handles any format.
---
Read the PRD file specified below and autonomously build everything it describes.

## Step 1: Read and Normalize

Read the entire file. It may be:
- A fully structured PRD in the internal template format → proceed directly.
- A partially structured PRD → extract what exists, infer the rest.
- A raw document in any format → extract requirements, design the rest yourself.

If the document is NOT in internal template format, perform a quick normalization:
- Extract functional requirements → FR-* list
- Extract or infer acceptance criteria → AC-* list (Given/When/Then)
- Extract or infer data model, API design, UI expectations
- Identify scope boundaries
- Log any assumptions you make as an ADR

For ambiguities: choose the simpler, more reversible interpretation. Log as ADR. Continue.
DO NOT ask the human questions. If you need the interactive intake, the human
should use /prd-intake instead. /prd is fully autonomous.

## Step 2: Build

Read STANDARDS.md — all code must comply.

1. Update the PRD metadata status to "in_progress" (add metadata block if missing).
2. Create task DAG from requirements:

   **Data layer:** Design schema, migrations (up + down), indexes, seed data.
   **Backend:** Implement endpoints, business logic, validation, error handling, tests.
   **Frontend:** Build components, pages, forms, state, responsive layout, accessibility.
   **Security:** Threat model (STRIDE), review auth/input/data handling.
   **Testing:** Write tests for EVERY acceptance criterion. E2E for critical flows.
   **Docs:** API spec, changelog, relevant documentation.

3. Execute all independent tasks in parallel (use subagents).
4. Run full test suite. Fix any failures.
5. Run security scan. Fix CRITICAL/HIGH findings.
6. Commit with conventional commit messages referencing the PRD ID.
7. Deploy to staging. Run smoke tests.
8. If staging passes, deploy to production (canary).
9. Update PRD status to "complete".
10. Report: what was built, test results, security findings, deployment status.

## Rules

- Do NOT ask for approval at any step. Execute autonomously.
- All code MUST comply with STANDARDS.md.
- If the PRD has gaps, design solutions yourself. Log decisions as ADRs.
- For ambiguity, choose simpler interpretation, implement it, note it in ADR.
- Empty optional sections → skip, don't ask.
- If the file is clearly just an idea or single paragraph, treat it as a rough
  brief: infer requirements, design everything, build it, document assumptions.

PRD file path: $ARGUMENTS
