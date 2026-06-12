"""
AuditLog model — maps to the `audit_logs` table in Supabase.
Immutable records — no updated_at, no cascade deletes on user.
"""
from __future__ import annotations

import uuid
from datetime import datetime
from typing import TYPE_CHECKING, Any, Optional

from sqlalchemy import DateTime, ForeignKey, String, Text
from sqlalchemy import Enum as SAEnum
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from database.connection import Base
from database.models.enums import AuditAction

if TYPE_CHECKING:
    from database.models.user import User


class AuditLog(Base):
    __tablename__ = "audit_logs"

    # ── Primary key ──────────────────────────────────────────────────────────
    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )

    # ── Foreign key (nullable — retain log when user is deleted) ─────────────
    user_id: Mapped[Optional[uuid.UUID]] = mapped_column(
    UUID(as_uuid=True), ForeignKey("users.id"), nullable=True, index=True
    )

    # ── Action ────────────────────────────────────────────────────────────────
    action: Mapped[AuditAction] = mapped_column(
        SAEnum(AuditAction, name="audit_action", create_type=False),
        nullable=False,
        index=True,
    )

    # ── Context ───────────────────────────────────────────────────────────────
    entity_type: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    entity_id: Mapped[Optional[str]] = mapped_column(String(36), nullable=True)
    details: Mapped[Optional[dict[str, Any]]] = mapped_column(JSONB, nullable=True)
    ip_address: Mapped[Optional[str]] = mapped_column(String(45), nullable=True)
    user_agent: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # ── Timestamp ─────────────────────────────────────────────────────────────
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=datetime.utcnow
    )

    # ── Relationships ─────────────────────────────────────────────────────────
    user: Mapped[Optional["User"]] = relationship("User", back_populates="audit_logs")

    # ── Serialization ─────────────────────────────────────────────────────────

    def to_dict(self) -> dict:
        return {
            "id":           str(self.id),
            "user_id":      str(self.user_id) if self.user_id else None,
            "action":       self.action.value,
            "entity_type":  self.entity_type,
            "entity_id":    self.entity_id,
            "details":      self.details,
            "ip_address":   self.ip_address,
            "user_agent":   self.user_agent,
            "created_at":   self.created_at.isoformat() if self.created_at else None,
        }

    def __repr__(self) -> str:
        return (
            f"<AuditLog id={self.id} "
            f"action={self.action.value} "
            f"user={self.user_id}>"
        )
