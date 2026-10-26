"""Feedback master (categories) and customer feedback / complaints."""
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Request
from sqlalchemy import func, select
from sqlalchemy.orm import selectinload

from ... import models as m
from ...core.dates import local_to_utc, try_parse_date_only
from ...core.deps import DB, Body
from ...core.http import fail, guard, ok, query, truthy
from .common import csv_response, paginate, perm, total_pages

router = APIRouter()

FEEDBACK_STATUSES = ("new", "in_progress", "resolved", "closed")
FEEDBACK_MODES = ("app", "website", "call", "whatsapp", "email")


# ---- feedback master --------------------------------------------------------------

def _category_filters(request: Request) -> list:
    conditions = []
    name, status = query(request, "name"), query(request, "status")
    if name:
        conditions.append(m.feedback_categories.name.ilike(f"%{name}%"))
    if status:
        conditions.append(m.feedback_categories.is_active.is_(status == "active"))
    return conditions


@router.get("/feedback-categories/export")
@guard("Server Error")
def categories_export(request: Request, db: DB, user: dict = perm("feedback_master", "excel")):
    rows = db.scalars(
        select(m.feedback_categories).where(*_category_filters(request)).order_by(m.feedback_categories.created_at.desc())
    ).all()
    return csv_response(
        ["Feedback Option", "Status"],
        [[c.name, "Activated" if c.is_active else "Deactivated"] for c in rows],
        "feedback-master",
    )


@router.get("/feedback-categories/{id}")
@guard("Server Error")
def categories_show(id: str, db: DB, user: dict = perm("feedback_master", "view")):
    category = db.get(m.feedback_categories, id)
    if category is None:
        return fail(404, "Feedback option not found")
    return ok({"id": category.id, "name": category.name, "isActive": category.is_active})


@router.patch("/feedback-categories/{id}")
@guard("Server Error")
def categories_update(id: str, body: Body, db: DB, user: dict = perm("feedback_master", "update")):
    if "name" in body and not str(body["name"] if body["name"] is not None else "").strip():
        return fail(422, "Feedback option name is required")
    category = db.get(m.feedback_categories, id)
    if category is None:
        raise LookupError("Feedback option not found")
    if "name" in body:
        category.name = str(body["name"]).strip()
    if "status" in body:
        category.is_active = truthy(body["status"])
    category.updated_at = m.utcnow()
    db.commit()
    return ok(category)


@router.get("/feedback-categories")
@guard("Server Error")
def categories_index(request: Request, db: DB, user: dict = perm("feedback_master", "view")):
    conditions = _category_filters(request)
    if query(request, "activeOnly") == "true":
        conditions.append(m.feedback_categories.is_active.is_(True))
    categories = db.scalars(
        select(m.feedback_categories).where(*conditions).order_by(m.feedback_categories.created_at.desc())
    ).all()
    usage = dict(db.execute(
        select(m.customer_feedback.feedback_category_id, func.count()).group_by(m.customer_feedback.feedback_category_id)
    ).all())
    return ok([
        {"id": c.id, "name": c.name, "isActive": c.is_active, "usageCount": usage.get(c.id) or 0}
        for c in categories
    ])


@router.post("/feedback-categories")
@guard("Server Error")
def categories_create(body: Body, db: DB, user: dict = perm("feedback_master", "create")):
    name = body.get("name")
    if not truthy(name) or not str(name).strip():
        return fail(422, "Feedback option name is required")
    name = str(name).strip()
    exists = db.scalar(
        select(m.feedback_categories.id).where(func.lower(m.feedback_categories.name) == name.lower()).limit(1)
    )
    if exists is not None:
        return fail(422, "This feedback option already exists")
    now = m.utcnow()
    category = m.feedback_categories(
        id=str(uuid.uuid4()), name=name, is_active=body.get("status") is not False, created_at=now, updated_at=now
    )
    db.add(category)
    db.commit()
    return ok(category, status=201)


# ---- customer feedback ------------------------------------------------------------

def _local_bound(day_str: str, end: bool):
    """`new Date("YYYY-MM-DDT00:00:00")` — local time, as naive UTC."""
    day = try_parse_date_only(day_str)
    if day is None:
        raise ValueError(f"Invalid date: {day_str!r}")
    if end:
        return local_to_utc(datetime(day.year, day.month, day.day, 23, 59, 59, 999000))
    return local_to_utc(datetime(day.year, day.month, day.day))


def _feedback_filters(request: Request) -> list:
    q = lambda name: query(request, name)  # noqa: E731
    f = m.customer_feedback
    conditions = []
    if q("dateFrom"):
        conditions.append(f.created_at >= _local_bound(q("dateFrom"), end=False))
    if q("dateTo"):
        conditions.append(f.created_at <= _local_bound(q("dateTo"), end=True))
    for param, column in (
        ("customerId", f.customer_id),
        ("feedbackCategoryId", f.feedback_category_id),
        ("status", f.status),
        ("feedbackMode", f.feedback_mode),
        ("type", f.type),
    ):
        if q(param):
            conditions.append(column == q(param))
    if q("city"):
        conditions.append(f.customer_id.in_(select(m.customers.id).where(m.customers.city.ilike(f"%{q('city')}%"))))
    return conditions


def _feedback_query(request: Request):
    f = m.customer_feedback
    return (
        select(f)
        .where(*_feedback_filters(request))
        .options(selectinload(f.customers), selectinload(f.feedback_categories))
        .order_by(f.created_at.desc())
    )


def _map_feedback(f) -> dict:
    c = f.customers
    return {
        "id": f.id,
        "customerId": f.customer_id,
        "customerCode": (c.code if c else None) or None,
        "customerName": (c.name if c else None) or "Unnamed",
        "customerCity": (c.city if c else None) or None,
        "customerPhone": (c.phone if c else None) or None,
        "rating": f.rating,
        "comment": f.comment,
        "type": f.type or "feedback",
        "subject": f.subject or None,
        "feedbackMode": f.feedback_mode,
        "status": f.status,
        "categoryId": f.feedback_category_id,
        "categoryName": f.feedback_categories.name if f.feedback_categories else None,
        "reply": f.reply,
        "repliedBy": f.replied_by,
        "repliedAt": f.replied_at,
        "entryBy": f.entry_by,
        "createdAt": f.created_at,
        "updatedAt": f.updated_at,
    }


def _en_in_datetime(value: datetime | None) -> str:
    """`new Date(x).toLocaleString('en-IN')`, e.g. "26/10/2026, 3:15:00 pm"."""
    if value is None:
        return ""
    dt = value.replace(tzinfo=timezone.utc).astimezone()
    hour = dt.hour % 12 or 12
    return f"{dt.day}/{dt.month}/{dt.year}, {hour}:{dt.minute:02d}:{dt.second:02d} {'am' if dt.hour < 12 else 'pm'}"


def _log_status(db, feedback_id: str, status: str, note, now) -> None:
    db.add(m.feedback_status_logs(
        id=str(uuid.uuid4()), feedback_id=feedback_id, status=status, changed_by="Admin", note=note, created_at=now
    ))


@router.get("/feedback/export")
@guard("Server Error")
def feedback_export(request: Request, db: DB, user: dict = perm("feedback", "excel")):
    rows = db.scalars(_feedback_query(request)).all()
    return csv_response(
        ["Customer", "Date", "Type", "Subject", "Mode", "Status", "Category", "Comment", "Reply", "Entry By"],
        [
            [
                (f.customers.name if f.customers else None) or "", _en_in_datetime(f.created_at),
                f.type or "feedback", f.subject or "", f.feedback_mode, f.status,
                f.feedback_categories.name if f.feedback_categories else "", f.comment or "", f.reply or "", f.entry_by,
            ]
            for f in rows
        ],
        "feedback-report",
    )


@router.get("/feedback/{id}")
@guard("Server Error")
def feedback_show(id: str, db: DB, user: dict = perm("feedback", "view")):
    feedback = db.get(m.customer_feedback, id)
    if feedback is None:
        return fail(404, "Feedback not found")
    history = db.scalars(
        select(m.feedback_status_logs)
        .where(m.feedback_status_logs.feedback_id == feedback.id)
        .order_by(m.feedback_status_logs.created_at.desc())
    ).all()
    return ok({
        **_map_feedback(feedback),
        "history": [
            {"id": h.id, "status": h.status, "note": h.note, "changedBy": h.changed_by, "createdAt": h.created_at}
            for h in history
        ],
    })


@router.patch("/feedback/{id}/status")
@guard("Server Error")
def feedback_update_status(id: str, body: Body, db: DB, user: dict = perm("feedback", "update")):
    status = body.get("status")
    if not truthy(status) or status not in FEEDBACK_STATUSES:
        return fail(422, "A valid status is required")
    feedback = db.get(m.customer_feedback, id)
    if feedback is None:
        return fail(404, "Feedback not found")
    now = m.utcnow()
    feedback.status = status
    feedback.updated_at = now
    _log_status(db, feedback.id, status, body.get("note") or None, now)
    db.commit()
    return ok(feedback)


@router.patch("/feedback/{id}/reply")
@guard("Server Error")
def feedback_reply(id: str, body: Body, db: DB, user: dict = perm("feedback", "update")):
    reply = body.get("reply")
    if not truthy(reply) or not str(reply).strip():
        return fail(422, "Reply text is required")
    feedback = db.get(m.customer_feedback, id)
    if feedback is None:
        return fail(404, "Feedback not found")

    now = m.utcnow()
    previous = feedback.status
    next_status = previous if body.get("resolve") is False else "resolved"
    feedback.reply = str(reply).strip()
    feedback.replied_by = "Admin"
    feedback.replied_at = now
    feedback.status = next_status
    feedback.updated_at = now
    if next_status != previous:
        _log_status(db, feedback.id, next_status, "Auto-updated after admin reply", now)
    db.commit()
    return ok(feedback)


@router.get("/feedback")
@guard("Server Error")
def feedback_index(request: Request, db: DB, user: dict = perm("feedback", "view")):
    page, page_size = paginate(request)
    total = db.scalar(select(func.count()).select_from(m.customer_feedback).where(*_feedback_filters(request))) or 0
    rows = db.scalars(_feedback_query(request).offset((page - 1) * page_size).limit(page_size)).all()
    return ok({
        "rows": [_map_feedback(f) for f in rows],
        "total": total,
        "page": page,
        "pageSize": page_size,
        "totalPages": total_pages(total, page_size),
    })


@router.post("/feedback")
@guard("Server Error")
def feedback_create(body: Body, db: DB, user: dict = perm("feedback", "create")):
    customer_id, mode, status = body.get("customerId"), body.get("feedbackMode"), body.get("status")
    if not truthy(customer_id) or not truthy(mode):
        return fail(422, "Customer and feedback mode are required")
    if mode not in FEEDBACK_MODES:
        return fail(422, "Invalid feedback mode")
    resolved_status = status if truthy(status) and status in FEEDBACK_STATUSES else "new"
    if db.get(m.customers, customer_id) is None:
        return fail(422, "Selected customer does not exist")

    now = m.utcnow()
    feedback = m.customer_feedback(
        id=str(uuid.uuid4()),
        customer_id=customer_id,
        feedback_mode=mode,
        status=resolved_status,
        feedback_category_id=body.get("feedbackCategoryId") or None,
        comment=body.get("comment") or None,
        entry_by="admin",
        created_at=now,
        updated_at=now,
    )
    db.add(feedback)
    db.flush()
    _log_status(db, feedback.id, resolved_status, "Feedback created by admin", now)
    db.commit()
    db.refresh(feedback)
    return ok(feedback, status=201)
