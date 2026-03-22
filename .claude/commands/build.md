Execute an autonomous build cycle as ATLAS. Read STANDARDS.md first.

1. Check codebase state: git status, failing tests, TODOs, lint warnings.
2. Check docs/prd/ for any PRDs with status "ready". If found, build the highest-priority one (use /prd process).
3. If no PRDs, identify the highest-priority incomplete work.
4. Decompose into tasks. Use subagents for independent work streams.
5. Execute ALL tasks. Do not ask for approval.
6. Run full test suite. Fix failures.
7. Run security checks: dependency audit, secret scan, SAST.
8. If all quality gates pass, commit with conventional commit messages.
9. Report: completed, deferred, next priorities.

All code MUST comply with STANDARDS.md.

Objective: $ARGUMENTS
