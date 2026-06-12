"""AuditLogRepository — all database operations on the audit_logs table."""
from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from database.models.audit_log import AuditLog


class AuditLogRepository:
    """Encapsulates all data-access operations for AuditLogs."""

    def __init__(self, db: Session) -> None:
        self.db = db

    # ── Queries ────────────────────────────────────────────────────────────────

    def find_recent(self, limit: int = 100) -> list[AuditLog]:
        return list(
            self.db.execute(
                select(AuditLog)
                .options(joinedload(AuditLog.user))
                .order_by(AuditLog.created_at.desc())   # fixed: was .timestamp
                .limit(limit)
            ).unique().scalars().all()
        )

    def find_by_user(self, user_id) -> list[AuditLog]:
        return list(
            self.db.execute(
                select(AuditLog)
                .where(AuditLog.user_id == user_id)
                .order_by(AuditLog.created_at.desc())   # fixed: was .timestamp
            ).scalars().all()
        )

    # ── Mutations ─────────────────────────────────────────────────────────────

    def log(
        self,
        action: str,
        user_id=None,
        details: dict | None = None,
        ip_address: str | None = None,
        user_agent: str | None = None,
    ) -> AuditLog:
        entry = AuditLog(
            user_id=user_id,
            action=action,
            details=details,
            ip_address=ip_address,
            user_agent=user_agent,
        )
        self.db.add(entry)
        self.db.flush()
        return entry
