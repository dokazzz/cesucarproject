"""NotificationService — notification business logic."""
from __future__ import annotations

from sqlalchemy.orm import Session

from database.repositories.notification_repository import NotificationRepository


class NotificationService:
    """Manages user notifications."""

    def __init__(self, db: Session) -> None:
        self.db = db
        self._notifs = NotificationRepository(db)

    def get_notifications(
        self, user_id, limit: int = 50, unread_only: bool = False
    ) -> list[dict]:
        return [
            n.to_dict()
            for n in self._notifs.find_by_user(user_id, limit, unread_only=unread_only)
        ]

    def mark_all_read(self, user_id: int) -> dict:
        count = self._notifs.mark_all_read(user_id)
        self.db.commit()
        return {"updated": count}

    def create_notification(self, user_id: int, title: str, message: str) -> dict:
        notif = self._notifs.create(user_id, title, message)
        self.db.commit()
        return notif.to_dict()

    def unread_count(self, user_id: int) -> int:
        return self._notifs.count_unread(user_id)
