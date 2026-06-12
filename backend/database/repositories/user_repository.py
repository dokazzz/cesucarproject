"""UserRepository — all database operations on the users table."""
from __future__ import annotations

from sqlalchemy import select, func
from sqlalchemy.orm import Session

from database.models.user import User

# Maps API-level lowercase role names to PostgreSQL enum values (uppercase).
# Both "passenger" and "PASSENGER" are accepted and normalized to "PASSENGER".
_ROLE_NORMALIZE: dict[str, str] = {
    "passenger": "PASSENGER",
    "driver":    "DRIVER",
    "admin":     "ADMIN",
}


def _normalize_role(role: str) -> str:
    """Return the uppercase DB enum string for a role, regardless of input case."""
    return _ROLE_NORMALIZE.get(role.lower(), role.upper())


class UserRepository:
    """Encapsulates all data-access operations for Users."""

    def __init__(self, db: Session) -> None:
        self.db = db

    # ── Queries ────────────────────────────────────────────────────────────────

    def find_by_id(self, user_id) -> User | None:
        """Look up a user by UUID primary key (accepts str or uuid.UUID)."""
        return self.db.get(User, user_id)

    def find_by_rgm(self, rgm: str) -> User | None:
        return self.db.execute(
            select(User).where(User.rgm == rgm)
        ).scalar_one_or_none()

    def count(self) -> int:
        return self.db.execute(select(func.count()).select_from(User)).scalar_one()

    def count_by_role(self, role: str) -> int:
        normalized = _normalize_role(role)
        return self.db.execute(
            select(func.count()).select_from(User).where(User.role == normalized)
        ).scalar_one()

    def exists_by_rgm(self, rgm: str) -> bool:
        result = self.db.execute(
            select(func.count()).select_from(User).where(User.rgm == rgm)
        ).scalar_one()
        return result > 0

    # ── Mutations ─────────────────────────────────────────────────────────────

    def find_all(self, search: str | None = None, role: str | None = None) -> list[User]:
        from sqlalchemy import or_
        stmt = select(User).order_by(User.created_at)
        if role:
            stmt = stmt.where(User.role == _normalize_role(role))
        if search:
            q = f"%{search.lower()}%"
            stmt = stmt.where(
                or_(
                    func.lower(User.full_name).like(q),
                    User.rgm.like(q),
                    func.lower(func.coalesce(User.course, "")).like(q),
                )
            )
        return list(self.db.execute(stmt).scalars().all())

    def create(
        self,
        *,
        full_name: str,
        rgm: str,
        password_hash: str,
        role: str = "passenger",
        course: str | None = None,
        city: str | None = None,
        neighborhood: str | None = None,
        phone: str | None = None,
        vehicle_model: str | None = None,
        vehicle_brand: str | None = None,
        vehicle_color: str | None = None,
        vehicle_seats: int | None = None,
    ) -> User:
        user = User(
            full_name=full_name,
            rgm=rgm,
            password_hash=password_hash,
            role=_normalize_role(role),
            course=course,
            city=city,
            neighborhood=neighborhood,
            phone=phone,
            vehicle_model=vehicle_model,
            vehicle_brand=vehicle_brand,
            vehicle_color=vehicle_color,
            vehicle_seats=vehicle_seats,
        )
        self.db.add(user)
        self.db.flush()
        self.db.refresh(user)
        return user

    def update(self, user_id, **fields) -> User | None:
        user = self.find_by_id(user_id)
        if not user:
            return None
        allowed = {
            "full_name", "role", "course", "city", "neighborhood", "phone",
            "password_hash", "is_active",
            "vehicle_model", "vehicle_brand", "vehicle_color", "vehicle_seats",
        }
        for key, value in fields.items():
            if key in allowed:
                if key == "role":
                    value = _normalize_role(value)
                setattr(user, key, value)
        self.db.flush()
        self.db.refresh(user)
        return user

    def delete(self, user_id) -> bool:
        user = self.find_by_id(user_id)
        if not user:
            return False
        self.db.delete(user)
        self.db.flush()
        return True
