"""User Access Control — super-admin only, regardless of any staff permission
row (letting staff manage this would let them grant themselves more access)."""
import uuid

from fastapi import APIRouter, Request
from sqlalchemy import delete, insert, select
from sqlalchemy.orm import selectinload

from ... import models as m
from ...core.access_control import ACCESS_CONTROL_CATALOG, ALL_MODULE_KEYS
from ...core.deps import DB, Body
from ...core.http import fail, guard, ok, query, truthy
from .common import SuperAdmin, csv_response

router = APIRouter()

MODULE_KEY_SET = set(ALL_MODULE_KEYS)
AC = m.access_controls


def _sections(rows: list) -> list:
    by_key = {r.module_key: r for r in rows}
    sections = []
    for section in ACCESS_CONTROL_CATALOG:
        modules = []
        for module in section["modules"]:
            row = by_key.get(module["key"])
            modules.append({
                "key": module["key"],
                "label": module["label"],
                "canCreate": bool(row and row.can_create),
                "canUpdate": bool(row and row.can_update),
                "canView": bool(row and row.can_view),
                "canPdf": bool(row and row.can_pdf),
                "canExcel": bool(row and row.can_excel),
            })
        sections.append({"key": section["key"], "label": section["label"], "modules": modules})
    return sections


def _summary(rows: list) -> dict:
    granted = [r for r in rows if r.can_create or r.can_update or r.can_view or r.can_pdf or r.can_excel]
    return {"modulesGranted": len(granted), "totalModules": len(ALL_MODULE_KEYS)}


def _permission_rows(access_control_id: str, permissions) -> list[dict]:
    by_key = {}
    for p in permissions if isinstance(permissions, list) else []:
        if isinstance(p, dict) and "moduleKey" in p:
            by_key[p["moduleKey"]] = p
    rows = []
    for key in ALL_MODULE_KEYS:
        p = by_key.get(key) or {}
        rows.append({
            "id": str(uuid.uuid4()),
            "access_control_id": access_control_id,
            "module_key": key,
            "can_create": truthy(p.get("canCreate")),
            "can_update": truthy(p.get("canUpdate")),
            "can_view": truthy(p.get("canView")),
            "can_pdf": truthy(p.get("canPdf")),
            "can_excel": truthy(p.get("canExcel")),
        })
    return rows


def _list_query(request: Request):
    stmt = (
        select(AC)
        .options(selectinload(AC.office_staff), selectinload(AC.staff_types), selectinload(AC.access_control_permissions))
        .order_by(AC.created_at.desc())
    )
    if query(request, "officeStaffId"):
        stmt = stmt.where(AC.office_staff_id == query(request, "officeStaffId"))
    return stmt


@router.get("/access-control/catalog")
def catalog(user: dict = SuperAdmin):
    return ok(ACCESS_CONTROL_CATALOG)


@router.get("/access-control/eligible-staff")
@guard("Server Error")
def eligible_staff(request: Request, db: DB, user: dict = SuperAdmin):
    staff = db.scalars(
        select(m.office_staff)
        .options(selectinload(m.office_staff.staff_types), selectinload(m.office_staff.access_controls))
        .order_by(m.office_staff.name)
    ).all()
    if query(request, "excludeAssigned") == "true":
        staff = [s for s in staff if s.access_controls is None]
    return ok([
        {
            "id": s.id,
            "name": s.name,
            "staffTypeId": s.staff_type_id,
            "staffTypeName": s.staff_types.name if s.staff_types else None,
            "hasAccessControl": s.access_controls is not None,
        }
        for s in staff
    ])


@router.get("/access-control/export")
@guard("Server Error")
def export_list(request: Request, db: DB, user: dict = SuperAdmin):
    rows = db.scalars(_list_query(request)).all()
    body = []
    for r in rows:
        summary = _summary(r.access_control_permissions)
        body.append([
            r.staff_types.name if r.staff_types else "",
            r.office_staff.name if r.office_staff else "",
            summary["modulesGranted"],
            summary["totalModules"],
        ])
    return csv_response(["User Type", "User", "Modules Granted", "Total Modules"], body, "user-access-control")


@router.get("/access-control/{id}")
@guard("Server Error")
def show(id: str, db: DB, user: dict = SuperAdmin):
    ac = db.get(AC, id)
    if ac is None:
        return fail(404, "Access control not found")
    return ok({
        "id": ac.id,
        "officeStaffId": ac.office_staff_id,
        "staffTypeId": ac.staff_type_id,
        "userTypeName": ac.staff_types.name if ac.staff_types else None,
        "userName": ac.office_staff.name if ac.office_staff else None,
        "sections": _sections(ac.access_control_permissions),
        "createdAt": ac.created_at,
        "updatedAt": ac.updated_at,
    })


@router.patch("/access-control/{id}")
@guard("Server Error")
def update(id: str, body: Body, db: DB, user: dict = SuperAdmin):
    ac = db.get(AC, id)
    if ac is None:
        return fail(404, "Access control not found")
    permissions = [
        p for p in (body.get("permissions") if isinstance(body.get("permissions"), list) else [])
        if isinstance(p, dict) and p.get("moduleKey") in MODULE_KEY_SET
    ]
    db.execute(delete(m.access_control_permissions).where(m.access_control_permissions.access_control_id == ac.id))
    db.execute(insert(m.access_control_permissions), _permission_rows(ac.id, permissions))
    ac.updated_at = m.utcnow()
    db.commit()
    return ok({"id": ac.id})


@router.delete("/access-control/{id}")
@guard("Server Error")
def destroy(id: str, db: DB, user: dict = SuperAdmin):
    ac = db.get(AC, id)
    if ac is None:
        return fail(404, "Access control not found")
    db.delete(ac)
    db.commit()
    return ok({"deleted": True})


@router.get("/access-control")
@guard("Server Error")
def index(request: Request, db: DB, user: dict = SuperAdmin):
    rows = db.scalars(_list_query(request)).all()
    return ok([
        {
            "srNo": i + 1,
            "id": r.id,
            "officeStaffId": r.office_staff_id,
            "userTypeName": r.staff_types.name if r.staff_types else None,
            "userName": r.office_staff.name if r.office_staff else None,
            **_summary(r.access_control_permissions),
            "createdAt": r.created_at,
            "updatedAt": r.updated_at,
        }
        for i, r in enumerate(rows)
    ])


@router.post("/access-control")
@guard("Server Error")
def create(body: Body, db: DB, user: dict = SuperAdmin):
    staff_type_id, office_staff_id = body.get("staffTypeId"), body.get("officeStaffId")
    if not truthy(staff_type_id) or not truthy(office_staff_id):
        return fail(422, "User Type and User are required")
    staff = db.get(m.office_staff, office_staff_id)
    if staff is None:
        return fail(422, "Selected user does not exist")
    if staff.staff_type_id != staff_type_id:
        return fail(422, "Selected user does not belong to this user type")
    if db.scalar(select(AC.id).where(AC.office_staff_id == office_staff_id)) is not None:
        return fail(422, "This user already has an access control — edit it instead")

    now = m.utcnow()
    ac_id = str(uuid.uuid4())
    db.add(AC(id=ac_id, staff_type_id=staff_type_id, office_staff_id=office_staff_id, created_at=now, updated_at=now))
    db.flush()
    db.execute(insert(m.access_control_permissions), _permission_rows(ac_id, body.get("permissions")))
    db.commit()
    return ok({"id": ac_id}, status=201)
