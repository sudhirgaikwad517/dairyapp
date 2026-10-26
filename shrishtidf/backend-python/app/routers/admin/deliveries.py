"""Delivery boys (full management) and Mark Daily Delivery."""
import uuid

from fastapi import APIRouter, Request
from sqlalchemy import func, select
from sqlalchemy.orm import selectinload

from ... import models as m
from ...core.dates import format_date_only, js_date_to_date, local_today, parse_date_only
from ...core.deps import DB, Body
from ...core.http import fail, guard, js_number, ok, query, respond, truthy
from ...core.security import hash_password
from ...services.subscription_lifecycle import (
    add_frequency_days,
    parse_day_wise_days,
    promote_pending_if_due,
    skip_vacation_days,
)
from .common import coalesce, csv_response, num0, paginate, perm, total_pages

router = APIRouter()


# ---- delivery boys ----------------------------------------------------------------

def _map_boy(d) -> dict:
    # Never include `password` — login credentials must never round-trip through any API response.
    return {
        "id": d.id,
        "name": d.name,
        "firstName": d.first_name or d.name,
        "middleName": d.middle_name or "",
        "lastName": d.last_name or "",
        "phone": d.phone,
        "dateOfBirth": d.date_of_birth,
        "address": d.address,
        "city": d.city,
        "hubId": d.hub_id,
        "hub": d.hubs.name if d.hubs else None,
        "photoUrl": d.photo_url,
        "aadharUrl": d.aadhar_url,
        "username": d.username,
        "isActive": d.is_active,
        "createdAt": d.created_at,
    }


def _boy_filters(request: Request) -> list:
    q = lambda name: query(request, name)  # noqa: E731
    b = m.delivery_boys
    conditions = []
    if q("name"):
        conditions.append(b.name.ilike(f"%{q('name')}%"))
    if q("phone"):
        conditions.append(b.phone.like(f"%{q('phone')}%"))
    if q("address"):
        conditions.append(b.address.ilike(f"%{q('address')}%"))
    if q("city"):
        conditions.append(b.city.ilike(f"%{q('city')}%"))
    if q("hubId"):
        conditions.append(b.hub_id == q("hubId"))
    if q("status"):
        conditions.append(b.is_active.is_(q("status") == "active"))
    if q("dob"):
        conditions.append(b.date_of_birth == js_date_to_date(q("dob")))
    return conditions


@router.get("/logistics/delivery-boys/export")
@guard("Server Error")
def boys_export(request: Request, db: DB, user: dict = perm("delivery_boy", "excel")):
    rows = db.scalars(
        select(m.delivery_boys)
        .where(*_boy_filters(request))
        .options(selectinload(m.delivery_boys.hubs))
        .order_by(m.delivery_boys.name)
    ).all()
    return csv_response(
        ["Name", "Date of Birth", "Mobile", "Address", "City", "Hub", "Username", "Status"],
        [
            [
                b.name, format_date_only(b.date_of_birth) if b.date_of_birth else "", b.phone or "",
                b.address or "", b.city or "", b.hubs.name if b.hubs else "", b.username or "",
                "Activated" if b.is_active else "Deactivated",
            ]
            for b in rows
        ],
        "delivery-boys",
    )


@router.get("/logistics/delivery-boys/{id}")
@guard("Server Error")
def boys_show(id: str, db: DB, user: dict = perm("delivery_boy", "view")):
    boy = db.get(m.delivery_boys, id)
    if boy is None:
        return fail(404, "Delivery boy not found")
    return ok(_map_boy(boy))


@router.patch("/logistics/delivery-boys/{id}")
@guard("Server Error")
def boys_update(id: str, body: Body, db: DB, user: dict = perm("delivery_boy", "update")):
    b = body
    boy = db.get(m.delivery_boys, id)
    if boy is None:
        return fail(404, "Delivery boy not found")
    if truthy(b.get("phone")) and b["phone"] != boy.phone and db.scalar(
        select(m.delivery_boys.id).where(m.delivery_boys.phone == b["phone"]).limit(1)
    ) is not None:
        return fail(422, "This mobile number is already in use")
    if truthy(b.get("username")) and b["username"] != boy.username and db.scalar(
        select(m.delivery_boys.id).where(m.delivery_boys.username == b["username"])
    ) is not None:
        return fail(422, "This username is already in use")
    if truthy(b.get("hubId")) and db.get(m.hubs, b["hubId"]) is None:
        return fail(422, "Selected hub does not exist")

    if "firstName" in b or "middleName" in b or "lastName" in b:
        parts = [
            b["firstName"] if "firstName" in b else boy.first_name,
            b["middleName"] if "middleName" in b else boy.middle_name,
            b["lastName"] if "lastName" in b else boy.last_name,
        ]
        boy.name = " ".join(str(p) for p in parts if p) or boy.name
    if "firstName" in b:
        boy.first_name = b["firstName"]
    if "middleName" in b:
        boy.middle_name = b["middleName"] or None
    if "lastName" in b:
        boy.last_name = b["lastName"]
    for key, column in (("phone", "phone"), ("address", "address"), ("city", "city"), ("username", "username")):
        if key in b:
            setattr(boy, column, b[key])
    if "dateOfBirth" in b:
        boy.date_of_birth = js_date_to_date(b["dateOfBirth"]) if truthy(b["dateOfBirth"]) else None
    for key, column in (("hubId", "hub_id"), ("photoUrl", "photo_url"), ("aadharUrl", "aadhar_url")):
        if key in b:
            setattr(boy, column, b[key] or None)
    if "status" in b:
        boy.is_active = truthy(b["status"])
    if truthy(b.get("password")):
        boy.password = hash_password(str(b["password"]))
    boy.updated_at = m.utcnow()
    db.commit()
    db.expire(boy, ["hubs"])
    return ok(_map_boy(boy))


@router.get("/logistics/delivery-boys")
@guard("Server Error")
def boys_index(request: Request, db: DB, user: dict = perm("delivery_boy", "view")):
    conditions = _boy_filters(request)
    if not query(request, "page"):
        boys = db.scalars(
            select(m.delivery_boys)
            .where(m.delivery_boys.is_active.is_(True), *conditions)
            .order_by(m.delivery_boys.name)
        ).all()
        return ok([{"id": b.id, "name": b.name, "phone": b.phone} for b in boys])

    page, page_size = paginate(request)
    total = db.scalar(select(func.count()).select_from(m.delivery_boys).where(*conditions)) or 0
    rows = db.scalars(
        select(m.delivery_boys)
        .where(*conditions)
        .options(selectinload(m.delivery_boys.hubs))
        .order_by(m.delivery_boys.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    ).all()
    return ok({"rows": [_map_boy(b) for b in rows], "total": total, "page": page, "pageSize": page_size, "totalPages": total_pages(total, page_size)})


@router.post("/logistics/delivery-boys")
@guard("Server Error")
def boys_create(body: Body, db: DB, user: dict = perm("delivery_boy", "create")):
    b = body
    required = ("firstName", "lastName", "phone", "address", "city", "username", "password")
    if not all(truthy(b.get(k)) for k in required):
        return fail(422, "First name, last name, mobile, address, city, username and password are required")
    if db.scalar(select(m.delivery_boys.id).where(m.delivery_boys.phone == b["phone"]).limit(1)) is not None:
        return fail(422, "This mobile number is already in use")
    if db.scalar(select(m.delivery_boys.id).where(m.delivery_boys.username == b["username"])) is not None:
        return fail(422, "This username is already in use")
    if truthy(b.get("hubId")) and db.get(m.hubs, b["hubId"]) is None:
        return fail(422, "Selected hub does not exist")

    now = m.utcnow()
    boy = m.delivery_boys(
        id=str(uuid.uuid4()),
        name=" ".join(str(p) for p in (b["firstName"], b.get("middleName"), b["lastName"]) if p),
        first_name=b["firstName"],
        middle_name=b.get("middleName") or None,
        last_name=b["lastName"],
        phone=b["phone"],
        date_of_birth=js_date_to_date(b["dateOfBirth"]) if truthy(b.get("dateOfBirth")) else None,
        address=b["address"],
        city=b["city"],
        hub_id=b.get("hubId") or None,
        photo_url=b.get("photoUrl") or None,
        aadhar_url=b.get("aadharUrl") or None,
        username=b["username"],
        password=hash_password(str(b["password"])),
        is_active=b.get("status") is not False,
        created_at=now,
        updated_at=now,
    )
    db.add(boy)
    db.commit()
    return ok(_map_boy(boy), status=201)


# ---- mark daily delivery -------------------------------------------------------------

def _map_row(row: dict) -> dict:
    ordered = float(row["quantityOrdered"])
    delivered = row["quantityDelivered"]
    pending = row["pendingQty"]
    return {
        "recordId": row.get("recordId") or None,
        "subscriptionId": row["subscription_id"],
        "customerId": row["customer_id"],
        "customerName": row["customerName"],
        "address": row["address"],
        "hub": row["hub"],
        "city": row["city"],
        "deliveryBoyId": row["delivery_boy_id"],
        "deliveryBoy": row["deliveryBoy"],
        "deliveryMode": row["deliveryMode"],
        "productId": row["product_id"],
        "productName": row["productName"],
        "variantId": row["variant_id"],
        "quantityOrdered": ordered,
        "quantityDelivered": float(delivered) if delivered is not None else ordered,
        "pendingQty": float(pending) if pending is not None else 0,
        "remark": row["remark"] or "",
        "bottlesCollected": row["bottlesCollected"] or 0,
        "status": row["status"] or "pending",
        "deliveredAt": row["deliveredAt"] or None,
    }


def _product_label(product, variant) -> str:
    return f"{product.name if product else ''}{f' - {variant.size_label}' if variant else ''}"


@router.get("/logistics/daily-deliveries")
@guard("Server Error")
def daily_index(request: Request, db: DB, user: dict = perm("mark_daily_delivery", "view")):
    date_str = query(request, "date") or format_date_only(local_today())
    target = parse_date_only(date_str)
    only_unmarked = query(request, "unmarked") == "true"

    customer_conditions = []
    if query(request, "deliveryBoyId"):
        customer_conditions.append(m.customers.delivery_boy_id == query(request, "deliveryBoyId"))
    if query(request, "hubId"):
        customer_conditions.append(m.customers.hub_id == query(request, "hubId"))
    if query(request, "city"):
        customer_conditions.append(m.customers.city.ilike(f"%{query(request, 'city')}%"))
    customer_ids = select(m.customers.id).where(*customer_conditions)

    def customer_options(rel):
        customer = selectinload(rel)
        return [customer, customer.selectinload(m.customers.hubs), customer.selectinload(m.customers.delivery_boys)]

    records = db.scalars(
        select(m.delivery_records)
        .where(m.delivery_records.delivery_date == target, m.delivery_records.customer_id.in_(customer_ids))
        .options(
            *customer_options(m.delivery_records.customers),
            selectinload(m.delivery_records.products),
            selectinload(m.delivery_records.product_variants),
        )
    ).all()

    due = [] if only_unmarked else db.scalars(
        select(m.subscriptions)
        .where(
            m.subscriptions.status == "active",
            m.subscriptions.next_delivery_date <= target,
            m.subscriptions.customer_id.in_(customer_ids),
        )
        .options(
            *customer_options(m.subscriptions.customers),
            selectinload(m.subscriptions.products),
            selectinload(m.subscriptions.product_variants),
        )
    ).all()

    # Candidates include anything overdue (next_delivery_date <= target), because a
    # subscription can be "stuck" behind a vacation window or an unpromoted pending
    # change — this fast-forwards/promotes it and checks whether it actually lands
    # on the target date.
    resolved = []
    for sub in due:
        promote_pending_if_due(db, sub, target)
        final_due = skip_vacation_days(db, sub, target)
        db.commit()
        if final_due is not None and final_due == target:
            resolved.append(sub)

    rows = []
    for r in records:
        c = r.customers
        rows.append({
            "recordId": r.id,
            "subscription_id": r.subscription_id,
            "customer_id": r.customer_id,
            "customerName": c.name if c else None,
            "address": c.address if c else None,
            "hub": c.hubs.name if c and c.hubs else None,
            "city": c.city if c else None,
            "delivery_boy_id": r.delivery_boy_id,
            "deliveryBoy": c.delivery_boys.name if c and c.delivery_boys else None,
            "deliveryMode": c.delivery_mode if c else None,
            "product_id": r.product_id,
            "productName": _product_label(r.products, r.product_variants),
            "variant_id": r.variant_id,
            "quantityOrdered": r.quantity_ordered,
            "quantityDelivered": r.quantity_delivered,
            "pendingQty": r.pending_qty,
            "remark": r.remark,
            "bottlesCollected": r.bottles_collected,
            "status": r.status,
            "deliveredAt": r.delivered_at,
        })

    marked = {r.subscription_id for r in records}
    for s in resolved:
        if s.id in marked:
            continue
        c = s.customers
        rows.append({
            "recordId": None,
            "subscription_id": s.id,
            "customer_id": s.customer_id,
            "customerName": c.name if c else None,
            "address": c.address if c else None,
            "hub": c.hubs.name if c and c.hubs else None,
            "city": c.city if c else None,
            "delivery_boy_id": (c.delivery_boy_id if c else None) or None,
            "deliveryBoy": c.delivery_boys.name if c and c.delivery_boys else None,
            "deliveryMode": c.delivery_mode if c else None,
            "product_id": s.product_id,
            "productName": _product_label(s.products, s.product_variants),
            "variant_id": s.variant_id,
            "quantityOrdered": s.quantity,
            "quantityDelivered": None,
            "pendingQty": 0,
            "remark": "",
            "bottlesCollected": 0,
            "status": "pending",
            "deliveredAt": None,
        })

    return respond({"success": True, "data": [_map_row(r) for r in rows], "date": date_str})


def _wallet_for_update(db, customer_id: str, now):
    wallet = db.scalar(select(m.customer_wallets).where(m.customer_wallets.customer_id == customer_id).with_for_update())
    if wallet is None:
        wallet = m.customer_wallets(id=str(uuid.uuid4()), customer_id=customer_id, balance=0, created_at=now, updated_at=now)
        db.add(wallet)
        db.flush()
    return wallet


@router.post("/logistics/daily-deliveries")
@guard("Server Error")
def daily_save(body: Body, db: DB, user: dict = perm("mark_daily_delivery", "create")):
    date_str, deliveries = body.get("date"), body.get("deliveries")
    if not truthy(date_str) or not isinstance(deliveries, list) or not deliveries:
        return fail(422, "Date and at least one delivery entry are required")
    target = parse_date_only(date_str)
    now = m.utcnow()

    saved = 0
    for d in deliveries:
        sub = db.scalar(
            select(m.subscriptions).where(m.subscriptions.id == d.get("subscriptionId")).options(selectinload(m.subscriptions.customers))
        )
        if sub is None:
            continue

        quantity_ordered = js_number(coalesce(d.get("quantityOrdered"), sub.quantity))
        quantity_delivered = js_number(coalesce(d.get("quantityDelivered"), quantity_ordered))
        pending_qty = quantity_ordered - quantity_delivered
        status = "delivered" if quantity_delivered > 0 else "not_delivered"
        bottles = int(num0(d.get("bottlesCollected")))

        # Postpaid customers pay per delivery — the previously-billed quantity
        # makes re-saving a corrected delivery bill only the difference.
        record = db.scalar(
            select(m.delivery_records).where(
                m.delivery_records.subscription_id == sub.id, m.delivery_records.delivery_date == target
            )
        )
        previously_delivered = float(record.quantity_delivered) if record else 0
        if record is None:
            record = m.delivery_records(
                id=str(uuid.uuid4()),
                subscription_id=sub.id,
                customer_id=d.get("customerId") or sub.customer_id,
                delivery_boy_id=d.get("deliveryBoyId") or None,
                delivery_date=target,
                product_id=d.get("productId") or sub.product_id,
                variant_id=d.get("variantId") or sub.variant_id,
                created_at=now,
            )
            db.add(record)
        record.quantity_ordered = quantity_ordered
        record.quantity_delivered = quantity_delivered
        record.pending_qty = pending_qty
        record.remark = d.get("remark") or None
        record.bottles_collected = bottles
        record.status = status
        record.delivered_at = now
        record.updated_at = now
        db.flush()

        # Advance the subscription only the first time this due date is marked —
        # re-saving an already-marked day must not push it forward twice.
        if sub.next_delivery_date and format_date_only(sub.next_delivery_date) == date_str:
            sub.next_delivery_date = add_frequency_days(target, sub.frequency, parse_day_wise_days(sub.day_wise_days))

        # Postpaid billing: charge the wallet for exactly what was delivered, the
        # moment it's marked. Prepaid plans already paid upfront.
        if sub.wallet_auto_debit and sub.customers and sub.customers.customer_type == "postpaid":
            delta_amount = (quantity_delivered - previously_delivered) * float(sub.rate or 0)
            if delta_amount != 0:
                wallet = _wallet_for_update(db, sub.customer_id, now)
                # Postpaid is allowed to go negative — that running due is the point.
                new_balance = int(wallet.balance) - int(delta_amount)
                wallet.balance = new_balance
                wallet.updated_at = now
                label = "Delivery charge" if delta_amount > 0 else "Delivery correction"
                db.add(m.wallet_transactions(
                    id=str(uuid.uuid4()),
                    customer_id=sub.customer_id,
                    type="debit" if delta_amount > 0 else "credit",
                    amount=int(abs(delta_amount)),
                    balance_after=new_balance,
                    reference_type="subscription_delivery",
                    reference_id=record.id,
                    notes=f"{label}: {_qty(quantity_delivered)} unit(s) on {date_str}",
                    created_at=now,
                    updated_at=now,
                ))
        db.commit()
        saved += 1

    return ok({"saved": saved})


def _qty(value: float) -> str:
    return str(int(value)) if float(value).is_integer() else str(value)


@router.post("/logistics/daily-deliveries/{id}/unmark")
@guard("Server Error")
def daily_unmark(id: str, db: DB, user: dict = perm("mark_daily_delivery", "update")):
    record = db.scalar(
        select(m.delivery_records)
        .where(m.delivery_records.id == id)
        .options(selectinload(m.delivery_records.subscriptions).selectinload(m.subscriptions.customers))
    )
    if record is None:
        return fail(404, "Delivery record not found")

    record_date = record.delivery_date
    sub = record.subscriptions
    now = m.utcnow()

    # A postpaid delivery that was already billed refunds that charge —
    # unmarking means it never happened.
    if sub.wallet_auto_debit and sub.customers and sub.customers.customer_type == "postpaid":
        billed = int(float(record.quantity_delivered) * float(sub.rate or 0))
        if billed != 0:
            wallet = db.scalar(select(m.customer_wallets).where(m.customer_wallets.customer_id == sub.customer_id).with_for_update())
            if wallet is None:
                raise LookupError("Wallet not found")  # Prisma's update() threw here
            new_balance = int(wallet.balance) + billed
            wallet.balance = new_balance
            wallet.updated_at = now
            db.add(m.wallet_transactions(
                id=str(uuid.uuid4()),
                customer_id=sub.customer_id,
                type="credit",
                amount=billed,
                balance_after=new_balance,
                reference_type="subscription_delivery",
                reference_id=record.id,
                notes=f"Delivery unmarked, charge reversed: {format_date_only(record_date)}",
                created_at=now,
                updated_at=now,
            ))

    db.delete(record)
    # Only roll next delivery back if it had actually advanced past this record's date.
    if sub.next_delivery_date and sub.next_delivery_date != record_date:
        sub.next_delivery_date = record_date
    db.commit()
    return respond({"success": True})
