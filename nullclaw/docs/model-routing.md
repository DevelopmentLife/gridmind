# Model Routing Guide

NullClaw routes tasks to the right Claude model tier automatically, minimizing cost without sacrificing capability.

## The Three Tiers

| Tier | Model | Latency | Cost | Best For |
|---|---|---|---|---|
| **Perception** | Claude Haiku 4.5 | ~300ms | $ | Classification, monitoring, data collection, health checks, routing decisions |
| **Reasoning** | Claude Sonnet 4.6 | ~1-3s | $$ | Planning, analysis, multi-step logic, tool orchestration, report writing |
| **Critical** | Claude Opus 4.6 | ~5-15s | $$$ | Root cause analysis, complex decisions, security review, escalated failures |

## How It Works

Every agent in your `team.yaml` declares its model tier:

```yaml
agents:
  - name: monitor
    model: haiku      # Fast, cheap — runs every 60 seconds
  - name: planner
    model: sonnet     # Balanced — runs on demand
  - name: auditor
    model: opus       # Critical path — infrequent, high stakes
```

NullClaw enforces model boundaries at runtime. A `haiku` agent **cannot** escalate to `sonnet` or `opus` mid-task unless:

1. The agent fails and `max_retries` is exceeded — NullClaw escalates to `routing.escalation_model`
2. The task explicitly requests escalation via the `escalate_to_reasoning()` built-in tool

## Cost Optimization Strategies

### 1. Tiered pipeline (most common)

Use cheap models for filtering and expensive models only on filtered output:

```yaml
agents:
  - name: filter
    model: haiku          # Reads 1000 events, outputs 20 that need action
    role: "Filter events that require intervention"

  - name: plan
    model: sonnet         # Processes only the 20 filtered events
    role: "Create action plan for each flagged event"
    depends_on: [filter]

  - name: review
    model: opus           # Reviews only high-risk plans
    role: "Review and approve high-risk action plans"
    depends_on: [plan]
    approval_required: true
```

**Result:** 95% of token spend happens on Haiku. Sonnet and Opus only run on relevant work.

### 2. Haiku-first with escalation

Start every task with Haiku. Escalate to Sonnet/Opus only on failure or complexity signal:

```yaml
routing:
  default_model: haiku
  escalation_model: sonnet   # Try sonnet before opus

agents:
  - name: resolver
    model: haiku
    max_retries: 2             # First 2 retries on haiku
    role: "Resolve the issue"
    # On 3rd failure, escalates to routing.escalation_model (sonnet)
```

### 3. Parallel triage

Run multiple haiku agents in parallel to fan out work, then funnel results to one sonnet agent:

```yaml
agents:
  - name: scanner-a
    model: haiku
  - name: scanner-b
    model: haiku
  - name: scanner-c
    model: haiku
  - name: synthesizer
    model: sonnet
    depends_on: [scanner-a, scanner-b, scanner-c]
    role: "Synthesize findings from all three scanners"
```

## Pricing Reference

Actual Anthropic API pricing (per million tokens, as of March 2026):

| Model | Input | Output |
|---|---|---|
| Claude Haiku 4.5 | $0.25 | $1.25 |
| Claude Sonnet 4.6 | $3.00 | $15.00 |
| Claude Opus 4.6 | $15.00 | $75.00 |

**GridMind adds a 55–75% margin** on top of raw API cost. The margin scales with volume — larger deployments get a lower effective margin. This covers infrastructure, managed scaling, observability, and support.

### Example cost calculation

A monitoring agent running every 60 seconds, using ~500 input tokens and ~200 output tokens per cycle:

```
Haiku input:  (500 / 1,000,000) × $0.25  = $0.000000125
Haiku output: (200 / 1,000,000) × $1.25  = $0.00000025
Per cycle:    $0.000000375

Per day (1440 cycles): $0.00054
Per month:             $0.016
```

At GridMind's 65% margin: **~$0.046/month** for continuous monitoring.

For a fleet of 24 agents: **~$1.10/month** in AI costs for perception-tier monitoring.

## Decision Attribution

Every agent decision is logged with:

- Model used
- Input/output token counts
- Compute duration
- Tool calls made
- Total cost (raw + margin)
- Agent name, team name, tenant ID

This lets you see cost breakdowns at any granularity: per-agent, per-team, per-customer session, or per product feature.

Access via the GridMind portal or the cost API:

```bash
gridmind cost my-team --breakdown agent
gridmind cost my-team --breakdown model --since 7d
```
