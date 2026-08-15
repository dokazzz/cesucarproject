"""Authentication routes: login, register, refresh, logout, sessions, me."""
from fastapi import APIRouter, Depends, Request, Response
from sqlalchemy.orm import Session

from config import config
from controllers.auth_controller import AuthController
from database.connection import get_db
from database.models.user import User
from middleware.auth import get_current_user
from rate_limit import client_ip, limiter
from schemas.auth import LoginRequest, RefreshRequest, RegisterRequest, UserUpdateRequest

# No /api prefix here: app.py mounts this router twice, once under /api/v1 and
# once under bare /api for the existing web frontend.
router = APIRouter(prefix="/auth", tags=["Authentication"])


def _client(request: Request) -> dict:
    """Device metadata recorded against a session so a user can recognise it."""
    return {
        "user_agent": request.headers.get("User-Agent"),
        "client_ip": client_ip(request),
    }


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
    return AuthController(db).login(body, **_client(request))


@router.post("/register", status_code=201, summary="Register a new user")
@limiter.limit(config.RATE_LIMIT_REGISTER)
def register(
    request: Request,
    response: Response,
    body: RegisterRequest,
    db: Session = Depends(get_db),
) -> dict:
    return AuthController(db).register(body, **_client(request))


@router.post("/refresh", summary="Exchange a refresh token for a new token pair")
@limiter.limit(config.RATE_LIMIT_REFRESH)
def refresh(
    request: Request,
    response: Response,
    body: RefreshRequest,
    db: Session = Depends(get_db),
) -> dict:
    """
    Rotates the refresh token: the presented one is spent and a new one is
    returned. Presenting a spent token revokes the whole session family, on
    the assumption that it was stolen.
    """
    return AuthController(db).refresh(body.refresh_token, **_client(request))


@router.post("/logout", summary="Revoke the current session")
def logout(body: RefreshRequest, db: Session = Depends(get_db)) -> dict:
    """
    Takes the refresh token rather than the access token: the access token
    cannot be revoked (it is stateless and simply expires), so the session is
    what actually ends here.
    """
    return AuthController(db).logout(body.refresh_token)


@router.get("/sessions", summary="List the authenticated user's active sessions")
def sessions(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list:
    return AuthController(db).sessions(current_user.id)


@router.delete("/sessions", summary="Revoke every session for the authenticated user")
def revoke_sessions(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    return AuthController(db).revoke_all_sessions(current_user.id)


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
