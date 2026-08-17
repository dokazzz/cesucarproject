"""
Ride times.

The parser used to stamp tzinfo=utc onto the local wall-clock time a driver
typed, so a 07:00 ride was stored as 07:00Z -- 04:00 in Porto Alegre. The
website hid it by formatting the same value back out without converting, so
the displayed number always matched what was typed. Only a client rendering an
ISO timestamp in the device's own timezone reveals it, which is exactly what a
phone does.
"""
from __future__ import annotations

from datetime import UTC, datetime, timedelta

from app_time import local_to_utc, now_utc, parse_local, to_local


def test_local_input_is_converted_to_the_right_instant():
    """07:00 in Porto Alegre is 10:00 UTC. Brazil has had no DST since 2019."""
    stored = parse_local("2026-08-20", "07:00")
    assert stored.strftime("%Y-%m-%d %H:%M") == "2026-08-20 10:00"
    assert stored.utcoffset() == timedelta(0)


def test_round_trip_returns_what_the_driver_typed():
    assert to_local(parse_local("2026-08-20", "07:00")).strftime("%H:%M") == "07:00"


def test_the_old_behaviour_was_three_hours_early():
    """Documents the bug, so a regression fails here with an explanation."""
    old = datetime.strptime("2026-08-20 07:00", "%Y-%m-%d %H:%M").replace(tzinfo=UTC)
    assert to_local(old).strftime("%H:%M") == "04:00"


def test_migration_shift_repairs_an_affected_row():
    """Migration 003 adds three hours; this is the value it must produce."""
    old = datetime.strptime("2026-08-20 07:00", "%Y-%m-%d %H:%M").replace(tzinfo=UTC)
    assert old + timedelta(hours=3) == parse_local("2026-08-20", "07:00")


def test_naive_datetimes_are_read_as_local():
    naive = datetime(2026, 8, 20, 7, 0)
    assert local_to_utc(naive).strftime("%H:%M") == "10:00"


def test_aware_datetimes_are_not_shifted_twice():
    already_utc = datetime(2026, 8, 20, 10, 0, tzinfo=UTC)
    assert local_to_utc(already_utc) == already_utc


def test_legacy_naive_values_are_read_back_as_utc():
    """Rows read without an offset are UTC instants, not local times."""
    assert to_local(datetime(2026, 8, 20, 10, 0)).strftime("%H:%M") == "07:00"


def test_to_local_passes_none_through():
    assert to_local(None) is None


def test_now_is_timezone_aware():
    assert now_utc().tzinfo is not None


def test_serialized_ride_shows_local_time_but_stores_the_utc_instant(ride):
    data = ride.to_dict(ride.driver)
    assert data["horario"] == "07:00"          # what a student reads
    assert data["data"] == "20/08/2026"
    assert data["departure_time"].startswith("2026-08-20T10:00")   # the instant
