<!-- ![NullClaw](assets/logo.png) -->

# NullClaw

**The 678KB agent runtime. Deploy AI agent teams with zero infrastructure overhead.**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![License: BSL 1.1](https://img.shields.io/badge/License-BSL_1.1-orange.svg)](LICENSE-BSL)
[![Build Status](https://img.shields.io/github/actions/workflow/status/gridmindai/nullclaw/ci.yml?branch=main)](https://github.com/gridmindai/nullclaw/actions)
[![Discord](https://img.shields.io/discord/placeholder?label=Discord&logo=discord)](https://discord.gg/gridmind)

---

```
 678KB binary    ~1MB RAM/agent    <2s cold start    1000+ concurrent agents
```

NullClaw is a Zig-based agent runtime that deploys AI agent teams from a single YAML config. Define your agents, their tools, and model assignments — NullClaw handles orchestration, scaling, and inter-agent communication at a fraction of the resource cost of Python-based alternatives.

## Comparison

| | NullClaw | LangChain | CrewAI | AutoGen |
|---|---|---|---|---|
| **Binary size** | 678KB | ~150MB+ | ~120MB+ | ~200MB+ |
| **RAM per agent** | ~1MB | ~80-150MB | ~60-120MB | ~100-200MB |
| **Cold start** | <2s | 8-15s | 6-12s | 10-20s |
| **Concurrent agents** | 1000+ per node | 10-20 per node | 15-30 per node | 5-15 per node |
| **Dependencies** | Zero | Python + pip ecosystem | Python + pip ecosystem | Python + pip ecosystem |
| **Model routing** | Built-in | Manual | Manual | Manual |

## Installation

```bash
curl -fsSL https://get.nullclaw.dev | sh
```

Or download a specific release:

```bash
# Linux (amd64)
curl -Lo nullclaw https://github.com/gridmindai/nullclaw/releases/latest/download/nullclaw-linux-amd64
chmod +x nullclaw
sudo mv nullclaw /usr/local/bin/

# macOS (Apple Silicon)
curl -Lo nullclaw https://github.com/gridmindai/nullclaw/releases/latest/download/nullclaw-darwin-arm64
chmod +x nullclaw
sudo mv nullclaw /usr/local/bin/
```

## Quickstart

Deploy a 3-agent research team in under 5 minutes.

**1. Create `research-team.yaml`:**

```yaml
team:
  name: research-team
  version: "1.0"

agents:
  - name: researcher
    role: "Find and summarize relevant papers on a given topic"
    model: sonnet
    tools: [web_search, pdf_reader]

  - name: analyst
    role: "Analyze findings and identify patterns across sources"
    model: sonnet
    tools: [data_analysis, chart_generator]
    depends_on: [researcher]

  - name: writer
    role: "Produce a final markdown report from the analysis"
    model: haiku
    tools: [markdown_writer]
    depends_on: [analyst]

routing:
  default_model: haiku
  escalation_model: opus
```

**2. Run locally:**

```bash
nullclaw run research-team.yaml
```

**3. Deploy to GridMind (managed hosting):**

```bash
gridmind deploy research-team.yaml
```

Your agents are live. Monitor them at [app.gridmindai.dev](https://app.gridmindai.dev).

## Agent Team YAML Spec

The agent team config is the single source of truth for your deployment.

```yaml
team:
  name: my-team              # Unique team identifier
  version: "1.0"             # Semver for rollback tracking

agents:
  - name: agent-name         # Unique within team (snake_case or kebab-case)
    role: "What this agent does"  # Natural language role description
    model: haiku | sonnet | opus  # Model assignment (see Model Routing below)
    tools: [tool_a, tool_b]       # Scoped tool allowlist
    depends_on: [other-agent]     # DAG dependencies — runs after these complete
    env:                          # Per-agent environment variables
      API_KEY: "${SECRET_API_KEY}"
    approval_required: false      # If true, human must approve actions before execution
    max_retries: 3                # Retry count on failure (default: 3)
    timeout: 300s                 # Max execution time per task (default: 300s)

routing:
  default_model: haiku        # Fallback model for unassigned agents
  escalation_model: opus      # Model for complex decisions and error recovery

scaling:
  min_instances: 1            # Minimum agent instances (never scale below)
  max_instances: 10           # Maximum agent instances per agent type
  scale_on: queue_depth > 5   # Scaling trigger expression
  idle_timeout: 5m            # Terminate idle agents after this duration

secrets:
  provider: env | vault       # Secret injection method
  vault_addr: ""              # HashiCorp Vault address (if using vault)
```

## Model Routing

NullClaw routes tasks to the right model tier automatically, minimizing cost without sacrificing capability.

| Tier | Model | Use Cases | Relative Cost |
|---|---|---|---|
| **Perception** | Haiku | Monitoring, classification, data collection, health checks | $ |
| **Reasoning** | Sonnet | Planning, analysis, multi-step logic, tool orchestration | $$ |
| **Critical** | Opus | Complex decisions, security review, root cause analysis | $$$ |

Agents declare their model tier in the YAML config. The runtime enforces model boundaries — a Haiku agent cannot escalate to Opus unless the `escalation_model` is configured and the runtime detects a failure requiring higher capability.

## Architecture

```
                          nullclaw run team.yaml
                                  |
                                  v
                    +---------------------------+
                    |     NullClaw Runtime       |
                    |         (678KB)            |
                    +---------------------------+
                    |  YAML Parser & Validator   |
                    |  Agent Lifecycle Manager   |
                    |  Task Router & Scheduler   |
                    |  Model Router (H/S/O)      |
                    |  Tool Sandbox (per-agent)  |
                    +---------------------------+
                         |        |        |
              +----------+   +----+----+   +----------+
              |              |         |              |
         +----v----+   +----v----+   +----v----+   +----v----+
         | Agent A |   | Agent B |   | Agent C |   | Agent N |
         | (Haiku) |   | (Sonnet)|   | (Haiku) |   | (Opus)  |
         +---------+   +---------+   +---------+   +---------+
              |              |              |              |
              v              v              v              v
         +-------------------------------------------------------+
         |              NATS JetStream (Event Mesh)               |
         |        Agent-to-agent messaging & task queuing         |
         +-------------------------------------------------------+
                                  |
                    +-------------+-------------+
                    |                           |
              +-----v------+            +------v------+
              | State Store |            | Audit Trail  |
              | (Checkpoint)|            | (Immutable)  |
              +-------------+            +--------------+
```

## GridMind Platform

NullClaw is the open-source runtime core. [GridMind](https://gridmindai.dev) is the managed platform that adds:

- **Auto-scaling** — spin agents up and down based on demand signals and budget limits
- **Cost attribution** — per-agent, per-task, per-customer cost tracking down to the individual decision
- **Fleet observability** — dashboards for agent health, decision rates, model usage, and cost trends
- **12 specialized agents** — ARGUS, ORACLE, TITAN, PRISM, SHERLOCK, AEGIS, FORGE, CONVOY, VAULT, TUNER, HARBOR, HERALD
- **Framework connectors** — deploy LangChain, CrewAI, AutoGen, or Claude Code agent teams alongside NullClaw
- **Security & compliance** — CMMC Level 2, STIG hardening, air-gapped deployment for defense and regulated industries

[Start free on GridMind](https://gridmindai.dev) — 14-day trial, no credit card required.

## Contributing

We welcome contributions. See [CONTRIBUTING.md](.github/CONTRIBUTING.md) for build instructions, coding standards, and PR guidelines.

**Quick links:**

- [Bug reports](.github/ISSUE_TEMPLATE/bug_report.md)
- [Feature requests](.github/ISSUE_TEMPLATE/feature_request.md)
- [Agent Team YAML Spec](docs/agent-team-spec.md)
- [Model Routing Guide](docs/model-routing.md)
- [Quickstart Guide](docs/quickstart.md)

## License

NullClaw is dual-licensed:

- **MIT** ([LICENSE](LICENSE)) — the runtime core, CLI, and all examples. Use it anywhere, for anything.
- **BSL 1.1** ([LICENSE-BSL](LICENSE-BSL)) — platform features (managed scaling, fleet observability, multi-node orchestration beyond 3 nodes). Converts to MIT on 2030-03-29.

Single-node and up-to-3-node deployments are fully MIT. The BSL applies only to platform orchestration features for deployments exceeding 3 nodes.

---

Built by [Assertive Mind](https://assertivemind.com) — the team behind [GridMind](https://gridmindai.dev).
