"""Notification routes."""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from controllers.notification_controller import NotificationController
from database.connection import get_db
from database.models.user import User
from middleware.auth import get_current_user

router = APIRouter(prefix="/api/notifications", tags=["Notifications"])


@router.get("", summary="List notifications for the authenticated user")
def list_notifications(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list:
    return NotificationController(db).list_notifications(current_user.id)


@router.put("/read-all", summary="Mark all notifications as read")
def mark_all_read(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    return NotificationController(db).mark_all_read(current_user.id)
