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
    """
    Handles ride publication, search, seat reservation, and cancellation.

    Demonstrates OOP via a rich service class that orchestrates multiple
    repository objects and enforces domain rules.
    """

    def __init__(self, db: Session) -> None:
        self.db = db
        self._rides = RideRepository(db)
        self._users = UserRepository(db)
        self._notifs = NotificationRepository(db)
        self._audit = AuditLogRepository(db)

    # ── Helpers ────────────────────────────────────────────────────────────────

    @staticmethod
    def tipo_to_trip_type(tipo: str) -> str:
        """Map frontend 'ida'/'volta' to DB enum."""
        return TRIP_GOING if tipo == "ida" else TRIP_RETURNING

    @staticmethod
    def trip_type_to_tipo(trip_type: str) -> str:
        return "ida" if trip_type == TRIP_GOING else "volta"

    @staticmethod
    def _parse_departure_time(data: str, horario: str) -> datetime:
        """Combine a date string and a time string into a UTC datetime."""
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
    ) -> list[dict]:
        """Return a list of active ride-offer dicts matching the given filters."""
        rides = self._rides.find_all(
            trip_type=trip_type,
            departure_city=departure_city,
            ride_date=ride_date,
        )
        return [r.to_dict() for r in rides]

    def get_ride(self, ride_id) -> RideOffer:    # ride_id is a UUID string
        ride = self._rides.find_by_id(ride_id)
        if not ride:
            raise RideError("Carona não encontrada.", 404)
        return ride

    def get_my_rides(self, driver_id) -> list[dict]:
        return [r.to_dict() for r in self._rides.find_by_driver(driver_id)]

    # ── Publish ───────────────────────────────────────────────────────────────

    def create_ride(
        self,
        driver_id,    # UUID string
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
        """
        Publish a new ride offer.

        Business rules:
          - Only drivers may create rides.
          - Available seats must be 1-8.
          - Price must be >= 0.
          - Departure time must be in the future.
          - Route follows university pattern: City ↔ CESUCA.
        """
        driver = self._users.find_by_id(driver_id)
        # driver.role is a UserRole enum whose .value is "DRIVER" or "ADMIN" (uppercase)
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

        # University routing rule
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
            action="RIDE_CREATED",        # matches AuditAction.RIDE_CREATED
            user_id=driver_id,
            details={
                "ride_id": str(ride.id),  # UUID must be a string for JSONB
                "tipo": tipo,
                "cidade": cidade,
                "data": data,
            },
        )
        self.db.commit()
        self.db.refresh(ride)
        return ride.to_dict()

    # ── Seat request ──────────────────────────────────────────────────────────

    def request_seat(self, ride_id, passenger_id) -> dict:    # UUID strings
        """
        Reserve a seat on an existing ride offer.

        Business rules:
          - Ride must be active.
          - At least one seat must be available.
          - Passenger cannot book their own ride.
          - Passenger cannot book the same ride twice.
        """
        ride = self.get_ride(ride_id)

        # ride.status is a RideStatus enum — compare against uppercase value
        if ride.status.value.upper() != "ACTIVE":
            raise RideError("Esta carona não está mais disponível.", 400)

        if ride.driver_id == passenger_id:
            raise RideError("Você não pode reservar sua própria carona.", 400)

        existing = self._rides.find_request(ride_id, passenger_id)
        if existing:
            raise RideError("Você já reservou esta carona.", 409)

        seats_left = ride.seats_available()
        if seats_left <= 0:
            raise RideError("Esta carona está sem vagas disponíveis.", 400)

        self._rides.create_request(ride_id, passenger_id)

        # Mark ride as full when last seat is taken
        if seats_left == 1:
            self._rides.update_status(ride_id, "FULL")

        # Notify the driver
        passenger = self._users.find_by_id(passenger_id)
        if passenger:
            self._notifs.create(
                user_id=ride.driver_id,
                title="Nova reserva",
                message=(
                    f"{passenger.full_name} reservou uma vaga em sua carona "
                    f"{ride.origem} → {ride.destino} às {ride.departure_time.strftime('%H:%M')}."
                ),
            )

        self._audit.log(
            action="REQUEST_CREATED",     # matches AuditAction.REQUEST_CREATED
            user_id=passenger_id,
            details={"ride_id": str(ride_id)},
        )
        self.db.commit()
        return {"message": "Reserva confirmada.", "ride": ride.to_dict()}

    def cancel_request(self, ride_id, passenger_id) -> dict:    # UUID strings
        """Cancel an existing seat reservation."""
        req = self._rides.cancel_request(ride_id, passenger_id)
        if not req:
            raise RideError("Reserva não encontrada.", 404)

        # Re-activate ride if it was full
        ride = self.get_ride(ride_id)
        if ride.status.value.upper() == "FULL":
            self._rides.update_status(ride_id, "ACTIVE")

        self._audit.log(
            action="REQUEST_CANCELLED",   # matches AuditAction.REQUEST_CANCELLED
            user_id=passenger_id,
            details={"ride_id": str(ride_id)},
        )
        self.db.commit()
        return {"message": "Reserva cancelada."}

    def get_my_requests(self, passenger_id) -> list[dict]:    # UUID string
        """Return all active seat reservations for a passenger."""
        return [r.to_dict() for r in self._rides.find_requests_by_passenger(passenger_id)]

    # ── Cost calculation ─────────────────────────────────────────────────────

    @staticmethod
    def calculate_cost(
        distancia: float,
        consumo: float,
        preco_combustivel: float,
        passageiros: int,
    ) -> dict:
        """Pure business logic — no DB access needed."""
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
