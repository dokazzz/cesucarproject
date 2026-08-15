"""Admin routes — protected by admin role."""
from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, Body, Depends, Query
from sqlalchemy.orm import Session

from controllers.admin_controller import AdminController
from database.connection import get_db
from database.models.user import User
from middleware.auth import require_role

router = APIRouter(prefix="/admin", tags=["Admin"])

_admin_only = require_role("admin")


@router.get("/users", summary="List all users")
def list_users(
    search: Optional[str] = Query(None),
    role: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    _: User = Depends(_admin_only),
) -> list:
    return AdminController(db).list_users(search=search, role=role)


@router.get("/users/{user_id}", summary="Get user detail")
def get_user(
    user_id: str,
    db: Session = Depends(get_db),
    _: User = Depends(_admin_only),
) -> dict:
    return AdminController(db).get_user(user_id)


@router.get("/stats", summary="Platform statistics")
def get_stats(
    db: Session = Depends(get_db),
    _: User = Depends(_admin_only),
) -> dict:
    return AdminController(db).get_stats()


@router.get("/recent-activity", summary="Recent audit logs and new users")
def recent_activity(
    limit: int = Query(15, ge=1, le=100),
    db: Session = Depends(get_db),
    _: User = Depends(_admin_only),
) -> dict:
    return AdminController(db).get_recent_activity(limit)


@router.patch("/users/{user_id}/role", summary="Change a user's role")
def update_role(
    user_id: str,
    role: str = Body(..., embed=True),
    db: Session = Depends(get_db),
    current_user: User = Depends(_admin_only),
) -> dict:
    return AdminController(db).update_user_role(user_id, role, current_user.id)


@router.patch("/users/{user_id}/status", summary="Activate or deactivate a user account")
def toggle_active(
    user_id: str,
    is_active: bool = Body(..., embed=True),
    db: Session = Depends(get_db),
    current_user: User = Depends(_admin_only),
) -> dict:
    return AdminController(db).toggle_active(user_id, is_active, current_user.id)


@router.delete("/users/{user_id}", summary="Delete a user account")
def delete_user(
    user_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(_admin_only),
) -> dict:
    return AdminController(db).delete_user(user_id, current_user.id)


@router.patch("/users/{user_id}/reset-password", summary="Reset a user's password")
def reset_password(
    user_id: str,
    new_password: str = Body(..., embed=True),
    db: Session = Depends(get_db),
    current_user: User = Depends(_admin_only),
) -> dict:
    return AdminController(db).reset_password(user_id, new_password, current_user.id)


@router.get("/audit-logs", summary="View recent audit log entries")
def audit_logs(
    # Bounded: this was an unvalidated integer, so ?limit=10000000 would ask
    # the database for the entire audit history in one response.
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
    _: User = Depends(_admin_only),
) -> list:
    return AdminController(db).list_audit_logs(limit)
