"""RideController — handles HTTP concerns for ride endpoints."""
from __future__ import annotations

from datetime import date

from fastapi import HTTPException
from sqlalchemy.orm import Session

from schemas.rides import CostCalculationRequest, RideCreateRequest
from services.ride_service import RideError, RideService


class RideController:
    """Bridges FastAPI routes and RideService."""

    def __init__(self, db: Session) -> None:
        self.service = RideService(db)

    def list_rides(
        self,
        trip_type: str | None,
        departure_city: str | None,
        ride_date: date | None,
    ) -> list[dict]:
        return self.service.search_rides(
            trip_type=trip_type,
            departure_city=departure_city,
            ride_date=ride_date,
        )

    def get_ride(self, ride_id) -> dict:   # ride_id is a UUID string
        try:
            return self.service.get_ride(ride_id).to_dict()
        except RideError as exc:
            raise HTTPException(status_code=exc.status_code, detail=exc.message) from exc

    def create_ride(self, driver_id, body: RideCreateRequest) -> dict:
        try:
            return self.service.create_ride(
                driver_id,
                tipo=body.tipo,
                cidade=body.cidade,
                bairro=body.bairro,
                data=body.data,
                horario=body.horario,
                vagas=body.vagas,
                valor=body.valor,
                veiculo=body.veiculo,
                placa=body.placa,
            )
        except RideError as exc:
            raise HTTPException(status_code=exc.status_code, detail=exc.message) from exc

    def request_seat(self, ride_id, passenger_id) -> dict:
        try:
            return self.service.request_seat(ride_id, passenger_id)
        except RideError as exc:
            raise HTTPException(status_code=exc.status_code, detail=exc.message) from exc

    def cancel_request(self, ride_id, passenger_id) -> dict:
        try:
            return self.service.cancel_request(ride_id, passenger_id)
        except RideError as exc:
            raise HTTPException(status_code=exc.status_code, detail=exc.message) from exc

    def my_rides(self, driver_id) -> list[dict]:
        return self.service.get_my_rides(driver_id)

    def my_requests(self, passenger_id) -> list[dict]:
        return self.service.get_my_requests(passenger_id)

    def calculate_cost(self, body: CostCalculationRequest) -> dict:
        try:
            return RideService.calculate_cost(
                body.distancia, body.consumo, body.preco_combustivel, body.passageiros
            )
        except RideError as exc:
            raise HTTPException(status_code=exc.status_code, detail=exc.message) from exc
