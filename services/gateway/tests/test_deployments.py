"""Tests for gateway.routes.deployments — CRUD + tenant isolation."""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from tests.conftest import create_test_token


class TestDeploymentsCRUD:
    """Deployment endpoint tests."""

    def test_create_deployment(self, client: TestClient, auth_headers: dict[str, str]) -> None:
        """Create a deployment returns 201."""
        resp = client.post("/api/v1/deployments", json={
            "name": "test-db",
            "engine": "postgresql",
            "engine_version": "16",
            "region": "us-east-1",
            "instance_size": "db.t3.medium",
            "storage_gb": 100,
        }, headers=auth_headers)
        assert resp.status_code == 201
        data = resp.json()
        assert data["name"] == "test-db"
        assert data["status"] == "provisioning"

    def test_list_deployments(self, client: TestClient, auth_headers: dict[str, str]) -> None:
        """List deployments returns paginated results."""
        # Create one first
        client.post("/api/v1/deployments", json={
            "name": "list-test",
        }, headers=auth_headers)

        resp = client.get("/api/v1/deployments", headers=auth_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert "items" in data
        assert "total_count" in data

    def test_get_deployment(self, client: TestClient, auth_headers: dict[str, str]) -> None:
        """Get a specific deployment by ID."""
        create_resp = client.post("/api/v1/deployments", json={
            "name": "get-test",
        }, headers=auth_headers)
        dep_id = create_resp.json()["id"]

        resp = client.get(f"/api/v1/deployments/{dep_id}", headers=auth_headers)
        assert resp.status_code == 200
        assert resp.json()["id"] == dep_id

    def test_update_deployment(self, client: TestClient, auth_headers: dict[str, str]) -> None:
        """Patch a deployment updates fields."""
        create_resp = client.post("/api/v1/deployments", json={
            "name": "update-test",
        }, headers=auth_headers)
        dep_id = create_resp.json()["id"]

        resp = client.patch(f"/api/v1/deployments/{dep_id}", json={
            "name": "updated-name",
        }, headers=auth_headers)
        assert resp.status_code == 200
        assert resp.json()["name"] == "updated-name"

    def test_delete_deployment(self, client: TestClient, auth_headers: dict[str, str]) -> None:
        """Delete soft-deletes a deployment."""
        create_resp = client.post("/api/v1/deployments", json={
            "name": "delete-test",
        }, headers=auth_headers)
        dep_id = create_resp.json()["id"]

        resp = client.delete(f"/api/v1/deployments/{dep_id}", headers=auth_headers)
        assert resp.status_code == 204

    def test_deployment_health(self, client: TestClient, auth_headers: dict[str, str]) -> None:
        """Health endpoint returns deployment health."""
        create_resp = client.post("/api/v1/deployments", json={
            "name": "health-test",
        }, headers=auth_headers)
        dep_id = create_resp.json()["id"]

        resp = client.get(f"/api/v1/deployments/{dep_id}/health", headers=auth_headers)
        assert resp.status_code == 200
        assert "status" in resp.json()

    def test_deployment_metrics(self, client: TestClient, auth_headers: dict[str, str]) -> None:
        """Metrics endpoint returns resource metrics."""
        create_resp = client.post("/api/v1/deployments", json={
            "name": "metrics-test",
        }, headers=auth_headers)
        dep_id = create_resp.json()["id"]

        resp = client.get(f"/api/v1/deployments/{dep_id}/metrics", headers=auth_headers)
        assert resp.status_code == 200
        assert "cpu_percent" in resp.json()

    def test_deployment_restart(self, client: TestClient, auth_headers: dict[str, str]) -> None:
        """Restart endpoint returns 202 accepted."""
        create_resp = client.post("/api/v1/deployments", json={
            "name": "restart-test",
        }, headers=auth_headers)
        dep_id = create_resp.json()["id"]

        resp = client.post(f"/api/v1/deployments/{dep_id}/restart", headers=auth_headers)
        assert resp.status_code == 202


class TestDeploymentTenantIsolation:
    """Verify tenant isolation for deployments."""

    def test_cannot_access_other_tenant_deployment(self, client: TestClient, auth_headers: dict[str, str]) -> None:
        """Deployment from another tenant returns 404."""
        # Create as default tenant
        create_resp = client.post("/api/v1/deployments", json={
            "name": "isolated",
        }, headers=auth_headers)
        dep_id = create_resp.json()["id"]

        # Access as different tenant
        other_token = create_test_token(org_id="org-other-999")
        other_headers = {"Authorization": f"Bearer {other_token}"}
        resp = client.get(f"/api/v1/deployments/{dep_id}", headers=other_headers)
        assert resp.status_code == 404

    def test_no_auth_returns_error(self, client: TestClient) -> None:
        """Request without auth header fails."""
        resp = client.get("/api/v1/deployments")
        assert resp.status_code in (401, 403)
