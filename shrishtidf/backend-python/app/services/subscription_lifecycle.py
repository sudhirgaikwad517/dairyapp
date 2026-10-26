from datetime import date, timedelta

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from .. import models as m
from ..core.http import js_int

# The canonical frequency values every client (admin panel + app) offers.
# 'weekly' is kept only for rows created before 'every_3_days'/'day_wise'
# existed — add_frequency_days still honors it, but nothing new should write it.
SUBSCRIPTION_FREQUENCIES = ("daily", "alternate_days", "every_3_days", "day_wise")


def parse_day_wise_days(value: str | None) -> list[int]:
    """"1,3,5" -> [1, 3, 5] (ISO weekdays, 1=Mon..7=Sun). Invalid/out-of-range
    entries are dropped rather than raised, since this only ever feeds a
    best-effort "what's the next matching day" calculation."""
    if not value:
        return []
    days = set()
    for part in str(value).split(","):
        n = js_int(part.strip())
        if n is not None and 1 <= n <= 7:
            days.add(n)
    return sorted(days)


def day_wise_input(value) -> list[int]:
    """The request's `dayWiseDays` (array or comma string) as a clean list."""
    if isinstance(value, list):
        return parse_day_wise_days(",".join(str(v) for v in value))
    return parse_day_wise_days(str(value or ""))


def serialize_day_wise_days(days: list[int]) -> str:
    return ",".join(str(n) for n in sorted({d for d in days if isinstance(d, int) and 1 <= d <= 7}))


def add_frequency_days(current: date, frequency: str, day_wise_days: list[int] | None = None) -> date:
    """Advances `current` to the next occurrence per `frequency`. For 'day_wise' this
    walks forward (at most a week) to the next date whose weekday is in
    `day_wise_days` — falling back to +1 day if that list is somehow empty, so a
    bad data row never loops forever."""
    if frequency == "day_wise" and day_wise_days:
        wanted = set(day_wise_days)
        nxt = current
        for _ in range(7):
            nxt = nxt + timedelta(days=1)
            if nxt.isoweekday() in wanted:
                return nxt
        return nxt

    if frequency == "weekly":
        days = 7
    elif frequency == "every_3_days":
        days = 3
    elif frequency in ("alternate_days", "alternate"):
        days = 2
    else:
        days = 1
    return current + timedelta(days=days)


def count_occurrences(from_date: date, to_date: date, frequency: str, day_wise_days: list[int] | None = None) -> int:
    """How many deliveries a plan from `from_date` to `to_date` (inclusive) actually
    works out to. `from_date` is always the first delivery — that mirrors how
    `next_delivery_date` is seeded when a subscription is created — so a
    prepaid quote charges for exactly the deliveries that will really happen."""
    if to_date < from_date:
        return 0
    count = 1
    current = from_date
    for _ in range(2000):
        nxt = add_frequency_days(current, frequency, day_wise_days or [])
        if nxt > to_date:
            break
        count += 1
        current = nxt
    return count


def is_on_vacation(db: Session, customer_id: str, day: date) -> bool:
    count = db.scalar(
        select(func.count()).select_from(m.vacations).where(
            m.vacations.customer_id == customer_id,
            m.vacations.from_date <= day,
            m.vacations.to_date >= day,
        )
    )
    return (count or 0) > 0


def promote_pending_if_due(db: Session, sub: "m.subscriptions", target: date) -> bool:
    """Applies a previously-requested Change Request once its effective date is reached.
    Returns True if something was promoted (caller should re-read relations that may
    have changed, e.g. variant/delivery mode). Flushes but does not commit."""
    if not sub.change_effective_date:
        return False
    if sub.change_effective_date > target:
        return False

    if sub.pending_quantity is not None:
        sub.quantity = sub.pending_quantity
    if sub.pending_variant_id:
        sub.variant_id = sub.pending_variant_id
    if sub.pending_frequency:
        sub.frequency = sub.pending_frequency
        # day_wise_days only makes sense alongside a 'day_wise' frequency —
        # clear it when switching away so a stale weekday list can't linger.
        sub.day_wise_days = (sub.pending_day_wise_days or None) if sub.pending_frequency == "day_wise" else None
    if sub.pending_delivery_slot_id is not None:
        sub.delivery_slot_id = sub.pending_delivery_slot_id
    if sub.pending_delivery_mode_id is not None:
        sub.delivery_mode_id = sub.pending_delivery_mode_id

    sub.change_effective_date = None
    sub.pending_quantity = None
    sub.pending_variant_id = None
    sub.pending_frequency = None
    sub.pending_day_wise_days = None
    sub.pending_delivery_slot_id = None
    sub.pending_delivery_mode_id = None
    sub.updated_at = m.utcnow()
    db.flush()
    db.expire(sub, ["product_variants", "delivery_modes", "delivery_slots"])
    return True


def skip_vacation_days(db: Session, sub: "m.subscriptions", target: date) -> date | None:
    """A vacation suppresses delivery for its date range without touching the subscription's
    own pause state, so once it ends deliveries must resume exactly where they left off —
    this fast-forwards next_delivery_date past any vacation-covered occurrences (capped to
    avoid a runaway loop on a data error). Flushes but does not commit."""
    if not sub.next_delivery_date:
        return None
    current = sub.next_delivery_date
    guard = 0
    while guard < 400:
        if current > target:
            break
        if not is_on_vacation(db, sub.customer_id, current):
            break
        current = add_frequency_days(current, sub.frequency, parse_day_wise_days(sub.day_wise_days))
        guard += 1
    if guard > 0:
        sub.next_delivery_date = current
        sub.updated_at = m.utcnow()
        db.flush()
    return current
