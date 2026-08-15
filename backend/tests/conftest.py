"""
Shared test setup.

pytest imports conftest before any test module, which matters here: config.py
validates its environment at import and refuses to start without real secrets.
Setting these first is what lets the suite import application code at all.

DATABASE_URL points at nothing on purpose. Nothing in this suite touches a
database -- ORM objects are built as transient instances and serialization is
pure Python -- and a bogus URL guarantees a test can never reach the real one
by accident. SQLAlchemy does not connect when the engine is created, so an
unreachable host costs nothing.
"""
from __future__ import annotations

import os
import sys
import uuid
from pathlib import Path

BACKEND = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BACKEND))

# Must happen before any `import config`. load_dotenv() does not override
# values already present in the environment, so these win over backend/.env.
os.environ.update({
    "SECRET_KEY":         "test-" + "s" * 44,
    "JWT_SECRET_KEY":     "test-" + "j" * 44,
    "DATABASE_URL":       "postgresql://test:test@127.0.0.1:1/nonexistent",
    "DEBUG":              "false",
    "MIN_CLIENT_VERSION": "1.2.0",
    "RATE_LIMIT_LOGIN":   "3/minute",
})

import pytest  # noqa: E402

from database.models.enums import RequestStatus, RideStatus, TripType, UserRole  # noqa: E402
from database.models.ride_offer import RideOffer  # noqa: E402
from database.models.ride_request import RideRequest  # noqa: E402
from database.models.user import User  # noqa: E402


def make_user(role=UserRole.PASSENGER, **overrides):
    fields = {
        "id": uuid.uuid4(),
        "rgm": "12345678",
        "full_name": "Ana Paula Souza",
        "password_hash": "x",
        "role": role,
    }
    fields.update(overrides)
    return User(**fields)


@pytest.fixture
def driver():
    return make_user(
        UserRole.DRIVER, rgm="11111111", full_name="Ana Paula Souza",
        course="ADS", phone="51999998888", neighborhood="Centro",
        vehicle_model="Onix", vehicle_brand="Chevrolet", vehicle_color="Prata",
    )


@pytest.fixture
def stranger():
    return make_user(rgm="22222222", full_name="Bruno Lima")


@pytest.fixture
def approved_passenger():
    return make_user(rgm="33333333", full_name="Carla Dias", phone="51977776666")


@pytest.fixture
def pending_passenger():
    return make_user(rgm="44444444", full_name="Diego Reis", phone="51966665555")


@pytest.fixture
def admin():
    return make_user(UserRole.ADMIN, rgm="00000001", full_name="Administrador CESUCAR")


@pytest.fixture
def ride(driver, approved_passenger, pending_passenger):
    """An active ride with one approved and one pending seat request."""
    from app_time import parse_local

    offer = RideOffer(
        id=uuid.uuid4(),
        driver_id=driver.id,
        trip_type=TripType.GOING_TO_CESUCA,
        departure_city="Gravataí",
        destination="CESUCA",
        departure_time=parse_local("2026-08-20", "07:00"),
        available_seats=3,
        price_per_passenger=8.50,
        vehicle="Onix prata",
        license_plate="ABC1D23",
        neighborhood="Morada do Vale",
        status=RideStatus.ACTIVE,
    )
    offer.driver = driver
    offer.requests = [
        RideRequest(id=uuid.uuid4(), ride_id=offer.id,
                    passenger_id=approved_passenger.id, status=RequestStatus.APPROVED),
        RideRequest(id=uuid.uuid4(), ride_id=offer.id,
                    passenger_id=pending_passenger.id, status=RequestStatus.PENDING),
    ]
    for request in offer.requests:
        request.ride = offer
    offer.requests[0].passenger = approved_passenger
    offer.requests[1].passenger = pending_passenger
    return offer


@pytest.fixture(scope="session")
def client():
    """
    TestClient over the real application. No database is reachable.

    raise_server_exceptions=False makes an unhandled error come back as the
    500 the application would really send, instead of being re-raised into the
    test. That is what the exception handler is for, and it lets the suite
    assert on the response a user would actually receive.
    """
    from fastapi.testclient import TestClient

    import app as app_module

    return TestClient(app_module.app, raise_server_exceptions=False)
