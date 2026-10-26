import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Request
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from ... import models as m
from ...core.dates import local_date_of, local_today
from ...core.deps import DB, Body
from ...core.http import fail, guard, js_int, ok, query, truthy
from .common import perm

router = APIRouter()


# ---- lite lookups shared across other modules' dropdowns (any logged-in staff) ----

@router.get("/routes")
@guard("Server Error")
def lite_routes(db: DB):
    routes = db.scalars(
        select(m.delivery_routes)
        .where(m.delivery_routes.is_active.is_(True))
        .options(selectinload(m.delivery_routes.delivery_boys))
        .order_by(m.delivery_routes.sort_order)
    ).all()
    return ok([
        {
            "id": r.id,
            "name": r.name,
            "routeCode": r.route_code,
            "driver": r.delivery_boys.name if r.delivery_boys else "Unassigned",
        }
        for r in routes
    ])


@router.get("/delivery-boys")
@guard("Server Error")
def lite_delivery_boys(db: DB):
    boys = db.scalars(
        select(m.delivery_boys).where(m.delivery_boys.is_active.is_(True)).order_by(m.delivery_boys.name)
    ).all()
    return ok([{"id": b.id, "name": b.name, "phone": b.phone} for b in boys])


# ---- hubs -------------------------------------------------------------------

def _map_hub(h) -> dict:
    return {"id": h.id, "name": h.name, "city": h.city, "isActive": h.is_active, "createdAt": h.created_at}


@router.get("/hubs/{id}")
@guard("Server Error")
def hubs_show(id: str, db: DB, user: dict = perm("hub", "view")):
    hub = db.get(m.hubs, id)
    if hub is None:
        return fail(404, "Hub not found")
    return ok(_map_hub(hub))


@router.patch("/hubs/{id}")
@guard("Server Error")
def hubs_update(id: str, body: Body, db: DB, user: dict = perm("hub", "update")):
    hub = db.get(m.hubs, id)
    if hub is None:
        return fail(404, "Hub not found")
    if "name" in body and not str(body["name"] if body["name"] is not None else "").strip():
        return fail(422, "Hub name is required")
    if "name" in body:
        hub.name = body["name"]
    if "city" in body:
        hub.city = body["city"] or None
    if "status" in body:
        hub.is_active = truthy(body["status"])
    hub.updated_at = m.utcnow()
    db.commit()
    return ok(_map_hub(hub))


@router.get("/hubs")
@guard("Server Error")
def hubs_index(request: Request, db: DB, user: dict = perm("hub", "view")):
    stmt = select(m.hubs)
    name, city, status = query(request, "name"), query(request, "city"), query(request, "status")
    if name:
        stmt = stmt.where(m.hubs.name.ilike(f"%{name}%"))
    if city:
        stmt = stmt.where(m.hubs.city.ilike(f"%{city}%"))
    # Dropdown callers (Customer form/filters) pass no `status` and rely on
    # active-only results; the Hubs page passes status=all/active/inactive.
    if status == "active" or not status:
        stmt = stmt.where(m.hubs.is_active.is_(True))
    elif status == "inactive":
        stmt = stmt.where(m.hubs.is_active.is_(False))
    hubs = db.scalars(stmt.order_by(m.hubs.name)).all()
    return ok([_map_hub(h) for h in hubs])


@router.post("/hubs")
@guard("Server Error")
def hubs_create(body: Body, db: DB, user: dict = perm("hub", "create")):
    if not truthy(body.get("name")):
        return fail(422, "Hub name is required")
    now = m.utcnow()
    hub = m.hubs(
        id=str(uuid.uuid4()),
        name=body["name"],
        city=body.get("city") or None,
        is_active=body.get("status") is not False,
        created_at=now,
        updated_at=now,
    )
    db.add(hub)
    db.commit()
    return ok(_map_hub(hub), status=201)


# ---- inventory, zones, dispatch ----------------------------------------------

@router.get("/inventory")
def inventory(db: DB, user: dict = perm("inventory", "view")):
    try:
        batches = db.scalars(
            select(m.inventory_batches)
            .options(selectinload(m.inventory_batches.products), selectinload(m.inventory_batches.product_variants))
            .order_by(m.inventory_batches.expiry_date)
        ).all()
        now = datetime.now(timezone.utc).replace(tzinfo=None)
        result = []
        for b in batches:
            days_to_expiry = (datetime(b.expiry_date.year, b.expiry_date.month, b.expiry_date.day) - now).total_seconds() / 86400
            if b.quantity == 0:
                status = "Empty"
            elif b.quantity < 20:
                status = "Low Stock"
            elif days_to_expiry < 3:
                status = "Expiring Soon"
            else:
                status = "Good"
            result.append({
                "id": b.batch_number,
                "product": b.products.name,
                "variant": (b.product_variants.size_label if b.product_variants else None) or b.products.size,
                "quantity": b.quantity,
                "expiry": b.expiry_date,
                "status": status,
            })
        return ok(result)
    except Exception:
        return fail(500, "Server Error")


@router.get("/zones")
@guard("Server Error")
def zones_index(db: DB, user: dict = perm("delivery_zones", "view")):
    zones = db.scalars(select(m.delivery_zones).order_by(m.delivery_zones.pincode)).all()
    return ok([
        {
            "id": z.id,
            "pincode": z.pincode,
            "area": z.area_name,
            "city": z.city,
            "route": z.route_id or "Unassigned",
            "fee": int(z.delivery_fee or 0),
            "minOrder": int(z.min_order_value or 0),
            "active": z.is_serviceable,
        }
        for z in zones
    ])


@router.post("/zones")
@guard("Server Error")
def zones_create(body: Body, db: DB, user: dict = perm("delivery_zones", "create")):
    pincode = body.get("pincode")
    if not truthy(pincode):
        return fail(400, "Pincode is required")
    if db.scalar(select(m.delivery_zones.id).where(m.delivery_zones.pincode == pincode)) is not None:
        return fail(400, "Zone with this pincode already exists")

    fee, min_order = body.get("fee"), body.get("minOrder")
    now = m.utcnow()
    zone = m.delivery_zones(
        id=str(uuid.uuid4()),
        pincode=pincode,
        area_name=body.get("area") or None,
        city=body.get("city") or None,
        route_id=body.get("route") or None,
        delivery_fee=js_int(fee, None) if truthy(fee) else 0,
        min_order_value=js_int(min_order, None) if truthy(min_order) else None,
        is_serviceable=body.get("active") is not False,
        created_at=now,
        updated_at=now,
    )
    db.add(zone)
    db.commit()
    return ok(zone, status=201)


@router.get("/dispatch")
@guard("Server Error")
def dispatch_sheet(request: Request, db: DB, user: dict = perm("dispatch_sheet", "view")):
    target = local_date_of(query(request, "date")) if query(request, "date") else None
    target = target or local_today()

    routes = db.scalars(
        select(m.delivery_routes)
        .where(m.delivery_routes.is_active.is_(True))
        .options(selectinload(m.delivery_routes.delivery_boys))
        .order_by(m.delivery_routes.sort_order)
    ).all()

    result = []
    for route in routes:
        orders = db.scalars(
            select(m.orders)
            .where(m.orders.route_id == route.id, m.orders.status != "CANCELLED", m.orders.delivery_date == target)
            .options(selectinload(m.orders.order_items))
        ).all()
        items: dict[str, dict] = {}
        for order in orders:
            for item in order.order_items:
                kind = "Subscription" if item.purchase_type == "SUBSCRIPTION" else "One-time"
                key = f"{item.product_name}__{kind}"
                if key in items:
                    items[key]["quantity"] += item.quantity
                else:
                    items[key] = {"name": item.product_name, "quantity": item.quantity, "type": kind}
        result.append({
            "id": route.id,
            "name": route.name,
            "driver": route.delivery_boys.name if route.delivery_boys else "Unassigned",
            "totalOrders": len(orders),
            "items": list(items.values()),
        })
    return ok(result)
