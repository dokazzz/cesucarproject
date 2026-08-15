"""
API error shape.

Every failure carries a stable machine-readable `code` alongside the
Portuguese `detail`. The prose is for the person reading the screen and is
free to change or be translated; the code is what a client branches on.

Without this a mobile app has to match on message text to tell "this ride is
full" from "you are not allowed to do that", which breaks the moment anyone
edits a string. `detail` stays a plain string so existing callers, including
the current web frontend, are unaffected.
"""
from __future__ import annotations

from fastapi import HTTPException, Request
from fastapi.responses import JSONResponse


class ErrorCode:
    """Stable identifiers. Add to this list; never repurpose an entry."""

    # Authentication / authorisation
    INVALID_CREDENTIALS = "INVALID_CREDENTIALS"
    ACCOUNT_DISABLED    = "ACCOUNT_DISABLED"
    TOKEN_INVALID       = "TOKEN_INVALID"
    TOKEN_EXPIRED       = "TOKEN_EXPIRED"
    REFRESH_INVALID     = "REFRESH_INVALID"
    REFRESH_REUSED      = "REFRESH_REUSED"
    FORBIDDEN           = "FORBIDDEN"

    # Registration / profile
    RGM_TAKEN           = "RGM_TAKEN"
    RGM_RESERVED        = "RGM_RESERVED"
    VALIDATION_FAILED   = "VALIDATION_FAILED"

    # Rides
    RIDE_NOT_FOUND      = "RIDE_NOT_FOUND"
    RIDE_UNAVAILABLE    = "RIDE_UNAVAILABLE"
    RIDE_FULL           = "RIDE_FULL"
    NOT_A_DRIVER        = "NOT_A_DRIVER"
    OWN_RIDE            = "OWN_RIDE"
    REQUEST_NOT_FOUND   = "REQUEST_NOT_FOUND"
    REQUEST_NOT_PENDING = "REQUEST_NOT_PENDING"

    # Generic
    NOT_FOUND           = "NOT_FOUND"
    RATE_LIMITED        = "RATE_LIMITED"
    UPGRADE_REQUIRED    = "UPGRADE_REQUIRED"
    INTERNAL            = "INTERNAL"


class ApiError(HTTPException):
    """An HTTPException that also carries a stable error code."""

    def __init__(self, status_code: int, message: str, code: str) -> None:
        super().__init__(status_code=status_code, detail=message)
        self.code = code


async def api_error_handler(request: Request, exc: ApiError) -> JSONResponse:
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail, "code": exc.code},
        headers=getattr(exc, "headers", None),
    )
