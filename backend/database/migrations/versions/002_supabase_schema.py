"""Supabase schema migration — UUIDs, enums, system_settings, updated constraints.

Revision ID: 002
Revises: 001
Create Date: 2026-06-10

This migration replaces the integer-PK schema with the full Supabase-compatible
schema using UUID primary keys, PostgreSQL enum types, JSONB columns, and
proper indexes + triggers.

Run AFTER 001 on a fresh Supabase database (001 should be a no-op since
Supabase SQL Editor already created the tables via supabase_schema.sql).
If starting fresh, use this migration as the sole migration by setting
down_revision = None and removing 001.
"""
from __future__ import annotations

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "002"
down_revision = "001"
branch_labels = None
depends_on = None


# ── Enum type definitions ──────────────────────────────────────────────────────

user_role      = postgresql.ENUM("ADMIN", "DRIVER", "PASSENGER",                     name="user_role",      create_type=False)
trip_type      = postgresql.ENUM("GOING_TO_CESUCA", "RETURNING_HOME",                 name="trip_type",      create_type=False)
ride_status    = postgresql.ENUM("ACTIVE", "FULL", "COMPLETED", "CANCELLED",          name="ride_status",    create_type=False)
request_status = postgresql.ENUM("PENDING", "APPROVED", "REJECTED", "CANCELLED",      name="request_status", create_type=False)
notif_type     = postgresql.ENUM(
    "INFO", "SUCCESS", "WARNING",
    "RIDE_REQUEST", "RIDE_APPROVED", "RIDE_REJECTED", "RIDE_CANCELLED", "SYSTEM",
    name="notification_type", create_type=False,
)
audit_action   = postgresql.ENUM(
    "USER_REGISTERED", "USER_LOGIN", "USER_LOGOUT", "USER_UPDATED",
    "USER_DEACTIVATED", "USER_DELETED", "PASSWORD_CHANGED",
    "RIDE_CREATED", "RIDE_UPDATED", "RIDE_CANCELLED", "RIDE_COMPLETED",
    "REQUEST_CREATED", "REQUEST_APPROVED", "REQUEST_REJECTED", "REQUEST_CANCELLED",
    "ADMIN_ACTION",
    name="audit_action", create_type=False,
)


def upgrade() -> None:
    conn = op.get_bind()

    # Create enum types if they don't exist (idempotent via DO block)
    conn.execute(sa.text("""
        DO $$
        BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
                CREATE TYPE user_role AS ENUM ('ADMIN', 'DRIVER', 'PASSENGER');
            END IF;
            IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'trip_type') THEN
                CREATE TYPE trip_type AS ENUM ('GOING_TO_CESUCA', 'RETURNING_HOME');
            END IF;
            IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ride_status') THEN
                CREATE TYPE ride_status AS ENUM ('ACTIVE', 'FULL', 'COMPLETED', 'CANCELLED');
            END IF;
            IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'request_status') THEN
                CREATE TYPE request_status AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED');
            END IF;
            IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'notification_type') THEN
                CREATE TYPE notification_type AS ENUM (
                    'INFO','SUCCESS','WARNING',
                    'RIDE_REQUEST','RIDE_APPROVED','RIDE_REJECTED','RIDE_CANCELLED','SYSTEM'
                );
            END IF;
            IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'audit_action') THEN
                CREATE TYPE audit_action AS ENUM (
                    'USER_REGISTERED','USER_LOGIN','USER_LOGOUT','USER_UPDATED',
                    'USER_DEACTIVATED','USER_DELETED','PASSWORD_CHANGED',
                    'RIDE_CREATED','RIDE_UPDATED','RIDE_CANCELLED','RIDE_COMPLETED',
                    'REQUEST_CREATED','REQUEST_APPROVED','REQUEST_REJECTED','REQUEST_CANCELLED',
                    'ADMIN_ACTION'
                );
            END IF;
        END$$;
    """))

    # updated_at trigger function
    conn.execute(sa.text("""
        CREATE OR REPLACE FUNCTION update_updated_at_column()
        RETURNS TRIGGER AS $$
        BEGIN
            NEW.updated_at = NOW();
            RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;
    """))

    # ── users ─────────────────────────────────────────────────────────────────
    conn.execute(sa.text("""
        CREATE TABLE IF NOT EXISTS users (
            id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            rgm             CHAR(8)     NOT NULL,
            full_name       VARCHAR(150) NOT NULL,
            password_hash   VARCHAR(255) NOT NULL,
            role            user_role   NOT NULL DEFAULT 'PASSENGER',
            course          VARCHAR(100),
            city            VARCHAR(100),
            phone           VARCHAR(20),
            is_active       BOOLEAN     NOT NULL DEFAULT TRUE,
            created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            CONSTRAINT uq_users_rgm        UNIQUE (rgm),
            CONSTRAINT chk_users_rgm_format CHECK (rgm ~ '^\\d{8}$')
        );
    """))

    # ── ride_offers ───────────────────────────────────────────────────────────
    conn.execute(sa.text("""
        CREATE TABLE IF NOT EXISTS ride_offers (
            id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            driver_id           UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            trip_type           trip_type   NOT NULL,
            departure_city      VARCHAR(100) NOT NULL,
            destination         VARCHAR(100) NOT NULL,
            departure_time      TIMESTAMPTZ NOT NULL,
            available_seats     SMALLINT    NOT NULL,
            price_per_passenger NUMERIC(8,2) NOT NULL DEFAULT 0.00,
            vehicle             VARCHAR(100),
            license_plate       VARCHAR(20),
            notes               TEXT,
            status              ride_status NOT NULL DEFAULT 'ACTIVE',
            created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            CONSTRAINT chk_ride_offers_seats CHECK (available_seats >= 0),
            CONSTRAINT chk_ride_offers_price CHECK (price_per_passenger >= 0)
        );
    """))

    # ── ride_requests ─────────────────────────────────────────────────────────
    conn.execute(sa.text("""
        CREATE TABLE IF NOT EXISTS ride_requests (
            id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            ride_id      UUID           NOT NULL REFERENCES ride_offers(id) ON DELETE CASCADE,
            passenger_id UUID           NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            status       request_status NOT NULL DEFAULT 'PENDING',
            message      TEXT,
            created_at   TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
            updated_at   TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
            CONSTRAINT uq_ride_requests_passenger UNIQUE (ride_id, passenger_id)
        );
    """))

    # ── notifications ─────────────────────────────────────────────────────────
    conn.execute(sa.text("""
        CREATE TABLE IF NOT EXISTS notifications (
            id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id            UUID              NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            related_ride_id    UUID              REFERENCES ride_offers(id) ON DELETE SET NULL,
            related_request_id UUID              REFERENCES ride_requests(id) ON DELETE SET NULL,
            title              VARCHAR(200)      NOT NULL,
            message            TEXT              NOT NULL,
            type               notification_type NOT NULL DEFAULT 'INFO',
            is_read            BOOLEAN           NOT NULL DEFAULT FALSE,
            created_at         TIMESTAMPTZ       NOT NULL DEFAULT NOW()
        );
    """))

    # ── audit_logs ────────────────────────────────────────────────────────────
    conn.execute(sa.text("""
        CREATE TABLE IF NOT EXISTS audit_logs (
            id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id     UUID         REFERENCES users(id) ON DELETE SET NULL,
            action      audit_action NOT NULL,
            entity_type VARCHAR(50),
            entity_id   VARCHAR(36),
            details     JSONB,
            ip_address  VARCHAR(45),
            user_agent  TEXT,
            created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
        );
    """))

    # ── system_settings ───────────────────────────────────────────────────────
    conn.execute(sa.text("""
        CREATE TABLE IF NOT EXISTS system_settings (
            id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            key         VARCHAR(100) NOT NULL,
            value       JSONB,
            description TEXT,
            created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
            updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
            CONSTRAINT uq_system_settings_key UNIQUE (key)
        );
    """))

    # ── Indexes ───────────────────────────────────────────────────────────────
    conn.execute(sa.text("""
        CREATE INDEX IF NOT EXISTS idx_users_rgm          ON users(rgm);
        CREATE INDEX IF NOT EXISTS idx_users_role         ON users(role);
        CREATE INDEX IF NOT EXISTS idx_ride_offers_driver ON ride_offers(driver_id);
        CREATE INDEX IF NOT EXISTS idx_ride_offers_status ON ride_offers(status);
        CREATE INDEX IF NOT EXISTS idx_ride_requests_ride      ON ride_requests(ride_id);
        CREATE INDEX IF NOT EXISTS idx_ride_requests_passenger ON ride_requests(passenger_id);
        CREATE INDEX IF NOT EXISTS idx_ride_requests_status    ON ride_requests(status);
        CREATE INDEX IF NOT EXISTS idx_notifications_user   ON notifications(user_id);
        CREATE INDEX IF NOT EXISTS idx_audit_logs_user   ON audit_logs(user_id);
        CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
        CREATE INDEX IF NOT EXISTS idx_system_settings_key ON system_settings(key);
    """))

    # ── Triggers ──────────────────────────────────────────────────────────────
    for table in ("users", "ride_offers", "ride_requests", "system_settings"):
        conn.execute(sa.text(f"""
            DROP TRIGGER IF EXISTS trg_{table}_updated_at ON {table};
            CREATE TRIGGER trg_{table}_updated_at
                BEFORE UPDATE ON {table}
                FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
        """))

    # ── Disable RLS (FastAPI enforces access control) ─────────────────────────
    for table in ("users", "ride_offers", "ride_requests", "notifications", "audit_logs", "system_settings"):
        conn.execute(sa.text(f"ALTER TABLE {table} DISABLE ROW LEVEL SECURITY;"))


def downgrade() -> None:
    conn = op.get_bind()

    for table in ("system_settings", "audit_logs", "notifications", "ride_requests", "ride_offers", "users"):
        conn.execute(sa.text(f"DROP TABLE IF EXISTS {table} CASCADE;"))

    for enum_name in ("audit_action", "notification_type", "request_status", "ride_status", "trip_type", "user_role"):
        conn.execute(sa.text(f"DROP TYPE IF EXISTS {enum_name};"))

    conn.execute(sa.text("DROP FUNCTION IF EXISTS update_updated_at_column CASCADE;"))
