# GridMind Development Guide — TDD, Agentic Patterns, and Coding Standards

> **Audience:** Human developers and AI coding agents (RAG-optimized).
> **Scope:** This document defines how all GridMind code must be written, tested, and structured. It is the authoritative source for development patterns, testing requirements, and agentic architecture standards.

---

## SECTION 1: PROJECT STRUCTURE AND CONVENTIONS

### 1.1 Repository Layout

```
gridmind/
├── services/
│   ├── cortex/           # Python 3.12 — Agent runtime (24 AI agents)
│   ├── gateway/          # Python 3.12 — FastAPI API gateway
│   ├── admin/            # Next.js 15 / TypeScript — Operator panel
│   ├── portal/           # Next.js 15 / TypeScript — Customer portal
│   └── superadmin/       # Next.js 15 / TypeScript — Platform admin
├── shared/
│   ├── models/           # SQLAlchemy 2.0 ORM models (Pydantic v2 + SA)
│   ├── schemas/          # Pydantic v2 event schemas (NATS events)
│   └── config/           # Shared configuration (pydantic-settings)
├── migrations/           # PostgreSQL SQL migrations (001-010)
├── infrastructure/
│   ├── helm/             # 6 Helm charts
│   ├── terraform/        # 9 modules + 3 environments
│   └── docker/           # Dev Docker configs
├── tests/
│   └── contract/         # Cross-service contract tests
├── .github/workflows/    # CI (ci.yml), CD (cd.yml), PR (pr.yml)
└── docs/                 # PRD, this guide, architecture docs
```

### 1.2 Language and Version Requirements

| Service | Language | Version | Package Manager |
|---------|----------|---------|-----------------|
| cortex | Python | >= 3.12 | pip / hatch |
| gateway | Python | >= 3.12 | pip / uv 0.4.18 |
| admin | TypeScript | 5.x | npm |
| portal | TypeScript | 5.x | npm |
| superadmin | TypeScript | 5.x | npm |

### 1.3 Naming Conventions

| Element | Convention | Example |
|---------|-----------|---------|
| Python files | snake_case | `base_agent.py`, `event_mesh.py` |
| Python classes | PascalCase | `BaseAgent`, `EventMesh`, `CortexRuntime` |
| Python functions/methods | snake_case | `run_cycle`, `emit_heartbeat` |
| Python private methods | _snake_case | `_emit`, `_invoke_tool`, `_heartbeat_loop` |
| Python constants | UPPER_SNAKE | `AGENT_REGISTRY_METADATA`, `STREAM_NAME` |
| Python enums | PascalCase class, UPPER values | `AgentTier.PERCEPTION`, `Severity.HIGH` |
| TypeScript files | camelCase or kebab-case | `agentStore.ts`, `fleet-overview.tsx` |
| TypeScript components | PascalCase | `FleetOverview`, `AgentCard` |
| React pages | kebab-case directories | `app/deployments/[id]/page.tsx` |
| Database tables | snake_case plural | `tenants`, `agent_registry`, `usage_records` |
| Database columns | snake_case | `tenant_id`, `stripe_customer_id` |
| NATS subjects | dot-separated | `gridmind.events.{tenant_id}.agent.heartbeat` |
| Event types | dot-separated | `perception.workload_shift_detected` |
| Env variables | UPPER_SNAKE | `GRIDMIND_NATS_URL`, `ANTHROPIC_API_KEY` |
| Agent names | snake_case | `argus`, `sherlock`, `comptroller` |
| Agent display names | UPPER | `ARGUS`, `SHERLOCK`, `COMPTROLLER` |

### 1.4 Linter and Formatter Configuration

**Python (Ruff):**
```toml
[tool.ruff]
target-version = "py312"
line-length = 100

[tool.ruff.lint]
select = ["E", "F", "I", "UP", "B", "SIM"]
ignore = ["E501"]
```

**Python (mypy):**
```toml
[tool.mypy]
python_version = "3.12"
strict = true
ignore_missing_imports = true
```

**TypeScript (ESLint):** Standard Next.js ESLint config with strict type checking enabled.

### 1.5 Import Order (Python)

Ruff `I` rule enforces isort-compatible ordering:
1. Standard library (`import asyncio`, `from datetime import datetime`)
2. Third-party (`import structlog`, `from pydantic import BaseModel`)
3. Local project (`from cortex.base_agent import BaseAgent`)

Always use `from __future__ import annotations` as the first import in every Python file.

---

## SECTION 2: TEST-DRIVEN DEVELOPMENT (TDD)

### 2.1 TDD Workflow — The Iron Rule

Every feature, bug fix, and refactor MUST follow this cycle:

```
1. RED    — Write a failing test that specifies the desired behavior
2. GREEN  — Write the minimum code to make the test pass
3. REFACTOR — Clean up while keeping tests green
4. COMMIT — Commit with test + implementation together
```

**Never write production code without a corresponding test. Never commit code that reduces coverage below 85%.**

### 2.2 Coverage Requirements

| Service | Minimum Line Coverage | Enforced By |
|---------|-----------------------|-------------|
| cortex | 85% | `pytest --cov-fail-under=85` |
| gateway | 85% | `pytest --cov-fail-under=85` |
| admin | 85% | vitest coverage gate in CI |
| portal | 85% | vitest coverage gate in CI |
| superadmin | 85% | vitest coverage gate in CI |

CI blocks merge if coverage drops below threshold.

### 2.3 Test File Organization

**Python services:**
```
services/cortex/
├── cortex/
│   ├── base_agent.py
│   └── event_mesh.py
└── tests/
    ├── conftest.py           # Shared fixtures: mock NATS, mock PG, mock Redis
    ├── test_base_agent.py    # Tests for base_agent.py
    ├── test_event_mesh.py    # Tests for event_mesh.py
    ├── test_runtime.py       # Tests for runtime.py
    └── agents/
        ├── test_argus.py     # Tests for each agent
        └── test_sherlock.py
```

**TypeScript services:**
```
services/admin/
├── src/
│   ├── components/
│   │   └── AgentCard.tsx
│   └── stores/
│       └── agentStore.ts
└── __tests__/               # Or co-located .test.tsx files
    ├── components/
    │   └── AgentCard.test.tsx
    └── stores/
        └── agentStore.test.ts
```

### 2.4 Python Test Patterns

#### 2.4.1 Test File Template

```python
"""Tests for cortex.event_mesh — NATS JetStream wrapper."""

from __future__ import annotations

import asyncio
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from cortex.event_mesh import EventMesh
from cortex.models import GridMindEvent, WorkloadProfile


@pytest.fixture
def config():
    """Minimal CortexConfig for testing."""
    from cortex.config import CortexConfig
    return CortexConfig(
        nats_url="nats://localhost:4222",
        database_url="postgresql://test:test@localhost:5432/test",
        redis_url="redis://localhost:6379/0",
        environment="test",
    )


@pytest.fixture
def mock_nats():
    """Mock NATS client and JetStream context."""
    nc = AsyncMock()
    js = AsyncMock()
    nc.jetstream.return_value = js
    return nc, js


class TestEventMeshPublish:
    """Tests for EventMesh.publish()."""

    async def test_publish_sets_dedup_header(self, config, mock_nats):
        """Publishing an event includes Nats-Msg-Id for deduplication."""
        mesh = EventMesh(config)
        mesh._nc, mesh._js = mock_nats

        event = WorkloadProfile(
            tenant_id="tenant-1",
            event_type="perception.workload_profile",
            deployment_id="deploy-1",
            qps=100.0,
            p50_latency_ms=5.0,
            p95_latency_ms=15.0,
            p99_latency_ms=50.0,
            active_connections=42,
        )

        await mesh.publish(event)

        mock_nats[1].publish.assert_called_once()
        call_kwargs = mock_nats[1].publish.call_args
        assert call_kwargs.kwargs["headers"]["Nats-Msg-Id"] == event.event_id

    async def test_publish_raises_when_not_connected(self, config):
        """Publishing before connect() raises AssertionError."""
        mesh = EventMesh(config)
        event = MagicMock(spec=GridMindEvent)
        with pytest.raises(AssertionError, match="not connected"):
            await mesh.publish(event)
```

#### 2.4.2 Fixture Patterns for Infrastructure

```python
# conftest.py — Shared test fixtures

from __future__ import annotations

import asyncio
from unittest.mock import AsyncMock, MagicMock

import pytest


@pytest.fixture
def mock_event_mesh():
    """Mock EventMesh that records published events."""
    mesh = AsyncMock()
    mesh.published_events = []

    async def capture_publish(event):
        mesh.published_events.append(event)

    mesh.publish.side_effect = capture_publish
    return mesh


@pytest.fixture
def mock_state_manager():
    """Mock StateManager with in-memory context store."""
    state = AsyncMock()
    _context: dict[str, dict] = {}

    async def set_ctx(agent_id, tenant_id, key, value, ttl=None):
        _context.setdefault(f"{agent_id}:{tenant_id}", {})[key] = value

    async def get_ctx(agent_id, tenant_id, key):
        return _context.get(f"{agent_id}:{tenant_id}", {}).get(key)

    state.set_context.side_effect = set_ctx
    state.get_context.side_effect = get_ctx
    state.load_checkpoint.return_value = None
    state.pool = MagicMock()
    state.redis = AsyncMock()
    return state


@pytest.fixture
def mock_llm_client():
    """Mock LLMClient that returns canned responses."""
    llm = AsyncMock()
    llm.complete.return_value = MagicMock(
        content=[MagicMock(text="LLM response", type="text")]
    )
    return llm


@pytest.fixture
def mock_audit_logger():
    """Mock AuditLogger that captures log entries."""
    audit = MagicMock()
    audit.entries = []
    def capture(tenant_id, agent_id, action_type, details=None):
        audit.entries.append({
            "tenant_id": tenant_id,
            "agent_id": agent_id,
            "action_type": action_type,
            "details": details,
        })
    audit.record_action.side_effect = capture
    audit.record_event = MagicMock()
    return audit


@pytest.fixture
def mock_approval_gate():
    """Mock ApprovalGate that auto-approves."""
    from cortex.models import ApprovalResponse, ApprovalStatus
    gate = AsyncMock()
    gate.request.return_value = ApprovalResponse(
        tenant_id="test",
        source_agent_id="system",
        approval_id="test-approval-id",
        status=ApprovalStatus.APPROVED,
        approver_id="autonomous",
        justification="Test auto-approval",
    )
    return gate
```

#### 2.4.3 Agent Test Pattern

Every agent test must verify:
1. **Class-level declarations** — AGENT_NAME, TIER, AUTONOMY_LEVEL, MODEL_ASSIGNMENT
2. **Event processing** — correct behavior when `process()` receives events
3. **Event emission** — correct events published via `_emit()`
4. **Tool invocation** — tools called with correct parameters
5. **LLM interaction** — correct system prompts and message formatting
6. **Approval gating** — approval requested for supervised actions
7. **Error handling** — graceful degradation on failures

```python
"""Tests for agents.argus — Workload Profiler."""

from __future__ import annotations

import pytest
from cortex.models import AgentTier, AutonomyLevel

from agents.argus import Argus


class TestArgusDeclarations:
    """Verify Argus class-level metadata."""

    def test_agent_name(self):
        assert Argus.AGENT_NAME == "argus"

    def test_tier_is_perception(self):
        assert Argus.TIER == AgentTier.PERCEPTION

    def test_model_is_haiku(self):
        assert Argus.MODEL_ASSIGNMENT == "claude-haiku-4-5"

    def test_visibility_is_customer(self):
        assert Argus.VISIBILITY == "Customer"

    def test_cycle_interval_60s(self):
        assert Argus.CYCLE_INTERVAL_SECONDS == 60.0

    def test_subscriptions_include_workload(self):
        assert any("workload" in s for s in Argus.SUBSCRIPTIONS)

    def test_emissions_include_profile(self):
        assert "workload.profile" in Argus.EMISSIONS


class TestArgusProcessing:
    """Test Argus event processing logic."""

    @pytest.fixture
    def argus(self, config, mock_event_mesh, mock_state_manager,
              mock_llm_client, mock_audit_logger, mock_approval_gate):
        return Argus(
            config=config,
            event_mesh=mock_event_mesh,
            state_manager=mock_state_manager,
            llm_client=mock_llm_client,
            audit_logger=mock_audit_logger,
            approval_gate=mock_approval_gate,
            tenant_id="test-tenant",
        )

    async def test_run_cycle_emits_workload_profile(self, argus, mock_event_mesh):
        """ARGUS run_cycle must emit a workload.profile event."""
        await argus.run_cycle()
        assert len(mock_event_mesh.published_events) > 0
        event = mock_event_mesh.published_events[0]
        assert event.event_type == "perception.workload_profile"
```

### 2.5 TypeScript Test Patterns

#### 2.5.1 Component Test Template (Vitest + React Testing Library)

```typescript
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { AgentCard } from "@/components/AgentCard";

const mockAgent = {
  agentId: "argus-abc123",
  agentName: "argus",
  displayName: "ARGUS",
  tier: "perception",
  status: "healthy",
  model: "claude-haiku-4-5",
  uptimeSeconds: 3600,
  tasksInFlight: 2,
  lastActionAt: new Date().toISOString(),
};

describe("AgentCard", () => {
  it("renders agent display name", () => {
    render(<AgentCard agent={mockAgent} />);
    expect(screen.getByText("ARGUS")).toBeInTheDocument();
  });

  it("shows healthy status indicator", () => {
    render(<AgentCard agent={mockAgent} />);
    const indicator = screen.getByTestId("status-indicator");
    expect(indicator).toHaveClass("bg-brand-green");
  });

  it("shows tier badge", () => {
    render(<AgentCard agent={mockAgent} />);
    expect(screen.getByText("perception")).toBeInTheDocument();
  });

  it("calls onClick when card is clicked", () => {
    const onClick = vi.fn();
    render(<AgentCard agent={mockAgent} onClick={onClick} />);
    fireEvent.click(screen.getByRole("button"));
    expect(onClick).toHaveBeenCalledWith("argus-abc123");
  });
});
```

#### 2.5.2 Zustand Store Test Pattern

```typescript
import { describe, it, expect, beforeEach } from "vitest";
import { useAgentStore } from "@/stores/agentStore";

describe("agentStore", () => {
  beforeEach(() => {
    useAgentStore.setState({ agents: [], selectedAgentId: null });
  });

  it("setAgents updates agent list", () => {
    const agents = [{ agentId: "argus-1", agentName: "argus", status: "healthy" }];
    useAgentStore.getState().setAgents(agents);
    expect(useAgentStore.getState().agents).toHaveLength(1);
  });

  it("selectAgent sets selectedAgentId", () => {
    useAgentStore.getState().selectAgent("argus-1");
    expect(useAgentStore.getState().selectedAgentId).toBe("argus-1");
  });

  it("getAgentsByTier filters correctly", () => {
    useAgentStore.setState({
      agents: [
        { agentId: "1", tier: "perception", status: "healthy" },
        { agentId: "2", tier: "reasoning", status: "healthy" },
        { agentId: "3", tier: "perception", status: "degraded" },
      ],
    });
    const perception = useAgentStore.getState().getAgentsByTier("perception");
    expect(perception).toHaveLength(2);
  });
});
```

### 2.6 Contract Test Patterns

Contract tests validate that shared schemas stay consistent across services.

```python
"""Contract tests for shared event schemas."""

from __future__ import annotations

import json
import pathlib

import jsonschema
import pytest

from shared.schemas.events import EVENT_TYPE_MAP, EventEnvelope


class TestEventSchemas:
    """Validate all event schemas are well-formed."""

    @pytest.mark.parametrize("event_type,model_class", EVENT_TYPE_MAP.items())
    def test_schema_is_valid_json_schema(self, event_type, model_class):
        """Every event model produces a valid JSON Schema."""
        schema = model_class.model_json_schema()
        jsonschema.Draft7Validator.check_schema(schema)

    @pytest.mark.parametrize("event_type,model_class", EVENT_TYPE_MAP.items())
    def test_event_has_required_fields(self, event_type, model_class):
        """Every event model has tenant_id field."""
        fields = model_class.model_fields
        # All events that subclass GridMindEvent must have tenant_id
        assert "tenant_id" in fields or "deployment_id" in fields

    def test_envelope_wraps_any_event(self):
        """EventEnvelope can wrap any event type."""
        envelope = EventEnvelope(
            event_type="perception.workload_profile",
            tenant_id="test-tenant",
            payload={"qps": 100.0},
        )
        assert envelope.event_id  # Auto-generated UUID
        assert envelope.timestamp  # Auto-generated
```

### 2.7 Integration Test Patterns

Integration tests run against live staging and require service containers.

```python
"""Integration tests — run against staging with real dependencies."""

from __future__ import annotations

import httpx
import pytest

STAGING_URL = "https://staging-api.gridmind.io"


@pytest.fixture
def client():
    return httpx.AsyncClient(base_url=STAGING_URL, timeout=30.0)


class TestAuthFlow:
    """End-to-end authentication flow."""

    async def test_register_login_refresh(self, client):
        # Register
        resp = await client.post("/api/v1/auth/register", json={
            "email": f"test-{uuid4().hex[:8]}@gridmind.io",
            "password": "TestPassword123!",
            "full_name": "Test User",
            "org_name": "Test Org",
        })
        assert resp.status_code == 201

        # Login
        resp = await client.post("/api/v1/auth/token", data={
            "username": email,
            "password": "TestPassword123!",
        })
        assert resp.status_code == 200
        tokens = resp.json()
        assert "access_token" in tokens
        assert "refresh_token" in tokens

        # Refresh
        resp = await client.post("/api/v1/auth/refresh", json={
            "refresh_token": tokens["refresh_token"],
        })
        assert resp.status_code == 200
```

### 2.8 What to Test vs. What Not to Test

**ALWAYS test:**
- Business logic (agent processing, scaling decisions, billing calculations)
- Event serialization/deserialization
- Permission enforcement (RBAC checks)
- Error paths (approval denied, timeout, LLM failure)
- State transitions (tenant lifecycle, incident status)
- API request/response contracts

**DO NOT test:**
- Third-party library internals (Stripe SDK, NATS client)
- Pydantic model validation (Pydantic tests its own validators)
- SQLAlchemy column definitions (unless testing RLS or constraints)
- Static UI layout (unless interaction-dependent)

---

## SECTION 3: AGENTIC DEVELOPMENT PATTERNS

### 3.1 Agent Architecture Overview

GridMind agents follow the **Perception-Reasoning-Execution-Healing** (PREH) architecture. Every agent inherits from `BaseAgent` and participates in the event mesh.

```
                    ┌──────────────────────────┐
                    │     NATS JetStream        │
                    │     (Event Mesh)          │
                    └────┬───────────┬──────────┘
                         │           │
              subscribe  │           │  publish
                         ▼           │
                    ┌────────────────┴──────────┐
                    │       BaseAgent            │
                    │  ┌──────────────────────┐  │
                    │  │ process(event)       │  │  ← event-driven
                    │  │ run_cycle()          │  │  ← tick-driven
                    │  │ _emit(event)         │  │  ← tier-enforced publish
                    │  │ _llm(system, msgs)   │  │  ← Claude integration
                    │  │ _invoke_tool(name)   │  │  ← allowlist-enforced tools
                    │  │ _request_approval()  │  │  ← autonomy-gated
                    │  └──────────────────────┘  │
                    └────────────────────────────┘
                         │           │
                    ┌────▼────┐ ┌────▼────┐
                    │ PostgreSQL │ │  Redis  │
                    │ (durable)  │ │ (cache) │
                    └───────────┘ └─────────┘
```

### 3.2 Creating a New Agent — Step by Step

#### Step 1: Define the agent metadata in `agents/registry.py`

```python
"my_agent": {
    "agent_name": "my_agent",
    "display_name": "MY_AGENT",
    "tier": "reasoning",                    # perception | reasoning | execution | self_healing | specialized
    "model": "claude-sonnet-4-6",           # or "deterministic", "deterministic+claude-haiku-4-5"
    "visibility": "Customer",               # Customer | Internal
    "description": "One-sentence description of what this agent does.",
    "tools": ["tool_a", "tool_b"],          # Tool names this agent may invoke
    "subscriptions": ["workload.>"],        # NATS event patterns to subscribe to
    "emissions": ["action.plan"],           # Event types this agent may publish
    "cycle_seconds": 0.0,                   # 0 = event-driven only; >0 = also tick-driven
    "class_path": "agents.my_agent.MyAgent",
},
```

#### Step 2: Write the failing test FIRST

```python
"""Tests for agents.my_agent — MyAgent."""

from __future__ import annotations

import pytest
from cortex.models import AgentTier, AutonomyLevel, WorkloadShiftDetected

from agents.my_agent import MyAgent


class TestMyAgentDeclarations:
    def test_agent_name(self):
        assert MyAgent.AGENT_NAME == "my_agent"

    def test_tier(self):
        assert MyAgent.TIER == AgentTier.REASONING

    def test_autonomy(self):
        assert MyAgent.AUTONOMY_LEVEL == AutonomyLevel.SUPERVISED


class TestMyAgentProcessing:
    @pytest.fixture
    def agent(self, config, mock_event_mesh, mock_state_manager,
              mock_llm_client, mock_audit_logger, mock_approval_gate):
        return MyAgent(
            config=config,
            event_mesh=mock_event_mesh,
            state_manager=mock_state_manager,
            llm_client=mock_llm_client,
            audit_logger=mock_audit_logger,
            approval_gate=mock_approval_gate,
            tenant_id="test-tenant",
        )

    async def test_process_workload_shift_emits_plan(self, agent, mock_event_mesh):
        event = WorkloadShiftDetected(
            tenant_id="test-tenant",
            event_type="perception.workload_shift_detected",
            deployment_id="deploy-1",
            shift_type="spike",
            severity="high",
            confidence=0.92,
        )
        await agent.process(event)
        assert len(mock_event_mesh.published_events) >= 1

    async def test_process_calls_llm_with_context(self, agent, mock_llm_client):
        event = WorkloadShiftDetected(
            tenant_id="test-tenant",
            event_type="perception.workload_shift_detected",
            deployment_id="deploy-1",
            shift_type="spike",
            severity="high",
            confidence=0.92,
        )
        await agent.process(event)
        mock_llm_client.complete.assert_called_once()

    async def test_process_requests_approval_for_high_risk(self, agent, mock_approval_gate):
        event = WorkloadShiftDetected(
            tenant_id="test-tenant",
            event_type="perception.workload_shift_detected",
            deployment_id="deploy-1",
            shift_type="spike",
            severity="critical",
            confidence=0.95,
        )
        await agent.process(event)
        mock_approval_gate.request.assert_called_once()
```

#### Step 3: Implement the agent

```python
"""MY_AGENT — description of what it does."""

from __future__ import annotations

from cortex.base_agent import BaseAgent, AgentTier, AutonomyLevel, ToolDefinition
from cortex.models import (
    ActionPlan,
    GridMindEvent,
    Severity,
    WorkloadShiftDetected,
)


class MyAgent(BaseAgent):
    AGENT_NAME = "my_agent"
    TIER = AgentTier.REASONING
    AUTONOMY_LEVEL = AutonomyLevel.SUPERVISED
    MODEL_ASSIGNMENT = "claude-sonnet-4-6"
    VISIBILITY = "Customer"
    DESCRIPTION = "One-sentence description."

    TOOLS = [
        ToolDefinition(name="tool_a", description="Does A", parameters={}),
        ToolDefinition(name="tool_b", description="Does B", parameters={}),
    ]

    SUBSCRIPTIONS = ["workload.>"]
    EMISSIONS = ["action.plan"]

    CYCLE_INTERVAL_SECONDS = 0.0  # Event-driven only

    async def process(self, event: GridMindEvent) -> None:
        if not isinstance(event, WorkloadShiftDetected):
            return

        # 1. Gather context
        context = await self.get_context("last_analysis")

        # 2. Reason via LLM
        analysis = await self._llm(
            system="You are MY_AGENT, a reasoning agent for GridMind...",
            messages=[{"role": "user", "content": f"Analyze: {event.model_dump_json()}"}],
        )

        # 3. Request approval for high-risk actions
        if event.severity in ("high", "critical"):
            await self._request_approval(
                action_description=f"Execute plan based on {event.shift_type} shift",
                risk_level=Severity.HIGH,
                context={"analysis": analysis},
            )

        # 4. Emit result event
        plan = ActionPlan(
            tenant_id=event.tenant_id,
            event_type="reasoning.action_plan",
            deployment_id=event.deployment_id,
            trigger_event_id=event.event_id,
            objective=f"Respond to {event.shift_type}",
            steps=[],
            estimated_total_duration_seconds=300,
            risk_level=event.severity,
        )
        await self._emit(plan)

        # 5. Update context
        await self.set_context("last_analysis", analysis, ttl=3600)
```

#### Step 4: Register in `agents/__init__.py`

```python
from agents.my_agent import MyAgent

AGENT_REGISTRY["my_agent"] = MyAgent
ALL_AGENT_CLASSES.append(MyAgent)
```

### 3.3 Agent Class Variables — Complete Reference

| Variable | Type | Required | Description |
|----------|------|----------|-------------|
| `AGENT_NAME` | `str` | YES | Unique snake_case identifier. Must match registry key. |
| `TIER` | `AgentTier` | YES | `PERCEPTION`, `REASONING`, `EXECUTION`, `SELF_HEALING` |
| `AUTONOMY_LEVEL` | `AutonomyLevel` | YES | `AUTONOMOUS`, `SUPERVISED`, `ADVISORY` |
| `MODEL_ASSIGNMENT` | `str` | YES | `claude-haiku-4-5`, `claude-sonnet-4-6`, `claude-opus-4-6`, or `deterministic` |
| `VISIBILITY` | `str` | YES | `Customer` (shown in portal) or `Internal` (admin only) |
| `DESCRIPTION` | `str` | YES | One-sentence description for registry and docs |
| `TOOLS` | `list[ToolDefinition]` | YES | Allowed tool calls. Empty list = no tools. |
| `SUBSCRIPTIONS` | `list[str]` | YES | NATS patterns. `workload.>` = all workload events. |
| `EMISSIONS` | `list[str]` | YES | Event types this agent publishes. Enforced by tier. |
| `CYCLE_INTERVAL_SECONDS` | `float` | NO | Default 0.0 (event-driven only). Set >0 for tick-driven. |
| `HEARTBEAT_INTERVAL_SECONDS` | `int` | NO | Default 10. How often heartbeat is emitted. |

### 3.4 Tier Publish Permissions — What Each Tier Can Emit

This is enforced at runtime by `BaseAgent._emit()`. Violations raise `PermissionError`.

| Tier | Allowed Event Prefixes |
|------|----------------------|
| `PERCEPTION` | `workload.*`, `infra.*`, `agent.heartbeat`, `agent.health` |
| `REASONING` | `workload.*`, `cost.*`, `drift.*`, `capacity.*`, `action.*`, `scaling.*`, `incident.*`, `security.*`, `agent.heartbeat`, `agent.health`, `approval.*` |
| `EXECUTION` | `scaling.*`, `action.*`, `drift.*`, `tenant.*`, `agent.heartbeat`, `agent.health`, `approval.*` |
| `SELF_HEALING` | `agent.*`, `infra.*`, `approval.*`, `action.*` |

**Rule:** If your agent tries to `_emit()` an event that doesn't match its tier's allowed prefixes, it will fail. Design your agent's `EMISSIONS` accordingly.

### 3.5 Autonomy Levels — Detailed Behavior

| Level | `_request_approval()` Behavior | When to Use |
|-------|-------------------------------|-------------|
| `AUTONOMOUS` | Returns immediately with synthetic approval. Audit logged. | Read-only agents, heartbeat monitors, metrics collectors. Low-risk automated actions. |
| `SUPERVISED` | Publishes `ApprovalRequest` to NATS. Blocks until human approves/rejects or timeout (default 300s). | Any agent that modifies infrastructure, changes config, scales resources, or executes migrations. |
| `ADVISORY` | Raises `AdvisoryOnlyError`. Agent cannot execute. | Agents that only recommend. Their output is informational. |

**Default timeout:** 300 seconds (5 minutes). Configurable via `APPROVAL_TIMEOUT_SECONDS` env var.

**Timeout behavior:** If no human responds within timeout, the approval is automatically DENIED and the agent receives `ApprovalDeniedError`.

### 3.6 LLM Integration Patterns

#### 3.6.1 Single-Turn (Analysis / Classification)

```python
async def process(self, event: GridMindEvent) -> None:
    result = await self._llm(
        system="You are ARGUS, a workload profiler. Classify the workload.",
        messages=[{
            "role": "user",
            "content": f"Classify this workload snapshot:\n{event.model_dump_json()}"
        }],
        temperature=0.0,  # Deterministic for classification
    )
```

#### 3.6.2 Tool-Use Loop (Agentic Execution)

```python
async def process(self, event: GridMindEvent) -> None:
    result = await self._llm_with_tools(
        system="You are SHERLOCK. Investigate the incident using available tools.",
        user_message=f"Investigate incident: {event.model_dump_json()}",
        tools=self.TOOLS,
        max_iterations=10,  # Max tool-use rounds
    )
```

The tool-use loop:
1. Sends system + user message to Claude
2. If Claude returns tool_use blocks, executes ALL tools concurrently via `asyncio.gather`
3. Returns tool results to Claude
4. Repeats until Claude returns a final text response or `max_iterations` is reached

#### 3.6.3 Model Selection Guidelines

| Use Case | Model | Reasoning |
|----------|-------|-----------|
| Fast classification, metrics | `claude-haiku-4-5` | Low latency, cost-effective |
| Multi-step reasoning, planning | `claude-sonnet-4-6` | Good balance of speed and capability |
| Complex root-cause analysis | `claude-opus-4-6` | Highest capability for hard problems |
| No LLM needed (pure logic) | `deterministic` | IaC execution, heartbeat monitoring |
| Hybrid (deterministic + LLM) | `deterministic+claude-haiku-4-5` | Collect data deterministically, analyze with LLM |

### 3.7 Event Mesh Patterns

#### 3.7.1 Subject Convention

```
gridmind.events.{tenant_id}.{event_type}
```

All events are tenant-scoped. The tenant_id is part of the NATS subject for routing and isolation.

#### 3.7.2 Publishing Events

```python
# From inside a BaseAgent:
await self._emit(WorkloadProfile(
    tenant_id=self._tenant_id,
    event_type="perception.workload_profile",
    deployment_id="deploy-123",
    qps=500.0,
    p50_latency_ms=2.1,
    p95_latency_ms=8.5,
    p99_latency_ms=45.0,
    active_connections=150,
))
```

`_emit()` automatically:
- Stamps `source_agent_id`
- Sets `tenant_id` if not already set
- Validates tier publish permissions
- Logs to audit trail

#### 3.7.3 Subscribing to Events

Subscriptions are declared via `SUBSCRIPTIONS` class variable using NATS wildcard patterns:

| Pattern | Matches |
|---------|---------|
| `workload.>` | All workload events (workload.profile, workload.shift_detected) |
| `workload.*` | Direct workload children only |
| `agent.heartbeat` | Exact match |
| `approval.response` | Exact match |

#### 3.7.4 Event Deduplication

JetStream uses a 2-minute dedup window keyed on `Nats-Msg-Id` (set to `event.event_id`). If an event with the same ID is published within 2 minutes, JetStream silently drops the duplicate.

### 3.8 State Management Patterns

#### 3.8.1 Redis Context (Short-lived, Per-Agent)

```python
# Store analysis result for 1 hour
await self.set_context("last_analysis", {"qps": 500, "classification": "OLTP"}, ttl=3600)

# Retrieve
analysis = await self.get_context("last_analysis")

# Delete
await self.delete_context("last_analysis")
```

Key format: `cortex:agent:{agent_name}:{tenant_id}:{key}`

#### 3.8.2 PostgreSQL Checkpoints (Durable, Cross-Restart)

Override `_build_checkpoint_state()` and `_restore_checkpoint()` for durable state:

```python
async def _build_checkpoint_state(self) -> dict[str, Any]:
    base = await super()._build_checkpoint_state()
    base["workload_history"] = self._workload_history
    return base

async def _restore_checkpoint(self, checkpoint: dict[str, Any]) -> None:
    self._workload_history = checkpoint.get("workload_history", [])
```

### 3.9 Error Handling in Agents

```python
async def process(self, event: GridMindEvent) -> None:
    try:
        # ... agent logic ...
        await self._emit(result_event)
        self._record_success()
    except ApprovalDeniedError as exc:
        # Expected — log and continue
        self._log.info("approval_denied", reason=exc.reason)
    except AdvisoryOnlyError:
        # Agent misconfigured — this should never happen
        self._log.error("advisory_agent_attempted_execution")
    except Exception as exc:
        self._record_error()
        self._log.error("process_failed", error=str(exc), exc_info=True)
        # Do NOT re-raise — BaseAgent._handle_event wraps this and handles retry
```

**Rule:** Never let an unhandled exception escape `process()` or `run_cycle()`. The base class catches exceptions, but your agent should handle expected failure modes gracefully.

---

## SECTION 4: API DEVELOPMENT PATTERNS

### 4.1 Route Handler Template

```python
"""Deployments route module."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field

from gateway.auth import AuthDep, require_permission

router = APIRouter(prefix="/deployments", tags=["Deployments"])


class CreateDeploymentRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    engine: str = Field(..., pattern="^(postgresql|mysql|redis|mongodb)$")
    region: str = Field(..., min_length=1)
    instance_type: str = Field(...)


class DeploymentResponse(BaseModel):
    deployment_id: str
    name: str
    engine: str
    status: str
    region: str


@router.post(
    "",
    response_model=DeploymentResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_permission("deployment:write"))],
)
async def create_deployment(
    body: CreateDeploymentRequest,
    auth: AuthDep,
) -> DeploymentResponse:
    """Create a new deployment for the authenticated tenant."""
    # Auth context is already validated by require_permission
    # tenant_id is available via auth.tenant_id
    # ... create deployment logic ...
    return DeploymentResponse(...)
```

### 4.2 Permission Enforcement

Every endpoint MUST declare required permissions:

```python
# Read access
@router.get("", dependencies=[Depends(require_permission("deployment:read"))])

# Write access
@router.post("", dependencies=[Depends(require_permission("deployment:write"))])

# Role-specific
@router.delete("", dependencies=[Depends(require_role(Role.ORG_OWNER, Role.ORG_ADMIN))])
```

### 4.3 WebSocket Handler Pattern

```python
@app.websocket("/ws/{tenant_id}/agents")
async def ws_agents(websocket: WebSocket, tenant_id: str) -> None:
    # 1. Authenticate
    auth = await authenticate_websocket(websocket)
    if not auth:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    # 2. Enforce tenant scope
    if auth.tenant_id != tenant_id:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    # 3. Register connection
    await manager.connect(websocket, [agent_channel(tenant_id, "*")], auth)

    try:
        while True:
            raw = await websocket.receive_text()
            # Handle client messages (ping, subscribe, etc.)
    except WebSocketDisconnect:
        pass
    finally:
        await manager.disconnect(websocket)
```

---

## SECTION 5: FRONTEND DEVELOPMENT PATTERNS

### 5.1 Design System Tokens

All three frontend services (admin, portal, superadmin) share the same base design system:

| Token | Value | Usage |
|-------|-------|-------|
| `brand-electric` | `#2563EB` | Primary CTAs, active states, links |
| `brand-ocean` | `#0EA5E9` | Secondary actions |
| `brand-cyan` | `#06B6D4` | Perception tier indicator |
| `brand-midnight` | `#0A0E14` | Page background |
| `brand-navy` | `#111820` | Card background |
| `brand-green` | `#10B981` | Success, healthy, Execution tier |
| `brand-red` | `#EF4444` | Error, critical, Self-Healing tier |
| `brand-amber` | `#F59E0B` | Warning, Super Admin accent |

**Fonts:**
- Headings: Outfit
- Body: Outfit
- Code/metrics: JetBrains Mono

**Theme:** Always dark mode. No light mode.

### 5.2 Zustand Store Pattern

```typescript
import { create } from "zustand";

interface AgentState {
  agents: Agent[];
  selectedAgentId: string | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  setAgents: (agents: Agent[]) => void;
  selectAgent: (id: string | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;

  // Derived
  getAgentsByTier: (tier: string) => Agent[];
  getHealthyCount: () => number;
}

export const useAgentStore = create<AgentState>((set, get) => ({
  agents: [],
  selectedAgentId: null,
  isLoading: false,
  error: null,

  setAgents: (agents) => set({ agents }),
  selectAgent: (id) => set({ selectedAgentId: id }),
  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),

  getAgentsByTier: (tier) => get().agents.filter((a) => a.tier === tier),
  getHealthyCount: () => get().agents.filter((a) => a.status === "healthy").length,
}));
```

### 5.3 Component Structure

```
src/
├── app/                    # Next.js 15 App Router pages
│   ├── layout.tsx          # Root layout (fonts, theme, providers)
│   ├── page.tsx            # Dashboard / home
│   └── agents/
│       └── page.tsx        # Agent fleet page
├── components/             # Reusable UI components
│   ├── AgentCard.tsx
│   ├── DeploymentCard.tsx
│   ├── StatusBadge.tsx
│   └── MetricsChart.tsx
├── stores/                 # Zustand stores
│   ├── agentStore.ts
│   └── deploymentStore.ts
├── lib/                    # Utilities, API client, helpers
│   ├── api.ts
│   └── formatters.ts
└── types/                  # TypeScript type definitions
    └── index.ts
```

### 5.4 Service-Specific Themes

| Service | Accent Override | Purpose |
|---------|----------------|---------|
| admin | None (default Electric Blue) | Operator dashboard |
| portal | None (default Electric Blue) | Customer-facing |
| superadmin | Amber `#F59E0B` as primary accent | Visual distinction for god-mode |

---

## SECTION 6: DATABASE PATTERNS

### 6.1 Migration Rules

1. All migrations are sequential SQL files: `NNN_description.sql`
2. Every migration must be reversible
3. Never drop columns in the same deploy that removes referencing code
4. Large data migrations: batch 1000 rows, sleep 100ms between batches
5. DDL with exclusive locks: `SET statement_timeout = '5s'`
6. All tables with tenant_id get RLS policies

### 6.2 Row-Level Security Pattern

```sql
-- Enable RLS
ALTER TABLE deployments ENABLE ROW LEVEL SECURITY;

-- App role sees own tenant only
CREATE POLICY tenant_isolation ON deployments
    FOR ALL
    USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

-- Platform admin sees everything
CREATE POLICY platform_admin_read ON deployments
    FOR SELECT
    TO gridmind_platform_admin
    USING (true);
```

### 6.3 Table Partitioning Pattern

```sql
-- Monthly range partitioning for high-volume tables
CREATE TABLE audit_log (
    audit_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_time TIMESTAMPTZ NOT NULL DEFAULT now(),
    -- ... columns ...
) PARTITION BY RANGE (event_time);

-- Auto-create partitions
CREATE OR REPLACE FUNCTION create_audit_log_partition()
RETURNS void AS $$
-- Creates current + 3 forward monthly partitions
$$ LANGUAGE plpgsql;
```

Partitioned tables: `events_log`, `audit_log`, `usage_records`, `agent_heartbeats`.

### 6.4 Immutable Table Pattern

```sql
-- Audit log and incident timeline are append-only
CREATE OR REPLACE FUNCTION audit_log_immutable()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'audit_log is immutable: % not permitted', TG_OP;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_audit_immutability
    BEFORE UPDATE OR DELETE ON audit_log
    FOR EACH ROW EXECUTE FUNCTION audit_log_immutable();

REVOKE UPDATE, DELETE, TRUNCATE ON audit_log FROM gridmind_app;
```

---

## SECTION 7: INFRASTRUCTURE AND DEPLOYMENT PATTERNS

### 7.1 Helm Values Override Pattern

Each chart has three values files:
- `values.yaml` — defaults (dev-suitable)
- `values-staging.yaml` — staging overrides
- `values-production.yaml` — production overrides

### 7.2 Docker Build Pattern

All Python services use multi-stage builds:

```dockerfile
# Stage 1: Build
FROM python:3.12-slim AS builder
RUN pip install uv==0.4.18
COPY pyproject.toml .
RUN uv pip install --system --no-cache .

# Stage 2: Production
FROM python:3.12-slim
RUN useradd -r -u 1001 gridmind
COPY --from=builder /usr/local/lib/python3.12/site-packages /usr/local/lib/python3.12/site-packages
USER gridmind
HEALTHCHECK CMD curl -f http://localhost:8000/health
```

### 7.3 Environment Variable Precedence

1. Vault Agent sidecar (production) — files in `/vault/secrets/`
2. Kubernetes Secrets / ConfigMaps (staging)
3. `.env` file (development)
4. Hardcoded defaults in `pydantic-settings`

---

## SECTION 8: CI/CD REQUIREMENTS

### 8.1 Pre-Merge Checks (All Must Pass)

| Check | Tool | Threshold |
|-------|------|-----------|
| Python lint | Ruff | Zero errors |
| Python format | Ruff format | Zero diffs |
| TypeScript lint | ESLint | Zero errors |
| TypeScript types | tsc --noEmit | Zero errors |
| SAST | Semgrep (python, typescript, secrets, owasp-top-ten) | Zero HIGH+ findings |
| Python tests | pytest | 85% coverage minimum |
| TypeScript tests | vitest | 85% coverage minimum |
| Contract tests | pytest (shared/schemas) | All pass |
| Container scan | Trivy | Zero CRITICAL/HIGH (unfixed) |
| Docker build | docker build-push-action | All 5 services build |

### 8.2 Commit Message Format

```
<type>(<scope>): <short description>

<optional body>

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
```

Types: `feat`, `fix`, `refactor`, `test`, `docs`, `chore`, `ci`
Scopes: `cortex`, `gateway`, `admin`, `portal`, `superadmin`, `shared`, `infra`

---

## SECTION 9: SECURITY CODING STANDARDS

### 9.1 Input Validation

- All API inputs validated via Pydantic models with strict types
- Max request body: 1MB (10MB for file uploads)
- SQL: parameterized queries only (asyncpg) — never string interpolation
- Path params: validate UUID format
- Webhook URLs: validate against allowlist

### 9.2 Authentication

- JWT RS256 in production, HS256 only in dev/test
- Access tokens: 15-minute expiry, stateless
- Refresh tokens: 7-day expiry, stored hashed in DB
- API keys: HMAC-SHA256 hashed, never stored in plaintext
- Passwords: bcrypt (12 rounds minimum)

### 9.3 Secrets

- Never commit secrets to source control
- Never log secrets (use `SecretStr` from Pydantic)
- Production: all secrets from Vault, never env vars
- Dev: `.env` file (gitignored)

### 9.4 Tenant Isolation

- Every database query must be scoped to tenant_id via RLS
- Every API handler validates `auth.tenant_id` matches requested resource
- WebSocket connections verify tenant_id before accepting
- NATS subjects include tenant_id for event isolation

---

## SECTION 10: RAG RETRIEVAL HINTS

This section provides structured metadata for RAG systems to efficiently retrieve relevant content.

### 10.1 Key Concepts Index

| Concept | Section | Key Files |
|---------|---------|-----------|
| Creating a new agent | 3.2 | `agents/registry.py`, `cortex/base_agent.py` |
| Agent tiers and permissions | 3.4 | `cortex/base_agent.py` lines 69-92 |
| Autonomy levels | 3.5 | `cortex/approval.py` |
| LLM integration | 3.6 | `cortex/llm.py` |
| Event mesh / NATS | 3.7 | `cortex/event_mesh.py` |
| Writing Python tests | 2.4 | `services/cortex/tests/`, `services/gateway/tests/` |
| Writing TypeScript tests | 2.5 | `services/admin/__tests__/` |
| API route handlers | 4.1 | `services/gateway/gateway/routes/` |
| RBAC permissions | 4.2 | `services/gateway/gateway/auth.py` |
| Design system | 5.1 | `services/admin/tailwind.config.ts` |
| Zustand stores | 5.2 | `services/*/src/stores/` |
| Database migrations | 6.1 | `migrations/*.sql` |
| RLS policies | 6.2 | `migrations/001_tenants.sql` |
| Helm charts | 7.1 | `infrastructure/helm/` |
| CI checks | 8.1 | `.github/workflows/ci.yml` |

### 10.2 Common Tasks Quick Reference

**"How do I add a new API endpoint?"** → Section 4.1, follow the route handler template. Declare permissions with `require_permission()`. Write test first (Section 2.4).

**"How do I create a new agent?"** → Section 3.2, four steps: registry entry, failing test, implementation, registration.

**"What model should my agent use?"** → Section 3.6.3, model selection guidelines by use case.

**"How do I add a new database table?"** → Section 6.1, create `NNN_description.sql`, add RLS (6.2), add SQLAlchemy model in `shared/models/`.

**"How do I test agent approval flow?"** → Section 2.4.3, use `mock_approval_gate` fixture. Test both approved and denied paths.

**"What events can my agent publish?"** → Section 3.4, tier publish permissions table. Cross-reference with `cortex/base_agent.py` `_TIER_PUBLISH_ALLOW`.

**"How do I add a new Zustand store?"** → Section 5.2, follow the store pattern template. Write test first (Section 2.5.2).

**"What coverage do I need?"** → Section 2.2, 85% line coverage minimum for all services. CI blocks merge if below threshold.
