"""Add refresh_tokens for the access/refresh token flow.

Revision ID: 004
Revises: 003
Create Date: 2026-08-15

Access tokens are short-lived JWTs and are not stored -- they are verified by
signature and expiry alone. Refresh tokens are long-lived, so they have to be
revocable, and that requires server-side state.

Only a SHA-256 hash of each token is kept, so a dump of this table yields
nothing usable. `family_id` groups every token descended from one login: a
refresh rotates the token and its replacement stays in the family, so a
second use of an already-spent token means the value was captured and the
whole family is revoked.
"""
from __future__ import annotations

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "004"
down_revision = "003"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "refresh_tokens",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True,
                  server_default=sa.text("gen_random_uuid()")),
        sa.Column("user_id", postgresql.UUID(as_uuid=True),
                  sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("token_hash", sa.String(64), nullable=False),
        sa.Column("family_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("issued_at", sa.DateTime(timezone=True), nullable=False,
                  server_default=sa.text("now()")),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("used_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("revoked_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("user_agent", sa.String(255), nullable=True),
        sa.Column("client_ip", sa.String(64), nullable=True),
    )

    # Unique: the lookup on every refresh is by hash, and a collision would
    # mean two sessions sharing one credential.
    op.create_index("uq_refresh_tokens_hash", "refresh_tokens", ["token_hash"], unique=True)
    # Revoking a family and listing a user's sessions are the other two reads.
    op.create_index("ix_refresh_tokens_family", "refresh_tokens", ["family_id"])
    op.create_index("ix_refresh_tokens_user", "refresh_tokens", ["user_id"])
    # Supports the periodic purge of rows that can no longer authenticate.
    op.create_index("ix_refresh_tokens_expires", "refresh_tokens", ["expires_at"])


def downgrade() -> None:
    op.drop_index("ix_refresh_tokens_expires", table_name="refresh_tokens")
    op.drop_index("ix_refresh_tokens_user", table_name="refresh_tokens")
    op.drop_index("ix_refresh_tokens_family", table_name="refresh_tokens")
    op.drop_index("uq_refresh_tokens_hash", table_name="refresh_tokens")
    op.drop_table("refresh_tokens")
