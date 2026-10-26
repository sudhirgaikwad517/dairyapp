import re
import uuid

from fastapi import APIRouter, Request
from sqlalchemy import func, select
from sqlalchemy.orm import selectinload

from ... import models as m
from ...core.dates import format_timestamp_date, js_date, js_date_to_date
from ...core.deps import DB, Body
from ...core.http import fail, fail_nested, guard, js_number, ok, query, truthy
from ...core.serialize import to_dict
from ...services.activity_log import log_activity
from ...services.customer_code import next_customer_code
from .common import csv_response, paginate, perm, total_pages

router = APIRouter()


def _filters(request: Request) -> list:
    q = lambda name: query(request, name)  # noqa: E731
    c = m.customers
    conditions = []
    if q("name"):
        conditions.append(c.name.ilike(f"%{q('name')}%"))
    if q("mobile"):
        conditions.append(c.phone.like(f"%{q('mobile')}%"))
    if q("email"):
        conditions.append(c.email.ilike(f"%{q('email')}%"))
    if q("customerType"):
        conditions.append(c.customer_type == q("customerType"))
    if q("routeNotAssigned") == "true":
        conditions.append(c.route_id.is_(None))
    elif q("routeId"):
        conditions.append(c.route_id == q("routeId"))
    if q("hubId"):
        conditions.append(c.hub_id == q("hubId"))
    if q("deliveryBoyNotAssigned") == "true":
        conditions.append(c.delivery_boy_id.is_(None))
    elif q("deliveryBoyId"):
        conditions.append(c.delivery_boy_id == q("deliveryBoyId"))
    if q("sequenceNotAssigned") == "true":
        conditions.append(c.delivery_sequence == 0)
    if q("status"):
        conditions.append(c.is_active.is_(q("status") == "active"))
    if q("city"):
        conditions.append(c.city.ilike(f"%{q('city')}%"))
    if q("regFrom"):
        conditions.append(c.created_at >= js_date(q("regFrom")))
    if q("regTo"):
        conditions.append(c.created_at <= js_date(f"{q('regTo')}T23:59:59.999Z"))
    return conditions


@router.get("/customers/export")
@guard("Server Error")
def export_customers(request: Request, db: DB, user: dict = perm("customers", "excel")):
    rows = db.scalars(
        select(m.customers)
        .where(*_filters(request))
        .options(
            selectinload(m.customers.hubs),
            selectinload(m.customers.delivery_routes),
            selectinload(m.customers.delivery_boys),
        )
        .order_by(m.customers.created_at.desc())
    ).all()
    header = ["Customer ID", "Name", "Mobile", "Email", "Registration Date", "City", "Address", "Hub", "Route", "Delivery Boy", "Status"]
    return csv_response(header, [
        [
            c.code or "",
            c.name or "",
            c.phone or "",
            c.email or "",
            format_timestamp_date(c.created_at),
            c.city or "",
            re.sub(r"[\r\n,]+", " ", c.address or ""),
            c.hubs.name if c.hubs else "",
            c.delivery_routes.name if c.delivery_routes else "",
            c.delivery_boys.name if c.delivery_boys else "",
            "Active" if c.is_active else "Inactive",
        ]
        for c in rows
    ], "customers")


@router.get("/customers/{id}")
@guard("Server Error")
def get_customer(id: str, db: DB, user: dict = perm("customers", "view")):
    customer = db.scalar(
        select(m.customers)
        .where(m.customers.id == id)
        .options(
            selectinload(m.customers.hubs),
            selectinload(m.customers.delivery_routes),
            selectinload(m.customers.delivery_boys),
            selectinload(m.customers.customer_wallets),
            selectinload(m.customers.subscriptions).selectinload(m.subscriptions.products),
        )
    )
    if customer is None:
        return fail(404, "Customer not found")

    data = to_dict(customer, include={
        "hubs": True,
        "delivery_routes": True,
        "delivery_boys": True,
        "customer_wallets": True,
        "subscriptions": {"include": {"products": True}},
    })
    data["orders"] = [
        to_dict(o) for o in db.scalars(
            select(m.orders).where(m.orders.customer_id == id).order_by(m.orders.created_at.desc()).limit(10)
        )
    ]
    data["customer_delivery_boy_changes"] = [
        to_dict(ch) for ch in db.scalars(
            select(m.customer_delivery_boy_changes)
            .where(m.customer_delivery_boy_changes.customer_id == id)
            .order_by(m.customer_delivery_boy_changes.changed_at.desc())
            .limit(20)
        )
    ]
    return ok(data)


def _number_or_none(value):
    return None if value is None else js_number(value)


@router.patch("/customers/{id}")
@guard("Server Error")
def update_customer(id: str, body: Body, db: DB, user: dict = perm("customers", "update")):
    b = body
    customer = db.get(m.customers, id)
    if customer is None:
        return fail(404, "Customer not found")

    if truthy(b.get("hubId")) and db.get(m.hubs, b["hubId"]) is None:
        return fail(422, "Selected hub does not exist")
    if truthy(b.get("routeId")) and db.get(m.delivery_routes, b["routeId"]) is None:
        return fail(422, "Selected route does not exist")
    if truthy(b.get("deliveryBoyId")) and db.get(m.delivery_boys, b["deliveryBoyId"]) is None:
        return fail(422, "Selected delivery boy does not exist")

    if "name" in b:
        customer.name = b["name"]
    elif truthy(b.get("firstName")) or truthy(b.get("middleName")) or truthy(b.get("lastName")):
        customer.name = " ".join(str(p) for p in (b.get("firstName"), b.get("middleName"), b.get("lastName")) if p)

    nullable = {
        "email": "email",
        "alternatePhone": "alternate_phone",
        "residenceType": "residence_type",
        "flatNo": "flat_no",
        "societyName": "society_name",
        "streetName": "street_name",
        "landmark": "landmark",
        "area": "area",
        "state": "state",
        "city": "city",
        "pincode": "pincode",
        "hubId": "hub_id",
        "routeId": "route_id",
    }
    for key, column in nullable.items():
        if key in b:
            setattr(customer, column, b[key] or None)
    if "dateOfBirth" in b:
        customer.date_of_birth = js_date_to_date(b["dateOfBirth"]) if truthy(b["dateOfBirth"]) else None
    if "deliveryMode" in b:
        customer.delivery_mode = b["deliveryMode"]
    if "customerType" in b:
        customer.customer_type = b["customerType"]
    if "status" in b:
        customer.is_active = truthy(b["status"])
    if "deliverySequence" in b:
        seq = js_number(b["deliverySequence"])
        customer.delivery_sequence = int(seq) if truthy(seq) else 0
    if "latitude" in b:
        customer.latitude = _number_or_none(b["latitude"])
    if "longitude" in b:
        customer.longitude = _number_or_none(b["longitude"])

    old_boy = customer.delivery_boy_id
    boy_changed = "deliveryBoyId" in b and b["deliveryBoyId"] != old_boy
    if boy_changed:
        customer.delivery_boy_id = b["deliveryBoyId"] or None
    customer.updated_at = m.utcnow()
    db.flush()

    if boy_changed:
        db.add(m.customer_delivery_boy_changes(
            id=str(uuid.uuid4()),
            customer_id=id,
            old_delivery_boy_id=old_boy,
            new_delivery_boy_id=customer.delivery_boy_id,
            narration=b.get("deliveryBoyChangeNarration") or None,
            changed_by="admin",
            changed_at=m.utcnow(),
        ))
    db.commit()
    db.refresh(customer)
    return ok({"customer": customer})


@router.get("/customers")
@guard("Server Error")
def get_customers(request: Request, db: DB, user: dict = perm("customers", "view")):
    page, page_size = paginate(request, max_size=500)
    conditions = _filters(request)

    sub_status = query(request, "subscriptionStatus")
    if sub_status:
        if sub_status == "none":
            conditions.append(m.customers.id.not_in(select(m.subscriptions.customer_id).distinct()))
        else:
            conditions.append(m.customers.id.in_(
                select(m.subscriptions.customer_id).where(m.subscriptions.status == sub_status).distinct()
            ))

    total = db.scalar(select(func.count()).select_from(m.customers).where(*conditions)) or 0
    rows = db.scalars(
        select(m.customers)
        .where(*conditions)
        .options(
            selectinload(m.customers.hubs),
            selectinload(m.customers.delivery_routes),
            selectinload(m.customers.delivery_boys),
            selectinload(m.customers.customer_wallets),
        )
        .order_by(m.customers.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    ).all()
    serviceable = set(db.scalars(select(m.delivery_zones.pincode).where(m.delivery_zones.is_serviceable.is_(True))))

    status_by_customer: dict[str, str] = {}
    ids = [c.id for c in rows]
    if ids:
        for customer_id, status in db.execute(
            select(m.subscriptions.customer_id, m.subscriptions.status).where(m.subscriptions.customer_id.in_(ids))
        ):
            if customer_id not in status_by_customer or status == "active":
                status_by_customer[customer_id] = status

    mapped = [
        {
            "id": c.id,
            "code": c.code,
            "name": c.name,
            "phone": c.phone,
            "email": c.email,
            "registeredAt": c.created_at,
            "address": c.address,
            "apartment": c.society_name,
            "city": c.city,
            "pincode": c.pincode,
            "hub": c.hubs.name if c.hubs else None,
            "hubId": c.hub_id,
            "route": c.delivery_routes.name if c.delivery_routes else None,
            "routeId": c.route_id,
            "deliveryBoy": c.delivery_boys.name if c.delivery_boys else None,
            "deliveryBoyId": c.delivery_boy_id,
            "isActive": c.is_active,
            "customerType": c.customer_type,
            "serviceable": c.pincode in serviceable if c.pincode else False,
            "wallet": int(c.customer_wallets.balance) if c.customer_wallets else 0,
            "subscriptionStatus": status_by_customer.get(c.id) or "none",
            "registeredBy": c.registered_by,
            "deliverySequence": c.delivery_sequence,
            "latitude": float(c.latitude) if c.latitude is not None else None,
            "longitude": float(c.longitude) if c.longitude is not None else None,
        }
        for c in rows
    ]
    return ok({"rows": mapped, "total": total, "page": page, "pageSize": page_size, "totalPages": total_pages(total, page_size)})


@router.post("/customers")
@guard("Server Error")
def create_customer(body: Body, db: DB, user: dict = perm("customers", "create")):
    b = body
    name = str(b.get("name") or " ".join(str(p) for p in (b.get("firstName"), b.get("middleName"), b.get("lastName")) if p)).strip()
    if not name or not truthy(b.get("phone")):
        return fail(422, "Name and mobile number are required")

    phone = re.sub(r"\D+", "", str(b["phone"]))
    if db.scalar(select(m.customers.id).where(m.customers.phone == phone)) is not None:
        return fail(422, "A customer with this mobile number already exists")

    code = next_customer_code(db)
    address_parts = [
        b.get("flatNo"),
        f"Floor {b['floor']}" if truthy(b.get("floor")) else None,
        b.get("societyName"),
        b.get("streetName"),
        b.get("landmark"),
    ]
    address = ", ".join(str(p) for p in address_parts if p)
    now = m.utcnow()
    customer = m.customers(
        id=str(uuid.uuid4()),
        code=code,
        name=name,
        phone=phone,
        alternate_phone=b.get("alternatePhone") or None,
        email=b.get("email") or None,
        date_of_birth=js_date_to_date(b["dateOfBirth"]) if truthy(b.get("dateOfBirth")) else None,
        residence_type=b.get("residenceType") or None,
        flat_no=b.get("flatNo") or None,
        society_name=b.get("societyName") or None,
        street_name=b.get("streetName") or None,
        landmark=b.get("landmark") or None,
        area=b.get("area") or None,
        state=b.get("state") or "Maharashtra",
        city=b.get("city") or None,
        pincode=b.get("pincode") or None,
        address=address or None,
        delivery_mode=b.get("deliveryMode") or "Ring the Bell",
        customer_type=b.get("customerType") or "prepaid",
        hub_id=b.get("hubId") or None,
        route_id=b.get("routeId") or None,
        delivery_boy_id=b.get("deliveryBoyId") or None,
        is_active=truthy(b["status"]) if "status" in b else True,
        registered_by="admin",
        orders_count=0,
        leads_count=0,
        created_at=now,
        updated_at=now,
    )
    db.add(customer)
    db.commit()
    db.refresh(customer)

    log_activity(
        db,
        type="customer_registered",
        title="New Customer Registered",
        message=f"{name} ({code}) was added by admin.",
        customer_id=customer.id,
    )
    return ok({"customer": customer}, status=201)


# ---- leads ------------------------------------------------------------------

@router.get("/leads")
@guard(nested=True)
def leads_index(db: DB, user: dict = perm("leads", "view")):
    return ok(db.scalars(select(m.leads).order_by(m.leads.created_at.desc())).all())


@router.patch("/leads/{id}/status")
@guard(nested=True)
def leads_update_status(id: str, body: Body, db: DB, user: dict = perm("leads", "update")):
    status = body.get("status")
    if not truthy(status):
        return fail_nested(400, "Status is required")
    lead = db.get(m.leads, id)
    if lead is None:
        raise LookupError("Lead not found")
    lead.status = status
    lead.updated_at = m.utcnow()
    db.commit()
    return ok(lead)
