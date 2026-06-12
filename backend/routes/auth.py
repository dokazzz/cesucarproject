"""Authentication routes: login, register, me."""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from controllers.auth_controller import AuthController
from database.connection import get_db
from database.models.user import User
from middleware.auth import get_current_user
from schemas.auth import LoginRequest, RegisterRequest, UserUpdateRequest

router = APIRouter(prefix="/api/auth", tags=["Authentication"])


@router.post("/login", summary="Authenticate with RGM + password")
def login(body: LoginRequest, db: Session = Depends(get_db)) -> dict:
    return AuthController(db).login(body)


@router.post("/register", status_code=201, summary="Register a new user")
def register(body: RegisterRequest, db: Session = Depends(get_db)) -> dict:
    return AuthController(db).register(body)


@router.get("/me", summary="Return the authenticated user's profile")
def me(current_user: User = Depends(get_current_user)) -> dict:
    return current_user.to_dict()


@router.patch("/me", summary="Update own profile or switch role")
def update_me(
    body: UserUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    return AuthController(db).update_me(str(current_user.id), body)
