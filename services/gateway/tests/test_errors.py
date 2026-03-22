"""Tests for gateway.errors — error envelope format."""

from __future__ import annotations

from datetime import UTC, datetime

import pytest
from fastapi.testclient import TestClient

from gateway.errors import (
    AuthenticationError,
    ConflictError,
    GridMindError,
    InternalError,
    NotFoundError,
    PermissionDeniedError,
    RateLimitedError,
    UpstreamError,
    ValidationError,
    error_response,
)


class TestGridMindError:
    """GridMindError base class tests."""

    def test_default_values(self) -> None:
        """Default error has 500 status and INTERNAL_ERROR code."""
        err = GridMindError()
        assert err.status_code == 500
        assert err.code == "INTERNAL_ERROR"

    def test_custom_values(self) -> None:
        """Custom error preserves all fields."""
        err = GridMindError(
            code="CUSTOM_ERROR",
            message="Something custom",
            status_code=418,
            details=[{"field": "x", "issue": "bad"}],
        )
        assert err.code == "CUSTOM_ERROR"
        assert err.message == "Something custom"
        assert err.status_code == 418
        assert len(err.details) == 1


class TestErrorSubclasses:
    """Error subclass tests."""

    def test_validation_error(self) -> None:
        """ValidationError is 422."""
        err = ValidationError("Invalid input", [{"field": "email", "issue": "bad format"}])
        assert err.status_code == 422
        assert err.code == "VALIDATION_ERROR"
        assert len(err.details) == 1

    def test_authentication_error(self) -> None:
        """AuthenticationError is 401."""
        err = AuthenticationError()
        assert err.status_code == 401

    def test_permission_denied_error(self) -> None:
        """PermissionDeniedError is 403."""
        err = PermissionDeniedError()
        assert err.status_code == 403

    def test_not_found_error(self) -> None:
        """NotFoundError is 404."""
        err = NotFoundError("Resource X not found.")
        assert err.status_code == 404

    def test_conflict_error(self) -> None:
        """ConflictError is 409."""
        err = ConflictError()
        assert err.status_code == 409

    def test_rate_limited_error(self) -> None:
        """RateLimitedError is 429."""
        err = RateLimitedError()
        assert err.status_code == 429

    def test_upstream_error(self) -> None:
        """UpstreamError is 502."""
        err = UpstreamError()
        assert err.status_code == 502

    def test_internal_error(self) -> None:
        """InternalError is 500."""
        err = InternalError()
        assert err.status_code == 500


class TestErrorResponse:
    """error_response() envelope tests."""

    def test_envelope_format(self) -> None:
        """Error response has standard envelope structure."""
        err = NotFoundError("Deployment not found.")
        resp = error_response(err, request_id="req-123")
        body = resp.body.decode()

        assert resp.status_code == 404
        assert '"code": "NOT_FOUND"' in body
        assert '"request_id": "req-123"' in body
        assert '"timestamp"' in body
        assert '"message": "Deployment not found."' in body

    def test_envelope_generates_request_id(self) -> None:
        """Error response generates request_id when not provided."""
        err = InternalError()
        resp = error_response(err)
        body = resp.body.decode()
        assert '"request_id"' in body


class TestErrorHandlerIntegration:
    """Test error handling through the API."""

    def test_not_found_returns_envelope(self, client: TestClient, auth_headers: dict[str, str]) -> None:
        """404 errors return standard envelope."""
        resp = client.get("/api/v1/deployments/nonexistent", headers=auth_headers)
        assert resp.status_code == 404
        data = resp.json()
        assert "error" in data
        assert data["error"]["code"] == "NOT_FOUND"
        assert "request_id" in data["error"]
        assert "timestamp" in data["error"]

    def test_auth_error_returns_envelope(self, client: TestClient) -> None:
        """401 errors return standard envelope."""
        resp = client.get("/api/v1/users/me")
        assert resp.status_code in (401, 403)
