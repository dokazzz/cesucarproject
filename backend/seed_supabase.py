"""
Seed script for Supabase — creates the sole administrator account.

Usage:
    cd backend
    python seed_supabase.py

Requirements:
  - ADMIN_PASSWORD must be set in .env (minimum 8 characters)
  - DATABASE_URL must point to your Supabase PostgreSQL instance
  - The schema must already exist (run the SQL editor script first, or run
    `alembic upgrade 002` if connecting via SQLAlchemy direct)

This script is idempotent: running it multiple times is safe.
It will not create a second admin if RGM 00000001 already exists.
"""
from __future__ import annotations

import os
import sys

from dotenv import load_dotenv
from passlib.context import CryptContext
from sqlalchemy import create_engine, text
from sqlalchemy.orm import Session

load_dotenv()

# ── Validation ────────────────────────────────────────────────────────────────

DATABASE_URL   = os.getenv("DATABASE_URL", "")
ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "")
ADMIN_RGM      = "00000001"
ADMIN_NAME     = os.getenv("ADMIN_NAME", "Administrador CESUCAR")

if not DATABASE_URL:
    print("ERROR: DATABASE_URL is not set in .env")
    sys.exit(1)

if not ADMIN_PASSWORD:
    print("ERROR: ADMIN_PASSWORD is not set in .env")
    sys.exit(1)

if len(ADMIN_PASSWORD) < 8:
    print("ERROR: ADMIN_PASSWORD must be at least 8 characters")
    sys.exit(1)

# ── Password hashing ──────────────────────────────────────────────────────────

pwd_ctx = CryptContext(schemes=["bcrypt"], deprecated="auto")

# ── Seed ──────────────────────────────────────────────────────────────────────

def seed() -> None:
    engine = create_engine(DATABASE_URL, echo=False)

    with Session(engine) as session:
        existing = session.execute(
            text("SELECT id FROM users WHERE rgm = :rgm"),
            {"rgm": ADMIN_RGM},
        ).fetchone()

        if existing:
            print(f"Admin account (RGM {ADMIN_RGM}) already exists — skipping creation.")
            return

        password_hash = pwd_ctx.hash(ADMIN_PASSWORD)

        session.execute(
            text("""
                INSERT INTO users (rgm, full_name, password_hash, role, is_active)
                VALUES (:rgm, :full_name, :password_hash, 'ADMIN', TRUE)
            """),
            {
                "rgm":           ADMIN_RGM,
                "full_name":     ADMIN_NAME,
                "password_hash": password_hash,
            },
        )
        session.commit()

        print("Admin account created successfully.")
        print(f"  RGM      : {ADMIN_RGM}")
        print(f"  Name     : {ADMIN_NAME}")
        print("  Password : (from ADMIN_PASSWORD env var)")
        print("  Role     : ADMIN")
        print()
        print("IMPORTANT: Keep ADMIN_PASSWORD secret and never commit it to version control.")


if __name__ == "__main__":
    seed()
