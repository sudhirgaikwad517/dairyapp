"""Date helpers.

Conventions used throughout the Python port:
- `date` objects for anything stored in a `date` column (Prisma modelled
  these as UTC-midnight instants; a plain `date` is the same thing without
  the off-by-one-day traps — see `formatDateOnly` in the Node code).
- naive UTC `datetime`s for `timestamp` columns (`models.utcnow()`).
- `local_today()` / `datetime.now()` wherever Node used local calendar
  fields (`new Date()` + `getDate()`), so the server's TZ setting still
  decides what "today" means, exactly as before.
"""
import re
from datetime import date, datetime, timedelta, timezone
from typing import Any

_DATE_ONLY = re.compile(r"^\s*(\d{1,6})-(\d{1,2})-(\d{1,2})\s*$")


def local_today() -> date:
    return date.today()


def format_date_only(value: date | datetime) -> str:
    """"YYYY-MM-DD" from calendar fields — never via a UTC conversion."""
    if isinstance(value, datetime):
        value = value.date()
    return value.isoformat()


def try_parse_date_only(value: Any) -> date | None:
    match = _DATE_ONLY.match(str(value or ""))
    if not match:
        return None
    try:
        return date(int(match.group(1)), int(match.group(2)), int(match.group(3)))
    except ValueError:
        return None


def parse_date_only(value: Any) -> date:
    """Node's `parseDateOnly("2026-10-26")`. Raises on garbage (where Prisma
    would have rejected the resulting Invalid Date)."""
    parsed = try_parse_date_only(value)
    if parsed is None:
        raise ValueError(f"Invalid date: {value!r}")
    return parsed


def js_date(value: Any) -> datetime | None:
    """`new Date(value)` as a naive UTC datetime, or None for an Invalid Date.

    Like JS: a bare "YYYY-MM-DD" is UTC midnight, a date-time without an
    offset is local time, and numbers are epoch milliseconds.
    """
    if value is None:
        return None
    if isinstance(value, datetime):
        dt = value
    elif isinstance(value, date):
        return datetime(value.year, value.month, value.day)
    elif isinstance(value, (int, float)) and not isinstance(value, bool):
        try:
            return datetime.fromtimestamp(value / 1000, tz=timezone.utc).replace(tzinfo=None)
        except (OverflowError, OSError, ValueError):
            return None
    else:
        text = str(value).strip()
        if not text:
            return None
        only = try_parse_date_only(text)
        if only is not None:
            return datetime(only.year, only.month, only.day)
        try:
            dt = datetime.fromisoformat(text.replace("Z", "+00:00").replace(" ", "T", 1))
        except ValueError:
            return None
        if dt.tzinfo is None:
            dt = dt.astimezone()  # no offset given -> local time, as JS does
    if dt.tzinfo is not None:
        dt = dt.astimezone(timezone.utc).replace(tzinfo=None)
    return dt


def js_date_to_date(value: Any) -> date | None:
    """What Prisma stores in a `date` column when handed `new Date(value)`:
    the UTC calendar date of that instant."""
    dt = js_date(value)
    return dt.date() if dt else None


def utc_today() -> date:
    """The date Prisma stores/compares when a `date` column is given `new Date()`."""
    return datetime.now(timezone.utc).date()


def add_days(value: date, days: int) -> date:
    return value + timedelta(days=days)


def local_to_utc(value: datetime) -> datetime:
    """A naive local wall-clock time as the naive UTC instant stored in timestamp columns."""
    return value.astimezone(timezone.utc).replace(tzinfo=None)


def local_day_start(value: date) -> datetime:
    """Local midnight of `value` (Node's `setHours(0,0,0,0)`), as naive UTC."""
    return local_to_utc(datetime(value.year, value.month, value.day))


def local_day_end(value: date) -> datetime:
    """Local 23:59:59.999 of `value` (Node's `setHours(23,59,59,999)`), as naive UTC."""
    return local_to_utc(datetime(value.year, value.month, value.day, 23, 59, 59, 999000))


def month_start(value: date) -> date:
    return value.replace(day=1)


def month_end(value: date) -> date:
    nxt = (value.replace(day=28) + timedelta(days=4)).replace(day=1)
    return nxt - timedelta(days=1)


def format_timestamp_date(value: datetime | None) -> str:
    """`formatDateOnly(new Date(row.created_at))` — the *local* calendar date
    of a stored (UTC) timestamp."""
    if value is None:
        return ""
    return value.replace(tzinfo=timezone.utc).astimezone().date().isoformat()


def local_date_of(value: Any) -> date | None:
    """The local calendar date of `new Date(value)` — what `startOfDay(new Date(x))` keyed off."""
    dt = js_date(value)
    if dt is None:
        return None
    return dt.replace(tzinfo=timezone.utc).astimezone().date()
