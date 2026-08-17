"""
Who is allowed to see what.

These are the regression tests for the leak that started this work: /api/rides
accepts anonymous callers and used to return the driver's full name, phone
number, home neighbourhood, vehicle details and licence plate to every one of
them. The whole driver directory plus everyone's travel schedule was
scrapeable without an account.

Each test names a viewer and asserts what that viewer may and may not see.
"""
from __future__ import annotations

import pytest

from database.models.enums import RequestStatus

# Details that identify a person or their car well enough to find them.
CONTACT_FIELDS = ("driver_phone", "license_plate", "placa", "driver_neighborhood")
IDENTITY_FIELDS = ("driver", "course", "curso", "driver_vehicle_brand",
                   "driver_vehicle_model", "driver_vehicle_color", "vehicle", "veiculo")
# What public ride search genuinely needs: route, schedule, price, seats.
PUBLIC_FIELDS = ("id", "origem", "destino", "data", "horario",
                 "vagas", "vagasDisp", "valor", "tipo", "status")


class TestAnonymous:
    def test_tier_is_public(self, ride):
        assert ride.visibility_for(None) == "public"

    @pytest.mark.parametrize("field", CONTACT_FIELDS + IDENTITY_FIELDS)
    def test_cannot_see_identifying_fields(self, ride, field):
        assert field not in ride.to_dict(None)

    @pytest.mark.parametrize("field", PUBLIC_FIELDS)
    def test_still_gets_what_search_needs(self, ride, field):
        assert field in ride.to_dict(None)

    def test_no_personal_data_anywhere_in_the_payload(self, ride):
        """Not just absent keys -- no leaked value under any other name."""
        serialized = str(ride.to_dict(None).values())
        for secret in ("51999998888", "ABC1D23", "Ana Paula Souza", "Onix", "Centro"):
            assert secret not in serialized

    def test_defaults_to_public_when_a_caller_forgets_the_viewer(self, ride):
        """A missing viewer must under-share, never over-share."""
        assert ride.to_dict() == ride.to_dict(None)


class TestSignedInStranger:
    def test_tier_is_auth(self, ride, stranger):
        assert ride.visibility_for(stranger) == "auth"

    def test_sees_who_is_driving_and_what_car(self, ride, stranger):
        data = ride.to_dict(stranger)
        assert data["driver"] == "Ana Paula Souza"
        assert data["driver_vehicle_brand"] == "Chevrolet"
        assert data["neighborhood"] == "Morada do Vale"   # pickup area for the ride

    @pytest.mark.parametrize("field", CONTACT_FIELDS)
    def test_still_cannot_see_contact_details(self, ride, stranger, field):
        assert field not in ride.to_dict(stranger)


class TestPassengerAwaitingApproval:
    def test_tier_is_auth_not_contact(self, ride, pending_passenger):
        assert ride.visibility_for(pending_passenger) == "auth"

    @pytest.mark.parametrize("field", CONTACT_FIELDS)
    def test_asking_does_not_earn_contact_details(self, ride, pending_passenger, field):
        assert field not in ride.to_dict(pending_passenger)

    def test_nested_ride_in_a_pending_request_also_withholds(self, ride, pending_passenger):
        pending = next(r for r in ride.requests if r.status == RequestStatus.PENDING)
        nested = pending.to_dict(pending_passenger)["ride"]
        for field in CONTACT_FIELDS:
            assert field not in nested


class TestApprovedPassenger:
    def test_tier_is_contact(self, ride, approved_passenger):
        assert ride.visibility_for(approved_passenger) == "contact"

    def test_approval_grants_contact_details(self, ride, approved_passenger):
        data = ride.to_dict(approved_passenger)
        assert data["driver_phone"] == "51999998888"
        assert data["placa"] == "ABC1D23"

    def test_nested_ride_in_an_approved_request_grants_them_too(self, ride, approved_passenger):
        approved = next(r for r in ride.requests if r.status == RequestStatus.APPROVED)
        assert approved.to_dict(approved_passenger)["ride"]["driver_phone"] == "51999998888"


class TestDriverAndAdmin:
    def test_driver_sees_their_own_ride_fully(self, ride, driver):
        assert ride.visibility_for(driver) == "contact"
        assert ride.to_dict(driver)["license_plate"] == "ABC1D23"

    def test_admin_sees_everything(self, ride, admin):
        assert ride.visibility_for(admin) == "contact"
        assert ride.to_dict(admin)["driver_phone"] == "51999998888"


class TestPassengerDetailsSeenByDriver:
    """The same rule in the opposite direction."""

    def test_driver_sees_the_name_while_pending(self, ride, driver):
        pending = next(r for r in ride.requests if r.status == RequestStatus.PENDING)
        assert pending.to_dict(driver)["passenger_name"] == "Diego Reis"

    @pytest.mark.parametrize("field", ("passenger_phone", "passenger_rgm"))
    def test_driver_does_not_get_contact_details_while_pending(self, ride, driver, field):
        pending = next(r for r in ride.requests if r.status == RequestStatus.PENDING)
        assert field not in pending.to_dict(driver)

    def test_driver_gets_them_once_approved(self, ride, driver):
        approved = next(r for r in ride.requests if r.status == RequestStatus.APPROVED)
        data = approved.to_dict(driver)
        assert data["passenger_phone"] == "51977776666"
        assert data["passenger_rgm"] == "33333333"

    def test_passenger_always_sees_their_own_details(self, ride, pending_passenger):
        pending = next(r for r in ride.requests if r.status == RequestStatus.PENDING)
        assert pending.to_dict(pending_passenger)["passenger_phone"] == "51966665555"

    def test_no_viewer_gets_nothing(self, ride):
        pending = next(r for r in ride.requests if r.status == RequestStatus.PENDING)
        assert "passenger_phone" not in pending.to_dict(None)
