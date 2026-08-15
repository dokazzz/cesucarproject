"""RefreshTokenRepository — data access for the refresh_tokens table."""
from __future__ import annotations

import hashlib
import secrets
import uuid
from datetime import datetime, timedelta

from sqlalchemy import select, update
from sqlalchemy.orm import Session

from app_time import now_utc
from database.models.refresh_token import RefreshToken

# 256 bits of entropy, URL-safe. Not a JWT: there is nothing to read in it, and
# it is only ever compared against a stored hash.
_TOKEN_BYTES = 32


def generate_token() -> str:
    return secrets.token_urlsafe(_TOKEN_BYTES)


def hash_token(token: str) -> str:
    """
    SHA-256, not bcrypt.

    Deliberate: this input is 256 bits of server-generated randomness, not a
    human-chosen password, so there is no dictionary to attack and no work
    factor worth paying. bcrypt here would add latency to every refresh for
    no security gain -- and its 72-byte input limit is a trap besides.
    """
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


class RefreshTokenRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    # ── Queries ───────────────────────────────────────────────────────────────

    def find_by_token(self, token: str) -> RefreshToken | None:
        return self.db.execute(
            select(RefreshToken).where(RefreshToken.token_hash == hash_token(token))
        ).scalar_one_or_none()

    def find_active_for_user(self, user_id) -> list[RefreshToken]:
        now = now_utc()
        return list(
            self.db.execute(
                select(RefreshToken)
                .where(
                    RefreshToken.user_id == user_id,
                    RefreshToken.revoked_at.is_(None),
                    RefreshToken.used_at.is_(None),
                    RefreshToken.expires_at > now,
                )
                .order_by(RefreshToken.issued_at.desc())
            ).scalars().all()
        )

    # ── Mutations ─────────────────────────────────────────────────────────────

    def issue(
        self,
        *,
        user_id,
        ttl_days: int,
        family_id: uuid.UUID | None = None,
        user_agent: str | None = None,
        client_ip: str | None = None,
    ) -> tuple[str, RefreshToken]:
        """Mint a token. Returns (plaintext, row) — the plaintext is never stored."""
        token = generate_token()
        now = now_utc()
        row = RefreshToken(
            user_id=user_id,
            token_hash=hash_token(token),
            family_id=family_id or uuid.uuid4(),
            issued_at=now,
            expires_at=now + timedelta(days=ttl_days),
            user_agent=(user_agent or "")[:255] or None,
            client_ip=(client_ip or "")[:64] or None,
        )
        self.db.add(row)
        self.db.flush()
        return token, row

    def mark_used(self, row: RefreshToken, when: datetime | None = None) -> None:
        row.used_at = when or now_utc()
        self.db.flush()

    def revoke_family(self, family_id) -> int:
        """
        Revoke every unspent token in a family. Used both for logout and for
        reuse detection, where the whole session line is considered burned.
        """
        now = now_utc()
        result = self.db.execute(
            update(RefreshToken)
            .where(RefreshToken.family_id == family_id, RefreshToken.revoked_at.is_(None))
            .values(revoked_at=now)
        )
        self.db.flush()
        return result.rowcount or 0

    def revoke_all_for_user(self, user_id) -> int:
        now = now_utc()
        result = self.db.execute(
            update(RefreshToken)
            .where(RefreshToken.user_id == user_id, RefreshToken.revoked_at.is_(None))
            .values(revoked_at=now)
        )
        self.db.flush()
        return result.rowcount or 0

    def purge_expired(self, *, older_than_days: int = 0) -> int:
        """Housekeeping: drop rows that can no longer authenticate anything."""
        from sqlalchemy import delete
        cutoff = now_utc() - timedelta(days=older_than_days)
        result = self.db.execute(delete(RefreshToken).where(RefreshToken.expires_at < cutoff))
        self.db.flush()
        return result.rowcount or 0
