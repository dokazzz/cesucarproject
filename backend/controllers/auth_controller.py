"""AuthController — handles HTTP concerns for auth endpoints."""
from __future__ import annotations

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from schemas.auth import LoginRequest, RegisterRequest, UserUpdateRequest
from services.auth_service import AuthError, AuthService


class AuthController:
    """
    Bridges FastAPI routes and AuthService.
    Translates service exceptions to HTTP responses.
    """

    def __init__(self, db: Session) -> None:
        self.service = AuthService(db)

    def login(self, body: LoginRequest) -> dict:
        try:
            token, user = self.service.login(body.rgm, body.password)
            return {"token": token, "user": user.to_dict()}
        except AuthError as exc:
            raise HTTPException(status_code=exc.status_code, detail=exc.message) from exc

    def register(self, body: RegisterRequest) -> dict:
        try:
            token, user = self.service.register(
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
            )
            return {"token": token, "user": user.to_dict()}
        except AuthError as exc:
            raise HTTPException(status_code=exc.status_code, detail=exc.message) from exc

    def me(self, user_id) -> dict:
        try:
            user = self.service.get_current_user(user_id)
            return user.to_dict()
        except AuthError as exc:
            raise HTTPException(status_code=exc.status_code, detail=exc.message) from exc

    def update_me(self, user_id, body: UserUpdateRequest) -> dict:
        try:
            user = self.service.update_self(user_id, body)
            return user.to_dict()
        except AuthError as exc:
            raise HTTPException(status_code=exc.status_code, detail=exc.message) from exc
