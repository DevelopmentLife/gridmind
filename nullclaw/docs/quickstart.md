# NullClaw Quickstart

Deploy your first agent team in under 5 minutes.

## Prerequisites

- NullClaw installed (`curl -fsSL https://get.nullclaw.dev | sh`)
- An Anthropic API key (`export ANTHROPIC_API_KEY=sk-ant-...`)

## Step 1 — Create your team config

Save this as `my-team.yaml`:

```yaml
team:
  name: my-first-team
  version: "1.0"

agents:
  - name: researcher
    role: "Research a topic and return a summary with key facts"
    model: haiku
    tools: [web_search]

  - name: writer
    role: "Take research notes and write a clear, concise report"
    model: sonnet
    tools: []
    depends_on: [researcher]

routing:
  default_model: haiku
  escalation_model: opus
```

## Step 2 — Run locally

```bash
nullclaw run my-team.yaml --task "Summarize recent advances in AI agent frameworks"
```

Output appears streamed to stdout. Each agent logs its decisions and tool calls.

## Step 3 — Deploy to GridMind (managed)

```bash
# Install the GridMind CLI
pip install gridmind-cli

# Authenticate
gridmind auth login

# Deploy
gridmind deploy my-team.yaml

# Check status
gridmind status my-first-team

# View cost breakdown
gridmind cost my-first-team
```

Your team is now live at [app.gridmindai.dev](https://app.gridmindai.dev) with auto-scaling, cost attribution, and fleet observability.

## Step 4 — Monitor your agents

The GridMind portal shows:

- **ARGUS** — fleet health and heartbeats for every agent instance
- **ORACLE** — cost forecasting for the next 1h to 7 days
- **HERALD** — Slack/PagerDuty alerts on cost spikes or agent failures

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `ANTHROPIC_API_KEY` | Yes | Your Anthropic API key |
| `GRIDMIND_API_KEY` | For `gridmind deploy` | GridMind platform key (from portal) |
| `NULLCLAW_LOG_LEVEL` | No | `debug`, `info` (default), `warn`, `error` |
| `NULLCLAW_MAX_CONCURRENCY` | No | Max concurrent agents per node (default: 100) |

## Next Steps

- [Agent Team YAML Spec](agent-team-spec.md) — full config reference
- [Model Routing Guide](model-routing.md) — how to assign the right model to each agent role
- [GridMind Platform](https://gridmindai.dev) — managed hosting with auto-scaling and cost attribution
