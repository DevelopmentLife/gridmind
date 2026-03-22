"""Tests for gateway.websocket — WebSocket connection, auth, broadcast."""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from gateway.websocket import ConnectionManager
from tests.conftest import TEST_ORG_ID, create_test_token


class TestConnectionManager:
    """ConnectionManager unit tests."""

    def test_initial_state(self) -> None:
        """New manager has no channels."""
        mgr = ConnectionManager()
        assert mgr.channel_count == 0

    def test_connection_count_empty(self) -> None:
        """Empty channel returns 0 connections."""
        mgr = ConnectionManager()
        assert mgr.connection_count("nonexistent") == 0


class TestWebSocketAuth:
    """WebSocket authentication tests."""

    def test_ws_agents_no_token_rejected(self, client: TestClient) -> None:
        """WebSocket without token is rejected."""
        with pytest.raises(Exception):
            with client.websocket_connect(f"/ws/{TEST_ORG_ID}/agents") as ws:
                ws.receive_json()

    def test_ws_agents_invalid_token_rejected(self, client: TestClient) -> None:
        """WebSocket with invalid token is rejected."""
        with pytest.raises(Exception):
            with client.websocket_connect(
                f"/ws/{TEST_ORG_ID}/agents?token=invalid"
            ) as ws:
                ws.receive_json()

    def test_ws_agents_wrong_tenant_rejected(self, client: TestClient) -> None:
        """WebSocket with mismatched tenant is rejected."""
        token = create_test_token(org_id="org-different")
        with pytest.raises(Exception):
            with client.websocket_connect(
                f"/ws/{TEST_ORG_ID}/agents?token={token}"
            ) as ws:
                ws.receive_json()

    def test_ws_agents_valid_token_accepted(self, client: TestClient) -> None:
        """WebSocket with valid token and matching tenant connects."""
        token = create_test_token()
        with client.websocket_connect(
            f"/ws/{TEST_ORG_ID}/agents?token={token}"
        ) as ws:
            # Connection established — send a message
            ws.send_json({"type": "ping"})
            # The server echoes nothing but keeps connection open

    def test_ws_metrics_valid_token(self, client: TestClient) -> None:
        """Metrics WebSocket connects with valid token."""
        token = create_test_token()
        with client.websocket_connect(
            f"/ws/{TEST_ORG_ID}/metrics?token={token}"
        ) as ws:
            ws.send_json({"type": "ping"})

    def test_ws_notifications_valid_token(self, client: TestClient) -> None:
        """Notifications WebSocket connects with valid token."""
        token = create_test_token()
        with client.websocket_connect(
            f"/ws/{TEST_ORG_ID}/notifications?token={token}"
        ) as ws:
            ws.send_json({"type": "ping"})

    def test_ws_approvals_valid_token(self, client: TestClient) -> None:
        """Approvals WebSocket connects with valid token."""
        token = create_test_token()
        with client.websocket_connect(
            f"/ws/{TEST_ORG_ID}/approvals?token={token}"
        ) as ws:
            ws.send_json({"type": "ping"})
