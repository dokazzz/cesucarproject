"""AdminController — handles HTTP concerns for admin endpoints."""
from __future__ import annotations

from sqlalchemy.orm import Session

from errors import ApiError, ErrorCode

from database.repositories.audit_log_repository import AuditLogRepository
from database.repositories.ride_repository import RideRepository
from database.repositories.user_repository import UserRepository
from services.auth_service import AuthError, AuthService

_VALID_ROLES = {"ADMIN", "PASSENGER", "DRIVER"}


class AdminController:
    """Bridges FastAPI admin routes with repository/service operations."""

    def __init__(self, db: Session) -> None:
        self.db = db
        self._users = UserRepository(db)
        self._rides = RideRepository(db)
        self._audit = AuditLogRepository(db)

    def list_users(self, search: str | None = None, role: str | None = None) -> list[dict]:
        return [u.to_dict() for u in self._users.find_all(search=search, role=role)]

    def get_user(self, user_id) -> dict:
        user = self._users.find_by_id(user_id)
        if not user:
            raise ApiError(404, "Usuário não encontrado.", ErrorCode.NOT_FOUND)
        return user.to_dict()

    def get_stats(self) -> dict:
        return {
            "total_users":      self._users.count(),
            "active_rides":     self._rides.count_active(),
            "total_drivers":    self._users.count_by_role("DRIVER"),
            "total_passengers": self._users.count_by_role("PASSENGER"),
        }

    def get_recent_activity(self, limit: int = 15) -> dict:
        from sqlalchemy import select
        from database.models.user import User
        logs = self._audit.find_recent(limit)
        recent_users = list(
            self.db.execute(
                select(User).order_by(User.created_at.desc()).limit(5)
            ).scalars().all()
        )
        return {
            "recent_logs":  [l.to_dict() for l in logs],
            "recent_users": [u.to_dict() for u in recent_users],
        }

    def update_user_role(self, user_id, role: str, admin_id) -> dict:
        normalized_role = role.strip().upper()
        if normalized_role not in _VALID_ROLES:
            raise ApiError(400, "Role inválida.", ErrorCode.VALIDATION_FAILED)
        user = self._users.update(user_id, role=normalized_role)
        if not user:
            raise ApiError(404, "Usuário não encontrado.", ErrorCode.NOT_FOUND)
        self._audit.log(
            action="USER_UPDATED",
            user_id=admin_id,
            details={"target_user_id": str(user_id), "new_role": normalized_role},
        )
        self.db.commit()
        return user.to_dict()

    def toggle_active(self, user_id, is_active: bool, admin_id) -> dict:
        if str(user_id) == str(admin_id):
            raise ApiError(400, "Você não pode desativar sua própria conta.", ErrorCode.FORBIDDEN)
        user = self._users.update(user_id, is_active=is_active)
        if not user:
            raise ApiError(404, "Usuário não encontrado.", ErrorCode.NOT_FOUND)
        self._audit.log(
            action="USER_UPDATED",
            user_id=admin_id,
            details={"target_user_id": str(user_id), "is_active": is_active},
        )
        self.db.commit()
        return user.to_dict()

    def delete_user(self, user_id, admin_id) -> dict:
        if str(user_id) == str(admin_id):
            raise ApiError(400, "Você não pode excluir sua própria conta.", ErrorCode.FORBIDDEN)
        deleted = self._users.delete(user_id)
        if not deleted:
            raise ApiError(404, "Usuário não encontrado.", ErrorCode.NOT_FOUND)
        self._audit.log(
            action="USER_DELETED",
            user_id=admin_id,
            details={"deleted_user_id": str(user_id)},
        )
        self.db.commit()
        return {"message": "Usuário excluído."}

    def list_audit_logs(self, limit: int = 100) -> list[dict]:
        return [log.to_dict() for log in self._audit.find_recent(limit)]

    def reset_password(self, user_id, new_password: str, admin_id) -> dict:
        if len(new_password) < 6:
            raise ApiError(400, "A senha deve ter pelo menos 6 caracteres.", ErrorCode.VALIDATION_FAILED)
        password_hash = AuthService.hash_password(new_password)
        user = self._users.update(user_id, password_hash=password_hash)
        if not user:
            raise ApiError(404, "Usuário não encontrado.", ErrorCode.NOT_FOUND)
        self._audit.log(
            action="PASSWORD_CHANGED",
            user_id=admin_id,
            details={"target_user_id": str(user_id)},
        )
        self.db.commit()
        return {"message": "Senha redefinida com sucesso."}
