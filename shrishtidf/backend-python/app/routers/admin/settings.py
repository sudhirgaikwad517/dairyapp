"""Singleton settings (cut-off time, email T&C, referral plan) and cancel reasons."""
import re
import uuid

from fastapi import APIRouter, Request
from sqlalchemy import select

from ... import models as m
from ...core.deps import DB, Body
from ...core.http import fail, guard, ok, query, truthy
from ...services.cutoff import get_cutoff_time, set_cutoff_time
from .common import csv_response, perm

router = APIRouter()


def _get_setting(db, key: str):
    row = db.get(m.site_settings, key)
    return (row.value if row else None) or ""


def _put_setting(db, key: str, value) -> None:
    now = m.utcnow()
    row = db.get(m.site_settings, key)
    if row:
        row.value = value
        row.updated_at = now
    else:
        db.add(m.site_settings(key=key, value=value, created_at=now, updated_at=now))
    db.commit()


# ---- cut-off time ---------------------------------------------------------------

@router.get("/cutoff-time")
@guard("Server Error")
def cutoff_show(db: DB, user: dict = perm("cutoff_time", "view")):
    return ok({"cutoffTime": get_cutoff_time(db)})


@router.patch("/cutoff-time")
@guard("Server Error")
def cutoff_update(body: Body, db: DB, user: dict = perm("cutoff_time", "update")):
    cutoff_time = body.get("cutoffTime")
    if not truthy(cutoff_time) or not re.search(r"^\d{2}:\d{2}$", str(cutoff_time)):
        return fail(422, "cutoffTime must be in HH:mm 24-hour format")
    set_cutoff_time(db, cutoff_time)
    return ok({"cutoffTime": cutoff_time})


# ---- email terms & referral plan (singletons) -------------------------------------

EMAIL_TERMS_KEY = "email_terms_conditions"
REFERRAL_PLAN_KEY = "referral_plan"


@router.get("/email-terms")
@guard("Server Error")
def email_terms_show(db: DB, user: dict = perm("email_terms", "view")):
    return ok({"content": _get_setting(db, EMAIL_TERMS_KEY)})


@router.patch("/email-terms")
@guard("Server Error")
def email_terms_update(body: Body, db: DB, user: dict = perm("email_terms", "update")):
    content = body.get("content") or ""
    _put_setting(db, EMAIL_TERMS_KEY, content)
    return ok({"content": content})


@router.get("/referral-plan")
@guard("Server Error")
def referral_plan_show(db: DB, user: dict = perm("referral_plan", "view")):
    return ok({"content": _get_setting(db, REFERRAL_PLAN_KEY)})


@router.patch("/referral-plan")
@guard("Server Error")
def referral_plan_update(body: Body, db: DB, user: dict = perm("referral_plan", "update")):
    content = body.get("content") or ""
    _put_setting(db, REFERRAL_PLAN_KEY, content)
    return ok({"content": content})


# ---- cancel reasons ---------------------------------------------------------------

def cancel_reasons_list(request: Request, db, active_only: bool = False):
    stmt = select(m.cancel_reasons)
    reason, status = query(request, "reason"), query(request, "status")
    if reason:
        stmt = stmt.where(m.cancel_reasons.reason.ilike(f"%{reason}%"))
    # Public/lite callers (the app's cancel-subscription screen) only want active reasons.
    if active_only or query(request, "activeOnly") == "true":
        stmt = stmt.where(m.cancel_reasons.is_active.is_(True))
    elif status:
        stmt = stmt.where(m.cancel_reasons.is_active.is_(status == "active"))
    rows = db.scalars(stmt.order_by(m.cancel_reasons.created_at.desc())).all()
    return ok([{"id": r.id, "reason": r.reason, "isActive": r.is_active} for r in rows])


@router.get("/cancel-reasons/export")
@guard("Server Error")
def cancel_reasons_export(request: Request, db: DB, user: dict = perm("cancel_reason", "excel")):
    stmt = select(m.cancel_reasons)
    reason, status = query(request, "reason"), query(request, "status")
    if reason:
        stmt = stmt.where(m.cancel_reasons.reason.ilike(f"%{reason}%"))
    if status:
        stmt = stmt.where(m.cancel_reasons.is_active.is_(status == "active"))
    rows = db.scalars(stmt.order_by(m.cancel_reasons.created_at.desc())).all()
    return csv_response(
        ["Reason", "Status"],
        [[r.reason, "Activated" if r.is_active else "Deactivated"] for r in rows],
        "cancel-reasons",
    )


@router.get("/cancel-reasons/{id}")
@guard("Server Error")
def cancel_reasons_show(id: str, db: DB, user: dict = perm("cancel_reason", "view")):
    row = db.get(m.cancel_reasons, id)
    if row is None:
        return fail(404, "Cancel reason not found")
    return ok(row)


@router.patch("/cancel-reasons/{id}")
@guard("Server Error")
def cancel_reasons_update(id: str, body: Body, db: DB, user: dict = perm("cancel_reason", "update")):
    row = db.get(m.cancel_reasons, id)
    if row is None:
        raise LookupError("Cancel reason not found")
    if "reason" in body:
        row.reason = body["reason"]
    if "status" in body:
        row.is_active = truthy(body["status"])
    row.updated_at = m.utcnow()
    db.commit()
    return ok({"reason": row})


@router.get("/cancel-reasons")
@guard("Server Error")
def cancel_reasons_index(request: Request, db: DB, user: dict = perm("cancel_reason", "view")):
    return cancel_reasons_list(request, db)


@router.post("/cancel-reasons")
@guard("Server Error")
def cancel_reasons_create(body: Body, db: DB, user: dict = perm("cancel_reason", "create")):
    if not truthy(body.get("reason")):
        return fail(422, "Reason is required")
    now = m.utcnow()
    row = m.cancel_reasons(
        id=str(uuid.uuid4()), reason=body["reason"], is_active=body.get("status") is not False, created_at=now, updated_at=now
    )
    db.add(row)
    db.commit()
    return ok({"reason": row}, status=201)
