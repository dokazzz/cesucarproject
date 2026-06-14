from __future__ import annotations
import os
from dotenv import load_dotenv

load_dotenv()


def _env(key: str, default: str = "") -> str:
    """Get env var and strip BOM + whitespace (PowerShell pipe artifact)."""
    return os.environ.get(key, default).strip("﻿").strip()


class Config:
    # ── Flask / App ────────────────────────────────────────────────
    SECRET_KEY: str = _env("SECRET_KEY") or "dev-secret-change-in-production"

    # ── PostgreSQL ─────────────────────────────────────────────────
    DATABASE_URL: str = (
        _env("DATABASE_URL")
        or "postgresql://cesucar_user:cesucar_pass@localhost:5432/cesucar_db"
    )

    # ── SQLAlchemy ─────────────────────────────────────────────────
    SQLALCHEMY_ECHO: bool = _env("SQLALCHEMY_ECHO", "false").lower() == "true"
    DB_POOL_PRE_PING: bool = True
    DB_POOL_RECYCLE: int = 300

    # ── JWT ────────────────────────────────────────────────────────
    JWT_SECRET_KEY: str = _env("JWT_SECRET_KEY") or "jwt-dev-secret-change-in-production"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRES_HOURS: int = int(_env("JWT_EXPIRES_HOURS", "24"))

    # ── CORS ───────────────────────────────────────────────────────
    CORS_ORIGINS: list[str] = [
        o.strip()
        for o in _env(
            "CORS_ORIGINS",
            "http://localhost:5500,http://127.0.0.1:5500,http://localhost:3000",
        ).split(",")
        if o.strip()
    ]

    # ── Admin bootstrap ────────────────────────────────────────────
    ADMIN_RGM: str = "00000001"
    ADMIN_PASSWORD: str | None = _env("ADMIN_PASSWORD") or None
    ADMIN_FULL_NAME: str = "Administrador CESUCAR"

    # ── App ────────────────────────────────────────────────────────
    DEBUG: bool = _env("DEBUG", "false").lower() == "true"


config = Config()
