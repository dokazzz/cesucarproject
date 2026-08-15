"""RideService — ride offer and ride request business logic."""
from __future__ import annotations

from datetime import date, datetime, timezone

from sqlalchemy.orm import Session

from database.models.ride_offer import (
    RideOffer,
    TRIP_GOING,
    TRIP_RETURNING,
)
from database.models.ride_request import RideRequest
from database.repositories.audit_log_repository import AuditLogRepository
from database.repositories.notification_repository import NotificationRepository
from database.repositories.ride_repository import RideRepository
from database.repositories.user_repository import UserRepository


class RideError(Exception):
    """Raised for ride-related business rule violations."""

    def __init__(self, message: str, status_code: int = 400) -> None:
        super().__init__(message)
        self.message = message
        self.status_code = status_code


class RideService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self._rides = RideRepository(db)
        self._users = UserRepository(db)
        self._notifs = NotificationRepository(db)
        self._audit = AuditLogRepository(db)

    # ── Helpers ────────────────────────────────────────────────────────────────

    @staticmethod
    def tipo_to_trip_type(tipo: str) -> str:
        return TRIP_GOING if tipo == "ida" else TRIP_RETURNING

    @staticmethod
    def trip_type_to_tipo(trip_type: str) -> str:
        return "ida" if trip_type == TRIP_GOING else "volta"

    @staticmethod
    def _parse_departure_time(data: str, horario: str) -> datetime:
        try:
            dt = datetime.strptime(f"{data} {horario}", "%Y-%m-%d %H:%M")
            return dt.replace(tzinfo=timezone.utc)
        except ValueError as exc:
            raise RideError(f"Data ou horário inválido: {exc}", 400) from exc

    # ── Search ────────────────────────────────────────────────────────────────

    def search_rides(
        self,
        *,
        trip_type: str | None = None,
        departure_city: str | None = None,
        ride_date: date | None = None,
        viewer=None,
    ) -> list[dict]:
        rides = self._rides.find_all(
            trip_type=trip_type,
            departure_city=departure_city,
            ride_date=ride_date,
        )
        return [r.to_dict(viewer) for r in rides]

    def get_ride(self, ride_id) -> RideOffer:
        ride = self._rides.find_by_id(ride_id)
        if not ride:
            raise RideError("Carona não encontrada.", 404)
        return ride

    def get_my_rides(self, driver_id) -> list[dict]:
        # The driver owns these rides, so they see their own contact details.
        viewer = self._users.find_by_id(driver_id)
        return [r.to_dict(viewer) for r in self._rides.find_by_driver(driver_id)]

    # ── Publish ───────────────────────────────────────────────────────────────

    def create_ride(
        self,
        driver_id,
        *,
        tipo: str,
        cidade: str,
        bairro: str | None = None,
        data: str,
        horario: str,
        vagas: int,
        valor: float,
        veiculo: str | None = None,
        placa: str | None = None,
    ) -> dict:
        driver = self._users.find_by_id(driver_id)
        if not driver or driver.role.value.upper() not in ("DRIVER", "ADMIN"):
            raise RideError("Apenas motoristas podem publicar caronas.", 403)

        if not cidade.strip():
            raise RideError("Informe a cidade.", 400)
        if vagas < 1 or vagas > 8:
            raise RideError("O número de vagas deve ser entre 1 e 8.", 400)
        if valor < 0:
            raise RideError("O valor por passageiro não pode ser negativo.", 400)

        trip_type = self.tipo_to_trip_type(tipo)
        departure_time = self._parse_departure_time(data, horario)

        if trip_type == TRIP_GOING:
            departure_city, destination = cidade.strip(), "CESUCA"
        else:
            departure_city, destination = "CESUCA", cidade.strip()

        ride = self._rides.create(
            driver_id=driver_id,
            trip_type=trip_type,
            departure_city=departure_city,
            destination=destination,
            departure_time=departure_time,
            available_seats=vagas,
            price_per_passenger=valor,
            vehicle=veiculo,
            license_plate=placa.upper() if placa else None,
            neighborhood=bairro.strip() if bairro else None,
        )

        self._audit.log(
            action="RIDE_CREATED",
            user_id=driver_id,
            details={"ride_id": str(ride.id), "tipo": tipo, "cidade": cidade, "data": data},
        )
        self.db.commit()
        self.db.refresh(ride)
        return ride.to_dict(driver)

    # ── Seat request ──────────────────────────────────────────────────────────

    def request_seat(self, ride_id, passenger_id) -> dict:
        """Reserve a seat — creates a PENDING request awaiting driver approval."""
        ride = self.get_ride(ride_id)
        passenger = self._users.find_by_id(passenger_id)

        if ride.status.value.upper() not in ("ACTIVE", "FULL"):
            raise RideError("Esta carona não está mais disponível.", 400)

        if ride.driver_id == passenger_id:
            raise RideError("Você não pode reservar sua própria carona.", 400)

        existing = self._rides.find_request(ride_id, passenger_id)
        if existing:
            raise RideError("Você já tem uma solicitação ativa para esta carona.", 409)

        if ride.seats_available() <= 0:
            raise RideError("Esta carona está sem vagas disponíveis.", 400)

        self._rides.create_request(ride_id, passenger_id)

        # Notify the driver
        if passenger:
            self._notifs.create(
                user_id=ride.driver_id,
                title="Nova solicitação de carona",
                message=(
                    f"{passenger.full_name} solicitou uma vaga em sua carona "
                    f"{ride.origem} → {ride.destino} às {ride.departure_time.strftime('%H:%M')}."
                ),
            )

        self._audit.log(
            action="REQUEST_CREATED",
            user_id=passenger_id,
            details={"ride_id": str(ride_id)},
        )
        self.db.commit()
        # PENDING only — the passenger does not get the driver's phone or plate yet.
        return {"message": "Solicitação enviada. Aguarde a confirmação do motorista.", "ride": ride.to_dict(passenger)}

    # ── Driver approval ───────────────────────────────────────────────────────

    def approve_request(self, ride_id, request_id, driver_id) -> dict:
        """Driver confirms a PENDING ride request."""
        ride = self.get_ride(ride_id)

        if str(ride.driver_id) != str(driver_id):
            raise RideError("Você não tem permissão para confirmar esta solicitação.", 403)

        req = self._rides.find_request_by_id(request_id)
        if not req or str(req.ride_id) != str(ride_id):
            raise RideError("Solicitação não encontrada.", 404)
        if req.status.value != "PENDING":
            raise RideError("Esta solicitação não está pendente.", 400)
        if ride.seats_available() <= 0:
            raise RideError("Não há vagas disponíveis para confirmar.", 400)

        approved = self._rides.approve_request(request_id)

        # Refresh to get updated seat count after approval
        self.db.refresh(ride)
        if ride.seats_available() <= 0:
            self._rides.update_status(ride_id, "FULL")

        # Notify passenger
        passenger = approved.passenger if approved else None
        if passenger:
            self._notifs.create(
                user_id=approved.passenger_id,
                title="Carona confirmada!",
                message=(
                    f"Sua carona {ride.origem} → {ride.destino} "
                    f"às {ride.departure_time.strftime('%H:%M')} foi confirmada pelo motorista!"
                ),
            )

        self._audit.log(
            action="REQUEST_APPROVED",
            user_id=driver_id,
            details={"ride_id": str(ride_id), "request_id": str(request_id)},
        )
        self.db.commit()

        driver = self._users.find_by_id(driver_id)
        result = approved.to_dict(driver) if approved else {}
        result["ride"] = ride.to_dict(driver)
        return result

    def reject_request(self, ride_id, request_id, driver_id) -> dict:
        """Driver rejects/cancels a ride request."""
        ride = self.get_ride(ride_id)

        if str(ride.driver_id) != str(driver_id):
            raise RideError("Você não tem permissão para cancelar esta solicitação.", 403)

        req = self._rides.find_request_by_id(request_id)
        if not req or str(req.ride_id) != str(ride_id):
            raise RideError("Solicitação não encontrada.", 404)
        if req.status.value == "CANCELLED":
            raise RideError("Esta solicitação já foi cancelada.", 400)

        was_approved = req.status.value == "APPROVED"
        self._rides.reject_by_driver(request_id)

        # Re-activate ride if it was full and this was an approved request
        if was_approved and ride.status.value.upper() == "FULL":
            self._rides.update_status(ride_id, "ACTIVE")

        # Notify passenger
        passenger = req.passenger if req else None
        if passenger:
            self._notifs.create(
                user_id=req.passenger_id,
                title="Solicitação cancelada",
                message=(
                    f"Sua solicitação para {ride.origem} → {ride.destino} "
                    f"às {ride.departure_time.strftime('%H:%M')} foi cancelada pelo motorista."
                ),
            )

        self._audit.log(
            action="REQUEST_REJECTED",
            user_id=driver_id,
            details={"ride_id": str(ride_id), "request_id": str(request_id)},
        )
        self.db.commit()
        return {"message": "Solicitação cancelada."}

    def get_driver_requests(self, driver_id) -> list[dict]:
        """Return all PENDING requests for the driver's rides."""
        viewer = self._users.find_by_id(driver_id)
        return [r.to_dict(viewer) for r in self._rides.find_requests_by_driver(driver_id)]

    # ── Passenger cancellation ────────────────────────────────────────────────

    def cancel_request(self, ride_id, passenger_id) -> dict:
        """Passenger cancels their own seat reservation."""
        # Check current status before cancelling (to handle seat release)
        existing = self._rides.find_request(ride_id, passenger_id)
        was_approved = existing and existing.status.value == "APPROVED"

        req = self._rides.cancel_request(ride_id, passenger_id)
        if not req:
            raise RideError("Reserva não encontrada.", 404)

        # Re-activate ride if it was full and this was an approved booking
        if was_approved:
            ride = self.get_ride(ride_id)
            if ride.status.value.upper() == "FULL":
                self._rides.update_status(ride_id, "ACTIVE")

        self._audit.log(
            action="REQUEST_CANCELLED",
            user_id=passenger_id,
            details={"ride_id": str(ride_id)},
        )
        self.db.commit()
        return {"message": "Reserva cancelada."}

    def cancel_ride(self, ride_id, driver_id) -> dict:
        """Driver cancels their own published ride — sets CANCELLED and cancels all requests."""
        ride = self.get_ride(ride_id)

        if str(ride.driver_id) != str(driver_id):
            raise RideError("Você não tem permissão para cancelar esta carona.", 403)

        if ride.status.value.upper() == "CANCELLED":
            raise RideError("Esta carona já foi cancelada.", 400)

        cancelled_count = self._rides.cancel_all_requests_for_ride(ride_id)
        self._rides.update_status(ride_id, "CANCELLED")

        self._audit.log(
            action="RIDE_CANCELLED",
            user_id=driver_id,
            details={"ride_id": str(ride_id), "requests_cancelled": cancelled_count},
        )
        self.db.commit()
        return {"message": "Carona cancelada.", "requests_cancelled": cancelled_count}

    def get_my_requests(self, passenger_id) -> list[dict]:
        """
        Return all seat reservations for a passenger (all statuses).

        Each nested ride is serialized for this passenger, so driver contact
        details appear only on the ones the driver actually approved.
        """
        viewer = self._users.find_by_id(passenger_id)
        return [r.to_dict(viewer) for r in self._rides.find_all_requests_by_passenger(passenger_id)]

    # ── Cost calculation ─────────────────────────────────────────────────────

    @staticmethod
    def calculate_cost(
        distancia: float,
        consumo: float,
        preco_combustivel: float,
        passageiros: int,
    ) -> dict:
        if distancia < 0:
            raise RideError("Distância não pode ser negativa.", 400)
        if consumo <= 0:
            raise RideError("Consumo deve ser maior que zero.", 400)
        if passageiros <= 0:
            raise RideError("Número de passageiros deve ser maior que zero.", 400)
        if preco_combustivel < 0:
            raise RideError("Preço do combustível não pode ser negativo.", 400)

        custo_total = (distancia / consumo) * preco_combustivel
        valor_por_pessoa = custo_total / passageiros
        return {
            "custo_total": round(custo_total, 2),
            "valor_por_pessoa": round(valor_por_pessoa, 2),
        }
