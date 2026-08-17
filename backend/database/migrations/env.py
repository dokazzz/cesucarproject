"""Alembic environment configuration."""
from __future__ import annotations

import os
import sys

# Make sure the backend/ directory is on the path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))

from logging.config import fileConfig

from alembic import context
from sqlalchemy import engine_from_config, pool

from config import config as app_config
from database.connection import Base

# Import all models so Alembic can detect them
from database.models import AuditLog, Notification, RideOffer, RideRequest, User  # noqa: F401

# Alembic Config object from alembic.ini
alembic_config = context.config

# Set the database URL from our app config (reads from .env)
alembic_config.set_main_option("sqlalchemy.url", app_config.DATABASE_URL)

# Set up Python logging from alembic.ini
if alembic_config.config_file_name is not None:
    fileConfig(alembic_config.config_file_name)

# Target metadata — tells Alembic about our schema
target_metadata = Base.metadata


def run_migrations_offline() -> None:
    """Run migrations without connecting to the database."""
    url = alembic_config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        compare_type=True,
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Run migrations with an active database connection."""
    connectable = engine_from_config(
        alembic_config.get_section(alembic_config.config_ini_section),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            compare_type=True,
        )
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
