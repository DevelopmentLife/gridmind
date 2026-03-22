"""Base ORM class and common mixins for all GridMind models."""

from __future__ import annotations

from datetime import datetime

from sqlalchemy import func
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class Base(DeclarativeBase):
    """Declarative base for all GridMind ORM models.

    All models inherit from this base which configures the SQLAlchemy 2.0
    metadata and type mapping defaults.
    """


class TimestampMixin:
    """Mixin that adds created_at and updated_at columns to a model.

    Both columns default to the current UTC timestamp. The updated_at column
    is automatically refreshed on every UPDATE via ``onupdate``.
    """

    created_at: Mapped[datetime] = mapped_column(
        default=func.now(),
        server_default=func.now(),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        default=func.now(),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )
