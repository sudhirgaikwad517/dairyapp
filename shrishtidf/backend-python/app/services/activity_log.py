import uuid
from datetime import date

from sqlalchemy.orm import Session

from .. import models as m
from ..core.http import logger

# customer_registered | feedback | complaint | enquiry | subscription |
# one_time_order | holiday | change_request | wallet


def log_activity(
    db: Session,
    *,
    type: str,
    title: str,
    message: str,
    subtype: str | None = None,
    customer_id: str | None = None,
    subscription_id: str | None = None,
    effective_date: date | None = None,
    actor: str | None = None,
) -> None:
    """Writes an activity log row and commits it. Activity logging must never
    break the primary operation it's attached to, so a failure here is only
    logged — run it after the caller's own changes are committed."""
    try:
        db.add(m.activity_logs(
            id=str(uuid.uuid4()),
            type=type,
            subtype=subtype or None,
            title=title,
            message=message,
            customer_id=customer_id or None,
            subscription_id=subscription_id or None,
            effective_date=effective_date or None,
            actor=actor or None,
            created_at=m.utcnow(),
        ))
        db.commit()
    except Exception:
        db.rollback()
        logger.exception("Failed to write activity log")
