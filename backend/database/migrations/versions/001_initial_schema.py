"""Initial schema — users, ride_offers, ride_requests, notifications, audit_logs.

Revision ID: 001
Revises:
Create Date: 2026-06-10
"""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa

revision: str = "001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ── users ──────────────────────────────────────────────────────────────────
    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("full_name", sa.String(255), nullable=False),
        sa.Column("rgm", sa.String(8), nullable=False),
        sa.Column("password_hash", sa.String(255), nullable=False),
        sa.Column("role", sa.String(20), nullable=False, server_default="passenger"),
        sa.Column("course", sa.String(100), nullable=True),
        sa.Column("city", sa.String(100), nullable=True),
        sa.Column("phone", sa.String(20), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("NOW()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("NOW()"),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("rgm", name="uq_users_rgm"),
        sa.CheckConstraint(r"rgm ~ '^\d{8}$'", name="users_rgm_format"),
        sa.CheckConstraint(
            "role IN ('admin', 'passenger', 'driver')", name="users_role_valid"
        ),
    )
    op.create_index("ix_users_rgm", "users", ["rgm"], unique=True)

    # ── ride_offers ────────────────────────────────────────────────────────────
    op.create_table(
        "ride_offers",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("driver_id", sa.Integer(), nullable=False),
        sa.Column("trip_type", sa.String(20), nullable=False),
        sa.Column("departure_city", sa.String(100), nullable=False),
        sa.Column("destination", sa.String(100), nullable=False),
        sa.Column("departure_time", sa.DateTime(timezone=True), nullable=False),
        sa.Column("available_seats", sa.Integer(), nullable=False),
        sa.Column("price_per_passenger", sa.Numeric(10, 2), nullable=False),
        sa.Column("vehicle", sa.String(100), nullable=True),
        sa.Column("license_plate", sa.String(10), nullable=True),
        sa.Column("status", sa.String(20), nullable=False, server_default="active"),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("NOW()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["driver_id"], ["users.id"], name="fk_ride_offers_driver", ondelete="CASCADE"
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.CheckConstraint(
            "trip_type IN ('GOING_TO_CAMPUS', 'RETURNING_HOME')",
            name="ride_offers_trip_type_valid",
        ),
        sa.CheckConstraint(
            "status IN ('active', 'full', 'cancelled', 'completed')",
            name="ride_offers_status_valid",
        ),
        sa.CheckConstraint("available_seats >= 0", name="ride_offers_seats_positive"),
        sa.CheckConstraint(
            "price_per_passenger >= 0", name="ride_offers_price_positive"
        ),
    )
    op.create_index("ix_ride_offers_driver_id", "ride_offers", ["driver_id"])
    op.create_index("ix_ride_offers_departure_time", "ride_offers", ["departure_time"])

    # ── ride_requests ──────────────────────────────────────────────────────────
    op.create_table(
        "ride_requests",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("ride_id", sa.Integer(), nullable=False),
        sa.Column("passenger_id", sa.Integer(), nullable=False),
        sa.Column("status", sa.String(20), nullable=False, server_default="confirmed"),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("NOW()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["ride_id"],
            ["ride_offers.id"],
            name="fk_ride_requests_ride",
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["passenger_id"],
            ["users.id"],
            name="fk_ride_requests_passenger",
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("ride_id", "passenger_id", name="uq_ride_request"),
        sa.CheckConstraint(
            "status IN ('pending', 'confirmed', 'cancelled')",
            name="ride_requests_status_valid",
        ),
    )
    op.create_index("ix_ride_requests_ride_id", "ride_requests", ["ride_id"])
    op.create_index("ix_ride_requests_passenger_id", "ride_requests", ["passenger_id"])

    # ── notifications ──────────────────────────────────────────────────────────
    op.create_table(
        "notifications",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("title", sa.String(255), nullable=False),
        sa.Column("message", sa.Text(), nullable=False),
        sa.Column("read_status", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("NOW()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["users.id"],
            name="fk_notifications_user",
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_notifications_user_id", "notifications", ["user_id"])

    # ── audit_logs ─────────────────────────────────────────────────────────────
    op.create_table(
        "audit_logs",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=True),
        sa.Column("action", sa.String(255), nullable=False),
        sa.Column("details", sa.JSON(), nullable=True),
        sa.Column(
            "timestamp",
            sa.DateTime(timezone=True),
            server_default=sa.text("NOW()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["users.id"],
            name="fk_audit_logs_user",
            ondelete="SET NULL",
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_audit_logs_user_id", "audit_logs", ["user_id"])
    op.create_index("ix_audit_logs_action", "audit_logs", ["action"])
    op.create_index("ix_audit_logs_timestamp", "audit_logs", ["timestamp"])


def downgrade() -> None:
    op.drop_table("audit_logs")
    op.drop_table("notifications")
    op.drop_table("ride_requests")
    op.drop_table("ride_offers")
    op.drop_table("users")
