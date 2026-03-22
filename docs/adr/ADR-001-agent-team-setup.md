# ADR-001: Agent Team Setup

- **Status:** accepted
- **Date:** $(date -u +%Y-%m-%dT%H:%M:%SZ)
- **Decided by:** atlas
- **Context:** Project requires an autonomous development team with consistent standards.
- **Decision:** Adopted 9-agent team (ATLAS, HERALD, FORGE, PRISM, BASTION, PIPELINE, SENTRY, VIGIL, SCRIBE) with STANDARDS.md as canonical reference and PRD-driven build workflow.
- **Rationale:** Autonomous operation with consistent standards produces faster, more reliable output than ad-hoc development.
- **Alternatives rejected:** Manual code review gates (too slow), single-agent monolith (no specialization).
- **Consequences:** All agents must reference STANDARDS.md. PRDs drive the build queue. Quality gates are automated, not human-gated.
- **Reversibility:** Standards and agent definitions can be modified at any time by updating the respective files.
