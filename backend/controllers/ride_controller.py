"""RideController — handles HTTP concerns for ride endpoints."""
from __future__ import annotations

from sqlalchemy.orm import Session

from errors import ApiError, ErrorCode
from schemas.rides import CostCalculationRequest, RideCreateRequest
from services.ride_service import RideError, RideService

# Message fragment -> stable code. RideError predates codes, so the ones that
# do not set `code` explicitly are mapped here by what they say.
_CODE_BY_FRAGMENT = (
    ("não encontrada",        ErrorCode.RIDE_NOT_FOUND),
    ("Solicitação não encon", ErrorCode.REQUEST_NOT_FOUND),
    ("Reserva não encontrada", ErrorCode.REQUEST_NOT_FOUND),
    ("não está mais dispon",  ErrorCode.RIDE_UNAVAILABLE),
    ("já foi cancelada",      ErrorCode.RIDE_UNAVAILABLE),
    ("sem vagas",             ErrorCode.RIDE_FULL),
    ("Não há vagas",          ErrorCode.RIDE_FULL),
    ("Apenas motoristas",     ErrorCode.NOT_A_DRIVER),
    ("sua própria carona",    ErrorCode.OWN_RIDE),
    ("não está pendente",     ErrorCode.REQUEST_NOT_PENDING),
    ("não tem permissão",     ErrorCode.FORBIDDEN),
)

_CODE_BY_STATUS = {
    400: ErrorCode.VALIDATION_FAILED,
    403: ErrorCode.FORBIDDEN,
    404: ErrorCode.NOT_FOUND,
    409: ErrorCode.VALIDATION_FAILED,
}


def _to_api_error(exc: RideError) -> ApiError:
    if getattr(exc, "code", None):
        return ApiError(exc.status_code, exc.message, exc.code)
    for fragment, code in _CODE_BY_FRAGMENT:
        if fragment in exc.message:
            return ApiError(exc.status_code, exc.message, code)
    return ApiError(exc.status_code, exc.message,
                    _CODE_BY_STATUS.get(exc.status_code, ErrorCode.VALIDATION_FAILED))


class RideController:
    """Bridges FastAPI routes and RideService."""

    def __init__(self, db: Session) -> None:
        self.service = RideService(db)

    def list_rides(self, trip_type, departure_city, ride_date, viewer=None) -> list[dict]:
        return self.service.search_rides(
            trip_type=trip_type,
            departure_city=departure_city,
            ride_date=ride_date,
            viewer=viewer,
        )

    def list_rides_page(self, trip_type, departure_city, ride_date, viewer=None,
                        limit: int = 50, cursor: str | None = None) -> dict:
        try:
            return self.service.search_rides_page(
                trip_type=trip_type,
                departure_city=departure_city,
                ride_date=ride_date,
                viewer=viewer,
                limit=limit,
                cursor=cursor,
            )
        except RideError as exc:
            raise _to_api_error(exc) from exc

    def get_ride(self, ride_id, viewer=None) -> dict:
        try:
            return self.service.get_ride(ride_id).to_dict(viewer)
        except RideError as exc:
            raise _to_api_error(exc) from exc

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
            raise _to_api_error(exc) from exc

    def request_seat(self, ride_id, passenger_id) -> dict:
        try:
            return self.service.request_seat(ride_id, passenger_id)
        except RideError as exc:
            raise _to_api_error(exc) from exc

    def cancel_request(self, ride_id, passenger_id) -> dict:
        try:
            return self.service.cancel_request(ride_id, passenger_id)
        except RideError as exc:
            raise _to_api_error(exc) from exc

    def approve_request(self, ride_id, request_id, driver_id) -> dict:
        try:
            return self.service.approve_request(ride_id, request_id, driver_id)
        except RideError as exc:
            raise _to_api_error(exc) from exc

    def reject_request(self, ride_id, request_id, driver_id) -> dict:
        try:
            return self.service.reject_request(ride_id, request_id, driver_id)
        except RideError as exc:
            raise _to_api_error(exc) from exc

    def driver_requests(self, driver_id) -> list[dict]:
        return self.service.get_driver_requests(driver_id)

    def cancel_ride(self, ride_id, driver_id) -> dict:
        try:
            return self.service.cancel_ride(ride_id, driver_id)
        except RideError as exc:
            raise _to_api_error(exc) from exc

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
            raise _to_api_error(exc) from exc
