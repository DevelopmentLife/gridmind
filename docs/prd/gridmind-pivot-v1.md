# PRD: GridMind Strategic Pivot — Agentic Infrastructure Platform

## Metadata

| Field | Value |
|-------|-------|
| **PRD ID** | PRD-002 |
| **Status** | `in_progress` |
| **Author** | Zack (Founder) / HERALD (normalized) |
| **Created** | 2026-03-29 |
| **Priority** | `P0 — launch blocker` |
| **Source** | `docs/prd/incoming/gridmind-pivot-v1-raw.md` |
| **Supersedes** | PRD-001 (gridmind-platform.md) — positioning and copy only; technical architecture preserved |

---

## 1. Executive Summary

GridMind pivots from vertical AI product (database operations) to horizontal agentic infrastructure. Brand, domain, pricing architecture, and agent naming preserved. ICP, messaging, feature set, and marketing scope replaced entirely.

**Pivot From:** "24 AI Agents. Zero DBAs. Your databases, fully autonomous."
**Pivot To:** "Deploy AI agent teams at any scale. Zero infrastructure overhead."

## 2. Scope — P0 Launch Blockers (This Build)

### What Changes (P0 — build now)
1. All gridmind-site marketing copy (hero, agents, frameworks, pricing, how-it-works, footer)
2. Page title, meta description, OG tags
3. Remove "credit card required" from all CTAs
4. Replace "Engines" nav item and section with "Frameworks"
5. Add waitlist email capture (replace primary CTA)
6. Update portal/admin messaging where it references "database" language

### What Does NOT Change
- Brand: GridMind, gridmindai.dev, visual identity
- Agent names: ARGUS, ORACLE, TITAN, PRISM, SHERLOCK, AEGIS, FORGE, CONVOY, VAULT, TUNER, HARBOR, HERALD
- Pricing model: decision-based
- Tier structure: Starter / Growth / Scale / Enterprise
- Dark theme, design system, component architecture
- Backend services (gateway, cortex) — unchanged in P0

---

## 3. Detailed Copy Changes

### 3.1 Hero Section

| Element | New Value |
|---------|-----------|
| Headline | Deploy AI agent teams at any scale. Zero infrastructure overhead. |
| Sub-headline | GridMind provisions, routes, scales, and observes your AI agent fleet — so your team ships product instead of managing infrastructure. |
| CTA primary | Join Waitlist |
| CTA secondary | See How It Works |
| Trial note | 14-day free trial · No credit card required |

### 3.2 Agent Roster — New Descriptions (keep all names)

| Agent | Role | New Description |
|-------|------|-----------------|
| ARGUS | Perception | Continuous agent fleet monitoring, usage profiling, and health heartbeats across all deployments |
| ORACLE | Perception | Predictive compute scaling and cost forecasting with 1h-to-7-day horizon |
| TITAN | Reasoning | Auto-scales agent workers up and down based on demand signals and budget limits |
| PRISM | Reasoning | Intelligent task routing — assigns the right model to each task type to minimize cost |
| SHERLOCK | Reasoning | Agent failure diagnosis with ranked hypotheses, trace analysis, and decision lineage |
| AEGIS | Reasoning | Continuous agent security audit: secret rotation, permission scoping, and compliance posture |
| FORGE | Execution | Spins up agent infrastructure on any cloud via IaC with scoped IAM and automatic rollback |
| CONVOY | Execution | Zero-downtime agent team deployments, version upgrades, and canary rollbacks |
| VAULT | Execution | Agent state persistence, checkpoint recovery, and cross-region replication |
| TUNER | Execution | Model selection optimization and prompt tuning per agent role to reduce cost |
| HARBOR | Specialized | Connects your agent framework and activates the fleet in under 5 minutes |
| HERALD | Specialized | Slack, PagerDuty, and webhook alerts for agent health, cost spikes, and decision anomalies |

### 3.3 Frameworks Section (was "Engines")

| Framework | Status | Description |
|-----------|--------|-------------|
| NullClaw | Available Now | 678KB native runtime, ~1MB RAM. Zero-dependency agent orchestration. |
| LangChain / LangGraph | Available Now | Full tool-use, memory, and graph workflow support |
| Claude Code Agent Teams | Available Now | Native ATLAS/HERALD/FORGE team deployment |
| CrewAI | Coming Soon | Role-based crew deployment with GridMind auto-scaling |
| AutoGen | Coming Soon | Multi-agent conversation with GridMind cost attribution |
| OpenAI Agents SDK | Coming Soon | Tool-use agents with model routing |
| Custom / BYO Framework | Enterprise | Bring your own runtime; GridMind wraps it |

### 3.4 Pricing Labels (structure unchanged)

| Element | New Value |
|---------|-----------|
| Starter description | For startups deploying their first agent team |
| Growth description | For teams scaling agent fleets across products |
| Scale description | For platforms running hundreds of concurrent agents |
| Enterprise description | For regulated industries and defense-adjacent deployments |
| Deployments label | 3 agent team deployments (was: 3 database deployments) |
| Query volume label | 10M agent tasks / mo (was: 10M queries / mo) |
| Credit card note | Remove from ALL tier cards |

### 3.5 How It Works

| Step | Title | Description |
|------|-------|-------------|
| 1 | Define | Describe your agent team in a YAML config — or import from LangChain, CrewAI, or Claude Code. |
| 2 | Deploy | GridMind provisions compute, wires agent messaging, assigns models by task type, and activates your fleet in minutes. |
| 3 | Scale | Agents spin up and down automatically with demand. You see cost per agent, per run, per customer — and pay only for what runs. |

### 3.6 Footer & Site-Wide

| Element | New Value |
|---------|-----------|
| Footer tagline | Agent infrastructure for startups. Deploy AI agent teams in minutes. Scale to thousands of concurrent agents. Pay only for what runs. |
| Page title | GridMind — Agentic Infrastructure Platform |
| Meta description | Deploy, scale, and observe AI agent teams from a single config. GridMind is the infrastructure platform for AI-first startups. |
| Nav items | Agents, Pricing, Frameworks (was Engines), How It Works |

---

## 4. Waitlist Feature

| Element | Specification |
|---------|---------------|
| Goal | 500 signups before public launch |
| Capture | Email form replacing primary CTA on hero |
| Incentive | Early access + 3 months free Starter tier |
| Storage | POST to gateway `/api/v1/waitlist` endpoint → store in `waitlist_signups` table |
| Follow-up | Day 1 welcome, Day 3 founder story, Day 7 quickstart, Day 14 trial activation (mock in dev) |

---

## 5. Acceptance Criteria

| AC | Criteria |
|----|----------|
| AC-01 | Hero headline reads "Deploy AI agent teams at any scale. Zero infrastructure overhead." |
| AC-02 | All 12 agent descriptions match Section 3.2 — no database language remains |
| AC-03 | "Engines" section is replaced by "Frameworks" with 7 framework cards per Section 3.3 |
| AC-04 | All pricing tier descriptions updated per Section 3.4; "credit card required" removed |
| AC-05 | How It Works shows Define/Deploy/Scale steps per Section 3.5 |
| AC-06 | Footer tagline, page title, meta description updated per Section 3.6 |
| AC-07 | Primary CTA changed to "Join Waitlist" with email capture form |
| AC-08 | No reference to "database", "DBA", "queries", or "PostgreSQL" remains in any customer-facing copy |
| AC-09 | Nav item "Engines" renamed to "Frameworks" |
| AC-10 | Site builds with zero TypeScript errors and renders all sections |

---

## 6. Out of Scope (P0)

- Backend service changes (gateway, cortex agents) — P1
- NullClaw GitHub repo creation — separate task
- Blog post content — separate task
- Portal/admin deep copy rewrites — P1 (only update if "database" language is customer-visible)
- Stripe billing changes — P1
- K3s/infrastructure layer — P2
