from datetime import date, datetime, timedelta

from sqlalchemy.orm import Session

from .. import models as m

CUTOFF_SETTING_KEY = "cutoff_time"
DEFAULT_CUTOFF = "22:00"  # 10 PM, 24-hour "HH:mm"


def get_cutoff_time(db: Session) -> str:
    row = db.get(m.site_settings, CUTOFF_SETTING_KEY)
    return (row.value if row else None) or DEFAULT_CUTOFF


def set_cutoff_time(db: Session, value: str) -> None:
    row = db.get(m.site_settings, CUTOFF_SETTING_KEY)
    now = m.utcnow()
    if row:
        row.value = value
        row.updated_at = now
    else:
        db.add(m.site_settings(key=CUTOFF_SETTING_KEY, value=value, created_at=now, updated_at=now))
    db.commit()


def compute_earliest_effective_date(cutoff_time: str, now: datetime | None = None) -> date:
    """A change (quantity update, holiday/pause) requested before the cutoff takes
    effect the very next calendar day. Requested at/after the cutoff, tomorrow's
    delivery is already locked in, so it takes effect the day after that instead.

    Uses the server's local clock, as the Node version did."""
    now = now or datetime.now()
    parts = str(cutoff_time).split(":")
    hours = int(parts[0])
    minutes = int(parts[1]) if len(parts) > 1 and parts[1] else 0
    cutoff_today = now.replace(hour=hours, minute=minutes, second=0, microsecond=0)
    days_to_add = 1 if now < cutoff_today else 2
    return now.date() + timedelta(days=days_to_add)


def get_earliest_effective_date(db: Session, now: datetime | None = None) -> tuple[str, date]:
    cutoff_time = get_cutoff_time(db)
    return cutoff_time, compute_earliest_effective_date(cutoff_time, now)
