"""WebSocket connection manager and endpoints."""

from __future__ import annotations

from typing import Any

import structlog
from fastapi import APIRouter, Query, WebSocket, WebSocketDisconnect

from gateway.auth import verify_token
from gateway.errors import AuthenticationError

logger = structlog.get_logger()

router = APIRouter()


# ---------------------------------------------------------------------------
# Connection manager
# ---------------------------------------------------------------------------

class ConnectionManager:
    """Track WebSocket connections per channel, broadcast, send to specific clients."""

    def __init__(self) -> None:
        self._channels: dict[str, list[WebSocket]] = {}

    async def connect(self, channel: str, websocket: WebSocket) -> None:
        """Accept and register a WebSocket connection on a channel.

        Args:
            channel: Channel identifier (e.g. "agent:tenant-1:*").
            websocket: The WebSocket connection.
        """
        await websocket.accept()
        if channel not in self._channels:
            self._channels[channel] = []
        self._channels[channel].append(websocket)
        logger.info("ws_connected", channel=channel)

    def disconnect(self, channel: str, websocket: WebSocket) -> None:
        """Remove a WebSocket from a channel.

        Args:
            channel: Channel identifier.
            websocket: The WebSocket connection.
        """
        if channel in self._channels:
            self._channels[channel] = [
                ws for ws in self._channels[channel] if ws is not websocket
            ]
            if not self._channels[channel]:
                del self._channels[channel]
        logger.info("ws_disconnected", channel=channel)

    async def broadcast(self, channel: str, data: dict[str, Any]) -> None:
        """Send JSON data to all connections on a channel.

        Args:
            channel: Channel identifier.
            data: JSON-serializable payload.
        """
        dead: list[WebSocket] = []
        for ws in self._channels.get(channel, []):
            try:
                await ws.send_json(data)
            except Exception:
                dead.append(ws)
        for ws in dead:
            self.disconnect(channel, ws)

    async def send_to(self, channel: str, client_index: int, data: dict[str, Any]) -> None:
        """Send JSON data to a specific client on a channel.

        Args:
            channel: Channel identifier.
            client_index: Index of the client in the channel list.
            data: JSON-serializable payload.
        """
        connections = self._channels.get(channel, [])
        if 0 <= client_index < len(connections):
            await connections[client_index].send_json(data)

    @property
    def channel_count(self) -> int:
        """Number of active channels."""
        return len(self._channels)

    def connection_count(self, channel: str) -> int:
        """Number of connections on a channel."""
        return len(self._channels.get(channel, []))


# Singleton manager
manager = ConnectionManager()


# ---------------------------------------------------------------------------
# Auth helper
# ---------------------------------------------------------------------------

async def _authenticate_ws(
    websocket: WebSocket,
    token: str | None,
    tenant_id: str,
) -> bool:
    """Authenticate a WebSocket connection via JWT token.

    Args:
        websocket: The WebSocket connection.
        token: JWT token from query param or header.
        tenant_id: Expected tenant scope.

    Returns:
        True if authenticated, False otherwise.
    """
    if not token:
        # Check Authorization header
        auth_header = websocket.headers.get("authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header[7:]

    if not token:
        await websocket.close(code=4001, reason="Missing authentication")
        return False

    try:
        payload = verify_token(token)
        if payload.org_id != tenant_id:
            await websocket.close(code=4003, reason="Tenant mismatch")
            return False
        return True
    except AuthenticationError:
        await websocket.close(code=4001, reason="Invalid token")
        return False


# ---------------------------------------------------------------------------
# WebSocket endpoints
# ---------------------------------------------------------------------------

@router.websocket("/ws/{tenant_id}/agents")
async def ws_agents(
    websocket: WebSocket,
    tenant_id: str,
    token: str | None = Query(default=None),
) -> None:
    """Real-time agent heartbeats and status for a tenant."""
    if not await _authenticate_ws(websocket, token, tenant_id):
        return

    channel = f"agent:{tenant_id}:*"
    await manager.connect(channel, websocket)
    try:
        while True:
            data = await websocket.receive_json()
            logger.debug("ws_agents_received", tenant_id=tenant_id, data=data)
    except WebSocketDisconnect:
        manager.disconnect(channel, websocket)


@router.websocket("/ws/{tenant_id}/metrics")
async def ws_metrics(
    websocket: WebSocket,
    tenant_id: str,
    token: str | None = Query(default=None),
) -> None:
    """Aggregated metrics stream for a tenant."""
    if not await _authenticate_ws(websocket, token, tenant_id):
        return

    channel = f"metrics:{tenant_id}"
    await manager.connect(channel, websocket)
    try:
        while True:
            data = await websocket.receive_json()
            logger.debug("ws_metrics_received", tenant_id=tenant_id, data=data)
    except WebSocketDisconnect:
        manager.disconnect(channel, websocket)


@router.websocket("/ws/{tenant_id}/notifications")
async def ws_notifications(
    websocket: WebSocket,
    tenant_id: str,
    token: str | None = Query(default=None),
) -> None:
    """Alerts, incidents, and system messages for a tenant."""
    if not await _authenticate_ws(websocket, token, tenant_id):
        return

    channel = f"notifications:{tenant_id}"
    await manager.connect(channel, websocket)
    try:
        while True:
            data = await websocket.receive_json()
            logger.debug("ws_notifications_received", tenant_id=tenant_id, data=data)
    except WebSocketDisconnect:
        manager.disconnect(channel, websocket)


@router.websocket("/ws/{tenant_id}/approvals")
async def ws_approvals(
    websocket: WebSocket,
    tenant_id: str,
    token: str | None = Query(default=None),
) -> None:
    """HITL approval request push and inline decisions for a tenant."""
    if not await _authenticate_ws(websocket, token, tenant_id):
        return

    channel = f"approvals:{tenant_id}"
    await manager.connect(channel, websocket)
    try:
        while True:
            data = await websocket.receive_json()
            logger.debug("ws_approvals_received", tenant_id=tenant_id, data=data)
    except WebSocketDisconnect:
        manager.disconnect(channel, websocket)
