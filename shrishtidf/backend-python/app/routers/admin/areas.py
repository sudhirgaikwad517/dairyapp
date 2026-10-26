"""Logistics masters: delivery areas, sub areas, apartments and routes."""
import re
import uuid

from fastapi import APIRouter, Request
from sqlalchemy import func, or_, select, update
from sqlalchemy.orm import selectinload

from ... import models as m
from ...core.deps import DB, Body
from ...core.http import fail, guard, js_int, ok, query, truthy
from .common import csv_response, paginate, perm, total_pages

router = APIRouter()

UUID_RE = re.compile(r"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$", re.IGNORECASE)


def _blank(value) -> bool:
    """`!String(value).trim()`."""
    return not str("null" if value is None else value).strip()


# ---- delivery areas -------------------------------------------------------------

def _map_area(a, sub_area_count: int | None = None) -> dict:
    route = a.delivery_routes
    data = {
        "id": a.id,
        "state": a.state,
        "city": a.city,
        "areaName": a.area_name,
        "areaPin": a.area_pin,
        "isServiceable": a.is_serviceable,
        "routeId": a.route_id,
        "route": route.name if route else None,
        "hub": route.hubs.name if route and route.hubs else None,
    }
    if sub_area_count is not None:
        data["subAreaCount"] = sub_area_count
    data["createdAt"] = a.created_at
    return data


def _area_options():
    route = selectinload(m.delivery_areas.delivery_routes)
    return [route, route.selectinload(m.delivery_routes.hubs)]


def _area_filters(request: Request) -> list:
    q = lambda name: query(request, name)  # noqa: E731
    a = m.delivery_areas
    conditions = []
    if q("state"):
        conditions.append(a.state.ilike(f"%{q('state')}%"))
    if q("city"):
        conditions.append(a.city.ilike(f"%{q('city')}%"))
    if q("areaName"):
        conditions.append(a.area_name.ilike(f"%{q('areaName')}%"))
    if q("service"):
        conditions.append(a.is_serviceable.is_(q("service") == "available"))
    if q("hubId"):
        conditions.append(a.route_id.in_(select(m.delivery_routes.id).where(m.delivery_routes.hub_id == q("hubId"))))
    # Used by the Route dual-listbox: areas with no route yet, plus whichever are
    # already on this route (when editing). A non-UUID value (the frontend's
    # "__new__" sentinel for an unsaved route) just means "no route to keep".
    unassigned_for = q("unassignedFor")
    if unassigned_for and UUID_RE.match(unassigned_for):
        conditions.append(or_(a.route_id.is_(None), a.route_id == unassigned_for))
    elif unassigned_for:
        conditions.append(a.route_id.is_(None))
    return conditions


@router.get("/logistics/delivery-areas/export")
@guard("Server Error")
def areas_export(request: Request, db: DB, user: dict = perm("delivery_area", "excel")):
    rows = db.scalars(
        select(m.delivery_areas).where(*_area_filters(request)).options(*_area_options()).order_by(m.delivery_areas.area_name)
    ).all()
    return csv_response(
        ["State", "City", "Area Name", "Area Pin", "Hub", "Route", "Service Availability"],
        [
            [
                a.state or "", a.city or "", a.area_name, a.area_pin or "",
                a.delivery_routes.hubs.name if a.delivery_routes and a.delivery_routes.hubs else "",
                a.delivery_routes.name if a.delivery_routes else "",
                "Delivery Available" if a.is_serviceable else "Not Available",
            ]
            for a in rows
        ],
        "delivery-areas",
    )


@router.get("/logistics/delivery-areas/{id}")
@guard("Server Error")
def areas_show(id: str, db: DB, user: dict = perm("delivery_area", "view")):
    area = db.scalar(select(m.delivery_areas).where(m.delivery_areas.id == id).options(*_area_options()))
    if area is None:
        return fail(404, "Delivery area not found")
    return ok(_map_area(area))


@router.patch("/logistics/delivery-areas/{id}")
@guard("Server Error")
def areas_update(id: str, body: Body, db: DB, user: dict = perm("delivery_area", "update")):
    area = db.get(m.delivery_areas, id)
    if area is None:
        return fail(404, "Delivery area not found")
    if "city" in body and _blank(body["city"]):
        return fail(422, "City is required")
    if "areaName" in body and _blank(body["areaName"]):
        return fail(422, "Area Name is required")

    if "state" in body:
        area.state = body["state"] or None
    if "city" in body:
        area.city = body["city"]
    if "areaName" in body:
        area.area_name = body["areaName"]
    if "areaPin" in body:
        area.area_pin = body["areaPin"] or None
    if "isServiceable" in body:
        area.is_serviceable = truthy(body["isServiceable"])
    area.updated_at = m.utcnow()
    db.commit()
    db.expire(area, ["delivery_routes"])
    return ok(_map_area(area))


@router.get("/logistics/delivery-areas")
@guard("Server Error")
def areas_index(request: Request, db: DB, user: dict = perm("delivery_area", "view")):
    conditions = _area_filters(request)
    base = select(m.delivery_areas).where(*conditions).options(*_area_options()).order_by(m.delivery_areas.area_name)

    if not query(request, "page"):
        return ok([_map_area(a) for a in db.scalars(base)])

    page, page_size = paginate(request)
    total = db.scalar(select(func.count()).select_from(m.delivery_areas).where(*conditions)) or 0
    rows = db.scalars(base.offset((page - 1) * page_size).limit(page_size)).all()
    counts = dict(db.execute(
        select(m.sub_areas.delivery_area_id, func.count())
        .where(m.sub_areas.delivery_area_id.in_([a.id for a in rows]))
        .group_by(m.sub_areas.delivery_area_id)
    ).all()) if rows else {}
    return ok({
        "rows": [_map_area(a, counts.get(a.id, 0)) for a in rows],
        "total": total,
        "page": page,
        "pageSize": page_size,
        "totalPages": total_pages(total, page_size),
    })


@router.post("/logistics/delivery-areas")
@guard("Server Error")
def areas_create(body: Body, db: DB, user: dict = perm("delivery_area", "create")):
    if not truthy(body.get("city")) or not truthy(body.get("areaName")):
        return fail(422, "City and Area Name are required")
    now = m.utcnow()
    area = m.delivery_areas(
        id=str(uuid.uuid4()),
        state=body.get("state") or None,
        city=body["city"],
        area_name=body["areaName"],
        area_pin=body.get("areaPin") or None,
        is_serviceable=body.get("isServiceable") is not False,
        created_at=now,
        updated_at=now,
    )
    db.add(area)
    db.commit()
    return ok(_map_area(area), status=201)


# ---- sub areas ------------------------------------------------------------------

def _map_sub_area(s, apartment_count: int | None = None) -> dict:
    data = {
        "id": s.id,
        "deliveryAreaId": s.delivery_area_id,
        "deliveryArea": s.delivery_areas.area_name if s.delivery_areas else None,
        "name": s.name,
    }
    if apartment_count is not None:
        data["apartmentCount"] = apartment_count
    data["createdAt"] = s.created_at
    return data


def _sub_area_query(request: Request):
    stmt = select(m.sub_areas).options(selectinload(m.sub_areas.delivery_areas)).order_by(m.sub_areas.name)
    delivery_area_id, name = query(request, "deliveryAreaId"), query(request, "name")
    if delivery_area_id:
        stmt = stmt.where(m.sub_areas.delivery_area_id == delivery_area_id)
    if name:
        stmt = stmt.where(m.sub_areas.name.ilike(f"%{name}%"))
    return stmt


@router.get("/logistics/sub-areas/export")
@guard("Server Error")
def sub_areas_export(request: Request, db: DB, user: dict = perm("sub_area", "excel")):
    rows = db.scalars(_sub_area_query(request)).all()
    return csv_response(
        ["Delivery Area", "Sub Area"],
        [[s.delivery_areas.area_name if s.delivery_areas else "", s.name] for s in rows],
        "sub-areas",
    )


@router.get("/logistics/sub-areas/{id}")
@guard("Server Error")
def sub_areas_show(id: str, db: DB, user: dict = perm("sub_area", "view")):
    sub = db.get(m.sub_areas, id)
    if sub is None:
        return fail(404, "Sub area not found")
    return ok(_map_sub_area(sub))


@router.patch("/logistics/sub-areas/{id}")
@guard("Server Error")
def sub_areas_update(id: str, body: Body, db: DB, user: dict = perm("sub_area", "update")):
    sub = db.get(m.sub_areas, id)
    if sub is None:
        return fail(404, "Sub area not found")
    if "deliveryAreaId" in body and (body["deliveryAreaId"] is None or db.get(m.delivery_areas, body["deliveryAreaId"]) is None):
        return fail(422, "Selected delivery area does not exist")
    if "name" in body and _blank(body["name"]):
        return fail(422, "Sub Area name is required")

    if "deliveryAreaId" in body:
        sub.delivery_area_id = body["deliveryAreaId"]
    if "name" in body:
        sub.name = body["name"]
    sub.updated_at = m.utcnow()
    db.commit()
    db.expire(sub, ["delivery_areas"])
    return ok(_map_sub_area(sub))


@router.get("/logistics/sub-areas")
@guard("Server Error")
def sub_areas_index(request: Request, db: DB, user: dict = perm("sub_area", "view")):
    rows = db.scalars(_sub_area_query(request)).all()
    counts = dict(db.execute(
        select(m.apartments.sub_area_id, func.count())
        .where(m.apartments.sub_area_id.in_([s.id for s in rows]))
        .group_by(m.apartments.sub_area_id)
    ).all()) if rows else {}
    return ok([_map_sub_area(s, counts.get(s.id, 0)) for s in rows])


@router.post("/logistics/sub-areas")
@guard("Server Error")
def sub_areas_create(body: Body, db: DB, user: dict = perm("sub_area", "create")):
    delivery_area_id, name = body.get("deliveryAreaId"), body.get("name")
    if not truthy(delivery_area_id) or not truthy(name):
        return fail(422, "Delivery Area and Sub Area name are required")
    if db.get(m.delivery_areas, delivery_area_id) is None:
        return fail(422, "Selected delivery area does not exist")
    now = m.utcnow()
    sub = m.sub_areas(id=str(uuid.uuid4()), delivery_area_id=delivery_area_id, name=name, created_at=now, updated_at=now)
    db.add(sub)
    db.commit()
    return ok(_map_sub_area(sub), status=201)


# ---- apartments -----------------------------------------------------------------

def _map_apartment(a) -> dict:
    sub = a.sub_areas
    return {
        "id": a.id,
        "subAreaId": a.sub_area_id,
        "subArea": sub.name if sub else None,
        "deliveryArea": sub.delivery_areas.area_name if sub and sub.delivery_areas else None,
        "name": a.name,
        "createdAt": a.created_at,
    }


def _apartment_filters(request: Request) -> list:
    conditions = []
    sub_area_id, delivery_area_id, name = query(request, "subAreaId"), query(request, "deliveryAreaId"), query(request, "name")
    if sub_area_id:
        conditions.append(m.apartments.sub_area_id == sub_area_id)
    if delivery_area_id:
        conditions.append(m.apartments.sub_area_id.in_(
            select(m.sub_areas.id).where(m.sub_areas.delivery_area_id == delivery_area_id)
        ))
    if name:
        conditions.append(m.apartments.name.ilike(f"%{name}%"))
    return conditions


def _apartment_query(request: Request):
    sub = selectinload(m.apartments.sub_areas)
    return (
        select(m.apartments)
        .where(*_apartment_filters(request))
        .options(sub, sub.selectinload(m.sub_areas.delivery_areas))
        .order_by(m.apartments.name)
    )


@router.get("/logistics/apartments/export")
@guard("Server Error")
def apartments_export(request: Request, db: DB, user: dict = perm("apartment", "excel")):
    rows = [_map_apartment(a) for a in db.scalars(_apartment_query(request))]
    return csv_response(
        ["Apartment", "Sub Area", "Delivery Area"],
        [[a["name"], a["subArea"] or "", a["deliveryArea"] or ""] for a in rows],
        "apartments",
    )


@router.get("/logistics/apartments/{id}")
@guard("Server Error")
def apartments_show(id: str, db: DB, user: dict = perm("apartment", "view")):
    apartment = db.get(m.apartments, id)
    if apartment is None:
        return fail(404, "Apartment not found")
    return ok(_map_apartment(apartment))


@router.patch("/logistics/apartments/{id}")
@guard("Server Error")
def apartments_update(id: str, body: Body, db: DB, user: dict = perm("apartment", "update")):
    apartment = db.get(m.apartments, id)
    if apartment is None:
        return fail(404, "Apartment not found")
    if "subAreaId" in body and (body["subAreaId"] is None or db.get(m.sub_areas, body["subAreaId"]) is None):
        return fail(422, "Selected sub area does not exist")
    if "name" in body and _blank(body["name"]):
        return fail(422, "Apartment name is required")

    if "subAreaId" in body:
        apartment.sub_area_id = body["subAreaId"]
    if "name" in body:
        apartment.name = body["name"]
    apartment.updated_at = m.utcnow()
    db.commit()
    db.expire(apartment, ["sub_areas"])
    return ok(_map_apartment(apartment))


@router.get("/logistics/apartments")
@guard("Server Error")
def apartments_index(request: Request, db: DB, user: dict = perm("apartment", "view")):
    page, page_size = paginate(request)
    total = db.scalar(select(func.count()).select_from(m.apartments).where(*_apartment_filters(request))) or 0
    rows = db.scalars(_apartment_query(request).offset((page - 1) * page_size).limit(page_size)).all()
    return ok({
        "rows": [_map_apartment(a) for a in rows],
        "total": total,
        "page": page,
        "pageSize": page_size,
        "totalPages": total_pages(total, page_size),
    })


@router.post("/logistics/apartments")
@guard("Server Error")
def apartments_create(body: Body, db: DB, user: dict = perm("apartment", "create")):
    sub_area_id, name = body.get("subAreaId"), body.get("name")
    if not truthy(sub_area_id) or not truthy(name):
        return fail(422, "Sub Area and Apartment name are required")
    if db.get(m.sub_areas, sub_area_id) is None:
        return fail(422, "Selected sub area does not exist")
    now = m.utcnow()
    apartment = m.apartments(id=str(uuid.uuid4()), sub_area_id=sub_area_id, name=name, created_at=now, updated_at=now)
    db.add(apartment)
    db.commit()
    return ok(_map_apartment(apartment), status=201)


# ---- routes ---------------------------------------------------------------------

def _map_route(r) -> dict:
    return {
        "id": r.id,
        "name": r.name,
        "routeCode": r.route_code,
        "city": r.city,
        "hubId": r.hub_id,
        "hub": r.hubs.name if r.hubs else None,
        "driverId": r.driver_id,
        "driver": r.delivery_boys.name if r.delivery_boys else None,
        "isActive": r.is_active,
        "areas": [{"id": a.id, "areaName": a.area_name} for a in (r.delivery_areas or [])],
        "createdAt": r.created_at,
    }


def _route_options():
    return [
        selectinload(m.delivery_routes.hubs),
        selectinload(m.delivery_routes.delivery_boys),
        selectinload(m.delivery_routes.delivery_areas),
    ]


def _route_filters(request: Request) -> list:
    q = lambda name: query(request, name)  # noqa: E731
    r = m.delivery_routes
    conditions = []
    if q("name"):
        conditions.append(r.name.ilike(f"%{q('name')}%"))
    if q("city"):
        conditions.append(r.city.ilike(f"%{q('city')}%"))
    if q("hubId"):
        conditions.append(r.hub_id == q("hubId"))
    if q("driverId"):
        conditions.append(r.driver_id == q("driverId"))
    if q("status"):
        conditions.append(r.is_active.is_(q("status") == "active"))
    return conditions


def _load_route(db, id: str):
    return db.scalar(
        select(m.delivery_routes)
        .where(m.delivery_routes.id == id)
        .options(*_route_options())
        .execution_options(populate_existing=True)
    )


@router.get("/logistics/routes/export")
@guard("Server Error")
def routes_export(request: Request, db: DB, user: dict = perm("route", "excel")):
    rows = db.scalars(
        select(m.delivery_routes).where(*_route_filters(request)).options(*_route_options()).order_by(m.delivery_routes.sort_order)
    ).all()
    return csv_response(
        ["Route Name", "City", "Hub", "Delivery Boy", "Street / Area", "Status"],
        [
            [
                r.name, r.city or "", r.hubs.name if r.hubs else "", r.delivery_boys.name if r.delivery_boys else "",
                "; ".join(a.area_name for a in r.delivery_areas), "Active" if r.is_active else "Not Active",
            ]
            for r in rows
        ],
        "delivery-routes",
    )


@router.get("/logistics/routes/{id}")
@guard("Server Error")
def routes_show(id: str, db: DB, user: dict = perm("route", "view")):
    route = _load_route(db, id)
    if route is None:
        return fail(404, "Delivery route not found")
    return ok(_map_route(route))


@router.patch("/logistics/routes/{id}")
@guard("Server Error")
def routes_update(id: str, body: Body, db: DB, user: dict = perm("route", "update")):
    route = db.get(m.delivery_routes, id)
    if route is None:
        return fail(404, "Delivery route not found")
    if truthy(body.get("hubId")) and db.get(m.hubs, body["hubId"]) is None:
        return fail(422, "Selected hub does not exist")
    if truthy(body.get("driverId")) and db.get(m.delivery_boys, body["driverId"]) is None:
        return fail(422, "Selected delivery boy does not exist")
    if "name" in body and _blank(body["name"]):
        return fail(422, "Route Name is required")
    if "city" in body and _blank(body["city"]):
        return fail(422, "City is required")

    if "name" in body:
        route.name = body["name"]
    if "city" in body:
        route.city = body["city"]
    if "hubId" in body:
        route.hub_id = body["hubId"] or None
    if "driverId" in body:
        route.driver_id = body["driverId"] or None
    if "status" in body:
        route.is_active = truthy(body["status"])
    route.updated_at = m.utcnow()
    db.flush()

    area_ids = body.get("areaIds")
    if isinstance(area_ids, list):
        # Release areas no longer on this route, then attach the selected ones.
        release = update(m.delivery_areas).where(m.delivery_areas.route_id == id).values(route_id=None)
        if area_ids:
            release = release.where(m.delivery_areas.id.not_in(area_ids))
        db.execute(release)
        if area_ids:
            db.execute(update(m.delivery_areas).where(m.delivery_areas.id.in_(area_ids)).values(route_id=id))
    db.commit()
    return ok(_map_route(_load_route(db, id)))


@router.get("/logistics/routes")
@guard("Server Error")
def routes_index(request: Request, db: DB, user: dict = perm("route", "view")):
    page, page_size = paginate(request)
    conditions = _route_filters(request)
    total = db.scalar(select(func.count()).select_from(m.delivery_routes).where(*conditions)) or 0
    rows = db.scalars(
        select(m.delivery_routes)
        .where(*conditions)
        .options(*_route_options())
        .order_by(m.delivery_routes.sort_order)
        .offset((page - 1) * page_size)
        .limit(page_size)
    ).all()
    return ok({
        "rows": [_map_route(r) for r in rows],
        "total": total,
        "page": page,
        "pageSize": page_size,
        "totalPages": total_pages(total, page_size),
    })


def _next_route_code(db) -> str:
    last = db.scalar(select(m.delivery_routes.route_code).order_by(m.delivery_routes.created_at.desc()).limit(1))
    last_num = (js_int(re.sub(r"\D", "", str(last)), 0) or 0) if last else 0
    return f"RT{last_num + 1:04d}"


@router.post("/logistics/routes")
@guard("Server Error")
def routes_create(body: Body, db: DB, user: dict = perm("route", "create")):
    name, city, hub_id, driver_id = body.get("name"), body.get("city"), body.get("hubId"), body.get("driverId")
    if not truthy(name) or not truthy(city):
        return fail(422, "Route Name and City are required")
    if truthy(hub_id) and db.get(m.hubs, hub_id) is None:
        return fail(422, "Selected hub does not exist")
    if truthy(driver_id) and db.get(m.delivery_boys, driver_id) is None:
        return fail(422, "Selected delivery boy does not exist")

    now = m.utcnow()
    route_id = str(uuid.uuid4())
    db.add(m.delivery_routes(
        id=route_id,
        name=name,
        route_code=_next_route_code(db),
        city=city,
        hub_id=hub_id or None,
        driver_id=driver_id or None,
        is_active=body.get("status") is not False,
        created_at=now,
        updated_at=now,
    ))
    db.flush()
    area_ids = body.get("areaIds")
    if isinstance(area_ids, list) and area_ids:
        db.execute(update(m.delivery_areas).where(m.delivery_areas.id.in_(area_ids)).values(route_id=route_id))
    db.commit()
    return ok(_map_route(_load_route(db, route_id)), status=201)
