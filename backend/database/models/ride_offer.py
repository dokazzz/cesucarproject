"""
RideOffer model — maps to the `ride_offers` table in Supabase.
"""
from __future__ import annotations

import uuid
from datetime import datetime
from decimal import Decimal
from typing import TYPE_CHECKING

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, Numeric, SmallInteger, String, Text
from sqlalchemy import Enum as SAEnum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app_time import to_local
from database.connection import Base
from database.models.enums import RideStatus, TripType

# Module-level string constants so ride_service.py can import them without
# importing the enum directly (keeps the service layer enum-agnostic).
TRIP_GOING: str = TripType.GOING_TO_CESUCA.value   # "GOING_TO_CESUCA"
TRIP_RETURNING: str = TripType.RETURNING_HOME.value  # "RETURNING_HOME"

if TYPE_CHECKING:
    from database.models.notification import Notification
    from database.models.ride_request import RideRequest
    from database.models.user import User


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
    vehicle: Mapped[str | None] = mapped_column(String(100), nullable=True)
    license_plate: Mapped[str | None] = mapped_column(String(20), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    neighborhood: Mapped[str | None] = mapped_column(String(100), nullable=True)

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
    driver: Mapped[User] = relationship("User", back_populates="ride_offers")
    requests: Mapped[list[RideRequest]] = relationship(
        "RideRequest", back_populates="ride", cascade="all, delete-orphan"
    )
    notifications: Mapped[list[Notification]] = relationship(
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

    # ── Visibility ────────────────────────────────────────────────────────────

    # Serialization tiers, widest last. Each tier adds to the one before it.
    #   public  — anonymous browse: route, schedule, price, seats. No identity.
    #   auth    — signed-in student: who is driving and what car, to pick a ride.
    #   contact — driver, admin, or a passenger whose request was APPROVED:
    #             phone, plate, and the driver's home neighborhood.
    VIS_PUBLIC:  str = "public"
    VIS_AUTH:    str = "auth"
    VIS_CONTACT: str = "contact"

    def visibility_for(self, viewer: User | None) -> str:
        """Return the serialization tier this viewer has earned on this ride."""
        if viewer is None:
            return self.VIS_PUBLIC

        if str(viewer.id) == str(self.driver_id):
            return self.VIS_CONTACT

        role = getattr(viewer.role, "value", viewer.role)
        if str(role).upper() == "ADMIN":
            return self.VIS_CONTACT

        # `requests` is eager-loaded by RideRepository, so this costs no query.
        for req in self.requests:
            if str(req.passenger_id) == str(viewer.id) and req.status.value == "APPROVED":
                return self.VIS_CONTACT

        return self.VIS_AUTH

    # ── Serialization ─────────────────────────────────────────────────────────

    def to_dict(self, viewer: User | None = None) -> dict:
        """
        Serialize for a specific viewer.

        Driver contact details are withheld unless the viewer has a reason to
        have them. Passing no viewer yields the public tier — the safe default,
        so a caller that forgets to thread the viewer through under-shares
        rather than leaking.
        """
        tier = self.visibility_for(viewer)
        driver = self.driver
        # departure_time is a UTC instant; the "data"/"horario" strings are
        # what a student reads, so they are rendered in local time.
        local = to_local(self.departure_time)

        # ── Public: the trip itself, nothing that identifies who is driving ──
        data = {
            "id":                   str(self.id),
            "driver_id":            str(self.driver_id),
            "trip_type":            self.trip_type.value,
            "departure_city":       self.departure_city,
            "destination":          self.destination,
            "departure_time":       self.departure_time.isoformat() if self.departure_time else None,
            "available_seats":      self.available_seats,
            "price_per_passenger":  float(self.price_per_passenger),
            "status":               self.status.value,
            # Portuguese aliases (frontend backward-compat)
            "tipo":                 self.tipo,
            "origem":               self.origem,
            "destino":              self.destino,
            "data":                 local.strftime("%d/%m/%Y") if local else None,
            "horario":              local.strftime("%H:%M") if local else None,
            "vagas":                self.available_seats,
            "vagasDisp":            self.seats_available(),
            "vagas_disp":           self.seats_available(),
            "valor":                float(self.price_per_passenger),
        }
        if tier == self.VIS_PUBLIC:
            return data

        # ── Authenticated: who is driving, and enough of the car to find it ──
        data.update({
            "driver":               driver.full_name if driver else None,
            "driver_avatar":        driver.avatar if driver else "CE",
            "driverAvatar":         driver.avatar if driver else "CE",
            "course":               driver.course if driver else None,
            "curso":                driver.course if driver else None,
            "driver_vehicle_model": driver.vehicle_model if driver else None,
            "driver_vehicle_brand": driver.vehicle_brand if driver else None,
            "driver_vehicle_color": driver.vehicle_color if driver else None,
            "vehicle":              self.vehicle,
            "veiculo":              self.vehicle,
            "neighborhood":         self.neighborhood,   # pickup area for this ride
        })
        if tier == self.VIS_AUTH:
            return data

        # ── Contact: only once there is a relationship to justify it ─────────
        data.update({
            "license_plate":        self.license_plate,
            "placa":                self.license_plate,
            "driver_phone":         driver.phone if driver else None,
            "driver_neighborhood":  driver.neighborhood if driver else None,  # driver's home
        })
        return data

    def __repr__(self) -> str:
        return (
            f"<RideOffer id={self.id} "
            f"driver={self.driver_id} "
            f"type={self.trip_type.value} "
            f"status={self.status.value}>"
        )
