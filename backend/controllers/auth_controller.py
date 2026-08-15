"""AuthController — handles HTTP concerns for auth endpoints."""
from __future__ import annotations

from sqlalchemy.orm import Session

from errors import ApiError, ErrorCode
from schemas.auth import LoginRequest, RegisterRequest, UserUpdateRequest
from services.auth_service import AuthError, AuthService

# Maps a service-layer failure onto a stable code a client can branch on.
# Matching is by (status, message fragment) because AuthError predates codes;
# anything unmatched falls back to a sensible default for its status.
_CODE_BY_FRAGMENT = (
    ("desativada",       ErrorCode.ACCOUNT_DISABLED),
    ("já está cadastrado", ErrorCode.RGM_TAKEN),
    ("não está disponível", ErrorCode.RGM_RESERVED),
    ("Sessão encerrada por motivo", ErrorCode.REFRESH_REUSED),
    ("Sessão inválida",  ErrorCode.REFRESH_INVALID),
    ("Sessão expirada",  ErrorCode.REFRESH_INVALID),
    ("Token inválido",   ErrorCode.TOKEN_INVALID),
    ("RGM ou senha",     ErrorCode.INVALID_CREDENTIALS),
)

_CODE_BY_STATUS = {
    400: ErrorCode.VALIDATION_FAILED,
    401: ErrorCode.INVALID_CREDENTIALS,
    403: ErrorCode.FORBIDDEN,
    404: ErrorCode.NOT_FOUND,
    409: ErrorCode.RGM_TAKEN,
}


def _to_api_error(exc: AuthError) -> ApiError:
    for fragment, code in _CODE_BY_FRAGMENT:
        if fragment in exc.message:
            return ApiError(exc.status_code, exc.message, code)
    return ApiError(
        exc.status_code, exc.message,
        _CODE_BY_STATUS.get(exc.status_code, ErrorCode.VALIDATION_FAILED),
    )


class AuthController:
    """
    Bridges FastAPI routes and AuthService.
    Translates service exceptions to HTTP responses with stable error codes.
    """

    def __init__(self, db: Session) -> None:
        self.service = AuthService(db)

    def login(self, body: LoginRequest, *, user_agent=None, client_ip=None) -> dict:
        try:
            session, user = self.service.login(
                body.rgm, body.password, user_agent=user_agent, client_ip=client_ip
            )
            return {**session, "user": user.to_dict()}
        except AuthError as exc:
            raise _to_api_error(exc) from exc

    def register(self, body: RegisterRequest, *, user_agent=None, client_ip=None) -> dict:
        try:
            session, user = self.service.register(
                full_name=body.full_name,
                rgm=body.rgm,
                password=body.password,
                role=body.role,
                course=body.course,
                city=body.city,
                neighborhood=body.neighborhood,
                phone=body.phone,
                vehicle_model=body.vehicle_model,
                vehicle_brand=body.vehicle_brand,
                vehicle_color=body.vehicle_color,
                vehicle_seats=body.vehicle_seats,
                vehicle_plate=body.vehicle_plate,
                user_agent=user_agent,
                client_ip=client_ip,
            )
            return {**session, "user": user.to_dict()}
        except AuthError as exc:
            raise _to_api_error(exc) from exc

    def refresh(self, refresh_token: str, *, user_agent=None, client_ip=None) -> dict:
        try:
            session, user = self.service.refresh_session(
                refresh_token, user_agent=user_agent, client_ip=client_ip
            )
            session.pop("_family_id", None)
            return {**session, "user": user.to_dict()}
        except AuthError as exc:
            raise _to_api_error(exc) from exc

    def logout(self, refresh_token: str | None) -> dict:
        return self.service.logout(refresh_token)

    def sessions(self, user_id) -> list[dict]:
        return self.service.list_sessions(user_id)

    def revoke_all_sessions(self, user_id) -> dict:
        return self.service.revoke_all_sessions(user_id)

    def me(self, user_id) -> dict:
        try:
            user = self.service.get_current_user(user_id)
            return user.to_dict()
        except AuthError as exc:
            raise _to_api_error(exc) from exc

    def update_me(self, user_id, body: UserUpdateRequest) -> dict:
        try:
            user = self.service.update_self(user_id, body)
            return user.to_dict()
        except AuthError as exc:
            raise _to_api_error(exc) from exc
