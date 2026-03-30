# Agent Team YAML Spec

Complete reference for the NullClaw agent team configuration format.

## Full Schema

```yaml
# ─────────────────────────────────────────────────────────
# Team metadata
# ─────────────────────────────────────────────────────────
team:
  name: my-team              # Required. Unique team identifier (kebab-case or snake_case)
  version: "1.0"             # Required. Semver string — used for rollback tracking
  description: ""            # Optional. Human-readable description

# ─────────────────────────────────────────────────────────
# Agent definitions
# ─────────────────────────────────────────────────────────
agents:
  - name: agent-name         # Required. Unique within team
    role: "..."              # Required. Natural language role description
    model: haiku             # Required. haiku | sonnet | opus (see Model Routing)
    tools: []                # Optional. Scoped tool allowlist (default: no tools)
    depends_on: []           # Optional. Agent names this agent waits for before running
    env: {}                  # Optional. Per-agent environment variable overrides
    approval_required: false # Optional. If true, human approval required before execution
    max_retries: 3           # Optional. Retry count on failure (default: 3)
    timeout: 300s            # Optional. Max execution time per task (default: 300s)
    min_instances: 1         # Optional. Minimum running instances (default: 1)
    max_instances: 10        # Optional. Maximum running instances (default: 10)

# ─────────────────────────────────────────────────────────
# Model routing
# ─────────────────────────────────────────────────────────
routing:
  default_model: haiku       # Fallback model for agents without explicit assignment
  escalation_model: opus     # Model used for error recovery and complex decisions

# ─────────────────────────────────────────────────────────
# Auto-scaling (optional)
# ─────────────────────────────────────────────────────────
scaling:
  min_instances: 1           # Global minimum (overridden per-agent if set)
  max_instances: 10          # Global maximum (overridden per-agent if set)
  scale_on: queue_depth > 5  # Scaling trigger expression (see Trigger Expressions)
  idle_timeout: 5m           # Terminate idle agent instances after this duration

# ─────────────────────────────────────────────────────────
# Secrets
# ─────────────────────────────────────────────────────────
secrets:
  provider: env              # env | vault
  vault_addr: ""             # HashiCorp Vault address (required if provider: vault)
  vault_role: ""             # Vault Kubernetes auth role
```

## Field Reference

### `team`

| Field | Type | Required | Description |
|---|---|---|---|
| `name` | string | Yes | Unique team identifier. Used as prefix for all agent instances. |
| `version` | string | Yes | Semver. NullClaw keeps the last 3 versions for rollback. |
| `description` | string | No | Displayed in GridMind portal. |

### `agents[]`

| Field | Type | Required | Default | Description |
|---|---|---|---|---|
| `name` | string | Yes | — | Unique within team. Used as `{team.name}/{agent.name}` in logs. |
| `role` | string | Yes | — | Natural language description. Injected into each LLM system prompt. |
| `model` | enum | Yes | — | `haiku`, `sonnet`, or `opus`. See Model Routing. |
| `tools` | string[] | No | `[]` | Scoped tool allowlist. Agents cannot call tools not listed here. |
| `depends_on` | string[] | No | `[]` | Agent names this agent waits for. Creates a DAG execution order. |
| `env` | object | No | `{}` | Per-agent env vars. Values can reference secrets: `"${SECRET_NAME}"`. |
| `approval_required` | bool | No | `false` | If `true`, a human must approve the agent's action plan before execution. |
| `max_retries` | int | No | `3` | How many times to retry on failure before giving up. |
| `timeout` | duration | No | `300s` | Max wall-clock time per task. Format: `30s`, `5m`, `1h`. |
| `min_instances` | int | No | `1` | Minimum warm instances for this agent type. |
| `max_instances` | int | No | `10` | Maximum concurrent instances for this agent type. |

### `routing`

| Field | Type | Required | Default | Description |
|---|---|---|---|---|
| `default_model` | enum | No | `haiku` | Used for agents that don't specify `model`. |
| `escalation_model` | enum | No | `opus` | Used when an agent fails and retries with higher capability. |

### `scaling`

| Field | Type | Default | Description |
|---|---|---|---|
| `min_instances` | int | `1` | Global minimum. Per-agent setting overrides this. |
| `max_instances` | int | `10` | Global maximum. Per-agent setting overrides this. |
| `scale_on` | expression | `queue_depth > 5` | Trigger expression for scale-up. |
| `idle_timeout` | duration | `5m` | How long an idle instance waits before terminating. |

**Scaling trigger expressions:**

```
queue_depth > 5          # Scale up when task queue exceeds 5
cpu_percent > 80         # Scale up on CPU pressure
error_rate > 0.05        # Scale up when error rate exceeds 5%
latency_p95 > 10s        # Scale up when P95 latency exceeds 10s
```

Multiple conditions: `queue_depth > 5 AND cpu_percent > 70`

### `secrets`

| Field | Type | Default | Description |
|---|---|---|---|
| `provider` | enum | `env` | `env` reads from environment variables. `vault` reads from HashiCorp Vault. |
| `vault_addr` | string | — | Vault server address (e.g. `https://vault.internal:8200`). |
| `vault_role` | string | — | Kubernetes auth role for Vault. |

**Referencing secrets in agent env:**

```yaml
agents:
  - name: searcher
    env:
      SEARCH_API_KEY: "${SEARCH_API_KEY}"   # Injected from env or Vault at runtime
```

## DAG Execution

Agents with `depends_on` form a directed acyclic graph. NullClaw executes:

1. All agents with no `depends_on` in parallel
2. Each agent starts as soon as all its dependencies complete successfully
3. If a dependency fails (after retries), its downstream agents are skipped

```yaml
agents:
  - name: fetch          # Runs first (no dependencies)
  - name: parse
    depends_on: [fetch]  # Runs after fetch completes
  - name: analyze
    depends_on: [fetch]  # Runs in parallel with parse (both depend on fetch)
  - name: report
    depends_on: [parse, analyze]  # Runs after both parse and analyze complete
```

## Tool Allowlist

Tools are sandboxed per-agent. An agent cannot call a tool not in its `tools` list.

**Built-in tools:**

| Tool | Description |
|---|---|
| `web_search` | Search the web via Brave Search API |
| `pdf_reader` | Read and extract text from PDF URLs |
| `code_runner` | Execute Python in a sandboxed environment |
| `data_analysis` | Tabular data analysis (CSV, JSON) |
| `markdown_writer` | Write structured markdown output |
| `http_request` | Make HTTP GET/POST requests to external APIs |
| `chart_generator` | Generate charts from data |

**Custom tools** are registered in the GridMind platform portal.

## Examples

### Research pipeline

```yaml
team:
  name: research-pipeline
  version: "1.0"

agents:
  - name: scout
    role: "Find 5 recent papers or articles on the given topic"
    model: haiku
    tools: [web_search]

  - name: analyst
    role: "Read the found sources and extract key claims and data"
    model: sonnet
    tools: [pdf_reader, web_search]
    depends_on: [scout]

  - name: writer
    role: "Synthesize findings into a 1000-word report with citations"
    model: sonnet
    tools: [markdown_writer]
    depends_on: [analyst]

routing:
  default_model: haiku
  escalation_model: opus
```

### Customer support triage

```yaml
team:
  name: support-triage
  version: "2.1"

agents:
  - name: classifier
    role: "Classify incoming support ticket into category and urgency"
    model: haiku
    tools: []
    max_instances: 50

  - name: resolver
    role: "Attempt to resolve the ticket using the knowledge base"
    model: sonnet
    tools: [http_request]
    depends_on: [classifier]
    approval_required: false

  - name: escalator
    role: "For unresolved tickets, draft a summary for human review"
    model: sonnet
    tools: [markdown_writer]
    depends_on: [resolver]

scaling:
  scale_on: queue_depth > 10
  idle_timeout: 2m
```
