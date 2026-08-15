"""Notification routes."""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from controllers.notification_controller import NotificationController
from database.connection import get_db
from database.models.user import User
from middleware.auth import get_current_user

router = APIRouter(prefix="/notifications", tags=["Notifications"])


@router.get("", summary="List notifications for the authenticated user")
def list_notifications(
    limit: int = Query(50, ge=1, le=200),
    unread_only: bool = Query(False),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list:
    return NotificationController(db).list_notifications(
        current_user.id, limit=limit, unread_only=unread_only
    )


@router.get("/unread-count", summary="Number of unread notifications")
def unread_count(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    """
    A single COUNT, for the badge.

    The badge used to be drawn by fetching up to fifty notifications and
    counting the unread ones in JavaScript: fifty rows and a full
    serialization on every page load to produce one integer, which also
    silently undercounts once someone has more than fifty.
    """
    return NotificationController(db).unread_count(current_user.id)


@router.put("/read-all", summary="Mark all notifications as read")
def mark_all_read(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    return NotificationController(db).mark_all_read(current_user.id)
