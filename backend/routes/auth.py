"""Authentication routes: login, register, me."""
from fastapi import APIRouter, Depends, Request, Response
from sqlalchemy.orm import Session

from config import config
from controllers.auth_controller import AuthController
from database.connection import get_db
from database.models.user import User
from middleware.auth import get_current_user
from rate_limit import limiter
from schemas.auth import LoginRequest, RegisterRequest, UserUpdateRequest

router = APIRouter(prefix="/api/auth", tags=["Authentication"])


# RGM is an 8-digit number and the administrator's is 00000001, so login is
# guessable by anyone willing to sit there trying. These two endpoints are the
# only ones an unauthenticated caller can use to change state, so they are
# where the limit belongs.
#
# Both extra parameters are required by the limiter, not by the handlers:
# `request` is where it reads the client address, and `response` is where it
# writes the X-RateLimit-* headers. Omitting `response` does not merely drop
# the headers -- slowapi raises on every successful call, taking the endpoint
# down with it.
@router.post("/login", summary="Authenticate with RGM + password")
@limiter.limit(config.RATE_LIMIT_LOGIN)
def login(
    request: Request,
    response: Response,
    body: LoginRequest,
    db: Session = Depends(get_db),
) -> dict:
    return AuthController(db).login(body)


@router.post("/register", status_code=201, summary="Register a new user")
@limiter.limit(config.RATE_LIMIT_REGISTER)
def register(
    request: Request,
    response: Response,
    body: RegisterRequest,
    db: Session = Depends(get_db),
) -> dict:
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
