"""Tests for gateway.routes.incidents — CRUD + analysis."""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient


class TestIncidents:
    """Incident endpoint tests."""

    def test_create_incident(self, client: TestClient, auth_headers: dict[str, str]) -> None:
        """Create an incident returns 201."""
        resp = client.post("/api/v1/incidents", json={
            "title": "High CPU usage on prod-db-1",
            "description": "CPU at 95% for 10 minutes",
            "severity": "high",
        }, headers=auth_headers)
        assert resp.status_code == 201
        data = resp.json()
        assert data["title"] == "High CPU usage on prod-db-1"
        assert data["status"] == "open"

    def test_list_incidents(self, client: TestClient, auth_headers: dict[str, str]) -> None:
        """List incidents returns paginated results."""
        client.post("/api/v1/incidents", json={
            "title": "List test incident",
            "severity": "low",
        }, headers=auth_headers)

        resp = client.get("/api/v1/incidents", headers=auth_headers)
        assert resp.status_code == 200
        assert resp.json()["total_count"] >= 1

    def test_get_incident(self, client: TestClient, auth_headers: dict[str, str]) -> None:
        """Get a specific incident by ID."""
        create_resp = client.post("/api/v1/incidents", json={
            "title": "Get test",
            "severity": "medium",
        }, headers=auth_headers)
        inc_id = create_resp.json()["id"]

        resp = client.get(f"/api/v1/incidents/{inc_id}", headers=auth_headers)
        assert resp.status_code == 200
        assert resp.json()["id"] == inc_id

    def test_update_incident(self, client: TestClient, auth_headers: dict[str, str]) -> None:
        """Update incident fields."""
        create_resp = client.post("/api/v1/incidents", json={
            "title": "Update test",
            "severity": "low",
        }, headers=auth_headers)
        inc_id = create_resp.json()["id"]

        resp = client.patch(f"/api/v1/incidents/{inc_id}", json={
            "severity": "high",
            "status": "investigating",
        }, headers=auth_headers)
        assert resp.status_code == 200
        assert resp.json()["severity"] == "high"
        assert resp.json()["status"] == "investigating"

    def test_resolve_incident(self, client: TestClient, auth_headers: dict[str, str]) -> None:
        """Resolve an incident."""
        create_resp = client.post("/api/v1/incidents", json={
            "title": "Resolve test",
            "severity": "medium",
        }, headers=auth_headers)
        inc_id = create_resp.json()["id"]

        resp = client.post(f"/api/v1/incidents/{inc_id}/resolve", headers=auth_headers)
        assert resp.status_code == 200
        assert resp.json()["status"] == "resolved"
        assert resp.json()["resolved_at"] is not None

    def test_get_timeline(self, client: TestClient, auth_headers: dict[str, str]) -> None:
        """Get incident timeline."""
        create_resp = client.post("/api/v1/incidents", json={
            "title": "Timeline test",
            "severity": "low",
        }, headers=auth_headers)
        inc_id = create_resp.json()["id"]

        resp = client.get(f"/api/v1/incidents/{inc_id}/timeline", headers=auth_headers)
        assert resp.status_code == 200
        assert len(resp.json()) >= 1  # At least the creation event

    def test_get_analysis(self, client: TestClient, auth_headers: dict[str, str]) -> None:
        """Get Sherlock analysis returns mock analysis."""
        create_resp = client.post("/api/v1/incidents", json={
            "title": "Analysis test",
            "severity": "high",
        }, headers=auth_headers)
        inc_id = create_resp.json()["id"]

        resp = client.get(f"/api/v1/incidents/{inc_id}/analysis", headers=auth_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "completed"
        assert len(data["root_cause"]) > 0
        assert len(data["recommended_actions"]) > 0

    def test_trigger_analysis(self, client: TestClient, auth_headers: dict[str, str]) -> None:
        """Trigger analysis returns 202."""
        create_resp = client.post("/api/v1/incidents", json={
            "title": "Trigger test",
            "severity": "critical",
        }, headers=auth_headers)
        inc_id = create_resp.json()["id"]

        resp = client.post(f"/api/v1/incidents/{inc_id}/analysis/trigger", headers=auth_headers)
        assert resp.status_code == 202
