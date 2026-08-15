"""Ride routes: search, publish, request seat, my rides."""
from __future__ import annotations

from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy.orm import Session

from controllers.ride_controller import RideController
from database.connection import get_db
from database.models.user import User
from middleware.auth import get_current_user, get_optional_user
from schemas.rides import CostCalculationRequest, RideCreateRequest

router = APIRouter(tags=["Rides"])


@router.get("/rides", summary="List / search active ride offers")
def list_rides(
    request: Request,
    trip_type: Optional[str] = None,
    departure_city: Optional[str] = None,
    date: Optional[date] = None,
    limit: int = Query(50, ge=1, le=100),
    cursor: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user),
):
    """
    Under /api/v1 this returns a page: {items, next_cursor, has_more}.

    Under the deprecated unversioned /api it returns a bare list, which is
    what the existing web frontend expects. This is the whole reason the
    version is in the path -- the response shape could be improved for new
    clients without breaking one already in the wild.
    """
    controller = RideController(db)
    if request.url.path.startswith("/api/v1/"):
        return controller.list_rides_page(
            trip_type, departure_city, date,
            viewer=current_user, limit=limit, cursor=cursor,
        )
    return controller.list_rides(trip_type, departure_city, date, viewer=current_user)


@router.get("/rides/{ride_id}", summary="Get a single ride offer")
def get_ride(
    ride_id: str,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user),
) -> dict:
    return RideController(db).get_ride(ride_id, viewer=current_user)


@router.post("/rides", status_code=201, summary="Publish a new ride offer (drivers only)")
def create_ride(
    body: RideCreateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    return RideController(db).create_ride(current_user.id, body)


@router.post("/rides/{ride_id}/request", status_code=201, summary="Request a seat (creates PENDING)")
def request_seat(
    ride_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    return RideController(db).request_seat(ride_id, current_user.id)


@router.delete("/rides/{ride_id}/request", summary="Passenger cancels their own reservation")
def cancel_request(
    ride_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    return RideController(db).cancel_request(ride_id, current_user.id)


@router.post(
    "/rides/{ride_id}/requests/{request_id}/approve",
    summary="Driver confirms a PENDING request",
)
def approve_request(
    ride_id: str,
    request_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    return RideController(db).approve_request(ride_id, request_id, current_user.id)


@router.delete(
    "/rides/{ride_id}/requests/{request_id}",
    summary="Driver cancels/rejects a request",
)
def reject_request(
    ride_id: str,
    request_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    return RideController(db).reject_request(ride_id, request_id, current_user.id)


@router.delete("/rides/{ride_id}", summary="Driver cancels their own published ride")
def cancel_ride(
    ride_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    return RideController(db).cancel_ride(ride_id, current_user.id)


@router.get("/my-rides", summary="Rides published by the authenticated driver")
def my_rides(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list:
    return RideController(db).my_rides(current_user.id)


@router.get("/my-requests", summary="All seat reservations for the authenticated passenger")
def my_requests(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list:
    return RideController(db).my_requests(current_user.id)


@router.get("/my-ride-requests", summary="PENDING requests for the authenticated driver's rides")
def my_ride_requests(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list:
    return RideController(db).driver_requests(current_user.id)


@router.post("/rides/calculate-cost", summary="Calculate ride cost (no auth required)")
def calculate_cost(
    body: CostCalculationRequest,
    db: Session = Depends(get_db),
) -> dict:
    return RideController(db).calculate_cost(body)
