"""Admin vacations and postpaid customer billing."""
import uuid

from fastapi import APIRouter, Request
from sqlalchemy import func, select
from sqlalchemy.orm import selectinload

from ... import models as m
from ...core.dates import format_date_only, local_today, parse_date_only
from ...core.deps import DB, Body
from ...core.http import fail, guard, js_number, ok, query, truthy
from ...services.activity_log import log_activity
from .common import csv_response, num0, paginate, perm, total_pages

router = APIRouter()


# ---- vacations --------------------------------------------------------------------

def _map_vacation(v) -> dict:
    c = v.customers
    return {
        "id": v.id,
        "customerId": v.customer_id,
        "customerCode": c.code if c else None,
        "customerName": c.name if c else None,
        "fromDate": v.from_date,
        "toDate": v.to_date,
        "remark": v.remark,
        "entryBy": v.entry_by,
        "endedBy": v.ended_by,
        "endedAt": v.ended_at,
        "isActive": not v.ended_by and v.to_date >= local_today(),
        "createdAt": v.created_at,
    }


@router.get("/vacations/export")
@guard("Server Error")
def vacations_export(request: Request, db: DB, user: dict = perm("vacation", "excel")):
    stmt = select(m.vacations).options(selectinload(m.vacations.customers)).order_by(m.vacations.from_date.desc())
    if query(request, "customerId"):
        stmt = stmt.where(m.vacations.customer_id == query(request, "customerId"))
    rows = db.scalars(stmt).all()
    return csv_response(
        ["Customer", "From Date", "To Date", "Remark", "Entry By", "Ended By"],
        [
            [
                v.customers.name if v.customers and v.customers.name else "",
                format_date_only(v.from_date), format_date_only(v.to_date),
                v.remark or "", v.entry_by or "", v.ended_by or "",
            ]
            for v in rows
        ],
        "vacations",
    )


@router.post("/vacations/{id}/end")
@guard("Server Error")
def vacations_end_early(id: str, db: DB, user: dict = perm("vacation", "update")):
    vacation = db.get(m.vacations, id)
    if vacation is None:
        return fail(404, "Vacation not found")

    today = local_today()
    new_to = vacation.from_date if today < vacation.from_date else today
    vacation.to_date = new_to
    vacation.ended_by = "admin"
    vacation.ended_at = m.utcnow()
    vacation.updated_at = m.utcnow()
    db.commit()

    name = vacation.customers.name if vacation.customers and vacation.customers.name else "Customer"
    log_activity(
        db,
        type="holiday",
        subtype="vacation_end",
        title="Vacation Ended Early",
        message=f"{name}'s vacation ended early on {format_date_only(new_to)}.",
        customer_id=vacation.customer_id,
        effective_date=new_to,
        actor="admin",
    )
    return ok(_map_vacation(vacation))


@router.get("/vacations")
@guard("Server Error")
def vacations_index(request: Request, db: DB, user: dict = perm("vacation", "view")):
    page, page_size = paginate(request)
    conditions = []
    if query(request, "customerId"):
        conditions.append(m.vacations.customer_id == query(request, "customerId"))
    if query(request, "fromDate"):
        conditions.append(m.vacations.to_date >= parse_date_only(query(request, "fromDate")))
    if query(request, "toDate"):
        conditions.append(m.vacations.from_date <= parse_date_only(query(request, "toDate")))

    total = db.scalar(select(func.count()).select_from(m.vacations).where(*conditions)) or 0
    rows = db.scalars(
        select(m.vacations)
        .where(*conditions)
        .options(selectinload(m.vacations.customers))
        .order_by(m.vacations.from_date.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    ).all()
    return ok({
        "rows": [_map_vacation(v) for v in rows],
        "total": total,
        "page": page,
        "pageSize": page_size,
        "totalPages": total_pages(total, page_size),
    })


@router.post("/vacations")
@guard("Server Error")
def vacations_create(body: Body, db: DB, user: dict = perm("vacation", "create")):
    customer_id, from_raw, to_raw, remark = body.get("customerId"), body.get("fromDate"), body.get("toDate"), body.get("remark")
    if not truthy(customer_id) or not truthy(from_raw) or not truthy(to_raw):
        return fail(422, "Customer, From Date and To Date are required")
    start, end = parse_date_only(from_raw), parse_date_only(to_raw)
    if start > end:
        return fail(422, "From Date must be on or before To Date")
    customer = db.get(m.customers, customer_id)
    if customer is None:
        return fail(422, "Selected customer does not exist")

    now = m.utcnow()
    vacation = m.vacations(
        id=str(uuid.uuid4()),
        customer_id=customer_id,
        from_date=start,
        to_date=end,
        remark=remark or None,
        entry_by="admin",
        created_at=now,
        updated_at=now,
    )
    db.add(vacation)
    db.commit()

    log_activity(
        db,
        type="holiday",
        subtype="vacation_start",
        title="Vacation Scheduled",
        message=(
            f"{customer.name or customer.phone} marked on vacation from {format_date_only(start)} to "
            f"{format_date_only(end)}.{f' Remark: {remark}.' if remark else ''}"
        ),
        customer_id=customer_id,
        effective_date=start,
        actor="admin",
    )
    return ok(_map_vacation(vacation), status=201)


# ---- customer billing (postpaid) -------------------------------------------------------

def _map_billing(b) -> dict:
    c = b.customers
    return {
        "id": b.id,
        "customerId": b.customer_id,
        "customerCode": c.code if c else None,
        "customerName": c.name if c else None,
        "billAmount": b.bill_amount,
        "paidAmount": b.paid_amount,
        "remainingAmount": b.remaining_amount,
        "fromDate": b.from_date,
        "toDate": b.to_date,
        "status": b.status,
        "createdAt": b.created_at,
    }


def _billing_filters(request: Request) -> list:
    b = m.customer_billings
    conditions = []
    if query(request, "customerId"):
        conditions.append(b.customer_id == query(request, "customerId"))
    if query(request, "status"):
        conditions.append(b.status == query(request, "status"))
    # A billing period "matches" a date filter if it overlaps the requested date/range.
    if query(request, "dateFrom"):
        conditions.append(b.to_date >= parse_date_only(query(request, "dateFrom")))
    if query(request, "dateTo"):
        conditions.append(b.from_date <= parse_date_only(query(request, "dateTo")))
    return conditions


def _billing_query(request: Request):
    return (
        select(m.customer_billings)
        .where(*_billing_filters(request))
        .options(selectinload(m.customer_billings.customers))
        .order_by(m.customer_billings.created_at.desc())
    )


@router.get("/wallet/billing/export")
@guard("Server Error")
def billing_export(request: Request, db: DB, user: dict = perm("customer_billing", "excel")):
    rows = db.scalars(_billing_query(request)).all()
    return csv_response(
        ["Customer", "From Date", "To Date", "Bill Amount", "Paid Amount", "Remaining Amount", "Status"],
        [
            [
                f"{(b.customers.code if b.customers else None) or ''} - {(b.customers.name if b.customers else None) or ''}",
                format_date_only(b.from_date), format_date_only(b.to_date),
                b.bill_amount, b.paid_amount, b.remaining_amount, b.status,
            ]
            for b in rows
        ],
        "customer-billing",
    )


@router.get("/wallet/billing/{id}")
@guard("Server Error")
def billing_show(id: str, db: DB, user: dict = perm("customer_billing", "view")):
    billing = db.get(m.customer_billings, id)
    if billing is None:
        return fail(404, "Billing not found")
    return ok(_map_billing(billing))


@router.patch("/wallet/billing/{id}")
@guard("Server Error")
def billing_update(id: str, body: Body, db: DB, user: dict = perm("customer_billing", "update")):
    billing = db.get(m.customer_billings, id)
    if billing is None:
        return fail(404, "Billing not found")
    bill = js_number(body["billAmount"]) if "billAmount" in body else billing.bill_amount
    paid = js_number(body["paidAmount"]) if "paidAmount" in body else billing.paid_amount
    if bill < 0 or paid < 0:
        return fail(422, "Amounts cannot be negative")
    start = parse_date_only(body["fromDate"]) if "fromDate" in body else billing.from_date
    end = parse_date_only(body["toDate"]) if "toDate" in body else billing.to_date
    if start > end:
        return fail(422, "From Date must be on or before To Date")

    remaining = bill - paid
    billing.bill_amount = int(bill)
    billing.paid_amount = int(paid)
    billing.remaining_amount = int(remaining)
    billing.from_date = start
    billing.to_date = end
    billing.status = "paid" if remaining <= 0 else "unpaid"
    billing.updated_at = m.utcnow()
    db.commit()
    return ok(_map_billing(billing))


@router.get("/wallet/billing")
@guard("Server Error")
def billing_index(request: Request, db: DB, user: dict = perm("customer_billing", "view")):
    page, page_size = paginate(request)
    total = db.scalar(select(func.count()).select_from(m.customer_billings).where(*_billing_filters(request))) or 0
    rows = db.scalars(_billing_query(request).offset((page - 1) * page_size).limit(page_size)).all()
    return ok({
        "rows": [_map_billing(b) for b in rows],
        "total": total,
        "page": page,
        "pageSize": page_size,
        "totalPages": total_pages(total, page_size),
    })


@router.post("/wallet/billing")
@guard("Server Error")
def billing_create(body: Body, db: DB, user: dict = perm("customer_billing", "create")):
    customer_id, from_raw, to_raw = body.get("customerId"), body.get("fromDate"), body.get("toDate")
    if not truthy(customer_id) or "billAmount" not in body or not truthy(from_raw) or not truthy(to_raw):
        return fail(422, "Customer, bill amount, from date and to date are required")
    start, end = parse_date_only(from_raw), parse_date_only(to_raw)
    if start > end:
        return fail(422, "From Date must be on or before To Date")
    if db.get(m.customers, customer_id) is None:
        return fail(422, "Selected customer does not exist")

    bill = js_number(body["billAmount"])
    paid = num0(body.get("paidAmount"))
    if paid < 0 or bill < 0:
        return fail(422, "Amounts cannot be negative")
    remaining = bill - paid

    now = m.utcnow()
    billing = m.customer_billings(
        id=str(uuid.uuid4()),
        customer_id=customer_id,
        bill_amount=int(bill),
        paid_amount=int(paid),
        remaining_amount=int(remaining),
        from_date=start,
        to_date=end,
        status="paid" if remaining <= 0 else "unpaid",
        created_at=now,
        updated_at=now,
    )
    db.add(billing)
    db.commit()
    return ok(_map_billing(billing), status=201)
