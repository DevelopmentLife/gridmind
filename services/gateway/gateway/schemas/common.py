"""Shared schema types: error envelope, pagination, cursor params."""

from __future__ import annotations

from datetime import datetime
from typing import Any, Generic, TypeVar

from pydantic import BaseModel, Field

T = TypeVar("T")


class ErrorDetail(BaseModel):
    """A single field-level error detail."""

    field: str
    issue: str


class ErrorBody(BaseModel):
    """Standard error envelope body."""

    code: str
    message: str
    details: list[ErrorDetail] = []
    request_id: str
    timestamp: datetime


class ErrorResponse(BaseModel):
    """Standard GridMind error response envelope."""

    error: ErrorBody


class CursorParams(BaseModel):
    """Cursor-based pagination query parameters."""

    cursor: str | None = Field(default=None, description="Opaque cursor for next page")
    limit: int = Field(default=20, ge=1, le=100, description="Items per page")


class PaginatedResponse(BaseModel, Generic[T]):
    """Generic paginated response wrapper."""

    items: list[Any] = Field(default_factory=list)
    total_count: int = 0
    next_cursor: str | None = None
    has_more: bool = False
