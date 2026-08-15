"""Correct ride departure times stored with the wrong timezone.

Revision ID: 003
Revises: 002
Create Date: 2026-08-15

RideService._parse_departure_time used to read the date and time a driver
typed and stamp tzinfo=utc onto it. Those are local wall-clock values, so a
ride published for 07:00 was stored as 07:00Z, which is 04:00 in Porto
Alegre -- every existing row is three hours earlier than intended.

The website never showed the error because it formatted the same value
straight back out without converting, so the number matched what was typed.
A client that renders an ISO timestamp in the device's own timezone, which is
what a phone does, would show all of them three hours early.

This shifts every existing ride_offers.departure_time forward by three hours
so the stored instant matches the local time the driver actually meant.

Two things make this safe to run once and only once:

  - Brazil abolished daylight saving in 2019, so America/Sao_Paulo has been a
    constant UTC-3 for every row this table can contain. A fixed interval is
    correct; a per-row timezone conversion would not be simpler or safer.
  - It must be applied together with the code change that fixes the parsing.
    Applied to a database that is already receiving correct values, it would
    push those three hours the other way.

Alembic's version table is what guarantees the once-only part.
"""
from __future__ import annotations

from alembic import op

revision: str = "003"
down_revision = "002"
branch_labels = None
depends_on = None

_SHIFT = "3 hours"


def upgrade() -> None:
    op.execute(
        f"UPDATE ride_offers SET departure_time = departure_time + INTERVAL '{_SHIFT}'"
    )


def downgrade() -> None:
    op.execute(
        f"UPDATE ride_offers SET departure_time = departure_time - INTERVAL '{_SHIFT}'"
    )
