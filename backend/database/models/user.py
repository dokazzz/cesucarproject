"""
User model — maps to the `users` table in Supabase.

Columns: id (UUID PK), rgm (CHAR 8, unique), full_name, password_hash,
         role (enum), course, city, phone, is_active, created_at, updated_at.
"""
from __future__ import annotations

import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, CheckConstraint, DateTime, SmallInteger, String, UniqueConstraint
from sqlalchemy import Enum as SAEnum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from database.connection import Base
from database.models.enums import UserRole

if TYPE_CHECKING:
    from database.models.audit_log import AuditLog
    from database.models.notification import Notification
    from database.models.ride_offer import RideOffer
    from database.models.ride_request import RideRequest


class User(Base):
    __tablename__ = "users"

    __table_args__ = (
        UniqueConstraint("rgm", name="uq_users_rgm"),
        CheckConstraint(r"rgm ~ '^\d{8}$'", name="chk_users_rgm_format"),
    )

    # ── Primary key ──────────────────────────────────────────────────────────
    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )

    # ── Core fields ──────────────────────────────────────────────────────────
    rgm: Mapped[str] = mapped_column(String(8), nullable=False)
    full_name: Mapped[str] = mapped_column(String(150), nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[UserRole] = mapped_column(
        SAEnum(UserRole, name="user_role", create_type=False),
        nullable=False,
        default=UserRole.PASSENGER,
    )

    # ── Profile fields (optional) ─────────────────────────────────────────────
    course: Mapped[str | None] = mapped_column(String(100), nullable=True)
    city: Mapped[str | None] = mapped_column(String(100), nullable=True)
    neighborhood: Mapped[str | None] = mapped_column(String(100), nullable=True)
    phone: Mapped[str | None] = mapped_column(String(20), nullable=True)

    # ── Driver vehicle info (optional — only populated for DRIVER role) ───────
    vehicle_model: Mapped[str | None] = mapped_column(String(100), nullable=True)
    vehicle_brand: Mapped[str | None] = mapped_column(String(100), nullable=True)
    vehicle_color: Mapped[str | None] = mapped_column(String(50), nullable=True)
    vehicle_seats: Mapped[int | None] = mapped_column(SmallInteger, nullable=True)
    vehicle_plate: Mapped[str | None] = mapped_column(String(10), nullable=True)

    # ── Status & timestamps ───────────────────────────────────────────────────
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=datetime.utcnow
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=datetime.utcnow
    )

    # ── Relationships ─────────────────────────────────────────────────────────
    ride_offers: Mapped[list[RideOffer]] = relationship(
        "RideOffer", back_populates="driver", cascade="all, delete-orphan"
    )
    ride_requests: Mapped[list[RideRequest]] = relationship(
        "RideRequest", back_populates="passenger", cascade="all, delete-orphan"
    )
    notifications: Mapped[list[Notification]] = relationship(
        "Notification", back_populates="user", cascade="all, delete-orphan"
    )
    audit_logs: Mapped[list[AuditLog]] = relationship(
        "AuditLog", back_populates="user"
    )

    # ── Computed properties ───────────────────────────────────────────────────

    @property
    def display_name(self) -> str:
        return self.full_name.split()[0] if self.full_name else "Usuário"

    @property
    def avatar(self) -> str:
        parts = self.full_name.upper().split()
        if len(parts) >= 2:
            return parts[0][0] + parts[-1][0]
        return parts[0][:2] if parts else "CE"

    @property
    def role_label(self) -> str:
        labels = {
            UserRole.ADMIN:     "Admin",
            UserRole.DRIVER:    "Motorista",
            UserRole.PASSENGER: "Passageiro",
        }
        return labels.get(self.role, self.role.value)

    def is_admin(self) -> bool:
        return self.role == UserRole.ADMIN

    def is_driver(self) -> bool:
        return self.role == UserRole.DRIVER

    def is_passenger(self) -> bool:
        return self.role == UserRole.PASSENGER

    # ── Serialization ─────────────────────────────────────────────────────────

    def to_dict(self) -> dict:
        return {
            "id":             str(self.id),
            "rgm":            self.rgm,
            "full_name":      self.full_name,
            "name":           self.full_name,
            "role":           self.role.value,
            "perfil":         self.role_label,
            "avatar":         self.avatar,
            "course":         self.course,
            "city":           self.city,
            "neighborhood":   self.neighborhood,
            "phone":          self.phone,
            "is_active":      self.is_active,
            "vehicle_model":  self.vehicle_model,
            "vehicle_brand":  self.vehicle_brand,
            "vehicle_color":  self.vehicle_color,
            "vehicle_seats":  self.vehicle_seats,
            "vehicle_plate":  self.vehicle_plate,
            "created_at":     self.created_at.isoformat() if self.created_at else None,
        }

    def __repr__(self) -> str:
        return f"<User id={self.id} rgm={self.rgm} role={self.role.value}>"
