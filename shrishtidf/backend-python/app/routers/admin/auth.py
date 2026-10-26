from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from ... import models as m
from ...core.access_control import ACCESS_CONTROL_CATALOG, ALL_MODULE_KEYS
from ...core.deps import DB, Body
from ...core.http import fail, guard, ok, respond, truthy
from ...core.security import (
    check_password,
    hash_password,
    login_limiter,
    revoke_token,
    sign_admin_token,
    sign_staff_token,
)
from .common import AuthUser

public_router = APIRouter()
router = APIRouter()


@public_router.post("/login", dependencies=[Depends(login_limiter)])
@guard("Server error")
def login(body: Body, db: DB):
    email, password = body.get("email"), body.get("password")
    if not truthy(email) or not truthy(password):
        return fail(400, "Email and password required")
    admin = db.scalar(select(m.admin_users).where(m.admin_users.email == email))
    if admin is None or not check_password(str(password), admin.password):
        return fail(401, "Invalid credentials")
    return respond({
        "success": True,
        "token": sign_admin_token(admin.id, admin.email),
        "data": {"type": "admin", "name": admin.name, "email": admin.email},
    })


@public_router.post("/staff-login", dependencies=[Depends(login_limiter)])
@guard("Server error")
def staff_login(body: Body, db: DB):
    username, password = body.get("username"), body.get("password")
    if not truthy(username) or not truthy(password):
        return fail(400, "Username and password required")
    staff = db.scalar(
        select(m.office_staff).options(selectinload(m.office_staff.staff_types)).where(m.office_staff.username == username)
    )
    if staff is None or not staff.is_active or not check_password(str(password), staff.password):
        return fail(401, "Invalid credentials")
    return respond({
        "success": True,
        "token": sign_staff_token(staff.id, staff.staff_type_id, staff.name),
        "data": {"type": "staff", "name": staff.name, "staffTypeName": staff.staff_types.name if staff.staff_types else None},
    })


@router.get("/me")
@guard("Server error")
def me(db: DB, user: dict = AuthUser):
    if user["type"] == "admin":
        admin = db.get(m.admin_users, user.get("id"))
        return ok({
            "type": "admin",
            "name": admin.name if admin else None,
            "email": admin.email if admin else None,
            "permissions": None,
        })

    access_control = db.scalar(
        select(m.access_controls)
        .options(selectinload(m.access_controls.access_control_permissions), selectinload(m.access_controls.staff_types))
        .where(m.access_controls.office_staff_id == user.get("officeStaffId"))
    )
    by_key = {p.module_key: p for p in (access_control.access_control_permissions if access_control else [])}
    permissions = {}
    for key in ALL_MODULE_KEYS:
        row = by_key.get(key)
        permissions[key] = {
            "canCreate": bool(row and row.can_create),
            "canUpdate": bool(row and row.can_update),
            "canView": bool(row and row.can_view),
            "canPdf": bool(row and row.can_pdf),
            "canExcel": bool(row and row.can_excel),
        }
    return ok({
        "type": "staff",
        "name": user.get("name"),
        "staffTypeName": access_control.staff_types.name if access_control and access_control.staff_types else None,
        "catalog": ACCESS_CONTROL_CATALOG,
        "permissions": permissions,
    })


@router.patch("/me/password")
@guard("Server error")
def change_password(body: Body, db: DB, user: dict = AuthUser):
    current, new = body.get("currentPassword"), body.get("newPassword")
    if not truthy(current) or not truthy(new):
        return fail(422, "Current password and new password are required")
    if len(str(new)) < 6:
        return fail(422, "New password must be at least 6 characters")

    if user["type"] == "admin":
        account = db.get(m.admin_users, user.get("id"))
    else:
        account = db.get(m.office_staff, user.get("officeStaffId"))
    if account is None:
        return fail(404, "Account not found")
    if not check_password(str(current), account.password):
        return fail(401, "Current password is incorrect")

    account.password = hash_password(str(new))
    if user["type"] != "admin":
        account.updated_at = m.utcnow()
    db.commit()
    return ok({"changed": True})


@router.post("/logout")
@guard("Server error")
def logout(db: DB, user: dict = AuthUser):
    revoke_token(db, user.get("jti"))
    return ok({"loggedOut": True})
