"""
Notification model — maps to the `notifications` table in Supabase.
"""
from __future__ import annotations

import uuid
from datetime import UTC, datetime
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, DateTime, ForeignKey, String, Text
from sqlalchemy import Enum as SAEnum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from database.connection import Base
from database.models.enums import NotificationType

if TYPE_CHECKING:
    from database.models.ride_offer import RideOffer
    from database.models.ride_request import RideRequest
    from database.models.user import User


class Notification(Base):
    __tablename__ = "notifications"

    # ── Primary key ──────────────────────────────────────────────────────────
    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )

    # ── Foreign keys ──────────────────────────────────────────────────────────
    user_id: Mapped[uuid.UUID] = mapped_column(
    UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True
    )
    related_ride_id: Mapped[uuid.UUID | None] = mapped_column(
    UUID(as_uuid=True), ForeignKey("ride_offers.id"), nullable=True
    )
    related_request_id: Mapped[uuid.UUID | None] = mapped_column(
    UUID(as_uuid=True), ForeignKey("ride_requests.id"), nullable=True
    )
    # ── Content ───────────────────────────────────────────────────────────────
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    type: Mapped[NotificationType] = mapped_column(
        SAEnum(NotificationType, name="notification_type", create_type=False),
        nullable=False,
        default=NotificationType.INFO,
    )

    # ── Read status ───────────────────────────────────────────────────────────
    is_read: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    # ── Timestamp ─────────────────────────────────────────────────────────────
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=datetime.utcnow
    )

    # ── Relationships ─────────────────────────────────────────────────────────
    user: Mapped[User] = relationship("User", back_populates="notifications")
    related_ride: Mapped[RideOffer | None] = relationship(
        "RideOffer",
        back_populates="notifications",
        foreign_keys=[related_ride_id],
    )
    related_request: Mapped[RideRequest | None] = relationship(
        "RideRequest",
        back_populates="notifications",
        foreign_keys=[related_request_id],
    )

    # ── Computed properties ───────────────────────────────────────────────────

    @property
    def relative_time(self) -> str:
        if not self.created_at:
            return ""
        now = datetime.now(UTC)
        created = self.created_at.replace(tzinfo=UTC) if self.created_at.tzinfo is None else self.created_at
        diff = now - created
        seconds = int(diff.total_seconds())
        if seconds < 60:
            return "agora"
        if seconds < 3600:
            return f"há {seconds // 60} min"
        if seconds < 86400:
            return f"há {seconds // 3600}h"
        return f"há {seconds // 86400}d"

    # ── Serialization ─────────────────────────────────────────────────────────

    def to_dict(self) -> dict:
        return {
            "id":                   str(self.id),
            "user_id":              str(self.user_id),
            "title":                self.title,
            "message":              self.message,
            "text":                 self.message,   # backward-compat alias
            "type":                 self.type.value,
            "is_read":              self.is_read,
            "read_status":          self.is_read,   # backward-compat alias
            "read":                 self.is_read,   # backward-compat alias
            "related_ride_id":      str(self.related_ride_id) if self.related_ride_id else None,
            "related_request_id":   str(self.related_request_id) if self.related_request_id else None,
            "created_at":           self.created_at.isoformat() if self.created_at else None,
            "time":                 self.relative_time,
        }

    def __repr__(self) -> str:
        return f"<Notification id={self.id} user={self.user_id} read={self.is_read}>"
