"""
RideOffer model — maps to the `ride_offers` table in Supabase.
"""
from __future__ import annotations

import uuid
from datetime import datetime
from decimal import Decimal
from typing import TYPE_CHECKING, Optional

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, Numeric, SmallInteger, String, Text
from sqlalchemy import Enum as SAEnum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from database.connection import Base
from database.models.enums import RideStatus, TripType

# Module-level string constants so ride_service.py can import them without
# importing the enum directly (keeps the service layer enum-agnostic).
TRIP_GOING: str = TripType.GOING_TO_CESUCA.value   # "GOING_TO_CESUCA"
TRIP_RETURNING: str = TripType.RETURNING_HOME.value  # "RETURNING_HOME"

if TYPE_CHECKING:
    from database.models.user import User
    from database.models.ride_request import RideRequest
    from database.models.notification import Notification


class RideOffer(Base):
    __tablename__ = "ride_offers"

    __table_args__ = (
        CheckConstraint("available_seats >= 0",       name="chk_ride_offers_seats"),
        CheckConstraint("price_per_passenger >= 0",   name="chk_ride_offers_price"),
    )

    # ── Primary key ──────────────────────────────────────────────────────────
    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )

    # ── Foreign key ───────────────────────────────────────────────────────────
    driver_id: Mapped[uuid.UUID] = mapped_column(
    UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True
    )

    # ── Trip details ──────────────────────────────────────────────────────────
    trip_type: Mapped[TripType] = mapped_column(
        SAEnum(TripType, name="trip_type", create_type=False), nullable=False
    )
    departure_city: Mapped[str] = mapped_column(String(100), nullable=False)
    destination: Mapped[str] = mapped_column(String(100), nullable=False)
    departure_time: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )
    available_seats: Mapped[int] = mapped_column(SmallInteger, nullable=False)
    price_per_passenger: Mapped[Decimal] = mapped_column(
        Numeric(8, 2), nullable=False
    )

    # ── Vehicle info (optional) ───────────────────────────────────────────────
    vehicle: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    license_plate: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    neighborhood: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)

    # ── Status & timestamps ───────────────────────────────────────────────────
    status: Mapped[RideStatus] = mapped_column(
        SAEnum(RideStatus, name="ride_status", create_type=False),
        nullable=False,
        default=RideStatus.ACTIVE,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=datetime.utcnow
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=datetime.utcnow
    )

    # ── Relationships ─────────────────────────────────────────────────────────
    driver: Mapped["User"] = relationship("User", back_populates="ride_offers")
    requests: Mapped[list["RideRequest"]] = relationship(
        "RideRequest", back_populates="ride", cascade="all, delete-orphan"
    )
    notifications: Mapped[list["Notification"]] = relationship(
        "Notification",
        back_populates="related_ride",
        foreign_keys="Notification.related_ride_id",
    )

    # ── Computed properties ───────────────────────────────────────────────────

    @property
    def origem(self) -> str:
        """Portuguese alias — origin city."""
        return self.departure_city if self.trip_type == TripType.GOING_TO_CESUCA else "CESUCA"

    @property
    def destino(self) -> str:
        """Portuguese alias — destination city."""
        return "CESUCA" if self.trip_type == TripType.GOING_TO_CESUCA else self.departure_city

    @property
    def tipo(self) -> str:
        return "ida" if self.trip_type == TripType.GOING_TO_CESUCA else "volta"

    @property
    def confirmed_requests_count(self) -> int:
        return sum(1 for r in self.requests if r.status.value == "APPROVED")

    def seats_available(self) -> int:
        return max(0, self.available_seats - self.confirmed_requests_count)

    def is_full(self) -> bool:
        return self.seats_available() == 0

    # ── Serialization ─────────────────────────────────────────────────────────

    def to_dict(self) -> dict:
        driver = self.driver
        return {
            # English keys
            "id":                   str(self.id),
            "driver_id":            str(self.driver_id),
            "trip_type":            self.trip_type.value,
            "departure_city":       self.departure_city,
            "destination":          self.destination,
            "departure_time":       self.departure_time.isoformat() if self.departure_time else None,
            "available_seats":      self.available_seats,
            "price_per_passenger":  float(self.price_per_passenger),
            "vehicle":              self.vehicle,
            "license_plate":        self.license_plate,
            "status":               self.status.value,
            # Portuguese aliases (frontend backward-compat)
            "tipo":                 self.tipo,
            "origem":               self.origem,
            "destino":              self.destino,
            "data":                 self.departure_time.strftime("%d/%m/%Y") if self.departure_time else None,
            "horario":              self.departure_time.strftime("%H:%M") if self.departure_time else None,
            "vagas":                self.available_seats,
            "vagasDisp":            self.seats_available(),
            "vagas_disp":           self.seats_available(),
            "valor":                float(self.price_per_passenger),
            "veiculo":              self.vehicle,
            "placa":                self.license_plate,
            # Driver info
            "driver":               driver.full_name if driver else None,
            "driver_avatar":        driver.avatar if driver else "CE",
            "driverAvatar":         driver.avatar if driver else "CE",
            "course":               driver.course if driver else None,
            "curso":                driver.course if driver else None,
            "driver_phone":         driver.phone if driver else None,
            "driver_neighborhood":  driver.neighborhood if driver else None,
            "driver_vehicle_model": driver.vehicle_model if driver else None,
            "driver_vehicle_brand": driver.vehicle_brand if driver else None,
            "driver_vehicle_color": driver.vehicle_color if driver else None,
            "neighborhood":         self.neighborhood,
        }

    def __repr__(self) -> str:
        return (
            f"<RideOffer id={self.id} "
            f"driver={self.driver_id} "
            f"type={self.trip_type.value} "
            f"status={self.status.value}>"
        )
