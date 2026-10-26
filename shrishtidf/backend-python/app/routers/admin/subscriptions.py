import uuid
from datetime import timedelta

from fastapi import APIRouter, Request
from sqlalchemy import func, or_, select
from sqlalchemy.orm import selectinload

from ... import models as m
from ...core.dates import (
    format_date_only,
    format_timestamp_date,
    js_date,
    local_today,
    parse_date_only,
    utc_today,
)
from ...core.deps import DB, Body
from ...core.http import fail, guard, js_number, js_round, ok, query, truthy
from ...services.activity_log import log_activity
from ...services.cutoff import get_earliest_effective_date
from ...services.subscription_lifecycle import (
    SUBSCRIPTION_FREQUENCIES,
    day_wise_input,
    parse_day_wise_days,
    serialize_day_wise_days,
)
from .common import csv_response, paginate, perm, total_pages

router = APIRouter()


def map_subscription_row(s) -> dict:
    today = local_today()
    is_expired = s.status == "active" and s.expires_at is not None and s.expires_at < today
    c = s.customers
    return {
        "id": s.id,
        "customerId": s.customer_id,
        "customerCode": c.code if c else None,
        "customerName": c.name if c else None,
        "mobile": c.phone if c else None,
        "customerType": c.customer_type if c else None,
        "hub": c.hubs.name if c and c.hubs else None,
        "city": c.city if c else None,
        "area": c.area if c else None,
        "deliveryBoy": c.delivery_boys.name if c and c.delivery_boys else None,
        "subscriptionDate": s.created_at,
        "subscriptionType": "Subscribe",
        "startDate": s.start_date,
        "productId": s.product_id,
        "productName": s.products.name if s.products else None,
        "packaging": (s.product_variants.size_label if s.product_variants else None) or (s.products.size if s.products else None),
        "qty": s.quantity,
        "rate": s.rate,
        "frequency": s.frequency,
        "dayWiseDays": parse_day_wise_days(s.day_wise_days),
        "deliveryType": s.delivery_modes.name if s.delivery_modes else None,
        "customDetails": s.custom_details,
        "nextDeliveryDate": s.next_delivery_date,
        "pausedFrom": s.paused_from,
        "pausedUntil": s.paused_until,
        "cancelledAt": s.cancelled_at,
        "inactivatedAt": s.inactivated_at,
        "expiresAt": s.expires_at,
        "hasPendingChange": bool(s.change_effective_date),
        "changeEffectiveDate": s.change_effective_date,
        "status": "expired" if is_expired else s.status,
        "createdAt": s.created_at,
    }


def subscription_options():
    customer = selectinload(m.subscriptions.customers)
    return [
        customer,
        customer.selectinload(m.customers.hubs),
        customer.selectinload(m.customers.delivery_routes),
        customer.selectinload(m.customers.delivery_boys),
        selectinload(m.subscriptions.products),
        selectinload(m.subscriptions.product_variants),
        selectinload(m.subscriptions.delivery_modes),
        selectinload(m.subscriptions.cancel_reasons),
    ]


def _filters(request: Request) -> list:
    q = lambda name: query(request, name)  # noqa: E731
    s = m.subscriptions
    conditions = []
    if q("customerId"):
        conditions.append(s.customer_id == q("customerId"))
    if q("productId"):
        conditions.append(s.product_id == q("productId"))
    if q("deliveryModeId"):
        conditions.append(s.delivery_mode_id == q("deliveryModeId"))

    customer_conditions = []
    if q("customerType"):
        customer_conditions.append(m.customers.customer_type == q("customerType"))
    if q("hubId"):
        customer_conditions.append(m.customers.hub_id == q("hubId"))
    if q("deliveryBoyId"):
        customer_conditions.append(m.customers.delivery_boy_id == q("deliveryBoyId"))
    if q("city"):
        customer_conditions.append(m.customers.city.ilike(f"%{q('city')}%"))
    if q("area"):
        customer_conditions.append(m.customers.area.ilike(f"%{q('area')}%"))
    if customer_conditions:
        conditions.append(s.customer_id.in_(select(m.customers.id).where(*customer_conditions)))

    if q("subDateFrom"):
        conditions.append(s.created_at >= js_date(q("subDateFrom")))
    if q("subDateTo"):
        conditions.append(s.created_at <= js_date(f"{q('subDateTo')}T23:59:59.999Z"))
    for column, start, end in (
        (s.start_date, "startDateFrom", "startDateTo"),
        (s.cancelled_at, "cancelDateFrom", "cancelDateTo"),
        (s.inactivated_at, "inactiveDateFrom", "inactiveDateTo"),
    ):
        if q(start):
            conditions.append(column >= parse_date_only(q(start)))
        if q(end):
            conditions.append(column <= parse_date_only(q(end)))
    return conditions


def _status_bucket(status: str | None) -> list:
    """The 5 tabs the admin UI shows are a mix of the stored `status` plus a
    derived "expired" bucket (an active prepaid plan whose validity window has
    passed) — kept derived so it can never go stale relative to `expires_at`."""
    today = local_today()
    s = m.subscriptions
    if not status or status == "active":
        return [s.status == "active", or_(s.expires_at.is_(None), s.expires_at >= today)]
    if status == "expired":
        return [s.status == "active", s.expires_at < today]
    if status == "hold":
        return [s.status == "paused"]
    return [s.status == status]  # 'inactive' | 'cancelled'


@router.get("/subscriptions/export")
@guard("Server Error")
def export_subscriptions(request: Request, db: DB, user: dict = perm("subscriptions", "excel")):
    rows = db.scalars(
        select(m.subscriptions)
        .where(*_filters(request), *_status_bucket(query(request, "status")))
        .options(*subscription_options())
        .order_by(m.subscriptions.created_at.desc())
    ).all()
    mapped = [map_subscription_row(s) for s in rows]
    header = ["Customer", "Mobile", "Hub", "Delivery Boy", "Subscription Date", "Start Date", "Product", "Packaging", "Qty", "Rate", "Delivery Type", "Status"]
    return csv_response(header, [
        [
            s["customerName"] or "", s["mobile"] or "", s["hub"] or "", s["deliveryBoy"] or "",
            format_timestamp_date(s["subscriptionDate"]),
            format_date_only(s["startDate"]) if s["startDate"] else "",
            s["productName"] or "", s["packaging"] or "", s["qty"],
            s["rate"] if s["rate"] is not None else "", s["deliveryType"] or "", s["status"],
        ]
        for s in mapped
    ], "subscriptions")


@router.get("/subscriptions/customer/{customer_id}/catalog")
@guard("Server Error")
def catalog_for_customer(customer_id: str, request: Request, db: DB, user: dict = perm("subscribe", "view")):
    """Categories -> products -> variants a customer may buy in "subscribe" or
    "onetime" mode, given their customer_type (prepaid/postpaid) and city."""
    mode = "onetime" if query(request, "mode") == "onetime" else "subscribe"
    customer = db.get(m.customers, customer_id)
    if customer is None:
        return fail(404, "Customer not found")

    is_prepaid = customer.customer_type == "prepaid"
    if mode == "subscribe":
        flag = "prepaid_subscribe" if is_prepaid else "postpaid_subscribe"
        eligible = lambda p: p.is_active and p.allow_subscription and getattr(p, flag)  # noqa: E731
    else:
        flag = "prepaid_getonce" if is_prepaid else "postpaid_getonce"
        eligible = lambda p: p.is_active and getattr(p, flag)  # noqa: E731

    products_path = selectinload(m.product_categories.products)
    categories = db.scalars(
        select(m.product_categories)
        .where(m.product_categories.is_active.is_(True))
        .order_by(m.product_categories.sort_order)
        .options(products_path, products_path.selectinload(m.products.product_variants))
    ).all()

    rate_field = "subscription" if mode == "subscribe" else "buy_once"
    customer_city = (customer.city or "").lower()
    mapped = []
    for c in categories:
        products = []
        for p in sorted((p for p in c.products if eligible(p)), key=lambda p: p.sort_order):
            variants = [
                {
                    "id": v.id,
                    "sizeLabel": v.size_label,
                    "rate": int(getattr(v, rate_field)),
                    "ltrs": float(v.ltrs) if v.ltrs is not None else None,
                    "isDefault": v.is_default,
                }
                for v in sorted(p.product_variants, key=lambda v: v.sort_order)
                if not v.out_of_stock and (not v.city or v.city.lower() == customer_city)
            ]
            if variants:
                products.append({
                    "id": p.id,
                    "name": p.name,
                    "gstRate": float(p.gst_rate or 0),
                    "isTaxInclusive": p.is_tax_inclusive,
                    "variants": variants,
                })
        if products:
            mapped.append({"id": c.id, "label": c.label, "products": products})

    modes = db.scalars(
        select(m.delivery_modes).where(m.delivery_modes.is_active.is_(True)).order_by(m.delivery_modes.sort_order)
    ).all()
    return ok({
        "customer": {
            "id": customer.id,
            "code": customer.code,
            "name": customer.name,
            "customerType": customer.customer_type,
            "city": customer.city,
        },
        "categories": mapped,
        "deliveryModes": [{"id": d.id, "name": d.name} for d in modes],
    })


@router.get("/subscriptions/customer/{customer_id}/plans")
@guard("Server Error")
def customer_plans(customer_id: str, db: DB, user: dict = perm("subscriptions", "view")):
    subs = db.scalars(
        select(m.subscriptions)
        .where(m.subscriptions.customer_id == customer_id, m.subscriptions.status.in_(["active", "paused"]))
        .options(selectinload(m.subscriptions.products), selectinload(m.subscriptions.product_variants))
        .order_by(m.subscriptions.created_at.desc())
    ).all()
    return ok([
        {
            "id": s.id,
            "label": (
                f"{s.products.name if s.products else None}"
                f"{f' - {s.product_variants.size_label}' if s.product_variants else ''}"
                f" (Qty {s.quantity}, {s.frequency})"
            ),
            "status": s.status,
        }
        for s in subs
    ])


@router.post("/subscriptions/subscribe")
@guard("Server Error")
def subscribe(body: Body, db: DB, user: dict = perm("subscribe", "create")):
    customer_id, items = body.get("customerId"), body.get("items")
    if not truthy(customer_id) or not isinstance(items, list) or not items:
        return fail(422, "Customer and at least one product are required")
    customer = db.get(m.customers, customer_id)
    if customer is None:
        return fail(404, "Customer not found")

    _, earliest = get_earliest_effective_date(db)
    is_prepaid = customer.customer_type == "prepaid"
    now = m.utcnow()
    created = 0

    # Each plan was its own insert in the Node version, so a later item
    # failing validation left the earlier ones in place — same here.
    for item in items:
        variant = db.get(m.product_variants, item["variantId"]) if truthy(item.get("variantId")) else None
        product = db.get(m.products, item.get("productId"))
        if product is None:
            return fail(422, "One of the selected products does not exist")
        if not product.allow_subscription or not (product.prepaid_subscribe if is_prepaid else product.postpaid_subscribe):
            return fail(422, f"{product.name} is not available for subscription for this customer type")

        frequency = item.get("frequency") or "daily"
        if frequency not in SUBSCRIPTION_FREQUENCIES:
            return fail(422, f"{product.name}: choose a valid delivery schedule")
        day_wise = day_wise_input(item.get("dayWiseDays")) if frequency == "day_wise" else []
        if frequency == "day_wise" and not day_wise:
            return fail(422, f"{product.name}: choose at least one day for a Day wise plan")

        requested = parse_date_only(item["startDate"]) if truthy(item.get("startDate")) else earliest
        effective_start = max(requested, earliest)
        rate = int(variant.subscription if variant is not None else product.subscription)
        plan_valid_days = int(js_number(item["planValidDays"])) if truthy(item.get("planValidDays")) else None
        expires_at = effective_start + timedelta(days=plan_valid_days - 1) if is_prepaid and plan_valid_days else None
        quantity = js_number(item.get("quantity"))

        db.add(m.subscriptions(
            id=str(uuid.uuid4()),
            customer_id=customer_id,
            product_id=item["productId"],
            variant_id=item.get("variantId") or None,
            frequency=frequency,
            day_wise_days=serialize_day_wise_days(day_wise) if frequency == "day_wise" else None,
            quantity=int(quantity) if truthy(quantity) else 1,
            delivery_slot_id=item.get("deliverySlotId") or None,
            delivery_mode_id=item.get("deliveryModeId") or None,
            status="active",
            start_date=effective_start,
            next_delivery_date=effective_start,
            rate=rate,
            custom_details=item.get("customDetails") or None,
            plan_valid_days=plan_valid_days,
            expires_at=expires_at,
            created_at=now,
            updated_at=now,
        ))
        db.commit()
        created += 1

    return ok({"created": created, "effectiveFrom": format_date_only(earliest)}, status=201)


@router.post("/subscriptions/one-time-order")
@guard("Server Error")
def one_time_order(body: Body, db: DB, user: dict = perm("one_time_order", "create")):
    customer_id, items = body.get("customerId"), body.get("items")
    if not truthy(customer_id) or not isinstance(items, list) or not items:
        return fail(422, "Customer and at least one product are required")
    customer = db.get(m.customers, customer_id)
    if customer is None:
        return fail(404, "Customer not found")

    is_prepaid = customer.customer_type == "prepaid"
    now = m.utcnow()
    target = parse_date_only(body["deliveryDate"]) if truthy(body.get("deliveryDate")) else utc_today() + timedelta(days=1)

    subtotal, tax_amount, lines = 0, 0, []
    for item in items:
        product = db.get(m.products, item.get("productId"))
        if product is None:
            return fail(422, "One of the selected products does not exist")
        if not (product.prepaid_getonce if is_prepaid else product.postpaid_getonce):
            return fail(422, f"{product.name} is not available as a one-time order for this customer type")
        variant = db.get(m.product_variants, item["variantId"]) if truthy(item.get("variantId")) else None
        rate = int(variant.buy_once if variant is not None else product.buy_once)
        qty_raw = js_number(item.get("quantity"))
        qty = int(qty_raw) if truthy(qty_raw) else 1
        line_total = rate * qty
        gst_rate = float(product.gst_rate or 0)
        line_tax = 0 if product.is_tax_inclusive else js_round(line_total * (gst_rate / 100))
        subtotal += line_total
        tax_amount += line_tax
        lines.append(dict(
            id=str(uuid.uuid4()),
            product_id=item["productId"],
            product_name=product.name,
            size=(variant.size_label if variant else None) or product.size,
            quantity=qty,
            unit_price=rate,
            purchase_type="BUY_ONCE",
            line_total=line_total,
            variant_id=item.get("variantId") or None,
            gst_rate=gst_rate,
            tax_amount=line_tax,
            created_at=now,
            updated_at=now,
        ))

    order_id = str(uuid.uuid4())
    invoice_number = f"SDF-{local_today().strftime('%Y%m%d')}-{order_id[:8].upper()}"
    db.add(m.orders(
        id=order_id,
        customer_id=customer_id,
        customer_name=customer.name,
        phone=customer.phone,
        address=customer.address,
        pincode=customer.pincode,
        delivery_date=target,
        route_id=customer.route_id,
        status="PENDING",
        subtotal=subtotal,
        tax_amount=tax_amount,
        total_amount=subtotal + tax_amount,
        payment_method="cod",
        payment_status="pending",
        invoice_number=invoice_number,
        created_at=now,
        updated_at=now,
    ))
    db.flush()
    for line in lines:
        db.add(m.order_items(order_id=order_id, **line))
    db.commit()
    return ok({"orderId": order_id, "invoiceNumber": invoice_number, "total": subtotal + tax_amount}, status=201)


def _load(db, id: str):
    sub = db.scalar(
        select(m.subscriptions).where(m.subscriptions.id == id).options(*subscription_options())
        .execution_options(populate_existing=True)
    )
    if sub is None:
        raise LookupError("Subscription not found")  # Prisma's update() threw here -> 500
    return sub


def _product_name(sub) -> str:
    return sub.products.name if sub.products and sub.products.name else "a subscription"


@router.patch("/subscriptions/{id}/change-request")
@guard("Server Error")
def request_change(id: str, body: Body, db: DB, user: dict = perm("change_request", "create")):
    existing = db.get(m.subscriptions, id)
    if existing is None:
        return fail(404, "Subscription not found")
    if existing.status == "cancelled":
        return fail(422, "A cancelled subscription cannot be changed")

    variant_id = body.get("variantId")
    if truthy(variant_id):
        variant = db.get(m.product_variants, variant_id)
        if variant is None or variant.product_id != existing.product_id:
            return fail(422, "Selected packaging does not belong to this product")

    _, earliest = get_earliest_effective_date(db)
    if "customDetails" in body:
        existing.custom_details = body["customDetails"] or None
    if "quantity" in body:
        existing.pending_quantity = int(js_number(body["quantity"]))
    if "variantId" in body:
        existing.pending_variant_id = variant_id or None
    if "frequency" in body:
        existing.pending_frequency = body["frequency"]
    if "deliverySlotId" in body:
        existing.pending_delivery_slot_id = body["deliverySlotId"] or None
    if "deliveryModeId" in body:
        existing.pending_delivery_mode_id = body["deliveryModeId"] or None

    has_pending = any(k in body for k in ("quantity", "variantId", "frequency", "deliverySlotId", "deliveryModeId"))
    if has_pending:
        existing.change_effective_date = earliest
    existing.updated_at = m.utcnow()
    db.commit()
    sub = _load(db, id)

    if has_pending:
        log_activity(
            db,
            type="change_request",
            subtype="change_request",
            title="Change Request (Admin)",
            message=f"Admin requested a change to {_product_name(sub)}, effective {format_date_only(earliest)}.",
            customer_id=sub.customer_id,
            subscription_id=sub.id,
            effective_date=earliest,
            actor="admin",
        )
    return ok({"subscription": map_subscription_row(sub), "effectiveFrom": format_date_only(earliest)})


@router.patch("/subscriptions/{id}/pause")
@guard("Server Error")
def pause(id: str, body: Body, db: DB, user: dict = perm("subscriptions", "update")):
    _, earliest = get_earliest_effective_date(db)
    sub = _load(db, id)
    sub.status = "paused"
    sub.paused_from = earliest
    sub.paused_until = parse_date_only(body["pausedUntil"]) if truthy(body.get("pausedUntil")) else None
    sub.updated_at = m.utcnow()
    db.commit()

    log_activity(
        db,
        type="subscription",
        subtype="pause",
        title="Subscription Paused (Admin)",
        message=f"Admin paused {_product_name(sub)}, effective {format_date_only(earliest)}.",
        customer_id=sub.customer_id,
        subscription_id=sub.id,
        effective_date=earliest,
        actor="admin",
    )
    return ok({"subscription": map_subscription_row(sub), "effectiveFrom": format_date_only(earliest)})


@router.patch("/subscriptions/{id}/resume")
@guard("Server Error")
def resume(id: str, db: DB, user: dict = perm("subscriptions", "update")):
    sub = _load(db, id)
    sub.status = "active"
    sub.paused_from = None
    sub.paused_until = None
    sub.inactivated_at = None
    sub.updated_at = m.utcnow()
    db.commit()

    log_activity(
        db,
        type="subscription",
        subtype="resume",
        title="Subscription Resumed (Admin)",
        message=f"Admin resumed {_product_name(sub)}.",
        customer_id=sub.customer_id,
        subscription_id=sub.id,
        effective_date=utc_today(),
        actor="admin",
    )
    return ok({"subscription": map_subscription_row(sub)})


@router.patch("/subscriptions/{id}/inactive")
@guard("Server Error")
def set_inactive(id: str, db: DB, user: dict = perm("subscriptions", "update")):
    sub = _load(db, id)
    sub.status = "inactive"
    sub.inactivated_at = utc_today()
    sub.updated_at = m.utcnow()
    db.commit()
    return ok({"subscription": map_subscription_row(sub)})


@router.patch("/subscriptions/{id}/cancel")
@guard("Server Error")
def cancel(id: str, body: Body, db: DB, user: dict = perm("subscriptions", "update")):
    cancel_note = body.get("cancelNote")
    sub = _load(db, id)
    sub.status = "cancelled"
    sub.next_delivery_date = None
    sub.paused_from = None
    sub.paused_until = None
    sub.cancel_reason_id = body.get("cancelReasonId") or None
    sub.cancel_note = cancel_note or None
    sub.cancelled_at = utc_today()
    sub.updated_at = m.utcnow()
    db.commit()
    db.expire(sub, ["cancel_reasons"])

    log_activity(
        db,
        type="subscription",
        subtype="cancel",
        title="Subscription Cancelled (Admin)",
        message=f"Admin cancelled {_product_name(sub)}.{f' Note: {cancel_note}.' if cancel_note else ''}",
        customer_id=sub.customer_id,
        subscription_id=sub.id,
        actor="admin",
    )
    return ok({"subscription": map_subscription_row(sub)})


@router.get("/subscriptions/{id}")
@guard("Server Error")
def show(id: str, db: DB, user: dict = perm("subscriptions", "view")):
    sub = db.scalar(select(m.subscriptions).where(m.subscriptions.id == id).options(*subscription_options()))
    if sub is None:
        return fail(404, "Subscription not found")
    return ok(map_subscription_row(sub))


@router.get("/subscriptions")
@guard("Server Error")
def index(request: Request, db: DB, user: dict = perm("subscriptions", "view")):
    page, page_size = paginate(request)
    conditions = [*_filters(request), *_status_bucket(query(request, "status"))]
    total = db.scalar(select(func.count()).select_from(m.subscriptions).where(*conditions)) or 0
    rows = db.scalars(
        select(m.subscriptions)
        .where(*conditions)
        .options(*subscription_options())
        .order_by(m.subscriptions.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    ).all()
    return ok({
        "rows": [map_subscription_row(s) for s in rows],
        "total": total,
        "page": page,
        "pageSize": page_size,
        "totalPages": total_pages(total, page_size),
    })
