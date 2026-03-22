"""Standard error types and error envelope for the GridMind API."""

from __future__ import annotations

import uuid
from datetime import UTC, datetime
from typing import Any

from fastapi import Request
from fastapi.responses import JSONResponse


class GridMindError(Exception):
    """Base exception for all GridMind API errors.

    Args:
        code: Machine-readable UPPER_SNAKE_CASE error code.
        message: Human-readable description.
        status_code: HTTP status code.
        details: Optional list of field-level error details.
    """

    def __init__(
        self,
        code: str = "INTERNAL_ERROR",
        message: str = "An unexpected error occurred.",
        status_code: int = 500,
        details: list[dict[str, Any]] | None = None,
    ) -> None:
        super().__init__(message)
        self.code = code
        self.message = message
        self.status_code = status_code
        self.details = details or []


class ValidationError(GridMindError):
    """422 — Request validation failed."""

    def __init__(
        self,
        message: str = "Validation failed.",
        details: list[dict[str, Any]] | None = None,
    ) -> None:
        super().__init__("VALIDATION_ERROR", message, 422, details)


class AuthenticationError(GridMindError):
    """401 — Authentication required or invalid."""

    def __init__(self, message: str = "Authentication required.") -> None:
        super().__init__("AUTHENTICATION_ERROR", message, 401)


class PermissionDeniedError(GridMindError):
    """403 — Insufficient permissions."""

    def __init__(self, message: str = "Permission denied.") -> None:
        super().__init__("PERMISSION_DENIED", message, 403)


class NotFoundError(GridMindError):
    """404 — Resource not found."""

    def __init__(self, message: str = "Resource not found.") -> None:
        super().__init__("NOT_FOUND", message, 404)


class ConflictError(GridMindError):
    """409 — Resource conflict."""

    def __init__(self, message: str = "Resource conflict.") -> None:
        super().__init__("CONFLICT", message, 409)


class RateLimitedError(GridMindError):
    """429 — Rate limit exceeded."""

    def __init__(self, message: str = "Rate limit exceeded.") -> None:
        super().__init__("RATE_LIMITED", message, 429)


class UpstreamError(GridMindError):
    """502 — Upstream service error."""

    def __init__(self, message: str = "Upstream service error.") -> None:
        super().__init__("UPSTREAM_ERROR", message, 502)


class InternalError(GridMindError):
    """500 — Internal server error."""

    def __init__(self, message: str = "An unexpected error occurred.") -> None:
        super().__init__("INTERNAL_ERROR", message, 500)


def error_response(error: GridMindError, request_id: str | None = None) -> JSONResponse:
    """Build a standard GridMind error envelope JSONResponse.

    Args:
        error: The GridMindError instance.
        request_id: Optional request ID; generates one if not provided.

    Returns:
        A JSONResponse with the standard error envelope.
    """
    return JSONResponse(
        status_code=error.status_code,
        content={
            "error": {
                "code": error.code,
                "message": error.message,
                "details": error.details,
                "request_id": request_id or str(uuid.uuid4()),
                "timestamp": datetime.now(UTC).isoformat(),
            }
        },
    )


async def gridmind_error_handler(request: Request, exc: GridMindError) -> JSONResponse:
    """FastAPI exception handler for GridMindError."""
    request_id = getattr(request.state, "request_id", None)
    return error_response(exc, request_id=request_id)
