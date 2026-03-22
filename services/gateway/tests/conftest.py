"""Shared test fixtures for the gateway test suite."""

from __future__ import annotations

from datetime import UTC, datetime, timedelta
from typing import Any, Generator
from unittest.mock import AsyncMock, MagicMock, patch
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient
from jose import jwt

from gateway.config import Settings
from gateway.main import create_app


# ---------------------------------------------------------------------------
# Test settings
# ---------------------------------------------------------------------------

TEST_JWT_SECRET = "test-secret-key-for-testing-only"
TEST_ORG_ID = "org-test-001"
TEST_USER_ID = "user-test-001"
TEST_ROLE = "owner"
TEST_PERMISSIONS = [
    "deployments:read", "deployments:write",
    "agents:read", "agents:write",
    "tenants:read", "tenants:write",
    "billing:read", "billing:write",
    "users:read", "users:write",
    "incidents:read", "incidents:write",
]


@pytest.fixture
def test_settings() -> Settings:
    """Create test-specific settings."""
    return Settings(
        database_url="postgresql://test:test@localhost:5432/test",
        redis_url="redis://localhost:6379/0",
        nats_url="nats://localhost:4222",
        jwt_secret_key=TEST_JWT_SECRET,
        jwt_algorithm="HS256",
        environment="test",
        debug=True,
        stripe_secret_key=None,
        cors_origins=["http://localhost:3000"],
    )


# ---------------------------------------------------------------------------
# Auth helpers
# ---------------------------------------------------------------------------

def create_test_token(
    user_id: str = TEST_USER_ID,
    org_id: str = TEST_ORG_ID,
    role: str = TEST_ROLE,
    permissions: list[str] | None = None,
    expired: bool = False,
) -> str:
    """Create a JWT for testing.

    Args:
        user_id: Subject claim.
        org_id: Organization ID.
        role: User role.
        permissions: Permission list.
        expired: If True, create an already-expired token.

    Returns:
        Encoded JWT string.
    """
    now = datetime.now(UTC)
    exp = now - timedelta(hours=1) if expired else now + timedelta(hours=1)
    payload = {
        "sub": user_id,
        "org_id": org_id,
        "role": role,
        "permissions": permissions or TEST_PERMISSIONS,
        "exp": exp,
        "iat": now,
        "jti": str(uuid4()),
    }
    return jwt.encode(payload, TEST_JWT_SECRET, algorithm="HS256")


@pytest.fixture
def auth_token() -> str:
    """Valid JWT for an owner user."""
    return create_test_token()


@pytest.fixture
def auth_headers(auth_token: str) -> dict[str, str]:
    """Authorization header dict."""
    return {"Authorization": f"Bearer {auth_token}"}


@pytest.fixture
def member_token() -> str:
    """Valid JWT for a member user (limited permissions)."""
    return create_test_token(
        user_id="user-member-001",
        role="member",
        permissions=["deployments:read", "agents:read"],
    )


@pytest.fixture
def member_headers(member_token: str) -> dict[str, str]:
    """Authorization header for member user."""
    return {"Authorization": f"Bearer {member_token}"}


# ---------------------------------------------------------------------------
# Application and client
# ---------------------------------------------------------------------------

@pytest.fixture
def app(test_settings: Settings) -> Any:
    """Create a FastAPI app with test settings."""
    with patch("gateway.config.get_settings", return_value=test_settings):
        with patch("gateway.auth.get_settings", return_value=test_settings):
            application = create_app()
            yield application


@pytest.fixture
def client(app: Any) -> Generator[TestClient, None, None]:
    """FastAPI test client."""
    with TestClient(app, raise_server_exceptions=False) as c:
        yield c


# ---------------------------------------------------------------------------
# Mock infrastructure
# ---------------------------------------------------------------------------

@pytest.fixture
def mock_db_pool() -> AsyncMock:
    """Mock asyncpg connection pool."""
    pool = AsyncMock()
    conn = AsyncMock()
    pool.acquire.return_value.__aenter__ = AsyncMock(return_value=conn)
    pool.acquire.return_value.__aexit__ = AsyncMock(return_value=False)
    conn.fetchval.return_value = 1
    conn.fetch.return_value = []
    conn.fetchrow.return_value = None
    conn.execute.return_value = "OK"
    return pool


@pytest.fixture
def mock_redis() -> AsyncMock:
    """Mock Redis client."""
    redis = AsyncMock()
    redis.ping.return_value = True
    redis.get.return_value = None
    redis.set.return_value = True
    redis.delete.return_value = 1
    return redis


@pytest.fixture
def mock_nats() -> AsyncMock:
    """Mock NATS client."""
    nc = AsyncMock()
    js = AsyncMock()
    nc.jetstream.return_value = js
    js.publish.return_value = AsyncMock()
    return nc
