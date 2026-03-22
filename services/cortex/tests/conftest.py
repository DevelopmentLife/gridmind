"""Shared test fixtures for the Cortex test suite."""

from __future__ import annotations

import asyncio
from unittest.mock import AsyncMock, MagicMock

import pytest

from cortex.config import CortexConfig
from cortex.models import AutonomyLevel, EventEnvelope


@pytest.fixture
def mock_config() -> CortexConfig:
    """Minimal CortexConfig for testing."""
    return CortexConfig(
        nats_url="nats://localhost:4222",
        database_url="postgresql://test:test@localhost:5432/test",
        redis_url="redis://localhost:6379/0",
        environment="test",
        anthropic_api_key=None,
        heartbeat_interval=10,
        approval_timeout=5,
        log_level="debug",
        prometheus_port=9999,
    )


@pytest.fixture
def mock_nats() -> tuple[AsyncMock, AsyncMock]:
    """Mock NATS client and JetStream context."""
    nc = AsyncMock()
    js = AsyncMock()
    nc.jetstream.return_value = js
    return nc, js


@pytest.fixture
def mock_pg() -> AsyncMock:
    """Mock asyncpg connection pool."""
    pool = AsyncMock()
    conn = AsyncMock()
    pool.acquire.return_value.__aenter__ = AsyncMock(return_value=conn)
    pool.acquire.return_value.__aexit__ = AsyncMock(return_value=None)
    conn.fetch.return_value = []
    conn.fetchval.return_value = 1
    conn.executemany.return_value = None
    return pool


@pytest.fixture
def mock_redis() -> AsyncMock:
    """Mock Redis async client."""
    redis = AsyncMock()
    _store: dict[str, str] = {}

    async def mock_set(key: str, value: str) -> None:
        _store[key] = value

    async def mock_setex(key: str, ttl: int, value: str) -> None:
        _store[key] = value

    async def mock_get(key: str) -> str | None:
        return _store.get(key)

    async def mock_delete(key: str) -> None:
        _store.pop(key, None)

    async def mock_ping() -> bool:
        return True

    redis.set.side_effect = mock_set
    redis.setex.side_effect = mock_setex
    redis.get.side_effect = mock_get
    redis.delete.side_effect = mock_delete
    redis.ping.side_effect = mock_ping
    return redis


@pytest.fixture
def mock_event_mesh() -> AsyncMock:
    """Mock EventMesh that records published events."""
    mesh = AsyncMock()
    mesh.published_events: list[EventEnvelope] = []
    mesh.is_connected = True

    async def capture_publish(event: EventEnvelope) -> None:
        mesh.published_events.append(event)

    mesh.publish.side_effect = capture_publish
    return mesh


@pytest.fixture
def mock_state_manager(mock_pg: AsyncMock, mock_redis: AsyncMock) -> AsyncMock:
    """Mock StateManager with in-memory context store."""
    state = AsyncMock()
    _context: dict[str, dict[str, object]] = {}

    async def set_ctx(
        agent_id: str, tenant_id: str, key: str, value: object, ttl: int | None = None
    ) -> None:
        _context.setdefault(f"{agent_id}:{tenant_id}", {})[key] = value

    async def get_ctx(agent_id: str, tenant_id: str, key: str) -> object | None:
        return _context.get(f"{agent_id}:{tenant_id}", {}).get(key)

    async def del_ctx(agent_id: str, tenant_id: str, key: str) -> None:
        bucket = _context.get(f"{agent_id}:{tenant_id}", {})
        bucket.pop(key, None)

    state.set_context.side_effect = set_ctx
    state.get_context.side_effect = get_ctx
    state.delete_context.side_effect = del_ctx
    state.pool = mock_pg
    state.redis = mock_redis
    return state


@pytest.fixture
def mock_llm_client() -> AsyncMock:
    """Mock LLMClient that returns canned responses."""
    llm = AsyncMock()

    async def mock_call(
        model: str, system: str, messages: list[dict], max_tokens: int = 4096
    ) -> str:
        return '{"status": "ok", "message": "Mock response"}'

    async def mock_call_with_tools(
        model: str,
        system: str,
        messages: list[dict],
        tools: list,
        max_tokens: int = 4096,
    ) -> tuple[str, list[dict]]:
        return '{"status": "ok"}', []

    llm.call.side_effect = mock_call
    llm.call_with_tools.side_effect = mock_call_with_tools
    llm.token_usage = 0
    return llm


@pytest.fixture
def mock_audit_logger() -> MagicMock:
    """Mock AuditLogger that captures log entries."""
    audit = MagicMock()
    audit.entries: list[dict] = []

    def capture_log(
        tenant_id: str,
        agent_id: str,
        action: str,
        resource_type: str = "",
        resource_id: str = "",
        details: dict | None = None,
    ) -> None:
        audit.entries.append({
            "tenant_id": tenant_id,
            "agent_id": agent_id,
            "action": action,
            "resource_type": resource_type,
            "resource_id": resource_id,
            "details": details,
        })

    audit.log.side_effect = capture_log
    return audit


@pytest.fixture
def mock_approval_gate() -> AsyncMock:
    """Mock ApprovalGate that auto-approves all requests."""
    gate = AsyncMock()

    async def auto_approve(
        agent_id: str,
        tenant_id: str,
        action: str,
        risk_level: str,
        autonomy_level: AutonomyLevel,
    ) -> bool:
        if autonomy_level == AutonomyLevel.ADVISORY:
            from cortex.approval import AdvisoryOnlyError
            raise AdvisoryOnlyError(f"Agent {agent_id} is ADVISORY-only")
        return True

    gate.request_approval.side_effect = auto_approve
    return gate


@pytest.fixture
def make_agent_context(
    mock_config: CortexConfig,
    mock_event_mesh: AsyncMock,
    mock_state_manager: AsyncMock,
    mock_llm_client: AsyncMock,
    mock_audit_logger: MagicMock,
    mock_approval_gate: AsyncMock,
):
    """Factory fixture to create an AgentContext for testing."""
    from cortex.base_agent import AgentContext

    def _make(tenant_id: str = "test-tenant") -> AgentContext:
        return AgentContext(
            tenant_id=tenant_id,
            config=mock_config,
            event_mesh=mock_event_mesh,
            state_manager=mock_state_manager,
            llm_client=mock_llm_client,
            audit_logger=mock_audit_logger,
            approval_gate=mock_approval_gate,
        )

    return _make
