"""Ride routes: search, publish, request seat, my rides."""
from __future__ import annotations

from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from controllers.ride_controller import RideController
from database.connection import get_db
from database.models.user import User
from middleware.auth import get_current_user, get_optional_user
from schemas.rides import CostCalculationRequest, RideCreateRequest

router = APIRouter(prefix="/api", tags=["Rides"])


@router.get("/rides", summary="List / search active ride offers")
def list_rides(
    trip_type: Optional[str] = None,
    departure_city: Optional[str] = None,
    date: Optional[date] = None,
    db: Session = Depends(get_db),
    _: Optional[User] = Depends(get_optional_user),
) -> list:
    return RideController(db).list_rides(trip_type, departure_city, date)


@router.get("/rides/{ride_id}", summary="Get a single ride offer")
def get_ride(
    ride_id: str,          # UUID path parameter — must be str, not int
    db: Session = Depends(get_db),
) -> dict:
    return RideController(db).get_ride(ride_id)


@router.post("/rides", status_code=201, summary="Publish a new ride offer (drivers only)")
def create_ride(
    body: RideCreateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    return RideController(db).create_ride(current_user.id, body)


@router.post("/rides/{ride_id}/request", status_code=201, summary="Request a seat")
def request_seat(
    ride_id: str,          # UUID path parameter
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    return RideController(db).request_seat(ride_id, current_user.id)


@router.delete("/rides/{ride_id}/request", summary="Cancel a seat reservation")
def cancel_request(
    ride_id: str,          # UUID path parameter
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    return RideController(db).cancel_request(ride_id, current_user.id)


@router.get("/my-rides", summary="Rides published by the authenticated driver")
def my_rides(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list:
    return RideController(db).my_rides(current_user.id)


@router.get("/my-requests", summary="Seat reservations made by the authenticated passenger")
def my_requests(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list:
    return RideController(db).my_requests(current_user.id)


@router.post("/rides/calculate-cost", summary="Calculate ride cost (no auth required)")
def calculate_cost(
    body: CostCalculationRequest,
    db: Session = Depends(get_db),
) -> dict:
    return RideController(db).calculate_cost(body)
