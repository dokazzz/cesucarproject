"""NotificationController — handles HTTP concerns for notification endpoints."""
from __future__ import annotations

from sqlalchemy.orm import Session

from services.notification_service import NotificationService


class NotificationController:
    """Bridges FastAPI routes and NotificationService."""

    def __init__(self, db: Session) -> None:
        self.service = NotificationService(db)

    def list_notifications(self, user_id: int) -> list[dict]:
        return self.service.get_notifications(user_id)

    def mark_all_read(self, user_id: int) -> dict:
        return self.service.mark_all_read(user_id)
