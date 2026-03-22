"""Tests for gateway.routes.auth — 7 auth endpoints."""

from __future__ import annotations

from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient

from tests.conftest import TEST_JWT_SECRET, TEST_ORG_ID, TEST_USER_ID, create_test_token


class TestLogin:
    """POST /api/v1/auth/token tests."""

    def test_login_no_user_returns_401(self, client: TestClient) -> None:
        """Login with unregistered email fails."""
        resp = client.post("/api/v1/auth/token", json={
            "email": "nobody@example.com",
            "password": "SomePass123",
        })
        assert resp.status_code == 401

    def test_login_after_register_succeeds(self, client: TestClient) -> None:
        """Register then login returns tokens."""
        # Register
        reg_resp = client.post("/api/v1/auth/register", json={
            "email": "logintest@example.com",
            "password": "StrongPass1",
            "full_name": "Login Test",
            "organization_name": "Test Org",
        })
        assert reg_resp.status_code == 201

        # Login
        resp = client.post("/api/v1/auth/token", json={
            "email": "logintest@example.com",
            "password": "StrongPass1",
        })
        assert resp.status_code == 200
        data = resp.json()
        assert "access_token" in data
        assert "refresh_token" in data
        assert data["token_type"] == "bearer"

    def test_login_wrong_password_returns_401(self, client: TestClient) -> None:
        """Login with wrong password fails."""
        # Register first
        client.post("/api/v1/auth/register", json={
            "email": "wrongpw@example.com",
            "password": "StrongPass1",
            "full_name": "WrongPW Test",
            "organization_name": "Test Org",
        })
        resp = client.post("/api/v1/auth/token", json={
            "email": "wrongpw@example.com",
            "password": "WrongPassword1",
        })
        assert resp.status_code == 401

    def test_login_lockout_after_10_failures(self, client: TestClient) -> None:
        """Account locks after 10 consecutive failed attempts."""
        client.post("/api/v1/auth/register", json={
            "email": "lockout@example.com",
            "password": "StrongPass1",
            "full_name": "Lockout Test",
            "organization_name": "Test Org",
        })
        for _ in range(10):
            client.post("/api/v1/auth/token", json={
                "email": "lockout@example.com",
                "password": "Wrong1234",
            })
        resp = client.post("/api/v1/auth/token", json={
            "email": "lockout@example.com",
            "password": "StrongPass1",
        })
        assert resp.status_code == 429


class TestRegister:
    """POST /api/v1/auth/register tests."""

    def test_register_success(self, client: TestClient) -> None:
        """Valid registration creates account."""
        resp = client.post("/api/v1/auth/register", json={
            "email": "newuser@example.com",
            "password": "StrongPass1",
            "full_name": "New User",
            "organization_name": "New Org",
        })
        assert resp.status_code == 201
        data = resp.json()
        assert "user_id" in data
        assert "org_id" in data
        assert data["email"] == "newuser@example.com"

    def test_register_disposable_email_rejected(self, client: TestClient) -> None:
        """Disposable email domains are rejected."""
        resp = client.post("/api/v1/auth/register", json={
            "email": "test@mailinator.com",
            "password": "StrongPass1",
            "full_name": "Disposable Test",
            "organization_name": "Test Org",
        })
        assert resp.status_code == 422

    def test_register_weak_password_rejected(self, client: TestClient) -> None:
        """Weak passwords are rejected."""
        resp = client.post("/api/v1/auth/register", json={
            "email": "weakpw@example.com",
            "password": "short",
            "full_name": "Weak PW",
            "organization_name": "Test Org",
        })
        assert resp.status_code == 422

    def test_register_duplicate_email_rejected(self, client: TestClient) -> None:
        """Duplicate email registration returns 409."""
        client.post("/api/v1/auth/register", json={
            "email": "dupe@example.com",
            "password": "StrongPass1",
            "full_name": "Dupe User",
            "organization_name": "Test Org",
        })
        resp = client.post("/api/v1/auth/register", json={
            "email": "dupe@example.com",
            "password": "StrongPass1",
            "full_name": "Dupe User 2",
            "organization_name": "Test Org 2",
        })
        assert resp.status_code == 409


class TestRefreshToken:
    """POST /api/v1/auth/refresh tests."""

    def test_refresh_rotates_tokens(self, client: TestClient) -> None:
        """Valid refresh token produces new token pair."""
        # Register + login
        client.post("/api/v1/auth/register", json={
            "email": "refresh@example.com",
            "password": "StrongPass1",
            "full_name": "Refresh Test",
            "organization_name": "Test Org",
        })
        login_resp = client.post("/api/v1/auth/token", json={
            "email": "refresh@example.com",
            "password": "StrongPass1",
        })
        refresh_token = login_resp.json()["refresh_token"]

        resp = client.post("/api/v1/auth/refresh", json={
            "refresh_token": refresh_token,
        })
        assert resp.status_code == 200
        data = resp.json()
        assert "access_token" in data
        assert data["refresh_token"] != refresh_token  # Rotated

    def test_refresh_invalid_token_returns_401(self, client: TestClient) -> None:
        """Invalid refresh token returns 401."""
        resp = client.post("/api/v1/auth/refresh", json={
            "refresh_token": "invalid-token",
        })
        assert resp.status_code == 401


class TestLogout:
    """POST /api/v1/auth/logout tests."""

    def test_logout_revokes_session(self, client: TestClient) -> None:
        """Logout invalidates the refresh token."""
        client.post("/api/v1/auth/register", json={
            "email": "logout@example.com",
            "password": "StrongPass1",
            "full_name": "Logout Test",
            "organization_name": "Test Org",
        })
        login_resp = client.post("/api/v1/auth/token", json={
            "email": "logout@example.com",
            "password": "StrongPass1",
        })
        refresh_token = login_resp.json()["refresh_token"]

        resp = client.post("/api/v1/auth/logout", json={
            "refresh_token": refresh_token,
        })
        assert resp.status_code == 204

        # Refresh should now fail
        resp = client.post("/api/v1/auth/refresh", json={
            "refresh_token": refresh_token,
        })
        assert resp.status_code == 401


class TestApiKeys:
    """API key CRUD tests."""

    def test_create_api_key(self, client: TestClient, auth_headers: dict[str, str]) -> None:
        """Create API key returns full key once."""
        resp = client.post("/api/v1/auth/api-keys", json={
            "name": "test-key",
        }, headers=auth_headers)
        assert resp.status_code == 201
        data = resp.json()
        assert data["key"].startswith("gm_")
        assert data["name"] == "test-key"

    def test_list_api_keys_masked(self, client: TestClient, auth_headers: dict[str, str]) -> None:
        """List returns masked keys."""
        client.post("/api/v1/auth/api-keys", json={"name": "list-key"}, headers=auth_headers)
        resp = client.get("/api/v1/auth/api-keys", headers=auth_headers)
        assert resp.status_code == 200
        keys = resp.json()
        assert len(keys) >= 1
        assert keys[0]["key_preview"].startswith("...")

    def test_revoke_api_key(self, client: TestClient, auth_headers: dict[str, str]) -> None:
        """Revoke deletes the key."""
        create_resp = client.post("/api/v1/auth/api-keys", json={"name": "revoke-key"}, headers=auth_headers)
        key_id = create_resp.json()["id"]
        resp = client.delete(f"/api/v1/auth/api-keys/{key_id}", headers=auth_headers)
        assert resp.status_code == 204

    def test_create_api_key_no_auth_returns_401(self, client: TestClient) -> None:
        """API key creation without auth fails."""
        resp = client.post("/api/v1/auth/api-keys", json={"name": "fail"})
        assert resp.status_code in (401, 403)
