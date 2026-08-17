"""NotificationController — handles HTTP concerns for notification endpoints."""
from __future__ import annotations

from sqlalchemy.orm import Session

from services.notification_service import NotificationService


class NotificationController:
    """Bridges FastAPI routes and NotificationService."""

    def __init__(self, db: Session) -> None:
        self.service = NotificationService(db)

    def list_notifications(self, user_id, limit: int = 50,
                           unread_only: bool = False) -> list[dict]:
        return self.service.get_notifications(user_id, limit, unread_only)

    def unread_count(self, user_id) -> dict:
        return {"unread": self.service.unread_count(user_id)}

    def mark_all_read(self, user_id) -> dict:
        return self.service.mark_all_read(user_id)
