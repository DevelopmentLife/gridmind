"""Tests for gateway.routes.users — CRUD + invite flow."""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient


class TestUsers:
    """User endpoint tests."""

    def test_get_current_user(self, client: TestClient, auth_headers: dict[str, str]) -> None:
        """GET /users/me returns current user profile."""
        resp = client.get("/api/v1/users/me", headers=auth_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert "id" in data
        assert "email" in data

    def test_list_users(self, client: TestClient, auth_headers: dict[str, str]) -> None:
        """List users returns paginated results."""
        resp = client.get("/api/v1/users", headers=auth_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert "items" in data

    def test_send_invitation(self, client: TestClient, auth_headers: dict[str, str]) -> None:
        """Send an invitation creates a pending invite."""
        resp = client.post("/api/v1/users/invite", json={
            "email": "invited@example.com",
            "role": "member",
        }, headers=auth_headers)
        assert resp.status_code == 201
        data = resp.json()
        assert data["status"] == "pending"
        assert data["email"] == "invited@example.com"

    def test_duplicate_invitation_rejected(self, client: TestClient, auth_headers: dict[str, str]) -> None:
        """Duplicate invitation for same email returns 409."""
        client.post("/api/v1/users/invite", json={
            "email": "dupe-invite@example.com",
            "role": "member",
        }, headers=auth_headers)
        resp = client.post("/api/v1/users/invite", json={
            "email": "dupe-invite@example.com",
            "role": "member",
        }, headers=auth_headers)
        assert resp.status_code == 409

    def test_accept_invitation(self, client: TestClient, auth_headers: dict[str, str]) -> None:
        """Accept invitation creates a user account."""
        # Send invite
        invite_resp = client.post("/api/v1/users/invite", json={
            "email": "accept@example.com",
            "role": "member",
        }, headers=auth_headers)
        # We need to get the token from the invitation store
        # In the mock, we can access the internal state
        from gateway.routes.users import _invitations
        invite_token = None
        for inv in _invitations.values():
            if inv["email"] == "accept@example.com":
                invite_token = inv["token"]
                break
        assert invite_token is not None

        resp = client.post("/api/v1/users/invite/accept", json={
            "token": invite_token,
            "full_name": "Accepted User",
            "password": "StrongPass1",
        })
        assert resp.status_code == 201
        data = resp.json()
        assert data["email"] == "accept@example.com"
        assert data["role"] == "member"

    def test_accept_invalid_invitation(self, client: TestClient) -> None:
        """Accept with invalid token returns 404."""
        resp = client.post("/api/v1/users/invite/accept", json={
            "token": "invalid-token",
            "full_name": "Nobody",
            "password": "StrongPass1",
        })
        assert resp.status_code == 404

    def test_users_no_auth(self, client: TestClient) -> None:
        """Users endpoint without auth fails."""
        resp = client.get("/api/v1/users")
        assert resp.status_code in (401, 403)
