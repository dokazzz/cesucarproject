"""NotificationRepository — all database operations on the notifications table."""
from __future__ import annotations

from sqlalchemy import select, update
from sqlalchemy.orm import Session

from database.models.notification import Notification


class NotificationRepository:
    """Encapsulates all data-access operations for Notifications."""

    def __init__(self, db: Session) -> None:
        self.db = db

    # ── Queries ────────────────────────────────────────────────────────────────

    def find_by_user(self, user_id, limit: int = 50) -> list[Notification]:
        return list(
            self.db.execute(
                select(Notification)
                .where(Notification.user_id == user_id)
                .order_by(Notification.created_at.desc())
                .limit(limit)
            ).scalars().all()
        )

    def count_unread(self, user_id) -> int:
        from sqlalchemy import func

        return self.db.execute(
            select(func.count())
            .select_from(Notification)
            .where(
                Notification.user_id == user_id,
                Notification.is_read == False,  # noqa: E712
            )
        ).scalar_one()

    # ── Mutations ─────────────────────────────────────────────────────────────

    def create(self, user_id, title: str, message: str) -> Notification:
        notif = Notification(user_id=user_id, title=title, message=message)
        self.db.add(notif)
        self.db.flush()
        self.db.refresh(notif)
        return notif

    def mark_all_read(self, user_id) -> int:
        result = self.db.execute(
            update(Notification)
            .where(
                Notification.user_id == user_id,
                Notification.is_read == False,  # noqa: E712
            )
            .values(is_read=True)
        )
        self.db.flush()
        return result.rowcount

    def mark_one_read(self, notification_id) -> Notification | None:
        notif = self.db.get(Notification, notification_id)
        if notif:
            notif.is_read = True
            self.db.flush()
        return notif
