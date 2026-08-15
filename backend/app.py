"""
CESUCAR — FastAPI application entry point.

Start with:
    uvicorn app:app --reload --port 8000

API documentation available at:
    http://localhost:8000/docs   (Swagger UI)
    http://localhost:8000/redoc  (ReDoc)
"""
from __future__ import annotations

import os
import uuid
from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi.errors import RateLimitExceeded
from sqlalchemy.orm import Session

# Build identity — Vercel injects VERCEL_GIT_COMMIT_SHA automatically
_BUILD_ID = os.environ.get("VERCEL_GIT_COMMIT_SHA", "dev")[:12]

from config import config
from database.connection import SessionLocal, engine, get_db
from database.models import User, RideOffer, RideRequest, Notification, AuditLog  # noqa: F401 — needed for Alembic
from database.repositories.ride_repository import RideRepository
from database.repositories.user_repository import UserRepository
from errors import ApiError, ErrorCode, api_error_handler
from logging_config import setup_logging
from rate_limit import client_ip, limiter
from routes.auth import router as auth_router
from routes.rides import router as rides_router
from routes.notifications import router as notifications_router
from routes.admin import router as admin_router

logger = setup_logging()


# ── Startup / shutdown lifecycle ───────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Run tasks at startup and shutdown."""
    # Ensure the admin account exists on every startup
    db = SessionLocal()
    try:
        from services.auth_service import AuthService
        AuthService(db).ensure_admin_exists()
    except RuntimeError as exc:
        # Not fatal: the rest of the API is still usable without an admin
        # account, but this must be visible rather than printed and lost.
        logger.error("Admin bootstrap skipped: %s", exc)
    finally:
        db.close()

    logger.info(
        "CESUCAR API started",
        extra={"build": _BUILD_ID, "debug": config.DEBUG,
               "rate_limit": config.RATE_LIMIT_ENABLED, "json_logs": config.LOG_JSON},
    )

    yield  # Application runs here

    # Shutdown — dispose engine connection pool
    engine.dispose()


# ── Application factory ────────────────────────────────────────────────────────

app = FastAPI(
    title="CESUCAR API",
    description=(
        "Backend para o sistema de caronas universitárias do Centro Universitário CESUCA. "
        "Implementado em Python com FastAPI, SQLAlchemy e PostgreSQL."
    ),
    version="2.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# ── CORS ───────────────────────────────────────────────────────────────────────

app.add_middleware(
    CORSMiddleware,
    allow_origins=config.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Rate limiting ──────────────────────────────────────────────────────────────

app.state.limiter = limiter

# Failures carry a stable `code` next to the human-readable `detail`, so a
# client can branch on RIDE_FULL instead of matching Portuguese prose.
app.add_exception_handler(ApiError, api_error_handler)


@app.exception_handler(RateLimitExceeded)
async def rate_limit_handler(request: Request, exc: RateLimitExceeded) -> JSONResponse:
    logger.warning(
        "Rate limit exceeded",
        extra={"request_id": getattr(request.state, "request_id", None),
               "path": request.url.path, "client_ip": client_ip(request)},
    )
    return JSONResponse(
        status_code=429,
        content={"detail": "Muitas tentativas. Aguarde um momento e tente novamente.",
                 "code": ErrorCode.RATE_LIMITED},
        headers={"Retry-After": "60"},
    )


# ── Request context ────────────────────────────────────────────────────────────

@app.middleware("http")
async def request_context(request: Request, call_next):
    """
    Tag every request with an id, and note who is making it.

    The id goes into each log line and into the error body, so a user can
    quote the code from their screen and it finds the exact stack trace.

    The user is read straight from the token here rather than from the
    database: this must be cheap, must not need a session, and must not fail
    the request when the token is rubbish -- the route's own dependency is
    what actually enforces authentication.
    """
    request.state.request_id = uuid.uuid4().hex[:12]
    request.state.user_id = None
    request.state.user_rgm = None

    auth = request.headers.get("Authorization", "")
    if auth.startswith("Bearer "):
        try:
            from services.auth_service import AuthService
            claims = AuthService.decode_token(auth[7:])
            request.state.user_id = claims.get("sub")
            request.state.user_rgm = claims.get("rgm")
        except Exception:
            pass   # unauthenticated or malformed — routes decide what that means

    # An app in someone's pocket cannot be patched, so the server needs a way
    # to refuse builds that are too old to be safe. Only applies when the
    # client identifies itself; the web frontend sends no such header.
    client_version = request.headers.get("X-Client-Version")
    if client_version and _older_than_minimum(client_version):
        return JSONResponse(
            status_code=426,
            content={
                "detail": "Esta versão do aplicativo não é mais suportada. Atualize para continuar.",
                "code": ErrorCode.UPGRADE_REQUIRED,
                "minimum_version": config.MIN_CLIENT_VERSION,
            },
        )

    response = await call_next(request)
    response.headers["X-App-Version"] = _BUILD_ID
    response.headers["X-Request-ID"] = request.state.request_id

    # Tell unversioned callers, in a machine-readable way, that they are on a
    # path with an end date. RFC 8594 / RFC 9745 headers.
    path = request.url.path
    if path.startswith(f"{API_LEGACY}/") and not path.startswith(f"{API_V1}/"):
        response.headers["Deprecation"] = "true"
        response.headers["Sunset"] = config.API_SUNSET_DATE
        response.headers["Link"] = f'<{API_V1}>; rel="successor-version"'

    return response


def _parse_version(value: str) -> tuple[int, ...]:
    """'1.4.2' -> (1, 4, 2). Unparseable input sorts as 0.0.0."""
    parts: list[int] = []
    for chunk in str(value).split(".")[:3]:
        digits = "".join(c for c in chunk if c.isdigit())
        parts.append(int(digits) if digits else 0)
    while len(parts) < 3:
        parts.append(0)
    return tuple(parts)


def _older_than_minimum(client_version: str) -> bool:
    return _parse_version(client_version) < _parse_version(config.MIN_CLIENT_VERSION)


# ── Routers ────────────────────────────────────────────────────────────────────

API_V1 = "/api/v1"
API_LEGACY = "/api"

# Every router is mounted twice. /api/v1 is the contract a mobile client is
# built against; bare /api is the same code kept alive for the existing web
# frontend, hidden from the schema so /docs shows one API rather than two, and
# answering with Deprecation and Sunset headers.
#
# The point of the version in the path is that an app already installed on
# someone's phone cannot be patched. When v2 has to break something, v1 keeps
# answering until the install base has moved.
for _router in (auth_router, rides_router, notifications_router, admin_router):
    app.include_router(_router, prefix=API_V1)
    app.include_router(_router, prefix=API_LEGACY, include_in_schema=False)


# ── Utility endpoints ──────────────────────────────────────────────────────────

@app.get("/api/stats", tags=["Public"])
def public_stats(db: Session = Depends(get_db)) -> dict:
    """Public statistics — used by the home page without auth."""
    return {
        "total_users":  UserRepository(db).count(),
        "active_rides": RideRepository(db).count_active(),
    }


@app.get("/api/version", tags=["Health"])
def api_version() -> dict:
    """Returns the current build ID — used by the frontend to detect stale deploys."""
    return {"build": _BUILD_ID}

@app.get("/status", tags=["Health"])
def health_check() -> dict:
    """Health-check endpoint — returns system status."""
    return {"sistema": "CESUCAR", "status": "Online", "version": "2.0.0", "build": _BUILD_ID}



# ── Global exception handler ──────────────────────────────────────────────────

@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """
    Last line of defence for anything a route did not handle.

    This used to swallow every crash and return a bare 500, logging nothing
    anywhere -- a production failure left no trace at all. It now records the
    full traceback with enough context to reproduce: which request, which
    route, which user, from where.

    The response body still says nothing useful to an attacker, but it now
    carries the request id so a user can report a failure that can actually be
    found in the logs.
    """
    request_id = getattr(request.state, "request_id", None)

    logger.exception(
        "Unhandled exception",
        extra={
            "request_id": request_id,
            "method":     request.method,
            "path":       request.url.path,
            "query":      str(request.url.query) or None,
            "user_id":    getattr(request.state, "user_id", None),
            "user_rgm":   getattr(request.state, "user_rgm", None),
            "client_ip":  client_ip(request),
            "exc_type":   type(exc).__name__,
        },
    )

    if config.DEBUG:
        raise exc

    return JSONResponse(
        status_code=500,
        content={
            "error": "Erro interno do servidor. Contate o administrador.",
            "detail": "Erro interno do servidor. Contate o administrador.",
            "code": ErrorCode.INTERNAL,
            "request_id": request_id,
        },
    )
