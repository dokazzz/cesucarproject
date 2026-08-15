"""
RideRequest model — maps to the `ride_requests` table in Supabase.
"""
from __future__ import annotations

import uuid
from datetime import datetime
from typing import TYPE_CHECKING, Optional

from sqlalchemy import ForeignKey, DateTime, Text, UniqueConstraint
from sqlalchemy import ForeignKey, Enum as SAEnum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from database.connection import Base
from database.models.enums import RequestStatus

if TYPE_CHECKING:
    from database.models.ride_offer import RideOffer
    from database.models.user import User
    from database.models.notification import Notification


class RideRequest(Base):
    __tablename__ = "ride_requests"

    __table_args__ = (
        UniqueConstraint("ride_id", "passenger_id", name="uq_ride_requests_passenger"),
    )

    # ── Primary key ──────────────────────────────────────────────────────────
    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )

    # ── Foreign keys ──────────────────────────────────────────────────────────
    ride_id: Mapped[uuid.UUID] = mapped_column(
    UUID(as_uuid=True), ForeignKey("ride_offers.id"), nullable=False, index=True
    )
    passenger_id: Mapped[uuid.UUID] = mapped_column(
    UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True
    )

    # ── Request details ───────────────────────────────────────────────────────
    status: Mapped[RequestStatus] = mapped_column(
        SAEnum(RequestStatus, name="request_status", create_type=False),
        nullable=False,
        default=RequestStatus.PENDING,
    )
    message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # ── Timestamps ────────────────────────────────────────────────────────────
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=datetime.utcnow
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=datetime.utcnow
    )

    # ── Relationships ─────────────────────────────────────────────────────────
    ride: Mapped["RideOffer"] = relationship("RideOffer", back_populates="requests")
    passenger: Mapped["User"] = relationship("User", back_populates="ride_requests")
    notifications: Mapped[list["Notification"]] = relationship(
        "Notification",
        back_populates="related_request",
        foreign_keys="Notification.related_request_id",
    )

    # ── Serialization ─────────────────────────────────────────────────────────

    def to_dict(self, viewer: "User | None" = None) -> dict:
        # The nested ride is serialized for `viewer`, not unconditionally — a
        # PENDING request must not hand out the driver's phone via this route.
        d: dict = {
            "id":           str(self.id),
            "ride_id":      str(self.ride_id),
            "rideId":       str(self.ride_id),   # camelCase alias
            "passenger_id": str(self.passenger_id),
            "status":       self.status.value,
            "message":      self.message,
            "created_at":   self.created_at.isoformat() if self.created_at else None,
            "ride":         self.ride.to_dict(viewer) if self.ride else None,
        }
        # Include passenger info when relationship is loaded (driver view)
        try:
            p = object.__getattribute__(self, "passenger")
            if p is not None:
                d["passenger_name"]  = p.full_name
                d["passenger_phone"] = p.phone
                d["passenger_rgm"]   = p.rgm
        except AttributeError:
            pass
        return d

    def __repr__(self) -> str:
        return (
            f"<RideRequest id={self.id} "
            f"ride={self.ride_id} "
            f"passenger={self.passenger_id} "
            f"status={self.status.value}>"
        )
