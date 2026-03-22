"""Tests for gateway.routes.agents — list, command, approvals."""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient


class TestAgents:
    """Agent endpoint tests."""

    def test_list_agents(self, client: TestClient, auth_headers: dict[str, str]) -> None:
        """List agents returns mock agent fleet."""
        resp = client.get("/api/v1/agents", headers=auth_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert "items" in data
        assert data["total_count"] >= 8  # Mock agents

    def test_get_agent_by_id(self, client: TestClient, auth_headers: dict[str, str]) -> None:
        """Get a specific agent by ID."""
        resp = client.get("/api/v1/agents/agent-argus", headers=auth_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert data["name"] == "argus"
        assert data["display_name"] == "ARGUS"

    def test_get_nonexistent_agent(self, client: TestClient, auth_headers: dict[str, str]) -> None:
        """Get a nonexistent agent returns 404."""
        resp = client.get("/api/v1/agents/agent-nonexistent", headers=auth_headers)
        assert resp.status_code == 404

    def test_send_command(self, client: TestClient, auth_headers: dict[str, str]) -> None:
        """Send command to agent returns accepted."""
        resp = client.post("/api/v1/agents/agent-argus/command", json={
            "command": "run_cycle",
            "parameters": {},
        }, headers=auth_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "accepted"

    def test_list_approvals_empty(self, client: TestClient, auth_headers: dict[str, str]) -> None:
        """List approvals returns empty when none exist."""
        resp = client.get("/api/v1/agents/approvals", headers=auth_headers)
        assert resp.status_code == 200
        assert resp.json()["total_count"] == 0

    def test_get_timeline(self, client: TestClient, auth_headers: dict[str, str]) -> None:
        """Get agent timeline returns paginated entries."""
        resp = client.get("/api/v1/agents/agent-sherlock/timeline", headers=auth_headers)
        assert resp.status_code == 200
        assert "items" in resp.json()

    def test_agents_no_auth(self, client: TestClient) -> None:
        """Agents endpoint without auth fails."""
        resp = client.get("/api/v1/agents")
        assert resp.status_code in (401, 403)

    def test_send_command_member_no_write(self, client: TestClient, member_headers: dict[str, str]) -> None:
        """Member without agents:write cannot send commands."""
        resp = client.post("/api/v1/agents/agent-argus/command", json={
            "command": "pause",
        }, headers=member_headers)
        assert resp.status_code == 403
