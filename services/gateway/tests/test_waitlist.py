"""Tests for the waitlist signup endpoint (POST /api/v1/waitlist)."""

from __future__ import annotations

from typing import TYPE_CHECKING, Generator
from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient

from gateway.config import Settings
from gateway.main import create_app
from gateway.routes.waitlist import _rate_limits, _waitlist

if TYPE_CHECKING:
    from fastapi import FastAPI


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------


@pytest.fixture(autouse=True)
def _clear_waitlist_state() -> Generator[None, None, None]:
    """Reset in-memory waitlist and rate-limit state between tests."""
    _waitlist.clear()
    _rate_limits.clear()
    yield
    _waitlist.clear()
    _rate_limits.clear()


@pytest.fixture
def test_settings() -> Settings:
    """Create test-specific settings."""
    return Settings(
        database_url="postgresql://test:test@localhost:5432/test",
        redis_url="redis://localhost:6379/0",
        nats_url="nats://localhost:4222",
        jwt_secret_key="test-secret-key-for-testing-only",
        jwt_algorithm="HS256",
        environment="test",
        debug=True,
        stripe_secret_key=None,
        cors_origins=["http://localhost:3000"],
    )


@pytest.fixture
def app(test_settings: Settings) -> FastAPI:
    """Create a FastAPI app with test settings."""
    with patch("gateway.config.get_settings", return_value=test_settings):
        with patch("gateway.auth.get_settings", return_value=test_settings):
            return create_app()


@pytest.fixture
def client(app: FastAPI) -> Generator[TestClient, None, None]:
    """FastAPI test client."""
    with TestClient(app, raise_server_exceptions=False) as c:
        yield c


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------


class TestWaitlistSignup:
    """POST /api/v1/waitlist — happy path."""

    def test_signup_valid_email_returns_201(self, client: TestClient) -> None:
        """A valid email returns 201 with confirmation message and position."""
        resp = client.post("/api/v1/waitlist", json={"email": "alice@example.com"})

        assert resp.status_code == 201
        data = resp.json()
        assert data["message"] == "You're on the list!"
        assert data["position"] >= 1

    def test_signup_with_optional_fields(self, client: TestClient) -> None:
        """Source and referral_code are accepted and persisted."""
        resp = client.post(
            "/api/v1/waitlist",
            json={
                "email": "bob@example.com",
                "source": "twitter",
                "referral_code": "FRIEND123",
            },
        )

        assert resp.status_code == 201
        assert _waitlist["bob@example.com"]["source"] == "twitter"
        assert _waitlist["bob@example.com"]["referral_code"] == "FRIEND123"

    def test_signup_normalises_email_to_lowercase(self, client: TestClient) -> None:
        """Emails are stored in lower case."""
        resp = client.post("/api/v1/waitlist", json={"email": "Carol@Example.COM"})

        assert resp.status_code == 201
        assert "carol@example.com" in _waitlist


class TestWaitlistDuplicate:
    """POST /api/v1/waitlist — duplicate email handling (privacy)."""

    def test_signup_duplicate_still_returns_201(self, client: TestClient) -> None:
        """A duplicate email still returns 201 to prevent enumeration."""
        client.post("/api/v1/waitlist", json={"email": "dupe@example.com"})
        resp = client.post("/api/v1/waitlist", json={"email": "dupe@example.com"})

        assert resp.status_code == 201
        assert resp.json()["message"] == "You're on the list!"

    def test_signup_duplicate_does_not_increase_count(self, client: TestClient) -> None:
        """The internal store does not grow on duplicate submissions."""
        client.post("/api/v1/waitlist", json={"email": "dupe2@example.com"})
        first_size = len(_waitlist)
        client.post("/api/v1/waitlist", json={"email": "dupe2@example.com"})

        assert len(_waitlist) == first_size


class TestWaitlistValidation:
    """POST /api/v1/waitlist — input validation."""

    def test_signup_invalid_email_returns_422(self, client: TestClient) -> None:
        """A malformed email is rejected with 422."""
        resp = client.post("/api/v1/waitlist", json={"email": "not-an-email"})
        assert resp.status_code == 422

    def test_signup_missing_email_returns_422(self, client: TestClient) -> None:
        """Omitting the email field returns 422."""
        resp = client.post("/api/v1/waitlist", json={})
        assert resp.status_code == 422

    def test_signup_disposable_email_returns_422(self, client: TestClient) -> None:
        """Disposable email domains are rejected with a validation error."""
        resp = client.post("/api/v1/waitlist", json={"email": "test@mailinator.com"})

        assert resp.status_code == 422
        body = resp.json()
        assert body["error"]["code"] == "VALIDATION_ERROR"

    def test_signup_another_disposable_domain(self, client: TestClient) -> None:
        """Second disposable domain in the blocklist is also rejected."""
        resp = client.post("/api/v1/waitlist", json={"email": "test@yopmail.com"})
        assert resp.status_code == 422


class TestWaitlistRateLimit:
    """POST /api/v1/waitlist — per-IP rate limiting."""

    def test_signup_rate_limit_exceeded_returns_429(self, client: TestClient) -> None:
        """The 6th request within the window returns 429."""
        for i in range(5):
            resp = client.post(
                "/api/v1/waitlist",
                json={"email": f"rate{i}@example.com"},
            )
            assert resp.status_code == 201, f"Request {i + 1} should succeed"

        resp = client.post(
            "/api/v1/waitlist",
            json={"email": "rate5@example.com"},
        )

        assert resp.status_code == 429
        assert resp.json()["error"]["code"] == "RATE_LIMITED"
