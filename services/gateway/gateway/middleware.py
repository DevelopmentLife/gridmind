"""Request middleware: logging, tenant isolation, metrics."""

from __future__ import annotations

import time
import uuid

import structlog
from fastapi import Request, Response
from prometheus_client import Counter, Histogram
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint

from gateway.auth import verify_token
from gateway.errors import AuthenticationError

logger = structlog.get_logger()

# ---------------------------------------------------------------------------
# Prometheus metrics
# ---------------------------------------------------------------------------

REQUEST_COUNT = Counter(
    "gridmind_requests_total",
    "Total HTTP requests",
    ["method", "path", "status"],
)
REQUEST_DURATION = Histogram(
    "gridmind_request_duration_seconds",
    "Request latency in seconds",
    ["method", "path"],
    buckets=(0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0, 10.0),
)
ERROR_COUNT = Counter(
    "gridmind_errors_total",
    "Total HTTP errors (4xx/5xx)",
    ["method", "path", "status"],
)


# ---------------------------------------------------------------------------
# Public paths that skip auth / tenant checks
# ---------------------------------------------------------------------------

PUBLIC_PATHS: set[str] = {
    "/health",
    "/readyz",
    "/metrics",
    "/api/v1/auth/token",
    "/api/v1/auth/register",
    "/api/v1/billing/webhook",
}


def _is_public(path: str) -> bool:
    """Check if a path is public (no auth required)."""
    return path in PUBLIC_PATHS


# ---------------------------------------------------------------------------
# RequestLoggingMiddleware
# ---------------------------------------------------------------------------

class RequestLoggingMiddleware(BaseHTTPMiddleware):
    """Generate a request_id, log request/response, record Prometheus metrics."""

    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        """Process request with logging and metrics."""
        request_id = str(uuid.uuid4())
        request.state.request_id = request_id

        structlog.contextvars.clear_contextvars()
        structlog.contextvars.bind_contextvars(
            request_id=request_id,
            method=request.method,
            path=request.url.path,
        )

        start = time.perf_counter()
        logger.info("request_started")

        try:
            response = await call_next(request)
        except Exception:
            logger.exception("request_failed")
            raise

        duration = time.perf_counter() - start
        status = str(response.status_code)

        # Prometheus
        path_label = request.url.path
        REQUEST_COUNT.labels(request.method, path_label, status).inc()
        REQUEST_DURATION.labels(request.method, path_label).observe(duration)
        if response.status_code >= 400:
            ERROR_COUNT.labels(request.method, path_label, status).inc()

        response.headers["X-Request-ID"] = request_id

        logger.info(
            "request_completed",
            status=response.status_code,
            duration_ms=round(duration * 1000, 2),
        )
        return response


# ---------------------------------------------------------------------------
# TenantIsolationMiddleware
# ---------------------------------------------------------------------------

class TenantIsolationMiddleware(BaseHTTPMiddleware):
    """Extract tenant from JWT, set on request state for RLS enforcement.

    Skips public paths. Emits audit log for tenant access.
    """

    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        """Process request with tenant isolation."""
        if _is_public(request.url.path):
            return await call_next(request)

        # WebSocket paths are authenticated via query param in websocket.py
        if request.url.path.startswith("/ws/"):
            return await call_next(request)

        auth_header = request.headers.get("authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header[7:]
            try:
                payload = verify_token(token)
                request.state.org_id = payload.org_id
                request.state.user_id = payload.sub
                request.state.role = payload.role

                structlog.contextvars.bind_contextvars(
                    tenant_id=payload.org_id,
                    user_id=payload.sub,
                )

                logger.info("tenant_access", org_id=payload.org_id)
            except AuthenticationError:
                pass  # Let the route dependency handle missing auth

        return await call_next(request)
