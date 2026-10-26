"""Customer wallet report, add/debit money, cash requests, low-balance and summary reports."""
import uuid
from datetime import datetime, timedelta

from fastapi import APIRouter, Request
from sqlalchemy import func, or_, select
from sqlalchemy.orm import selectinload

from ... import models as m
from ...core.dates import format_date_only, local_today, parse_date_only
from ...core.deps import DB, Body
from ...core.http import fail, guard, js_number, ok, query, respond, truthy
from .common import csv_response, paginate, perm, total_pages

router = APIRouter()

C = m.customers
W = m.customer_wallets


def _wallet_filters(request: Request) -> list:
    q = lambda name: query(request, name)  # noqa: E731
    conditions = []
    if q("name"):
        conditions.append(C.name.ilike(f"%{q('name')}%"))
    if q("customerType"):
        conditions.append(C.customer_type == q("customerType"))
    if q("email"):
        conditions.append(C.email.ilike(f"%{q('email')}%"))
    if q("deliveryBoyId"):
        conditions.append(C.delivery_boy_id == q("deliveryBoyId"))
    if q("deliveryType"):
        conditions.append(C.delivery_mode == q("deliveryType"))
    if q("city"):
        conditions.append(C.city.ilike(f"%{q('city')}%"))

    subscription_status = q("subscriptionStatus")
    if subscription_status == "none":
        conditions.append(C.id.not_in(select(m.subscriptions.customer_id).distinct()))
    elif subscription_status:
        conditions.append(C.id.in_(
            select(m.subscriptions.customer_id).where(m.subscriptions.status == subscription_status).distinct()
        ))

    balance = select(W.customer_id)
    wallet_amount = q("walletAmount")
    if wallet_amount == "negative":
        conditions.append(C.id.in_(balance.where(W.balance < 0)))
    elif wallet_amount == "positive":
        conditions.append(C.id.in_(balance.where(W.balance > 0)))
    elif wallet_amount == "zero":
        conditions.append(or_(C.id.not_in(select(W.customer_id)), C.id.in_(balance.where(W.balance == 0))))
    return conditions


def _wallet_query(request: Request):
    return (
        select(C)
        .where(*_wallet_filters(request))
        .options(selectinload(C.customer_wallets), selectinload(C.delivery_boys))
        .order_by(C.created_at.desc())
    )


def _balance(customer) -> int:
    return int(customer.customer_wallets.balance) if customer.customer_wallets else 0


@router.get("/wallet/report/export")
@guard("Server Error")
def report_export(request: Request, db: DB, user: dict = perm("wallet_report", "excel")):
    rows = db.scalars(_wallet_query(request)).all()
    return csv_response(
        ["Customer ID", "Customer Name", "Type", "Mobile", "Email", "Address", "Wallet Amount"],
        [[c.code or "", c.name or "", c.customer_type, c.phone or "", c.email or "", c.address or "", _balance(c)] for c in rows],
        "customer-wallet-report",
    )


@router.get("/wallet/report")
@guard("Server Error")
def report(request: Request, db: DB, user: dict = perm("wallet_report", "view")):
    page, page_size = paginate(request)
    total = db.scalar(select(func.count()).select_from(C).where(*_wallet_filters(request))) or 0
    rows = db.scalars(_wallet_query(request).offset((page - 1) * page_size).limit(page_size)).all()

    ids = [c.id for c in rows]
    refunds = dict(db.execute(
        select(m.wallet_transactions.customer_id, func.sum(m.wallet_transactions.amount))
        .where(
            m.wallet_transactions.customer_id.in_(ids),
            m.wallet_transactions.type == "debit",
            m.wallet_transactions.reference_type == "refund",
        )
        .group_by(m.wallet_transactions.customer_id)
    ).all()) if ids else {}

    mapped = [
        {
            "id": c.id,
            "code": c.code,
            "name": c.name,
            "customerType": c.customer_type,
            "mobile": c.phone,
            "email": c.email,
            "address": c.address,
            "city": c.city,
            "deliveryBoy": c.delivery_boys.name if c.delivery_boys else None,
            "walletAmount": _balance(c),
            "refund": int(refunds.get(c.id) or 0),
        }
        for c in rows
    ]
    return ok({"rows": mapped, "total": total, "page": page, "pageSize": page_size, "totalPages": total_pages(total, page_size)})


def _adjust_wallet(db, customer_id: str, delta: float, tx_type: str, reference_type: str, notes, reference_id=None) -> int:
    now = m.utcnow()
    wallet = db.scalar(select(W).where(W.customer_id == customer_id).with_for_update())
    if wallet is None:
        wallet = W(id=str(uuid.uuid4()), customer_id=customer_id, balance=0, created_at=now, updated_at=now)
        db.add(wallet)
        db.flush()
    new_balance = int(wallet.balance) + int(delta)
    wallet.balance = new_balance
    wallet.updated_at = now
    db.add(m.wallet_transactions(
        id=str(uuid.uuid4()),
        customer_id=customer_id,
        type=tx_type,
        amount=int(abs(delta)),
        balance_after=new_balance,
        reference_type=reference_type,
        reference_id=reference_id,
        notes=notes,
        created_at=now,
        updated_at=now,
    ))
    return new_balance


def _money_request(body: dict, label: str):
    customer_id, amount, remark = body.get("customerId"), body.get("amount"), body.get("remark")
    if not truthy(customer_id) or not truthy(amount) or not js_number(amount) > 0 or not truthy(remark):
        return None, fail(422, f"Customer, {label} amount and remark are required")
    return (customer_id, js_number(amount), remark), None


@router.post("/wallet/add-money")
@guard("Server Error")
def add_money(body: Body, db: DB, user: dict = perm("wallet_report", "create")):
    parsed, error = _money_request(body, "credit")
    if error:
        return error
    customer_id, amount, remark = parsed
    if db.get(C, customer_id) is None:
        return fail(422, "Selected customer does not exist")
    balance = _adjust_wallet(db, customer_id, amount, "credit", "topup_cash", remark)
    db.commit()
    return ok({"balance": balance}, status=201)


@router.post("/wallet/debit-money")
@guard("Server Error")
def debit_money(body: Body, db: DB, user: dict = perm("wallet_report", "create")):
    parsed, error = _money_request(body, "debit")
    if error:
        return error
    customer_id, amount, remark = parsed
    if db.get(C, customer_id) is None:
        return fail(422, "Selected customer does not exist")
    balance = _adjust_wallet(db, customer_id, -amount, "debit", "admin_debit", remark)
    db.commit()
    return ok({"balance": balance}, status=201)


@router.get("/wallet/transactions/{customer_id}")
@guard("Server Error")
def transactions(customer_id: str, db: DB, user: dict = perm("wallet_report", "view")):
    rows = db.scalars(
        select(m.wallet_transactions)
        .where(m.wallet_transactions.customer_id == customer_id)
        .order_by(m.wallet_transactions.created_at.desc())
        .limit(100)
    ).all()
    return ok([
        {
            "id": r.id,
            "type": r.type,
            "amount": int(r.amount),
            "balanceAfter": int(r.balance_after),
            "referenceType": r.reference_type,
            "notes": r.notes,
            "createdAt": r.created_at,
        }
        for r in rows
    ])


def _reviewer(user: dict) -> str | None:
    return (user.get("email") if user.get("type") == "admin" else user.get("name")) or None


@router.get("/wallet/cash-requests")
@guard("Server Error")
def cash_requests(request: Request, db: DB, user: dict = perm("wallet_report", "view")):
    """Pending "Request Cash" top-ups awaiting admin review (or a given status)."""
    page, page_size = paginate(request, default_size=20)
    requested = query(request, "status")
    # As before, `all` falls back to pending — only a concrete status changes the view.
    status = requested if requested and requested != "all" else "pending"
    conditions = [m.wallet_cash_requests.status == status]
    if query(request, "customerName"):
        conditions.append(m.wallet_cash_requests.customer_id.in_(
            select(C.id).where(C.name.ilike(f"%{query(request, 'customerName')}%"))
        ))

    total = db.scalar(select(func.count()).select_from(m.wallet_cash_requests).where(*conditions)) or 0
    rows = db.scalars(
        select(m.wallet_cash_requests)
        .where(*conditions)
        .options(selectinload(m.wallet_cash_requests.customers))
        .order_by(m.wallet_cash_requests.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    ).all()
    mapped = [
        {
            "id": r.id,
            "customerId": r.customer_id,
            "customerName": (r.customers.name if r.customers else None) or "",
            "customerCode": (r.customers.code if r.customers else None) or "",
            "mobile": (r.customers.phone if r.customers else None) or "",
            "amount": int(r.amount),
            "requestedDate": r.requested_date,
            "email": r.email,
            "status": r.status,
            "notes": r.notes,
            "reviewedBy": r.reviewed_by,
            "reviewedAt": r.reviewed_at,
            "createdAt": r.created_at,
        }
        for r in rows
    ]
    return ok({"rows": mapped, "total": total, "page": page, "pageSize": page_size, "totalPages": total_pages(total, page_size)})


def _pending_request(db, id: str):
    req = db.scalar(select(m.wallet_cash_requests).where(m.wallet_cash_requests.id == id).with_for_update())
    if req is None:
        return None, fail(404, "Request not found")
    if req.status != "pending":
        return None, fail(422, f"This request was already {req.status}")
    return req, None


@router.post("/wallet/cash-requests/{id}/approve")
@guard("Server Error")
def approve_cash_request(id: str, db: DB, user: dict = perm("wallet_report", "create")):
    req, error = _pending_request(db, id)
    if error:
        return error
    now = m.utcnow()
    balance = _adjust_wallet(
        db, req.customer_id, int(req.amount), "credit", "topup_cash", "Cash pickup collected and credited", reference_id=req.id
    )
    req.status = "approved"
    req.reviewed_by = _reviewer(user)
    req.reviewed_at = now
    req.updated_at = now
    db.commit()
    return ok({"balance": balance})


@router.post("/wallet/cash-requests/{id}/reject")
@guard("Server Error")
def reject_cash_request(id: str, body: Body, db: DB, user: dict = perm("wallet_report", "create")):
    req, error = _pending_request(db, id)
    if error:
        return error
    now = m.utcnow()
    req.status = "rejected"
    req.notes = body.get("reason") or None
    req.reviewed_by = _reviewer(user)
    req.reviewed_at = now
    req.updated_at = now
    db.commit()
    return respond({"success": True})


def _low_balance_query(request: Request):
    threshold_raw = query(request, "threshold")
    threshold = js_number(threshold_raw) if threshold_raw else 300
    stmt = (
        select(C)
        .join(W, W.customer_id == C.id)
        .where(W.balance > 0, W.balance < threshold)
        .options(selectinload(C.customer_wallets))
    )
    if query(request, "customerId"):
        stmt = stmt.where(C.id == query(request, "customerId"))
    return stmt


@router.get("/wallet/low-balance/export")
@guard("Server Error")
def low_balance_export(request: Request, db: DB, user: dict = perm("low_wallet_balance_report", "excel")):
    rows = db.scalars(_low_balance_query(request).order_by(W.balance.asc())).all()
    return csv_response(
        ["Customer ID", "Customer Name", "Mobile", "Email", "Wallet Amount"],
        [[c.code or "", c.name or "", c.phone or "", c.email or "", _balance(c)] for c in rows],
        "low-wallet-balance-report",
    )


@router.get("/wallet/low-balance")
@guard("Server Error")
def low_balance(request: Request, db: DB, user: dict = perm("low_wallet_balance_report", "view")):
    page, page_size = paginate(request, default_size=20)
    stmt = _low_balance_query(request)
    total = db.scalar(select(func.count()).select_from(stmt.subquery())) or 0
    rows = db.scalars(stmt.order_by(W.balance.asc()).offset((page - 1) * page_size).limit(page_size)).all()
    mapped = [
        {"id": c.id, "code": c.code, "name": c.name, "mobile": c.phone, "email": c.email, "walletAmount": _balance(c)}
        for c in rows
    ]
    return ok({"rows": mapped, "total": total, "page": page, "pageSize": page_size, "totalPages": total_pages(total, page_size)})


def _summary(request: Request, db) -> dict:
    today = local_today()
    from_str = query(request, "from") or format_date_only(today - timedelta(days=29))
    to_str = query(request, "to") or format_date_only(today)
    start_day, end_day = parse_date_only(from_str), parse_date_only(to_str)
    start = datetime(start_day.year, start_day.month, start_day.day)
    end = datetime(end_day.year, end_day.month, end_day.day) + timedelta(days=1) - timedelta(milliseconds=1)

    def wallet_sum(tx_type: str, reference_type: str | None) -> int:
        stmt = select(func.coalesce(func.sum(m.wallet_transactions.amount), 0)).where(
            m.wallet_transactions.type == tx_type,
            m.wallet_transactions.created_at >= start,
            m.wallet_transactions.created_at <= end,
        )
        if reference_type:
            stmt = stmt.where(m.wallet_transactions.reference_type == reference_type)
        return int(db.scalar(stmt) or 0)

    return {
        "from": from_str,
        "to": to_str,
        "totalRecharge": wallet_sum("credit", None),
        "totalCashback": wallet_sum("credit", "cashback"),
        "totalRefunded": wallet_sum("debit", "refund"),
    }


@router.get("/wallet/summary/export")
@guard("Server Error")
def summary_export(request: Request, db: DB, user: dict = perm("wallet_summary_report", "excel")):
    s = _summary(request, db)
    return csv_response(
        ["From", "To", "Total Recharge Amount", "Total Cashback Amount", "Total Refunded Amount"],
        [[s["from"], s["to"], s["totalRecharge"], s["totalCashback"], s["totalRefunded"]]],
        "wallet-summary-report",
    )


@router.get("/wallet/summary")
@guard("Server Error")
def summary(request: Request, db: DB, user: dict = perm("wallet_summary_report", "view")):
    return ok(_summary(request, db))
