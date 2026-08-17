"""
JWT authentication middleware for FastAPI.

Provides FastAPI dependency functions:
  - get_current_user()  → requires a valid Bearer token
  - require_role()      → requires specific role(s)
"""
from __future__ import annotations

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from database.connection import get_db
from database.models.user import User
from database.repositories.user_repository import UserRepository
from services.auth_service import AuthError, AuthService

_bearer = HTTPBearer(auto_error=False)


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer),
    db: Session = Depends(get_db),
) -> User:
    """
    FastAPI dependency — extract and validate the Bearer JWT.

    Injects the authenticated User model into route handlers.
    Raises HTTP 401 if no token or invalid token.
    """
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token de autenticação não fornecido.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    try:
        payload = AuthService.decode_token(credentials.credentials)
        # Only access tokens authenticate a request. Refresh tokens are opaque
        # random strings rather than JWTs so they cannot reach here anyway, but
        # rejecting anything not explicitly typed as an access token keeps that
        # true if another token kind is ever added.
        if payload.get("typ", "access") != "access":
            raise AuthError("Token inválido ou expirado.", 401)
        # sub is stored as a UUID string — do NOT cast to int
        user_id: str = payload["sub"]
    except (AuthError, KeyError) as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido ou expirado.",
            headers={"WWW-Authenticate": "Bearer"},
        ) from exc

    user = UserRepository(db).find_by_id(user_id)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Usuário não encontrado.",
        )

    # Tokens outlive an administrator's decision to disable an account, so the
    # flag is checked on every request rather than only at login. Without this,
    # "deactivate user" in the admin panel changed a column nobody read: the
    # account kept working until its token expired, and kept working after that
    # because it could still log in.
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Esta conta está desativada. Procure a administração do CESUCA.",
        )

    return user


def get_optional_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer),
    db: Session = Depends(get_db),
) -> User | None:
    """Like get_current_user but returns None instead of raising on missing token."""
    if credentials is None:
        return None
    try:
        return get_current_user(credentials, db)
    except HTTPException:
        return None


def require_role(*roles: str):
    """
    Factory that returns a FastAPI dependency enforcing one of the given roles.

    Role strings are compared case-insensitively so callers can use either
    lowercase ("admin") or uppercase ("ADMIN") — both work.

    Usage:
        @router.get("/admin/users")
        def list_users(user = Depends(require_role("admin"))):
            ...
    """
    normalized = {r.upper() for r in roles}

    def _dependency(current_user: User = Depends(get_current_user)) -> User:
        # current_user.role is a UserRole enum whose .value is uppercase ("ADMIN")
        if current_user.role.value.upper() not in normalized:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Acesso negado. Permissão insuficiente.",
            )
        return current_user

    return _dependency
