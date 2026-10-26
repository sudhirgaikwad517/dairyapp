"""Revenue, audit trail, pause/resume, change request, daily planner,
mark delivery, postpaid inactive and delivery area reports."""
from datetime import datetime, timedelta

from fastapi import APIRouter, Request
from sqlalchemy import func, or_, select
from sqlalchemy.orm import selectinload

from ... import models as m
from ...core.dates import format_date_only, format_timestamp_date, js_date, local_today, parse_date_only
from ...core.deps import DB
from ...core.http import guard, ok, query
from ...services.subscription_lifecycle import promote_pending_if_due, skip_vacation_days
from .common import csv_response, paginate, perm, total_pages

router = APIRouter()


def _default_range() -> tuple[str, str]:
    today = local_today()
    return format_date_only(today - timedelta(days=29)), format_date_only(today)


def _range(request: Request) -> tuple[str, str, datetime, datetime]:
    default_from, default_to = _default_range()
    date_from = query(request, "dateFrom") or default_from
    date_to = query(request, "dateTo") or default_to
    start_day = parse_date_only(date_from)
    return (
        date_from,
        date_to,
        datetime(start_day.year, start_day.month, start_day.day),
        js_date(f"{date_to}T23:59:59.999Z"),
    )


def _plan_label(sub) -> str | None:
    if sub is None:
        return None
    product = sub.products.name if sub.products else None
    return f"{product}{f' - {sub.product_variants.size_label}' if sub.product_variants else ''}"


def _blank_none(rows: list[list]) -> list[list]:
    """`String(v ?? '')` — the planner export renders missing values as empty cells."""
    return [["" if v is None else v for v in row] for row in rows]


# ---- revenue (ecom orders) ------------------------------------------------------

@router.get("/reports/revenue/export")
@guard("Server Error")
def revenue_export(request: Request, db: DB, user: dict = perm("revenue_order_report", "excel")):
    _, _, start, end = _range(request)
    orders = db.scalars(
        select(m.orders).where(m.orders.created_at >= start, m.orders.created_at <= end).order_by(m.orders.created_at)
    ).all()
    return csv_response(
        ["Order Date", "Invoice No", "Customer", "Status", "Payment Method", "Total(Rs)"],
        [
            [
                format_timestamp_date(o.created_at or m.utcnow()), o.invoice_number or "", o.customer_name or "",
                o.status, o.payment_method, int(o.total_amount),
            ]
            for o in orders
        ],
        "revenue-report",
    )


@router.get("/reports/revenue")
@guard("Server Error")
def revenue(request: Request, db: DB, user: dict = perm("revenue_order_report", "view")):
    """Ecom / website orders revenue & sales statistics — the "Revenue Report" screen."""
    date_from, date_to, start, end = _range(request)
    conditions = [m.orders.created_at >= start, m.orders.created_at <= end]
    city, hub_id = query(request, "city"), query(request, "hubId")
    if city:
        conditions.append(or_(
            m.orders.address.ilike(f"%{city}%"),
            m.orders.customer_id.in_(select(m.customers.id).where(m.customers.city.ilike(f"%{city}%"))),
        ))
    if hub_id:
        conditions.append(m.orders.route_id.in_(select(m.delivery_routes.id).where(m.delivery_routes.hub_id == hub_id)))

    orders = db.scalars(
        select(m.orders).where(*conditions).options(selectinload(m.orders.order_items)).order_by(m.orders.created_at)
    ).all()
    live = [o for o in orders if o.status != "CANCELLED"]
    cancelled = [o for o in orders if o.status == "CANCELLED"]

    total_revenue = sum(int(o.total_amount) for o in live)
    total_items = sum(it.quantity for o in live for it in o.order_items)

    status_map: dict[str, dict] = {}
    for o in orders:
        entry = status_map.setdefault(o.status, {"count": 0, "revenue": 0})
        entry["count"] += 1
        entry["revenue"] += int(o.total_amount)

    payment_map: dict[str, dict] = {}
    daily_map: dict[str, dict] = {}
    product_map: dict[str, dict] = {}
    for o in live:
        entry = payment_map.setdefault(o.payment_method or "unknown", {"count": 0, "revenue": 0})
        entry["count"] += 1
        entry["revenue"] += int(o.total_amount)

        day = daily_map.setdefault(format_timestamp_date(o.created_at or m.utcnow()), {"orders": 0, "revenue": 0})
        day["orders"] += 1
        day["revenue"] += int(o.total_amount)

        for it in o.order_items:
            p = product_map.setdefault(it.product_name, {"qty": 0, "revenue": 0})
            p["qty"] += it.quantity
            p["revenue"] += it.line_total

    top_products = sorted(
        ({"productName": name, "qty": v["qty"], "revenue": v["revenue"]} for name, v in product_map.items()),
        key=lambda p: p["revenue"],
        reverse=True,
    )[:10]

    return ok({
        "range": {"from": date_from, "to": date_to},
        "summary": {
            "totalOrders": len(orders),
            "liveOrders": len(live),
            "totalRevenue": total_revenue,
            "avgOrderValue": total_revenue / len(live) if live else 0,
            "totalItemsSold": total_items,
            "cancelledOrders": len(cancelled),
            "cancelledRevenueLost": sum(int(o.total_amount) for o in cancelled),
        },
        "statusBreakdown": [{"status": k, **v} for k, v in status_map.items()],
        "paymentBreakdown": [{"method": k, **v} for k, v in payment_map.items()],
        "dailyTrend": sorted(({"date": k, **v} for k, v in daily_map.items()), key=lambda d: d["date"]),
        "topProducts": top_products,
    })


# ---- revenue (subscriptions) ------------------------------------------------------

def _hub_scope(request: Request) -> list:
    hub_id = query(request, "hubId")
    return [m.subscriptions.customer_id.in_(select(m.customers.id).where(m.customers.hub_id == hub_id))] if hub_id else []


def _value(s) -> int:
    return int(s.rate or 0) * s.quantity


@router.get("/reports/revenue-subscription/export")
@guard("Server Error")
def subscription_revenue_export(request: Request, db: DB, user: dict = perm("revenue_subscription_report", "excel")):
    rows = db.scalars(
        select(m.subscriptions)
        .where(m.subscriptions.status == "active", *_hub_scope(request))
        .options(
            selectinload(m.subscriptions.customers),
            selectinload(m.subscriptions.products),
            selectinload(m.subscriptions.product_variants),
        )
        .order_by(m.subscriptions.created_at.desc())
    ).all()
    return csv_response(
        ["Customer", "Mobile", "Product", "Packaging", "Qty", "Rate", "Frequency", "Subscribed On"],
        [
            [
                (s.customers.name if s.customers else None) or "", (s.customers.phone if s.customers else None) or "",
                (s.products.name if s.products else None) or "", s.product_variants.size_label if s.product_variants else "",
                s.quantity, s.rate if s.rate is not None else "", s.frequency, format_timestamp_date(s.created_at),
            ]
            for s in rows
        ],
        "revenue-subscription-report",
    )


@router.get("/reports/revenue-subscription")
@guard("Server Error")
def subscription_revenue(request: Request, db: DB, user: dict = perm("revenue_subscription_report", "view")):
    """Recurring subscription value, distinct from the one-time order revenue."""
    date_from, date_to, start, end = _range(request)
    end_day = parse_date_only(date_to)
    scope = _hub_scope(request)

    customer = selectinload(m.subscriptions.customers)
    active = db.scalars(
        select(m.subscriptions)
        .where(m.subscriptions.status == "active", *scope)
        .options(
            selectinload(m.subscriptions.products),
            selectinload(m.subscriptions.product_variants),
            customer,
            customer.selectinload(m.customers.hubs),
        )
    ).all()
    new = db.scalars(
        select(m.subscriptions)
        .where(m.subscriptions.created_at >= start, m.subscriptions.created_at <= end, *scope)
        .options(selectinload(m.subscriptions.products))
    ).all()
    cancelled = db.scalars(
        select(m.subscriptions)
        .where(
            m.subscriptions.status == "cancelled",
            m.subscriptions.cancelled_at >= start.date(),
            m.subscriptions.cancelled_at <= end_day,
            *scope,
        )
        .options(selectinload(m.subscriptions.products))
    ).all()

    today = local_today()
    live = [s for s in active if not s.expires_at or s.expires_at >= today]

    freq_map: dict[str, dict] = {}
    hub_map: dict[str, dict] = {}
    product_map: dict[str, dict] = {}
    for s in live:
        f = freq_map.setdefault(s.frequency, {"count": 0, "value": 0})
        f["count"] += 1
        f["value"] += _value(s)
        hub_name = s.customers.hubs.name if s.customers and s.customers.hubs else "No Hub"
        h = hub_map.setdefault(hub_name, {"count": 0, "value": 0})
        h["count"] += 1
        h["value"] += _value(s)
        p = product_map.setdefault((s.products.name if s.products else None) or "Unknown", {"qty": 0, "value": 0})
        p["qty"] += s.quantity
        p["value"] += _value(s)

    daily_map: dict[str, dict] = {}
    for s in new:
        d = daily_map.setdefault(format_timestamp_date(s.created_at), {"newCount": 0, "newValue": 0})
        d["newCount"] += 1
        d["newValue"] += _value(s)

    return ok({
        "range": {"from": date_from, "to": date_to},
        "summary": {
            "activeCount": len(live),
            "recurringValue": sum(_value(s) for s in live),
            "newCount": len(new),
            "newValue": sum(_value(s) for s in new),
            "cancelledCount": len(cancelled),
            "cancelledValue": sum(_value(s) for s in cancelled),
        },
        "frequencyBreakdown": [{"frequency": k, **v} for k, v in freq_map.items()],
        "hubBreakdown": [{"hub": k, **v} for k, v in hub_map.items()],
        "topProducts": sorted(
            ({"productName": k, "qty": v["qty"], "value": v["value"]} for k, v in product_map.items()),
            key=lambda p: p["value"],
            reverse=True,
        )[:10],
        "dailyTrend": sorted(({"date": k, **v} for k, v in daily_map.items()), key=lambda d: d["date"]),
    })


# ---- audit trail ------------------------------------------------------------------

def _audit_filters(request: Request) -> list:
    conditions = []
    if query(request, "customerId"):
        conditions.append(m.activity_logs.customer_id == query(request, "customerId"))
    if query(request, "dateFrom"):
        day = parse_date_only(query(request, "dateFrom"))
        conditions.append(m.activity_logs.created_at >= datetime(day.year, day.month, day.day))
    if query(request, "dateTo"):
        conditions.append(m.activity_logs.created_at <= js_date(f"{query(request, 'dateTo')}T23:59:59.999Z"))
    return conditions


def _audit_user(r) -> str:
    if r.actor == "admin":
        return "Admin"
    return (r.customers.name if r.customers else None) or "System"


def _audit_query(request: Request):
    return (
        select(m.activity_logs)
        .where(*_audit_filters(request))
        .options(selectinload(m.activity_logs.customers))
        .order_by(m.activity_logs.created_at.desc())
    )


@router.get("/reports/audit-trail/export")
@guard("Server Error")
def audit_trail_export(request: Request, db: DB, user: dict = perm("audit_trail", "excel")):
    rows = db.scalars(_audit_query(request)).all()
    return csv_response(
        ["Sr No", "Date", "User", "Action Taken On", "Narration"],
        [[i + 1, format_timestamp_date(r.created_at), _audit_user(r), r.title, r.message] for i, r in enumerate(rows)],
        "audit-trail",
    )


@router.get("/reports/audit-trail")
@guard("Server Error")
def audit_trail(request: Request, db: DB, user: dict = perm("audit_trail", "view")):
    page, page_size = paginate(request, default_size=20)
    total = db.scalar(select(func.count()).select_from(m.activity_logs).where(*_audit_filters(request))) or 0
    rows = db.scalars(_audit_query(request).offset((page - 1) * page_size).limit(page_size)).all()
    mapped = [
        {
            "srNo": (page - 1) * page_size + i + 1,
            "date": r.created_at,
            "user": _audit_user(r),
            "actionTakenOn": r.title,
            "narration": r.message,
        }
        for i, r in enumerate(rows)
    ]
    return ok({"rows": mapped, "total": total, "page": page, "pageSize": page_size, "totalPages": total_pages(total, page_size)})


# ---- pause / resume requests ----------------------------------------------------------

def _pause_resume_rows(request: Request, db) -> list[dict]:
    customer_id = query(request, "customerId")
    pause_conditions = [m.activity_logs.type == "subscription", m.activity_logs.subtype == "pause"]
    resume_conditions = [m.activity_logs.type == "subscription", m.activity_logs.subtype == "resume"]
    if customer_id:
        pause_conditions.append(m.activity_logs.customer_id == customer_id)
        resume_conditions.append(m.activity_logs.customer_id == customer_id)
    if query(request, "pauseDate"):
        pause_conditions.append(m.activity_logs.effective_date == parse_date_only(query(request, "pauseDate")))

    sub = selectinload(m.activity_logs.subscriptions)
    pauses = db.scalars(
        select(m.activity_logs)
        .where(*pause_conditions)
        .options(
            selectinload(m.activity_logs.customers),
            sub,
            sub.selectinload(m.subscriptions.products),
            sub.selectinload(m.subscriptions.product_variants),
        )
        .order_by(m.activity_logs.created_at)
    ).all()
    resumes = db.scalars(select(m.activity_logs).where(*resume_conditions).order_by(m.activity_logs.created_at)).all()

    resumes_by_sub: dict[str, list] = {}
    for r in resumes:
        if r.subscription_id:
            resumes_by_sub.setdefault(r.subscription_id, []).append(r)

    rows = []
    for p in pauses:
        matched = next((r for r in resumes_by_sub.get(p.subscription_id or "", []) if r.created_at > p.created_at), None)
        rows.append({
            "customerName": p.customers.name if p.customers else None,
            "plan": _plan_label(p.subscriptions),
            "pauseRequestDate": p.created_at,
            "pauseDate": p.effective_date,
            "resumeRequestDate": matched.created_at if matched else None,
            "resumeDate": matched.effective_date if matched else None,
        })

    if query(request, "resumeDate"):
        target = parse_date_only(query(request, "resumeDate"))
        rows = [r for r in rows if r["resumeDate"] and r["resumeDate"] == target]
    return rows


@router.get("/reports/pause-resume/export")
@guard("Server Error")
def pause_resume_export(request: Request, db: DB, user: dict = perm("pause_resume_report", "excel")):
    rows = _pause_resume_rows(request, db)
    return csv_response(
        ["Customer Name", "Plan", "Pause Request Date", "Pause Date", "Resume Request Date", "Resume Date"],
        [
            [
                r["customerName"] or "", r["plan"] or "",
                format_timestamp_date(r["pauseRequestDate"]),
                format_date_only(r["pauseDate"]) if r["pauseDate"] else "",
                format_timestamp_date(r["resumeRequestDate"]),
                format_date_only(r["resumeDate"]) if r["resumeDate"] else "",
            ]
            for r in rows
        ],
        "pause-resume-report",
    )


@router.get("/reports/pause-resume")
@guard("Server Error")
def pause_resume(request: Request, db: DB, user: dict = perm("pause_resume_report", "view")):
    rows = _pause_resume_rows(request, db)
    return ok({"rows": rows, "total": len(rows)})


# ---- change requests ------------------------------------------------------------------

def _change_request_filters(request: Request, allow_range: bool) -> list:
    conditions = [m.activity_logs.type == "change_request"]
    if query(request, "customerId"):
        conditions.append(m.activity_logs.customer_id == query(request, "customerId"))
    if query(request, "quickRange") == "todayTomorrow":
        today = local_today()
        conditions += [m.activity_logs.effective_date >= today, m.activity_logs.effective_date <= today + timedelta(days=1)]
    elif allow_range:
        if query(request, "dateFrom"):
            conditions.append(m.activity_logs.effective_date >= parse_date_only(query(request, "dateFrom")))
        if query(request, "dateTo"):
            conditions.append(m.activity_logs.effective_date <= parse_date_only(query(request, "dateTo")))
    return conditions


def _change_request_options():
    sub = selectinload(m.activity_logs.subscriptions)
    return [
        selectinload(m.activity_logs.customers),
        sub,
        sub.selectinload(m.subscriptions.products),
        sub.selectinload(m.subscriptions.product_variants),
    ]


@router.get("/reports/change-requests/export")
@guard("Server Error")
def change_requests_export(request: Request, db: DB, user: dict = perm("change_request_report", "excel")):
    rows = db.scalars(
        select(m.activity_logs)
        .where(*_change_request_filters(request, allow_range=False))
        .options(*_change_request_options())
        .order_by(m.activity_logs.created_at.desc())
    ).all()
    return csv_response(
        ["Customer", "Mobile", "Plan", "Requested On", "Effective From", "Requested By", "Details"],
        [
            [
                (r.customers.name if r.customers else None) or "",
                (r.customers.phone if r.customers else None) or "",
                (r.subscriptions.products.name if r.subscriptions and r.subscriptions.products else None) or "",
                format_timestamp_date(r.created_at),
                format_date_only(r.effective_date) if r.effective_date else "",
                "Admin" if r.actor == "admin" else "Customer",
                r.message,
            ]
            for r in rows
        ],
        "change-requests",
    )


@router.get("/reports/change-requests")
@guard("Server Error")
def change_requests(request: Request, db: DB, user: dict = perm("change_request_report", "view")):
    conditions = _change_request_filters(request, allow_range=True)
    page, page_size = paginate(request, default_size=20)
    total = db.scalar(select(func.count()).select_from(m.activity_logs).where(*conditions)) or 0
    rows = db.scalars(
        select(m.activity_logs)
        .where(*conditions)
        .options(*_change_request_options())
        .order_by(m.activity_logs.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    ).all()
    mapped = [
        {
            "customerName": r.customers.name if r.customers else None,
            "mobile": r.customers.phone if r.customers else None,
            "plan": _plan_label(r.subscriptions),
            "requestedOn": r.created_at,
            "effectiveFrom": r.effective_date,
            "requestedBy": "Admin" if r.actor == "admin" else "Customer",
            "details": r.message,
        }
        for r in rows
    ]
    return ok({"rows": mapped, "total": total, "page": page, "pageSize": page_size, "totalPages": total_pages(total, page_size)})


# ---- daily planner (+ hub / delivery-boy pivots, pending delivery) ---------------------

def _resolve_planner(request: Request, db) -> list:
    date_str = query(request, "date") or format_date_only(local_today())
    target = parse_date_only(date_str)
    pending_only = query(request, "pendingOnly") == "true"

    customer_conditions = []
    for param, column in (("deliveryBoyId", m.customers.delivery_boy_id), ("hubId", m.customers.hub_id)):
        if query(request, param):
            customer_conditions.append(column == query(request, param))
    for param, column in (("city", m.customers.city), ("area", m.customers.area)):
        if query(request, param):
            customer_conditions.append(column.ilike(f"%{query(request, param)}%"))

    customer = selectinload(m.subscriptions.customers)
    candidates = db.scalars(
        select(m.subscriptions)
        .where(
            m.subscriptions.status == "active",
            m.subscriptions.next_delivery_date <= target,
            m.subscriptions.customer_id.in_(select(m.customers.id).where(*customer_conditions)),
        )
        .options(
            customer,
            customer.selectinload(m.customers.hubs),
            customer.selectinload(m.customers.delivery_boys),
            selectinload(m.subscriptions.products),
            selectinload(m.subscriptions.product_variants),
            selectinload(m.subscriptions.delivery_modes),
        )
    ).all()

    resolved = []
    for sub in candidates:
        promote_pending_if_due(db, sub, target)
        final = skip_vacation_days(db, sub, target)
        db.commit()
        if final is None:
            continue
        if (final > target) if pending_only else (final != target):
            continue
        resolved.append(sub)

    if pending_only:
        due_dates = {s.next_delivery_date for s in resolved}
        marked = {
            (sid, d) for sid, d in db.execute(
                select(m.delivery_records.subscription_id, m.delivery_records.delivery_date)
                .where(m.delivery_records.delivery_date.in_(due_dates))
            )
        } if due_dates else set()
        resolved = [s for s in resolved if (s.id, s.next_delivery_date) not in marked]
    return resolved


def _planner_row(s) -> dict:
    c = s.customers
    variant = s.product_variants
    return {
        "customerName": c.name if c else None,
        "address": c.address if c else None,
        "mobile": c.phone if c else None,
        "hub": c.hubs.name if c and c.hubs else "No Hub Assigned",
        "city": c.city if c else None,
        "deliveryBoy": c.delivery_boys.name if c and c.delivery_boys else "Not Assigned",
        "mode": (s.delivery_modes.name if s.delivery_modes else None) or (c.delivery_mode if c else None) or None,
        "product": s.products.name if s.products else None,
        "packaging": (variant.size_label if variant else None) or (s.products.size if s.products else None),
        "qty": s.quantity,
        "packets": s.quantity * ((variant.packets if variant else None) or 1),
        "frequency": s.frequency,
        "deliveryDate": s.next_delivery_date,
    }


def _pivot(rows: list[dict], group_by: str) -> dict:
    group_key = "hub" if group_by == "hub" else "deliveryBoy"
    columns_set: set[str] = set()
    groups: dict[str, dict[str, int]] = {}
    for r in rows:
        col = f"{r['product']} - {r['packaging']}"
        columns_set.add(col)
        bucket = groups.setdefault(r[group_key], {})
        bucket[col] = bucket.get(col, 0) + r["packets"]

    columns = sorted(columns_set)
    pivot_rows = sorted(
        ({"group": g, "values": v, "total": sum(v.get(c, 0) for c in columns)} for g, v in groups.items()),
        key=lambda r: r["group"],
    )
    grand_total = {c: sum(r["values"].get(c, 0) for r in pivot_rows) for c in columns}
    return {"columns": columns, "rows": pivot_rows, "grandTotal": grand_total}


def _group_by(request: Request) -> str:
    value = query(request, "groupBy")
    return value if value in ("hub", "deliveryBoy") else "none"


@router.get("/reports/daily-planner/export")
@guard("Server Error")
def daily_planner_export(request: Request, db: DB, user: dict = perm("daily_planner", "excel")):
    group_by = _group_by(request)
    rows = [_planner_row(s) for s in _resolve_planner(request, db)]
    if group_by == "none":
        header = ["Customer", "Address", "Mobile", "Hub", "City", "Delivery Boy", "Mode", "Product", "Packaging", "Qty", "Type", "Delivery Mode"]
        body = [
            [r["customerName"], r["address"], r["mobile"], r["hub"], r["city"], r["deliveryBoy"], r["mode"],
             r["product"], r["packaging"], r["qty"], r["frequency"], r["mode"]]
            for r in rows
        ]
    else:
        pivot = _pivot(rows, group_by)
        header = ["Hub" if group_by == "hub" else "Delivery Boy", *pivot["columns"], "Total"]
        body = [[r["group"], *(r["values"].get(c, 0) for c in pivot["columns"]), r["total"]] for r in pivot["rows"]]
        body.append(["Total", *(pivot["grandTotal"][c] for c in pivot["columns"]), sum(pivot["grandTotal"].values())])
    return csv_response(header, _blank_none(body), "daily-planner")


@router.get("/reports/daily-planner")
@guard("Server Error")
def daily_planner(request: Request, db: DB, user: dict = perm("daily_planner", "view")):
    date_str = query(request, "date") or format_date_only(local_today())
    group_by = _group_by(request)
    rows = [_planner_row(s) for s in _resolve_planner(request, db)]
    if group_by == "none":
        return ok({"date": date_str, "rows": rows, "total": len(rows)})
    return ok({"date": date_str, **_pivot(rows, group_by)})


# ---- mark delivery report (historical delivery_records) ------------------------------

def _mark_delivery_filters(request: Request) -> list:
    r = m.delivery_records
    conditions = []
    if query(request, "customerId"):
        conditions.append(r.customer_id == query(request, "customerId"))
    if query(request, "deliveryBoyId"):
        conditions.append(r.delivery_boy_id == query(request, "deliveryBoyId"))
    if query(request, "status"):
        conditions.append(r.status == query(request, "status"))
    if query(request, "dateFrom"):
        conditions.append(r.delivery_date >= parse_date_only(query(request, "dateFrom")))
    if query(request, "dateTo"):
        conditions.append(r.delivery_date <= parse_date_only(query(request, "dateTo")))
    return conditions


def _mark_delivery_query(request: Request):
    r = m.delivery_records
    return (
        select(r)
        .where(*_mark_delivery_filters(request))
        .options(
            selectinload(r.customers), selectinload(r.delivery_boys), selectinload(r.products), selectinload(r.product_variants)
        )
        .order_by(r.delivery_date.desc())
    )


def _mark_delivery_row(r) -> dict:
    return {
        "customerName": r.customers.name if r.customers else None,
        "deliveryDate": r.delivery_date,
        "product": f"{(r.products.name if r.products else None) or ''}{f' - {r.product_variants.size_label}' if r.product_variants else ''}",
        "deliveryBoy": r.delivery_boys.name if r.delivery_boys else "Not Assigned",
        "quantityOrdered": float(r.quantity_ordered),
        "quantityDelivered": float(r.quantity_delivered),
        "pendingQty": float(r.pending_qty),
        "bottlesCollected": r.bottles_collected,
        "status": r.status,
        "remark": r.remark,
    }


@router.get("/reports/mark-delivery/export")
@guard("Server Error")
def mark_delivery_export(request: Request, db: DB, user: dict = perm("mark_delivery_report", "excel")):
    rows = [_mark_delivery_row(r) for r in db.scalars(_mark_delivery_query(request))]
    return csv_response(
        ["Customer", "Delivery Date", "Product", "Delivery Boy", "Qty Ordered", "Qty Delivered", "Pending", "Bottles Collected", "Status", "Remark"],
        [
            [
                r["customerName"], format_date_only(r["deliveryDate"]), r["product"], r["deliveryBoy"],
                r["quantityOrdered"], r["quantityDelivered"], r["pendingQty"], r["bottlesCollected"], r["status"], r["remark"] or "",
            ]
            for r in rows
        ],
        "mark-delivery-report",
    )


@router.get("/reports/mark-delivery")
@guard("Server Error")
def mark_delivery(request: Request, db: DB, user: dict = perm("mark_delivery_report", "view")):
    page, page_size = paginate(request, default_size=20)
    total = db.scalar(select(func.count()).select_from(m.delivery_records).where(*_mark_delivery_filters(request))) or 0
    rows = db.scalars(_mark_delivery_query(request).offset((page - 1) * page_size).limit(page_size)).all()
    return ok({
        "rows": [_mark_delivery_row(r) for r in rows],
        "total": total,
        "page": page,
        "pageSize": page_size,
        "totalPages": total_pages(total, page_size),
    })


# ---- postpaid inactive plans -----------------------------------------------------------

def _postpaid_inactive_filters(request: Request) -> list:
    customer_conditions = [m.customers.customer_type == "postpaid"]
    if query(request, "hubId"):
        customer_conditions.append(m.customers.hub_id == query(request, "hubId"))
    conditions = [
        m.subscriptions.status.in_(["inactive", "cancelled"]),
        m.subscriptions.customer_id.in_(select(m.customers.id).where(*customer_conditions)),
    ]
    if query(request, "customerId"):
        conditions.append(m.subscriptions.customer_id == query(request, "customerId"))
    return conditions


def _postpaid_inactive_query(request: Request):
    customer = selectinload(m.subscriptions.customers)
    return (
        select(m.subscriptions)
        .where(*_postpaid_inactive_filters(request))
        .options(
            customer,
            customer.selectinload(m.customers.hubs),
            selectinload(m.subscriptions.products),
            selectinload(m.subscriptions.product_variants),
        )
        .order_by(m.subscriptions.updated_at.desc())
    )


@router.get("/reports/postpaid-inactive/export")
@guard("Server Error")
def postpaid_inactive_export(request: Request, db: DB, user: dict = perm("postpaid_inactive_report", "excel")):
    rows = db.scalars(_postpaid_inactive_query(request)).all()
    return csv_response(
        ["Customer", "Mobile", "Hub", "Plan", "Status", "Inactivated On", "Cancelled On"],
        [
            [
                (s.customers.name if s.customers else None) or "",
                (s.customers.phone if s.customers else None) or "",
                (s.customers.hubs.name if s.customers and s.customers.hubs else None) or "",
                _plan_label(s), s.status,
                format_date_only(s.inactivated_at) if s.inactivated_at else "",
                format_date_only(s.cancelled_at) if s.cancelled_at else "",
            ]
            for s in rows
        ],
        "postpaid-inactive-plans",
    )


@router.get("/reports/postpaid-inactive")
@guard("Server Error")
def postpaid_inactive(request: Request, db: DB, user: dict = perm("postpaid_inactive_report", "view")):
    page, page_size = paginate(request, default_size=20)
    total = db.scalar(select(func.count()).select_from(m.subscriptions).where(*_postpaid_inactive_filters(request))) or 0
    rows = db.scalars(_postpaid_inactive_query(request).offset((page - 1) * page_size).limit(page_size)).all()
    mapped = [
        {
            "customerName": s.customers.name if s.customers else None,
            "mobile": s.customers.phone if s.customers else None,
            "hub": s.customers.hubs.name if s.customers and s.customers.hubs else None,
            "plan": _plan_label(s),
            "status": s.status,
            "inactivatedAt": s.inactivated_at,
            "cancelledAt": s.cancelled_at,
            "lastActiveOn": s.updated_at,
        }
        for s in rows
    ]
    return ok({"rows": mapped, "total": total, "page": page, "pageSize": page_size, "totalPages": total_pages(total, page_size)})


# ---- delivery area report --------------------------------------------------------------

def _area_report_filters(request: Request) -> list:
    a = m.delivery_areas
    conditions = []
    for param, column in (("state", a.state), ("city", a.city), ("areaName", a.area_name)):
        if query(request, param):
            conditions.append(column.ilike(f"%{query(request, param)}%"))
    if query(request, "service"):
        conditions.append(a.is_serviceable.is_(query(request, "service") == "available"))
    if query(request, "hubId"):
        conditions.append(a.route_id.in_(select(m.delivery_routes.id).where(m.delivery_routes.hub_id == query(request, "hubId"))))
    return conditions


def _area_report_query(request: Request):
    route = selectinload(m.delivery_areas.delivery_routes)
    return (
        select(m.delivery_areas)
        .where(*_area_report_filters(request))
        .options(route, route.selectinload(m.delivery_routes.hubs), route.selectinload(m.delivery_routes.delivery_boys))
        .order_by(m.delivery_areas.area_name)
    )


def _area_report_row(a) -> dict:
    route = a.delivery_routes
    return {
        "state": a.state,
        "city": a.city,
        "areaName": a.area_name,
        "areaPin": a.area_pin,
        "route": route.name if route else None,
        "hub": route.hubs.name if route and route.hubs else None,
        "deliveryBoy": route.delivery_boys.name if route and route.delivery_boys else None,
        "isServiceable": a.is_serviceable,
    }


@router.get("/reports/delivery-area/export")
@guard("Server Error")
def delivery_area_export(request: Request, db: DB, user: dict = perm("delivery_area_report", "excel")):
    rows = [_area_report_row(a) for a in db.scalars(_area_report_query(request))]
    return csv_response(
        ["State", "City", "Area Name", "Area Pin", "Route", "Hub", "Delivery Boy", "Service Availability"],
        [
            [
                r["state"] or "", r["city"] or "", r["areaName"], r["areaPin"] or "", r["route"] or "",
                r["hub"] or "", r["deliveryBoy"] or "", "Delivery Available" if r["isServiceable"] else "Not Available",
            ]
            for r in rows
        ],
        "delivery-area-report",
    )


@router.get("/reports/delivery-area")
@guard("Server Error")
def delivery_area(request: Request, db: DB, user: dict = perm("delivery_area_report", "view")):
    page, page_size = paginate(request)
    total = db.scalar(select(func.count()).select_from(m.delivery_areas).where(*_area_report_filters(request))) or 0
    rows = db.scalars(_area_report_query(request).offset((page - 1) * page_size).limit(page_size)).all()
    return ok({
        "rows": [_area_report_row(a) for a in rows],
        "total": total,
        "page": page,
        "pageSize": page_size,
        "totalPages": total_pages(total, page_size),
    })
