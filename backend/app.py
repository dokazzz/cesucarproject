"""
CESUCAR — FastAPI application entry point.

Start with:
    uvicorn app:app --reload --port 8000

API documentation available at:
    http://localhost:8000/docs   (Swagger UI)
    http://localhost:8000/redoc  (ReDoc)
"""
from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

from config import config
from database.connection import SessionLocal, engine, get_db
from database.models import User, RideOffer, RideRequest, Notification, AuditLog  # noqa: F401 — needed for Alembic
from database.repositories.ride_repository import RideRepository
from database.repositories.user_repository import UserRepository
from routes.auth import router as auth_router
from routes.rides import router as rides_router
from routes.notifications import router as notifications_router
from routes.admin import router as admin_router


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
        print(f"[CESUCAR] WARNING: {exc}")
    finally:
        db.close()

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

# ── Routers ────────────────────────────────────────────────────────────────────

app.include_router(auth_router)
app.include_router(rides_router)
app.include_router(notifications_router)
app.include_router(admin_router)


# ── Utility endpoints ──────────────────────────────────────────────────────────

@app.get("/api/stats", tags=["Public"])
def public_stats(db: Session = Depends(get_db)) -> dict:
    """Public statistics — used by the home page without auth."""
    return {
        "total_users":  UserRepository(db).count(),
        "active_rides": RideRepository(db).count_active(),
    }


@app.get("/status", tags=["Health"])
def health_check() -> dict:
    """Health-check endpoint — returns system status."""
    return {"sistema": "CESUCAR", "status": "Online", "version": "2.0.0"}


@app.get("/", tags=["Health"])
def root() -> dict:
    return {
        "message": "CESUCAR API está rodando.",
        "docs": "/docs",
        "status": "/status",
    }


# ── Global exception handler ──────────────────────────────────────────────────

@app.exception_handler(Exception)
async def generic_exception_handler(request, exc):
    if config.DEBUG:
        raise exc
    return JSONResponse(
        status_code=500,
        content={"error": "Erro interno do servidor. Contate o administrador."},
    )
