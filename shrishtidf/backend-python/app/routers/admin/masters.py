"""Staff types, office staff, delivery modes and delivery charge tiers."""
import uuid

from fastapi import APIRouter, Request
from sqlalchemy import func, select
from sqlalchemy.orm import selectinload

from ... import models as m
from ...core.deps import DB, Body
from ...core.http import fail, guard, js_number, ok, query, respond, truthy
from ...core.security import hash_password
from .common import csv_response, paginate, perm, total_pages

router = APIRouter()


def _int(value) -> int:
    """`Number(value)` written to an Int column (NaN made Prisma throw -> 500)."""
    return int(js_number(value))


def _get_or_lookup_error(db, model, id: str):
    row = db.get(model, id)
    if row is None:
        raise LookupError(f"{model.__tablename__} {id} not found")  # Prisma update() threw -> 500
    return row


# ---- staff types --------------------------------------------------------------

@router.get("/staff-types/{id}")
@guard("Server Error")
def staff_types_show(id: str, db: DB, user: dict = perm("staff_type", "view")):
    row = db.get(m.staff_types, id)
    if row is None:
        return fail(404, "Staff type not found")
    return ok(row)


@router.patch("/staff-types/{id}")
@guard("Server Error")
def staff_types_update(id: str, body: Body, db: DB, user: dict = perm("staff_type", "update")):
    row = _get_or_lookup_error(db, m.staff_types, id)
    if "name" in body:
        row.name = body["name"]
    if "status" in body:
        row.is_active = truthy(body["status"])
    row.updated_at = m.utcnow()
    db.commit()
    return ok({"staffType": row})


@router.get("/staff-types")
@guard("Server Error")
def staff_types_index(request: Request, db: DB, user: dict = perm("staff_type", "view")):
    stmt = select(m.staff_types)
    name, status = query(request, "name"), query(request, "status")
    if name:
        stmt = stmt.where(m.staff_types.name.ilike(f"%{name}%"))
    if query(request, "activeOnly") == "true":
        stmt = stmt.where(m.staff_types.is_active.is_(True))
    elif status:
        stmt = stmt.where(m.staff_types.is_active.is_(status == "active"))
    rows = db.scalars(stmt.order_by(m.staff_types.name)).all()
    return ok([{"id": s.id, "name": s.name, "isActive": s.is_active} for s in rows])


@router.post("/staff-types")
@guard("Server Error")
def staff_types_create(body: Body, db: DB, user: dict = perm("staff_type", "create")):
    if not truthy(body.get("name")):
        return fail(422, "Name is required")
    now = m.utcnow()
    row = m.staff_types(
        id=str(uuid.uuid4()), name=body["name"], is_active=body.get("status") is not False, created_at=now, updated_at=now
    )
    db.add(row)
    db.commit()
    return ok({"staffType": row}, status=201)


# ---- office staff -------------------------------------------------------------

def _map_staff(s) -> dict:
    # Never include `password` — office staff credentials must never
    # round-trip through any API response, not even hashed.
    return {
        "id": s.id,
        "name": s.name,
        "email": s.email,
        "contactNo": s.contact_no,
        "address": s.address,
        "username": s.username,
        "photoUrl": s.photo_url,
        "aadharUrl": s.aadhar_url,
        "isActive": s.is_active,
        "staffTypeId": s.staff_type_id,
        "staffType": s.staff_types.name if s.staff_types else None,
        "createdAt": s.created_at,
    }


def _staff_filters(request: Request) -> list:
    q = lambda name: query(request, name)  # noqa: E731
    s = m.office_staff
    conditions = []
    if q("name"):
        conditions.append(s.name.ilike(f"%{q('name')}%"))
    if q("contactNo"):
        conditions.append(s.contact_no.like(f"%{q('contactNo')}%"))
    if q("email"):
        conditions.append(s.email.ilike(f"%{q('email')}%"))
    if q("address"):
        conditions.append(s.address.ilike(f"%{q('address')}%"))
    if q("staffTypeId"):
        conditions.append(s.staff_type_id == q("staffTypeId"))
    if q("status"):
        conditions.append(s.is_active.is_(q("status") == "active"))
    return conditions


def _staff_query(request: Request):
    return (
        select(m.office_staff)
        .where(*_staff_filters(request))
        .options(selectinload(m.office_staff.staff_types))
        .order_by(m.office_staff.created_at.desc())
    )


@router.get("/office-staff/export")
@guard("Server Error")
def office_staff_export(request: Request, db: DB, user: dict = perm("office_staff", "excel")):
    rows = db.scalars(_staff_query(request)).all()
    return csv_response(
        ["Name", "Email", "Contact No", "Address", "Staff Type", "Username", "Status"],
        [
            [
                s.name, s.email, s.contact_no, s.address or "",
                s.staff_types.name if s.staff_types else "",
                s.username, "Activated" if s.is_active else "Deactivated",
            ]
            for s in rows
        ],
        "office-staff",
    )


@router.get("/office-staff/{id}")
@guard("Server Error")
def office_staff_show(id: str, db: DB, user: dict = perm("office_staff", "view")):
    staff = db.scalar(select(m.office_staff).where(m.office_staff.id == id).options(selectinload(m.office_staff.staff_types)))
    if staff is None:
        return fail(404, "Office staff not found")
    return ok(_map_staff(staff))


def _taken(db, column, value) -> bool:
    return db.scalar(select(m.office_staff.id).where(column == value)) is not None


@router.patch("/office-staff/{id}")
@guard("Server Error")
def office_staff_update(id: str, body: Body, db: DB, user: dict = perm("office_staff", "update")):
    b = body
    staff = db.get(m.office_staff, id)
    if staff is None:
        return fail(404, "Office staff not found")
    if truthy(b.get("email")) and b["email"] != staff.email and _taken(db, m.office_staff.email, b["email"]):
        return fail(422, "This email is already in use")
    if truthy(b.get("username")) and b["username"] != staff.username and _taken(db, m.office_staff.username, b["username"]):
        return fail(422, "This username is already in use")
    if (
        truthy(b.get("staffTypeId")) and b["staffTypeId"] != staff.staff_type_id
        and db.get(m.staff_types, b["staffTypeId"]) is None
    ):
        return fail(422, "Selected staff type does not exist")

    for key, column in (("name", "name"), ("email", "email"), ("contactNo", "contact_no"),
                        ("staffTypeId", "staff_type_id"), ("username", "username")):
        if key in b:
            setattr(staff, column, b[key])
    for key, column in (("address", "address"), ("photoUrl", "photo_url"), ("aadharUrl", "aadhar_url")):
        if key in b:
            setattr(staff, column, b[key] or None)
    if "status" in b:
        staff.is_active = truthy(b["status"])
    # Password is optional on edit — only touched when the admin types a new one.
    if truthy(b.get("password")):
        staff.password = hash_password(str(b["password"]))
    staff.updated_at = m.utcnow()
    db.commit()
    db.refresh(staff)
    return ok(_map_staff(staff))


@router.get("/office-staff")
@guard("Server Error")
def office_staff_index(request: Request, db: DB, user: dict = perm("office_staff", "view")):
    page, page_size = paginate(request)
    total = db.scalar(select(func.count()).select_from(m.office_staff).where(*_staff_filters(request))) or 0
    rows = db.scalars(_staff_query(request).offset((page - 1) * page_size).limit(page_size)).all()
    return ok({
        "rows": [_map_staff(s) for s in rows],
        "total": total,
        "page": page,
        "pageSize": page_size,
        "totalPages": total_pages(total, page_size),
    })


@router.post("/office-staff")
@guard("Server Error")
def office_staff_create(body: Body, db: DB, user: dict = perm("office_staff", "create")):
    b = body
    required = ("name", "email", "contactNo", "staffTypeId", "username", "password")
    if not all(truthy(b.get(k)) for k in required):
        return fail(422, "Name, email, contact number, staff type, username and password are required")
    if _taken(db, m.office_staff.email, b["email"]):
        return fail(422, "This email is already in use")
    if _taken(db, m.office_staff.username, b["username"]):
        return fail(422, "This username is already in use")
    if db.get(m.staff_types, b["staffTypeId"]) is None:
        return fail(422, "Selected staff type does not exist")

    now = m.utcnow()
    staff = m.office_staff(
        id=str(uuid.uuid4()),
        staff_type_id=b["staffTypeId"],
        name=b["name"],
        email=b["email"],
        contact_no=b["contactNo"],
        address=b.get("address") or None,
        username=b["username"],
        password=hash_password(str(b["password"])),
        photo_url=b.get("photoUrl") or None,
        aadhar_url=b.get("aadharUrl") or None,
        is_active=b.get("status") is not False,
        created_at=now,
        updated_at=now,
    )
    db.add(staff)
    db.commit()
    db.refresh(staff)
    return ok(_map_staff(staff), status=201)


# ---- delivery modes -----------------------------------------------------------

def delivery_modes_list(request: Request, db, active_only: bool = False):
    stmt = select(m.delivery_modes)
    name, status = query(request, "name"), query(request, "status")
    if name:
        stmt = stmt.where(m.delivery_modes.name.ilike(f"%{name}%"))
    # Public/lite callers (e.g. the customer form's dropdown) only want active modes.
    if active_only or query(request, "activeOnly") == "true":
        stmt = stmt.where(m.delivery_modes.is_active.is_(True))
    elif status:
        stmt = stmt.where(m.delivery_modes.is_active.is_(status == "active"))
    rows = db.scalars(stmt.order_by(m.delivery_modes.sort_order)).all()
    return ok([
        {"id": d.id, "name": d.name, "iconUrl": d.icon_url, "isActive": d.is_active, "displayPriority": d.sort_order}
        for d in rows
    ])


@router.get("/delivery-modes/{id}")
@guard("Server Error")
def delivery_modes_show(id: str, db: DB, user: dict = perm("delivery_mode", "view")):
    mode = db.get(m.delivery_modes, id)
    if mode is None:
        return fail(404, "Delivery mode not found")
    return ok(mode)


@router.patch("/delivery-modes/{id}")
@guard("Server Error")
def delivery_modes_update(id: str, body: Body, db: DB, user: dict = perm("delivery_mode", "update")):
    mode = _get_or_lookup_error(db, m.delivery_modes, id)
    if "name" in body:
        mode.name = body["name"]
    if "iconUrl" in body:
        mode.icon_url = body["iconUrl"] or None
    if "status" in body:
        mode.is_active = truthy(body["status"])
    if "displayPriority" in body:
        mode.sort_order = _int(body["displayPriority"])
    mode.updated_at = m.utcnow()
    db.commit()
    return ok({"mode": mode})


@router.get("/delivery-modes")
@guard("Server Error")
def delivery_modes_index(request: Request, db: DB, user: dict = perm("delivery_mode", "view")):
    return delivery_modes_list(request, db)


@router.post("/delivery-modes")
@guard("Server Error")
def delivery_modes_create(body: Body, db: DB, user: dict = perm("delivery_mode", "create")):
    if not truthy(body.get("name")):
        return fail(422, "Name is required")
    current = db.scalar(select(func.max(m.delivery_modes.sort_order)))
    now = m.utcnow()
    mode = m.delivery_modes(
        id=str(uuid.uuid4()),
        name=body["name"],
        icon_url=body.get("iconUrl") or None,
        is_active=body.get("status") is not False,
        sort_order=(current if current is not None else -1) + 1,
        created_at=now,
        updated_at=now,
    )
    db.add(mode)
    db.commit()
    return ok({"mode": mode}, status=201)


# ---- delivery charge tiers ------------------------------------------------------

def _find_overlap(db, start: int, end: int, exclude_id: str | None = None):
    stmt = select(m.delivery_charge_tiers).where(
        m.delivery_charge_tiers.charge_from <= end, m.delivery_charge_tiers.charge_to >= start
    )
    if exclude_id:
        stmt = stmt.where(m.delivery_charge_tiers.id != exclude_id)
    return db.scalar(stmt.limit(1))


def _overlap_message(tier) -> str:
    return f"This range overlaps with an existing tier (₹{tier.charge_from}–₹{tier.charge_to})"


@router.get("/delivery-charges/{id}")
@guard("Server Error")
def delivery_charges_show(id: str, db: DB, user: dict = perm("delivery_charge", "view")):
    tier = db.get(m.delivery_charge_tiers, id)
    if tier is None:
        return fail(404, "Delivery charge tier not found")
    return ok(tier)


@router.patch("/delivery-charges/{id}")
@guard("Server Error")
def delivery_charges_update(id: str, body: Body, db: DB, user: dict = perm("delivery_charge", "update")):
    tier = db.get(m.delivery_charge_tiers, id)
    if tier is None:
        return fail(404, "Delivery charge tier not found")
    next_from = js_number(body["chargeFrom"]) if "chargeFrom" in body else tier.charge_from
    next_to = js_number(body["chargeTo"]) if "chargeTo" in body else tier.charge_to
    if not next_from < next_to:
        return fail(422, "Charge From must be less than Charge To")
    overlap = _find_overlap(db, next_from, next_to, id)
    if overlap is not None:
        return fail(422, _overlap_message(overlap))

    tier.charge_from = int(next_from)
    tier.charge_to = int(next_to)
    if "charge" in body:
        tier.charge = _int(body["charge"])
    tier.updated_at = m.utcnow()
    db.commit()
    return ok({"tier": tier})


@router.delete("/delivery-charges/{id}")
@guard("Server Error")
def delivery_charges_remove(id: str, db: DB, user: dict = perm("delivery_charge", "update")):
    db.delete(_get_or_lookup_error(db, m.delivery_charge_tiers, id))
    db.commit()
    return respond({"success": True})


@router.get("/delivery-charges")
@guard("Server Error")
def delivery_charges_index(db: DB, user: dict = perm("delivery_charge", "view")):
    tiers = db.scalars(select(m.delivery_charge_tiers).order_by(m.delivery_charge_tiers.charge_from)).all()
    return ok([{"id": t.id, "chargeFrom": t.charge_from, "chargeTo": t.charge_to, "charge": t.charge} for t in tiers])


@router.post("/delivery-charges")
@guard("Server Error")
def delivery_charges_create(body: Body, db: DB, user: dict = perm("delivery_charge", "create")):
    if not all(k in body for k in ("chargeFrom", "chargeTo", "charge")):
        return fail(422, "Charge From, Charge To and Charge are required")
    start, end = js_number(body["chargeFrom"]), js_number(body["chargeTo"])
    if not start < end:
        return fail(422, "Charge From must be less than Charge To")
    overlap = _find_overlap(db, start, end)
    if overlap is not None:
        return fail(422, _overlap_message(overlap))

    now = m.utcnow()
    tier = m.delivery_charge_tiers(
        id=str(uuid.uuid4()),
        charge_from=int(start),
        charge_to=int(end),
        charge=_int(body["charge"]),
        created_at=now,
        updated_at=now,
    )
    db.add(tier)
    db.commit()
    return ok({"tier": tier}, status=201)
