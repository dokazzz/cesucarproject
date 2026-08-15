"""
Time handling.

Students type local wall-clock times: "the ride leaves at 07:00" means 07:00
in Porto Alegre, not 07:00 UTC. The database stores timestamptz, so every
value written must be converted from local time, and every value shown must be
converted back.

This used to be wrong in a way the website hid. _parse_departure_time stamped
tzinfo=utc onto whatever the driver typed, so a 07:00 ride was stored as
07:00Z -- 04:00 local. The page then formatted the same value straight back
out, printed "07:00", and looked correct. Any client that formats an ISO
timestamp in the device's own timezone, which is what a phone does, shows
04:00 and every ride in the app is three hours early.

Brazil abolished daylight saving in 2019, so America/Sao_Paulo is a constant
UTC-3 today. ZoneInfo is still the right tool: it stays correct for historic
rows written before 2019 and if the rule ever changes back.
"""
from __future__ import annotations

from datetime import datetime, timezone
from zoneinfo import ZoneInfo

# Where the users are. CESUCA is in Cachoeirinha, Rio Grande do Sul.
APP_TZ = ZoneInfo("America/Sao_Paulo")


def local_to_utc(dt: datetime) -> datetime:
    """Interpret a naive datetime as local wall-clock time and return UTC."""
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=APP_TZ)
    return dt.astimezone(timezone.utc)


def to_local(dt: datetime | None) -> datetime | None:
    """Render a stored instant in local time, for display strings."""
    if dt is None:
        return None
    if dt.tzinfo is None:
        # Legacy rows read back without an offset: they are UTC instants.
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(APP_TZ)


def parse_local(date_str: str, time_str: str) -> datetime:
    """Parse 'YYYY-MM-DD' + 'HH:MM' as local wall-clock time, return UTC."""
    naive = datetime.strptime(f"{date_str} {time_str}", "%Y-%m-%d %H:%M")
    return local_to_utc(naive)


def now_utc() -> datetime:
    return datetime.now(timezone.utc)
