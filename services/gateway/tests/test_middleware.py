"""Tests for gateway.middleware — request logging, tenant isolation."""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from tests.conftest import create_test_token


class TestRequestLoggingMiddleware:
    """RequestLoggingMiddleware tests."""

    def test_request_id_in_response_header(self, client: TestClient) -> None:
        """Every response includes X-Request-ID header."""
        resp = client.get("/health")
        assert "x-request-id" in resp.headers

    def test_request_id_is_uuid(self, client: TestClient) -> None:
        """X-Request-ID is a valid UUID."""
        resp = client.get("/health")
        request_id = resp.headers["x-request-id"]
        assert len(request_id) == 36  # UUID format
        assert request_id.count("-") == 4

    def test_different_requests_get_different_ids(self, client: TestClient) -> None:
        """Each request gets a unique ID."""
        resp1 = client.get("/health")
        resp2 = client.get("/health")
        assert resp1.headers["x-request-id"] != resp2.headers["x-request-id"]


class TestTenantIsolationMiddleware:
    """TenantIsolationMiddleware tests."""

    def test_public_paths_skip_tenant_check(self, client: TestClient) -> None:
        """Public paths work without auth."""
        for path in ["/health", "/readyz", "/metrics"]:
            resp = client.get(path)
            assert resp.status_code == 200

    def test_auth_token_sets_tenant(self, client: TestClient, auth_headers: dict[str, str]) -> None:
        """Valid JWT sets tenant context on request."""
        resp = client.get("/api/v1/users/me", headers=auth_headers)
        assert resp.status_code == 200

    def test_missing_auth_on_protected_route(self, client: TestClient) -> None:
        """Protected routes without auth return error."""
        resp = client.get("/api/v1/deployments")
        assert resp.status_code in (401, 403)

    def test_expired_token_rejected(self, client: TestClient) -> None:
        """Expired JWT is rejected."""
        token = create_test_token(expired=True)
        resp = client.get("/api/v1/users/me", headers={"Authorization": f"Bearer {token}"})
        assert resp.status_code == 401
