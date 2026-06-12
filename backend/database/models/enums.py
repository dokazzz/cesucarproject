"""
Shared Python enums that mirror the PostgreSQL enum types in Supabase.
Import from here — never define the same enum in multiple places.
"""
from __future__ import annotations

import enum


class UserRole(str, enum.Enum):
    ADMIN     = "ADMIN"
    DRIVER    = "DRIVER"
    PASSENGER = "PASSENGER"


class TripType(str, enum.Enum):
    GOING_TO_CESUCA = "GOING_TO_CESUCA"
    RETURNING_HOME  = "RETURNING_HOME"


class RideStatus(str, enum.Enum):
    ACTIVE    = "ACTIVE"
    FULL      = "FULL"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"


class RequestStatus(str, enum.Enum):
    PENDING   = "PENDING"
    APPROVED  = "APPROVED"
    REJECTED  = "REJECTED"
    CANCELLED = "CANCELLED"


class NotificationType(str, enum.Enum):
    INFO            = "INFO"
    SUCCESS         = "SUCCESS"
    WARNING         = "WARNING"
    RIDE_REQUEST    = "RIDE_REQUEST"
    RIDE_APPROVED   = "RIDE_APPROVED"
    RIDE_REJECTED   = "RIDE_REJECTED"
    RIDE_CANCELLED  = "RIDE_CANCELLED"
    SYSTEM          = "SYSTEM"


class AuditAction(str, enum.Enum):
    USER_REGISTERED  = "USER_REGISTERED"
    USER_LOGIN       = "USER_LOGIN"
    USER_LOGOUT      = "USER_LOGOUT"
    USER_UPDATED     = "USER_UPDATED"
    USER_DEACTIVATED = "USER_DEACTIVATED"
    USER_DELETED     = "USER_DELETED"
    PASSWORD_CHANGED = "PASSWORD_CHANGED"
    RIDE_CREATED     = "RIDE_CREATED"
    RIDE_UPDATED     = "RIDE_UPDATED"
    RIDE_CANCELLED   = "RIDE_CANCELLED"
    RIDE_COMPLETED   = "RIDE_COMPLETED"
    REQUEST_CREATED  = "REQUEST_CREATED"
    REQUEST_APPROVED = "REQUEST_APPROVED"
    REQUEST_REJECTED = "REQUEST_REJECTED"
    REQUEST_CANCELLED = "REQUEST_CANCELLED"
    ADMIN_ACTION     = "ADMIN_ACTION"
