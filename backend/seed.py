"""
Seed script — creates the administrator account and runs initial migrations.

Usage:
    python seed.py

Requirements:
  - ADMIN_PASSWORD must be set in .env (minimum 8 characters)
  - PostgreSQL must be running and DATABASE_URL must be configured

This script is safe to run multiple times — it is idempotent.
"""
from __future__ import annotations

import sys

from database.connection import SessionLocal, engine
from database.models import AuditLog, Notification, RideOffer, RideRequest, User  # noqa: F401


def create_tables() -> None:
    """Create all tables defined in the ORM models (idempotent)."""
    from database.connection import Base
    Base.metadata.create_all(bind=engine)
    print("[seed] Tables created / verified.")


def seed_admin() -> None:
    """Ensure the admin account exists."""
    from services.auth_service import AuthService

    db = SessionLocal()
    try:
        AuthService(db).ensure_admin_exists()
        print("[seed] Admin account ready.")
    except RuntimeError as exc:
        print(f"[seed] ERROR: {exc}", file=sys.stderr)
        sys.exit(1)
    finally:
        db.close()


if __name__ == "__main__":
    print("=== CESUCAR Seed ===")
    create_tables()
    seed_admin()
    print("=== Done ===")
