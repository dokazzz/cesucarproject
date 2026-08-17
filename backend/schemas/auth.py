"""Pydantic schemas for authentication endpoints."""
from __future__ import annotations

import re

from pydantic import BaseModel, field_validator

RGM_RE = re.compile(r"^\d{8}$")
_PLATE_RE = re.compile(r'^[A-Z]{3}[0-9]{4}$|^[A-Z]{3}[0-9][A-Z][0-9]{2}$')


class LoginRequest(BaseModel):
    rgm: str
    password: str

    @field_validator("rgm")
    @classmethod
    def rgm_format(cls, v: str) -> str:
        if not RGM_RE.match(v):
            raise ValueError("RGM deve conter exatamente 8 dígitos numéricos.")
        return v


class RegisterRequest(BaseModel):
    full_name: str
    rgm: str
    password: str
    confirm_password: str
    role: str = "passenger"
    course: str | None = None
    city: str | None = None
    neighborhood: str | None = None
    phone: str | None = None
    vehicle_model: str | None = None
    vehicle_brand: str | None = None
    vehicle_color: str | None = None
    vehicle_seats: int | None = None
    vehicle_plate: str | None = None

    @field_validator("rgm")
    @classmethod
    def rgm_format(cls, v: str) -> str:
        if not RGM_RE.match(v):
            raise ValueError("RGM deve conter exatamente 8 dígitos numéricos.")
        return v

    @field_validator("vehicle_plate")
    @classmethod
    def plate_format_register(cls, v: str | None) -> str | None:
        if not v:
            return v
        normalized = v.replace("-", "").upper()
        if not _PLATE_RE.match(normalized):
            raise ValueError("Placa inválida. Use o formato ABC1234 (antiga) ou ABC1D23 (Mercosul).")
        return normalized

    @field_validator("password")
    @classmethod
    def password_length(cls, v: str) -> str:
        if len(v) < 6:
            raise ValueError("A senha deve ter pelo menos 6 caracteres.")
        return v

    @field_validator("confirm_password")
    @classmethod
    def passwords_match(cls, v: str, info) -> str:
        if "password" in info.data and v != info.data["password"]:
            raise ValueError("As senhas não coincidem.")
        return v

    @field_validator("role")
    @classmethod
    def role_valid(cls, v: str) -> str:
        if v not in ("passenger", "driver"):
            raise ValueError("Tipo de usuário inválido.")
        return v


class TokenResponse(BaseModel):
    token: str
    user: dict


class RefreshRequest(BaseModel):
    """Body for /auth/refresh and /auth/logout."""
    refresh_token: str


class UserUpdateRequest(BaseModel):
    full_name: str | None = None
    role: str | None = None
    course: str | None = None
    city: str | None = None
    neighborhood: str | None = None
    phone: str | None = None
    vehicle_model: str | None = None
    vehicle_brand: str | None = None
    vehicle_color: str | None = None
    vehicle_seats: int | None = None
    vehicle_plate: str | None = None

    @field_validator("vehicle_plate")
    @classmethod
    def plate_format_update(cls, v: str | None) -> str | None:
        if not v:
            return v
        normalized = v.replace("-", "").upper()
        if not _PLATE_RE.match(normalized):
            raise ValueError("Placa inválida. Use o formato ABC1234 (antiga) ou ABC1D23 (Mercosul).")
        return normalized

    @field_validator("role")
    @classmethod
    def role_valid(cls, v: str | None) -> str | None:
        if v is not None and v not in ("passenger", "driver", "PASSENGER", "DRIVER"):
            raise ValueError("Tipo de usuário inválido.")
        return v
