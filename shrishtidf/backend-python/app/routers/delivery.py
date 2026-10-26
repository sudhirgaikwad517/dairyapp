"""/api/v1/delivery-boy — the delivery app."""
from datetime import timedelta

from fastapi import APIRouter, Depends, Request
from sqlalchemy import or_, select
from sqlalchemy.orm import selectinload

from .. import models as m
from ..core.dates import js_date
from ..core.deps import DB, Body
from ..core.http import fail, guard, js_number, ok, query, respond, truthy
from ..core.security import authenticate_delivery_boy, check_password, revoke_token, sign_delivery_boy_token
from ..core.serialize import to_dict

router = APIRouter(prefix="/delivery-boy")
DeliveryBoy = Depends(authenticate_delivery_boy)


def _profile(boy) -> dict:
    return {"id": boy.id, "name": boy.name, "phone": boy.phone, "hub": boy.hubs.name if boy.hubs else None}


@router.post("/login")
@guard()
def login(body: Body, db: DB):
    phone, password = body.get("phone"), body.get("password")
    if not truthy(phone) or not truthy(password):
        return fail(400, "Phone and password are required")

    # Phone or username both work as the login id.
    boy = db.scalar(
        select(m.delivery_boys)
        .options(selectinload(m.delivery_boys.hubs))
        .where(or_(m.delivery_boys.phone == phone, m.delivery_boys.username == phone))
        .limit(1)
    )
    if boy is None or not boy.is_active:
        return fail(401, "Invalid credentials or inactive account")
    if not boy.password:
        return fail(401, "Password not set. Please contact admin.")
    if not check_password(str(password), boy.password):
        return fail(401, "Invalid credentials")

    token = sign_delivery_boy_token(boy.id, boy.phone or "")
    return ok({"token": token, "deliveryBoy": _profile(boy)})


@router.get("/me")
@guard()
def me(db: DB, auth: dict = DeliveryBoy):
    boy = db.scalar(select(m.delivery_boys).options(selectinload(m.delivery_boys.hubs)).where(m.delivery_boys.id == auth["id"]))
    if boy is None or not boy.is_active:
        return fail(401, "Account is inactive or deleted")
    return ok({"deliveryBoy": _profile(boy)})


@router.post("/logout")
@guard()
def logout(db: DB, auth: dict = DeliveryBoy):
    # Shares the revoked_admin_tokens table with admin/staff logout.
    revoke_token(db, auth.get("jti"))
    return respond({"success": True, "message": "Logged out successfully"})


@router.get("/run")
@guard()
def daily_run(request: Request, db: DB, auth: dict = DeliveryBoy):
    """Every delivery record assigned to this delivery boy for a date (default today)."""
    date_param = query(request, "date")
    target = js_date(date_param) if date_param else m.utcnow()
    if target is None:
        raise ValueError("Invalid date")
    day = target.date()

    records = db.scalars(
        select(m.delivery_records)
        .join(m.customers, m.customers.id == m.delivery_records.customer_id)
        .where(
            m.delivery_records.delivery_boy_id == auth["id"],
            m.delivery_records.delivery_date >= day,
            m.delivery_records.delivery_date < day + timedelta(days=1),
        )
        .options(
            selectinload(m.delivery_records.customers),
            selectinload(m.delivery_records.products),
            selectinload(m.delivery_records.product_variants),
        )
        .order_by(m.customers.delivery_sequence.asc())
    ).all()

    return ok([
        to_dict(r, include={
            "customers": {"select": [
                "id", "name", "phone", "address", "flat_no", "society_name", "landmark",
                "latitude", "longitude", "delivery_sequence",
            ]},
            "products": {"select": ["id", "name", "image_url"]},
            "product_variants": {"select": ["id", "size_label"]},
        })
        for r in records
    ])


@router.patch("/run/{record_id}/mark")
@guard()
def mark_delivery(record_id: str, body: Body, db: DB, auth: dict = DeliveryBoy):
    """Marks a delivery record delivered / skipped / damaged."""
    status = body.get("status")
    if status not in ("delivered", "skipped", "damaged"):
        return fail(400, "Invalid status")

    record = db.get(m.delivery_records, record_id)
    if record is None:
        return fail(404, "Delivery record not found")
    if record.delivery_boy_id != auth["id"]:
        return fail(403, "Record does not belong to you")

    quantity_delivered = body.get("quantityDelivered")
    record.status = status
    if status == "delivered":
        record.quantity_delivered = quantity_delivered
        record.pending_qty = float(record.quantity_ordered) - js_number(quantity_delivered)
    else:
        record.quantity_delivered = 0
        record.pending_qty = record.quantity_ordered
    # Prisma skipped fields left `undefined`; only overwrite what was sent.
    for key, column in (("remark", "remark"), ("leakPhotoUrl", "leak_photo_url"), ("deliveryPhotoUrl", "delivery_photo_url")):
        if key in body:
            setattr(record, column, body[key])
    record.delivered_at = m.utcnow()
    db.commit()
    db.refresh(record)

    # TODO: wallet deduction for prepaid customers (quantityDelivered * rate)
    # once the payment-type rules are settled — not implemented in Node either.
    return ok(record)


@router.get("/upload-url")
def upload_url(auth: dict = DeliveryBoy):
    # Presigned-URL generation (S3/R2) isn't implemented yet.
    return ok({"uploadUrl": "", "fileUrl": ""})
