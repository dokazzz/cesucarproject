"""
Request rate limiting.

Lives in its own module so route modules can import the limiter without
importing the application object and creating a cycle.

Storage is in-process memory. That is the right size for a single-VM
deployment and costs nothing, but it has two properties worth knowing:
counters reset when the process restarts, and each uvicorn worker keeps its
own, so the effective limit is per worker. Point `storage_uri` at Redis if
this ever runs on more than one machine.
"""
from __future__ import annotations

from fastapi import Request
from slowapi import Limiter
from slowapi.util import get_remote_address

from config import config


def client_ip(request: Request) -> str:
    """
    Identify the caller for rate-limiting purposes.

    X-Forwarded-For is only honoured when TRUST_PROXY_HEADERS says something
    we control sets it. Getting this wrong fails in both directions: behind a
    reverse proxy without it, every request carries the proxy's address and
    shares a single bucket, so one attacker locks out the whole campus;
    directly exposed with it on, anyone can spoof the header and never be
    limited at all.
    """
    if config.TRUST_PROXY_HEADERS:
        forwarded = request.headers.get("X-Forwarded-For")
        if forwarded:
            return forwarded.split(",")[0].strip()
    return get_remote_address(request)


limiter = Limiter(
    key_func=client_ip,
    enabled=config.RATE_LIMIT_ENABLED,
    headers_enabled=True,   # sends X-RateLimit-* so a client can back off
)
