"""Customer push/in-app notifications: audience preview, send and history."""
import uuid

from fastapi import APIRouter, Request
from sqlalchemy import func, insert, select
from sqlalchemy.orm import selectinload

from ... import models as m
from ...core.deps import DB, Body
from ...core.http import fail, guard, ok, query, truthy
from .common import csv_response, paginate, perm, total_pages
from .feedback import _en_in_datetime

router = APIRouter()

C = m.customers


def _audience_filters(filters: dict) -> list:
    conditions = []
    active = filters.get("isActiveFilter")
    if active == "active":
        conditions.append(C.is_active.is_(True))
    elif active == "inactive":
        conditions.append(C.is_active.is_(False))
    if filters.get("customerType"):
        conditions.append(C.customer_type == filters["customerType"])
    if filters.get("city"):
        conditions.append(C.city.ilike(f"%{filters['city']}%"))
    if filters.get("deliveryBoyId"):
        conditions.append(C.delivery_boy_id == filters["deliveryBoyId"])
    status = filters.get("subscriptionStatus")
    if status == "none":
        conditions.append(C.id.not_in(select(m.subscriptions.customer_id).distinct()))
    elif status:
        conditions.append(C.id.in_(select(m.subscriptions.customer_id).where(m.subscriptions.status == status).distinct()))
    return conditions


def _map_history(n, read_count: int | None = None) -> dict:
    audience = []
    if n.is_active_filter == "active":
        audience.append("Active Customers")
    elif n.is_active_filter == "inactive":
        audience.append("Inactive Customers")
    if n.customer_type:
        audience.append("Prepaid" if n.customer_type == "prepaid" else "Postpaid")
    if n.city:
        audience.append(f"City: {n.city}")
    if n.subscription_status:
        audience.append(f"Subscription: {'No Subscription' if n.subscription_status == 'none' else n.subscription_status}")
    if n.delivery_boy_id:
        audience.append(f"Delivery Boy: {n.delivery_boys.name}" if n.delivery_boys else "Delivery Boy")

    data = {
        "id": n.id,
        "title": n.title,
        "message": n.message,
        "audienceSummary": ", ".join(audience) if audience else "All Customers",
        "filters": {
            "isActiveFilter": n.is_active_filter,
            "customerType": n.customer_type,
            "city": n.city,
            "subscriptionStatus": n.subscription_status,
            "deliveryBoyId": n.delivery_boy_id,
        },
        "recipientCount": n.recipient_count,
    }
    if read_count is not None:
        data["readCount"] = read_count
    data["sentBy"] = n.sent_by
    data["createdAt"] = n.created_at
    return data


@router.get("/notifications/audience-preview")
@guard("Server Error")
def audience_preview(request: Request, db: DB, user: dict = perm("notifications", "view")):
    filters = {k: query(request, k) for k in ("isActiveFilter", "customerType", "city", "subscriptionStatus", "deliveryBoyId")}
    conditions = _audience_filters(filters)
    count = db.scalar(select(func.count()).select_from(C).where(*conditions)) or 0
    sample = db.execute(select(C.code, C.name).where(*conditions).order_by(C.created_at.desc()).limit(5)).all()
    return ok({"count": count, "sample": [f"{code} - {name or 'Unnamed'}" for code, name in sample]})


@router.get("/notifications/export")
@guard("Server Error")
def export_history(db: DB, user: dict = perm("notifications", "excel")):
    rows = db.scalars(
        select(m.notifications).options(selectinload(m.notifications.delivery_boys)).order_by(m.notifications.created_at.desc())
    ).all()
    mapped = [_map_history(n) for n in rows]
    return csv_response(
        ["Title", "Message", "Audience", "Recipients", "Sent By", "Sent At"],
        [
            [n["title"], n["message"], n["audienceSummary"], n["recipientCount"], n["sentBy"] or "", _en_in_datetime(n["createdAt"])]
            for n in mapped
        ],
        "notifications",
    )


@router.get("/notifications/{id}")
@guard("Server Error")
def show(id: str, request: Request, db: DB, user: dict = perm("notifications", "view")):
    notification = db.get(m.notifications, id)
    if notification is None:
        return fail(404, "Notification not found")

    page, page_size = paginate(request, default_size=20)
    total = db.scalar(
        select(func.count()).select_from(m.notification_recipients).where(m.notification_recipients.notification_id == id)
    ) or 0
    recipients = db.scalars(
        select(m.notification_recipients)
        .where(m.notification_recipients.notification_id == id)
        .options(selectinload(m.notification_recipients.customers))
        .order_by(m.notification_recipients.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    ).all()
    return ok({
        **_map_history(notification),
        "recipients": {
            "rows": [
                {
                    "id": r.id,
                    "customerCode": r.customers.code if r.customers else None,
                    "customerName": (r.customers.name if r.customers else None) or "Unnamed",
                    "isRead": r.is_read,
                    "readAt": r.read_at,
                }
                for r in recipients
            ],
            "total": total,
            "page": page,
            "pageSize": page_size,
            "totalPages": total_pages(total, page_size),
        },
    })


@router.get("/notifications")
@guard("Server Error")
def index(request: Request, db: DB, user: dict = perm("notifications", "view")):
    page, page_size = paginate(request)
    total = db.scalar(select(func.count()).select_from(m.notifications)) or 0
    rows = db.scalars(
        select(m.notifications)
        .options(selectinload(m.notifications.delivery_boys))
        .order_by(m.notifications.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    ).all()
    ids = [n.id for n in rows]
    reads = dict(db.execute(
        select(m.notification_recipients.notification_id, func.count())
        .where(m.notification_recipients.notification_id.in_(ids), m.notification_recipients.is_read.is_(True))
        .group_by(m.notification_recipients.notification_id)
    ).all()) if ids else {}
    return ok({
        "rows": [_map_history(n, reads.get(n.id, 0)) for n in rows],
        "total": total,
        "page": page,
        "pageSize": page_size,
        "totalPages": total_pages(total, page_size),
    })


@router.post("/notifications")
@guard("Server Error")
def send(body: Body, db: DB, user: dict = perm("notifications", "create")):
    title, message = body.get("title"), body.get("message")
    if not truthy(title) or not str(title).strip() or not truthy(message) or not str(message).strip():
        return fail(422, "Title and message are required")

    recipient_ids = list(db.scalars(select(C.id).where(*_audience_filters(body))))
    if not recipient_ids:
        return fail(422, "No customers match these filters — nothing was sent")

    now = m.utcnow()
    notification_id = str(uuid.uuid4())
    db.add(m.notifications(
        id=notification_id,
        title=str(title).strip(),
        message=str(message).strip(),
        is_active_filter=body.get("isActiveFilter") or None,
        customer_type=body.get("customerType") or None,
        city=body.get("city") or None,
        subscription_status=body.get("subscriptionStatus") or None,
        delivery_boy_id=body.get("deliveryBoyId") or None,
        recipient_count=len(recipient_ids),
        sent_by="Admin",
        created_at=now,
    ))
    db.flush()
    db.execute(insert(m.notification_recipients), [
        {"id": str(uuid.uuid4()), "notification_id": notification_id, "customer_id": cid, "created_at": now}
        for cid in recipient_ids
    ])
    db.commit()
    return ok({"id": notification_id, "recipientCount": len(recipient_ids)}, status=201)
