from __future__ import annotations
import os
from dotenv import load_dotenv

load_dotenv()


class ConfigError(RuntimeError):
    """Raised at import time when the environment cannot support a safe start."""


def _env(key: str, default: str = "") -> str:
    """Get env var and strip BOM + whitespace (PowerShell pipe artifact)."""
    return os.environ.get(key, default).strip("﻿").strip()


# Values that used to be hardcoded fallbacks in this file. They are in the
# public history of this repository, so treat them as known to an attacker and
# refuse to start on them even if someone pastes them into a .env.
_KNOWN_INSECURE = {
    "dev-secret-change-in-production",
    "jwt-dev-secret-change-in-production",
    "replace-with-a-long-random-string",
    "replace-with-another-long-random-string",
    "changeme",
    "secret",
}

_MIN_SECRET_LENGTH = 32


def _required(key: str) -> str:
    """
    Read a mandatory setting, or refuse to start.

    A missing secret used to fall back to a hardcoded string, which meant a
    misconfigured host booted happily and signed tokens with a value published
    in this repository. Failing at import is loud, immediate, and impossible to
    miss in a deploy log.
    """
    value = _env(key)
    if not value:
        raise ConfigError(
            f"{key} is not set. Copy backend/.env.example to backend/.env and "
            f"fill it in. Generate a secret with:\n"
            f"    python -c \"import secrets; print(secrets.token_urlsafe(48))\""
        )
    return value


def _required_secret(key: str, *, debug: bool) -> str:
    """A required setting that additionally must not be a known or weak value."""
    value = _required(key)
    if value in _KNOWN_INSECURE:
        raise ConfigError(
            f"{key} is set to a placeholder that is published in this "
            f"repository's history. Generate a real one with:\n"
            f"    python -c \"import secrets; print(secrets.token_urlsafe(48))\""
        )
    if len(value) < _MIN_SECRET_LENGTH and not debug:
        raise ConfigError(
            f"{key} is {len(value)} characters; at least {_MIN_SECRET_LENGTH} "
            f"are required outside DEBUG. Generate one with:\n"
            f"    python -c \"import secrets; print(secrets.token_urlsafe(48))\""
        )
    return value


class Config:
    # ── App ────────────────────────────────────────────────────────
    DEBUG: bool = _env("DEBUG", "false").lower() == "true"

    SECRET_KEY: str = _required_secret("SECRET_KEY", debug=DEBUG)

    # ── PostgreSQL ─────────────────────────────────────────────────
    # No localhost fallback: a silent default sends the app at the wrong
    # database, which fails later and more confusingly than failing here.
    DATABASE_URL: str = _required("DATABASE_URL")

    # ── SQLAlchemy ─────────────────────────────────────────────────
    SQLALCHEMY_ECHO: bool = _env("SQLALCHEMY_ECHO", "false").lower() == "true"
    DB_POOL_PRE_PING: bool = True
    DB_POOL_RECYCLE: int = 300

    # ── JWT ────────────────────────────────────────────────────────
    JWT_SECRET_KEY: str = _required_secret("JWT_SECRET_KEY", debug=DEBUG)
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

    # ── Rate limiting ──────────────────────────────────────────────
    # Applied per client IP. Login is the brute-force target: RGM is an
    # 8-digit number and the administrator's is 00000001.
    RATE_LIMIT_ENABLED: bool = _env("RATE_LIMIT_ENABLED", "true").lower() == "true"
    RATE_LIMIT_LOGIN: str = _env("RATE_LIMIT_LOGIN", "8/minute")
    RATE_LIMIT_REGISTER: str = _env("RATE_LIMIT_REGISTER", "12/hour")

    # Only trust X-Forwarded-For when something we control actually sets it.
    # Behind a reverse proxy this must be true or every request shares one
    # bucket (the proxy's IP) and one attacker locks out the whole campus.
    # Directly exposed, it must be false or a client can spoof the header and
    # bypass the limit entirely.
    TRUST_PROXY_HEADERS: bool = _env("TRUST_PROXY_HEADERS", "false").lower() == "true"

    # ── Logging ────────────────────────────────────────────────────
    LOG_LEVEL: str = _env("LOG_LEVEL", "INFO").upper()
    # JSON lines for Promtail/Loki; plain text is easier to read locally.
    LOG_JSON: bool = _env("LOG_JSON", "false").lower() == "true"


config = Config()
