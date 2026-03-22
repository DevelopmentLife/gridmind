"""AuditEntry ORM model — append-only audit log."""

from __future__ import annotations

from datetime import datetime

from sqlalchemy import ForeignKey, Index, String, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from shared.models.base import Base


class AuditEntry(Base):
    """Immutable audit log entry for compliance and forensic analysis.

    Append-only table with no updated_at column. Uses bigserial for
    high-throughput sequential writes. Partitioned by created_at in SQL.
    """

    __tablename__ = "audit_log"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    tenant_id: Mapped[str] = mapped_column(
        UUID(as_uuid=False),
        ForeignKey("tenants.tenant_id", ondelete="CASCADE"),
        nullable=False,
    )
    actor_id: Mapped[str | None] = mapped_column(UUID(as_uuid=False), nullable=True)
    actor_type: Mapped[str] = mapped_column(String(50), nullable=False)
    action: Mapped[str] = mapped_column(String(255), nullable=False)
    resource_type: Mapped[str] = mapped_column(String(100), nullable=False)
    resource_id: Mapped[str] = mapped_column(String(255), nullable=False)
    details: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    ip_address: Mapped[str | None] = mapped_column(String(45), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        default=func.now(),
        server_default=func.now(),
        nullable=False,
    )

    __table_args__ = (
        Index("ix_audit_log_tenant_id", "tenant_id"),
        Index("ix_audit_log_actor_id", "actor_id"),
        Index("ix_audit_log_action", "action"),
        Index("ix_audit_log_resource_type", "resource_type"),
        Index("ix_audit_log_created_at", "created_at"),
    )
