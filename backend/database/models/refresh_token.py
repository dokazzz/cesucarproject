"""
RefreshToken model — server-side half of the access/refresh token pair.

Access tokens are short-lived JWTs and are not stored: they are verified by
signature and expiry alone. Refresh tokens are the opposite -- long-lived, so
they must be revocable, which means the server has to know about them.

Only a SHA-256 hash of the token is stored. A database leak therefore exposes
no usable credential, the same reason passwords are hashed. The token itself
is opaque random bytes rather than a JWT: there is nothing to read in it, and
it is only ever compared against this table.

Reuse detection works through `family_id`. Every refresh rotates the token and
the replacement stays in the same family. A correctly behaving client uses
each token exactly once, so a second use of an already-spent token means the
value was captured by someone else -- and since the server cannot tell which
of the two parties is the thief, the whole family is revoked and both are
forced to log in again.
"""
from __future__ import annotations

import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from database.connection import Base

if TYPE_CHECKING:
    from database.models.user import User


class RefreshToken(Base):
    __tablename__ = "refresh_tokens"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False, index=True,
    )

    # SHA-256 hex of the opaque token. Unique so a lookup is a single index hit.
    token_hash: Mapped[str] = mapped_column(String(64), nullable=False, unique=True, index=True)

    # All tokens descended from one login share a family. Revoking the family
    # ends that session everywhere.
    family_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False, index=True)

    issued_at:  Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    # Set when this token is exchanged. A second exchange is the reuse signal.
    used_at:    Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    # Shown in the session list so a user can recognise their own devices.
    user_agent: Mapped[str | None] = mapped_column(String(255), nullable=True)
    client_ip:  Mapped[str | None] = mapped_column(String(64), nullable=True)

    user: Mapped[User] = relationship("User")

    # ── State ─────────────────────────────────────────────────────────────────

    def is_active(self, now: datetime) -> bool:
        return self.revoked_at is None and self.used_at is None and self.expires_at > now

    def to_dict(self) -> dict:
        """Session metadata. Never includes the hash."""
        return {
            "id":         str(self.id),
            "issued_at":  self.issued_at.isoformat() if self.issued_at else None,
            "expires_at": self.expires_at.isoformat() if self.expires_at else None,
            "user_agent": self.user_agent,
            "client_ip":  self.client_ip,
            "current":    False,   # set by the caller for the requesting session
            "revoked":    self.revoked_at is not None,
        }

    def __repr__(self) -> str:
        return (
            f"<RefreshToken user={self.user_id} family={self.family_id} "
            f"used={self.used_at is not None} revoked={self.revoked_at is not None}>"
        )
