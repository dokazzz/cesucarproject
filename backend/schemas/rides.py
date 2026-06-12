"""Pydantic schemas for ride endpoints."""
from __future__ import annotations

from pydantic import BaseModel, field_validator


class RideCreateRequest(BaseModel):
    tipo: str          # 'ida' | 'volta'
    cidade: str
    bairro: str | None = None
    data: str          # YYYY-MM-DD
    horario: str       # HH:MM
    vagas: int
    valor: float
    veiculo: str | None = None
    placa: str | None = None

    @field_validator("tipo")
    @classmethod
    def tipo_valid(cls, v: str) -> str:
        if v not in ("ida", "volta"):
            raise ValueError("Tipo deve ser 'ida' ou 'volta'.")
        return v

    @field_validator("vagas")
    @classmethod
    def vagas_range(cls, v: int) -> int:
        if v < 1 or v > 8:
            raise ValueError("Vagas deve ser entre 1 e 8.")
        return v

    @field_validator("valor")
    @classmethod
    def valor_positive(cls, v: float) -> float:
        if v < 0:
            raise ValueError("Valor não pode ser negativo.")
        return v


class CostCalculationRequest(BaseModel):
    distancia: float
    consumo: float
    preco_combustivel: float
    passageiros: int
