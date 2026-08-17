"""RideRepository — all database operations on ride_offers and ride_requests."""
from __future__ import annotations

from datetime import date, datetime

from sqlalchemy import and_, func, select, tuple_
from sqlalchemy.orm import Session, joinedload

from app_time import local_to_utc
from database.models.ride_offer import RideOffer
from database.models.ride_request import RideRequest


class RideRepository:
    """Encapsulates all data-access operations for RideOffers and RideRequests."""

    def __init__(self, db: Session) -> None:
        self.db = db

    # ── RideOffer queries ──────────────────────────────────────────────────────

    def find_all(
        self,
        *,
        trip_type: str | None = None,
        departure_city: str | None = None,
        ride_date: date | None = None,
        status: str = "ACTIVE",   # PostgreSQL enum value — uppercase
        limit: int | None = None,
        after: tuple[datetime, str] | None = None,
    ) -> list[RideOffer]:
        """
        Search active rides.

        `limit` and `after` implement keyset pagination. Ordering is
        (departure_time, id): the timestamp is what users care about and the
        id breaks ties so the sort is total, which is what makes the cursor
        stable. OFFSET would drift as rides are published or cancelled between
        pages -- a phone scrolling a list would see duplicates and gaps.
        """
        stmt = (
            select(RideOffer)
            .options(
                joinedload(RideOffer.driver),
                joinedload(RideOffer.requests),
            )
            .where(RideOffer.status == status.upper())
            .order_by(RideOffer.departure_time, RideOffer.id)
        )
        if trip_type:
            stmt = stmt.where(RideOffer.trip_type == trip_type.upper())
        if departure_city:
            stmt = stmt.where(
                func.lower(RideOffer.departure_city) == func.lower(departure_city)
            )
        if ride_date:
            # A calendar day is a local-time concept. Building the bounds in
            # UTC put the window three hours out and silently dropped rides
            # from the last three hours of the requested day.
            start = local_to_utc(datetime(ride_date.year, ride_date.month, ride_date.day))
            end = local_to_utc(
                datetime(ride_date.year, ride_date.month, ride_date.day, 23, 59, 59)
            )
            stmt = stmt.where(
                and_(RideOffer.departure_time >= start, RideOffer.departure_time <= end)
            )
        if after is not None:
            cursor_time, cursor_id = after
            stmt = stmt.where(
                tuple_(RideOffer.departure_time, RideOffer.id) > (cursor_time, cursor_id)
            )
        if limit is not None:
            # joinedload against a collection multiplies rows, so LIMIT cannot
            # be applied in SQL without truncating a ride's requests. The
            # result set here is one campus's active rides; slicing after the
            # fact is correct and fast enough. Revisit with a subquery load if
            # that stops being true.
            rides = list(self.db.execute(stmt).unique().scalars().all())
            return rides[:limit]
        return list(self.db.execute(stmt).unique().scalars().all())

    def find_by_id(self, ride_id) -> RideOffer | None:
        return self.db.execute(
            select(RideOffer)
            .options(joinedload(RideOffer.driver), joinedload(RideOffer.requests))
            .where(RideOffer.id == ride_id)
        ).unique().scalar_one_or_none()

    def find_by_driver(self, driver_id) -> list[RideOffer]:
        return list(
            self.db.execute(
                select(RideOffer)
                .options(joinedload(RideOffer.requests))
                .where(RideOffer.driver_id == driver_id)
                .order_by(RideOffer.departure_time.desc())
            ).unique().scalars().all()
        )

    def count_active(self) -> int:
        return self.db.execute(
            select(func.count()).select_from(RideOffer).where(RideOffer.status == "ACTIVE")
        ).scalar_one()

    # ── RideOffer mutations ────────────────────────────────────────────────────

    def create(
        self,
        *,
        driver_id,
        trip_type: str,
        departure_city: str,
        destination: str,
        departure_time: datetime,
        available_seats: int,
        price_per_passenger: float,
        vehicle: str | None = None,
        license_plate: str | None = None,
        neighborhood: str | None = None,
    ) -> RideOffer:
        ride = RideOffer(
            driver_id=driver_id,
            trip_type=trip_type.upper(),
            departure_city=departure_city,
            destination=destination,
            departure_time=departure_time,
            available_seats=available_seats,
            price_per_passenger=price_per_passenger,
            vehicle=vehicle,
            license_plate=license_plate,
            neighborhood=neighborhood,
            status="ACTIVE",
        )
        self.db.add(ride)
        self.db.flush()
        self.db.refresh(ride)
        return ride

    def update_status(self, ride_id, status: str) -> RideOffer | None:
        ride = self.find_by_id(ride_id)
        if not ride:
            return None
        ride.status = status.upper()   # ensure uppercase enum value
        self.db.flush()
        return ride

    # ── RideRequest queries ────────────────────────────────────────────────────

    def find_request(self, ride_id, passenger_id) -> RideRequest | None:
        """Find an active (non-cancelled) request for duplicate check."""
        return self.db.execute(
            select(RideRequest).where(
                and_(
                    RideRequest.ride_id == ride_id,
                    RideRequest.passenger_id == passenger_id,
                    RideRequest.status != "CANCELLED",
                )
            )
        ).scalar_one_or_none()

    def find_any_request(self, ride_id, passenger_id) -> RideRequest | None:
        """Find any request including CANCELLED (for reactivation)."""
        return self.db.execute(
            select(RideRequest).where(
                and_(
                    RideRequest.ride_id == ride_id,
                    RideRequest.passenger_id == passenger_id,
                )
            )
        ).scalar_one_or_none()

    def find_request_by_id(self, request_id) -> RideRequest | None:
        """Find a request by its own ID, loading ride and passenger."""
        return self.db.execute(
            select(RideRequest)
            .options(
                joinedload(RideRequest.ride).joinedload(RideOffer.driver),
                joinedload(RideRequest.passenger),
            )
            .where(RideRequest.id == request_id)
        ).unique().scalar_one_or_none()

    def find_requests_by_passenger(self, passenger_id) -> list[RideRequest]:
        """All requests by passenger — non-cancelled (active view)."""
        return list(
            self.db.execute(
                select(RideRequest)
                .options(
                    joinedload(RideRequest.ride).joinedload(RideOffer.driver),
                    joinedload(RideRequest.ride).joinedload(RideOffer.requests),
                )
                .where(
                    and_(
                        RideRequest.passenger_id == passenger_id,
                        RideRequest.status != "CANCELLED",
                    )
                )
                .order_by(RideRequest.created_at.desc())
            ).unique().scalars().all()
        )

    def find_all_requests_by_passenger(self, passenger_id) -> list[RideRequest]:
        """All requests by passenger — all statuses including CANCELLED (for history)."""
        return list(
            self.db.execute(
                select(RideRequest)
                .options(
                    joinedload(RideRequest.ride).joinedload(RideOffer.driver),
                    joinedload(RideRequest.ride).joinedload(RideOffer.requests),
                )
                .where(RideRequest.passenger_id == passenger_id)
                .order_by(RideRequest.created_at.desc())
            ).unique().scalars().all()
        )

    def find_requests_by_driver(self, driver_id) -> list[RideRequest]:
        """All PENDING requests for rides owned by this driver."""
        return list(
            self.db.execute(
                select(RideRequest)
                .join(RideOffer, RideRequest.ride_id == RideOffer.id)
                .options(
                    joinedload(RideRequest.ride),
                    joinedload(RideRequest.passenger),
                )
                .where(
                    and_(
                        RideOffer.driver_id == driver_id,
                        RideRequest.status == "PENDING",
                    )
                )
                .order_by(RideRequest.created_at.desc())
            ).unique().scalars().all()
        )

    def count_confirmed_for_ride(self, ride_id) -> int:
        return self.db.execute(
            select(func.count())
            .select_from(RideRequest)
            .where(
                and_(
                    RideRequest.ride_id == ride_id,
                    RideRequest.status == "APPROVED",
                )
            )
        ).scalar_one()

    # ── RideRequest mutations ─────────────────────────────────────────────────

    def create_request(self, ride_id, passenger_id) -> RideRequest:
        """New seat requests start as PENDING. Reactivates a cancelled request if one exists (avoids unique violation)."""
        existing = self.find_any_request(ride_id, passenger_id)
        if existing:
            existing.status = "PENDING"
            self.db.flush()
            self.db.refresh(existing)
            return existing
        req = RideRequest(
            ride_id=ride_id,
            passenger_id=passenger_id,
            status="PENDING",
        )
        self.db.add(req)
        self.db.flush()
        self.db.refresh(req)
        return req

    def approve_request(self, request_id) -> RideRequest | None:
        """Driver approves a PENDING request → APPROVED."""
        req = self.find_request_by_id(request_id)
        if not req:
            return None
        req.status = "APPROVED"
        self.db.flush()
        return req

    def reject_by_driver(self, request_id) -> RideRequest | None:
        """Driver rejects/cancels a request → CANCELLED."""
        req = self.find_request_by_id(request_id)
        if not req:
            return None
        req.status = "CANCELLED"
        self.db.flush()
        return req

    def cancel_request(self, ride_id, passenger_id) -> RideRequest | None:
        """Passenger cancels their own request → CANCELLED."""
        req = self.find_request(ride_id, passenger_id)
        if not req:
            return None
        req.status = "CANCELLED"
        self.db.flush()
        return req

    def cancel_all_requests_for_ride(self, ride_id) -> int:
        """Cancel every non-cancelled request for a ride. Returns count of cancelled."""
        reqs = list(
            self.db.execute(
                select(RideRequest).where(
                    and_(
                        RideRequest.ride_id == ride_id,
                        RideRequest.status != "CANCELLED",
                    )
                )
            ).scalars().all()
        )
        for req in reqs:
            req.status = "CANCELLED"
        self.db.flush()
        return len(reqs)
