from fastapi import APIRouter, Request
from sqlalchemy import func, or_, select
from sqlalchemy.orm import selectinload

from ... import models as m
from ...core.dates import format_timestamp_date, parse_date_only
from ...core.deps import DB, Body
from ...core.http import fail, guard, ok, query
from .common import csv_response, paginate, perm, total_pages

router = APIRouter()


def _order_options():
    route = selectinload(m.orders.delivery_routes)
    return [route, route.selectinload(m.delivery_routes.hubs), route.selectinload(m.delivery_routes.delivery_boys)]


def map_order_row(o) -> dict:
    route = o.delivery_routes
    return {
        "id": o.id,
        "invoiceNumber": o.invoice_number,
        "orderDate": o.created_at,
        "deliveryDate": o.delivery_date,
        "customerId": o.customer_id,
        "customerName": o.customer_name,
        "phone": o.phone,
        "address": o.address,
        "hub": (route.hubs.name if route and route.hubs else None) or None,
        "deliveryBoy": (route.delivery_boys.name if route and route.delivery_boys else None) or None,
        "total": int(o.total_amount),
        "status": o.status,
        "narration": o.narration,
        "paymentMethod": o.payment_method,
        "paymentStatus": o.payment_status,
    }


def _filters(request: Request) -> list:
    conditions = []
    customer_id = query(request, "customerId")
    delivery_boy_id = query(request, "deliveryBoyId")
    city = query(request, "city")
    date_from, date_to = query(request, "dateFrom"), query(request, "dateTo")

    if customer_id:
        conditions.append(m.orders.customer_id == customer_id)
    if delivery_boy_id:
        conditions.append(m.orders.route_id.in_(
            select(m.delivery_routes.id).where(m.delivery_routes.driver_id == delivery_boy_id)
        ))
    if city:
        conditions.append(or_(
            m.orders.address.ilike(f"%{city}%"),
            m.orders.customer_id.in_(select(m.customers.id).where(m.customers.city.ilike(f"%{city}%"))),
        ))
    if date_from:
        conditions.append(m.orders.delivery_date >= parse_date_only(date_from))
    if date_to:
        conditions.append(m.orders.delivery_date <= parse_date_only(date_to))
    conditions.append(m.orders.status == (query(request, "status") or "PENDING"))
    return conditions


@router.get("/orders/export")
@guard("Server Error")
def export_orders(request: Request, db: DB, user: dict = perm("ecom_orders", "excel")):
    rows = db.scalars(
        select(m.orders).where(*_filters(request)).options(*_order_options()).order_by(m.orders.created_at.desc())
    ).all()
    mapped = [map_order_row(o) for o in rows]
    header = ["Order No", "Order Date", "Customer Name", "Hub", "Total(Rs)", "Status", "Delivery Boy", "Narration"]
    return csv_response(header, [
        [
            o["invoiceNumber"] or "",
            format_timestamp_date(o["orderDate"]),
            o["customerName"] or "",
            o["hub"] or "",
            o["total"],
            o["status"],
            o["deliveryBoy"] or "",
            o["narration"] or "",
        ]
        for o in mapped
    ], "ecom-orders")


@router.get("/orders/{id}")
@guard("Server Error")
def show(id: str, db: DB, user: dict = perm("ecom_orders", "view")):
    order = db.scalar(
        select(m.orders)
        .where(m.orders.id == id)
        .options(*_order_options(), selectinload(m.orders.order_items), selectinload(m.orders.customers))
    )
    if order is None:
        return fail(404, "Order not found")
    return ok({
        **map_order_row(order),
        "customerEmail": (order.customers.email if order.customers else None) or None,
        "subtotal": int(order.subtotal),
        "taxAmount": int(order.tax_amount),
        "deliveryFee": int(order.delivery_fee),
        "walletAmountUsed": int(order.wallet_amount_used),
        "razorpayOrderId": order.razorpay_order_id,
        "razorpayPaymentId": order.razorpay_payment_id,
        "items": [
            {
                "id": it.id,
                "productName": it.product_name,
                "size": it.size,
                "quantity": it.quantity,
                "unitPrice": it.unit_price,
                "lineTotal": it.line_total,
                "purchaseType": it.purchase_type,
                "batchNumber": it.batch_number,
            }
            for it in order.order_items
        ],
    })


def _load(db, id: str):
    order = db.scalar(select(m.orders).where(m.orders.id == id).options(*_order_options()))
    if order is None:
        raise LookupError("Order not found")  # Prisma's update() threw here -> 500
    return order


@router.patch("/orders/{id}/status")
@guard("Server Error")
def update_status(id: str, body: Body, db: DB, user: dict = perm("ecom_orders", "update")):
    status = body.get("status")
    if status not in ("PENDING", "IN_PROCESS", "SHIPPED", "DELIVERED", "CANCELLED"):
        return fail(422, "Invalid order status")
    order = _load(db, id)
    order.status = status
    order.updated_at = m.utcnow()
    db.commit()
    return ok(map_order_row(order))


@router.patch("/orders/{id}/cancel")
@guard("Server Error")
def cancel(id: str, body: Body, db: DB, user: dict = perm("ecom_orders", "update")):
    order = _load(db, id)
    order.status = "CANCELLED"
    if body.get("narration"):
        order.narration = body["narration"]
    order.updated_at = m.utcnow()
    db.commit()
    return ok(map_order_row(order))


@router.patch("/orders/{id}/narration")
@guard("Server Error")
def update_narration(id: str, body: Body, db: DB, user: dict = perm("ecom_orders", "update")):
    order = _load(db, id)
    order.narration = body.get("narration") or None
    order.updated_at = m.utcnow()
    db.commit()
    return ok(map_order_row(order))


@router.get("/orders")
@guard("Server Error")
def index(request: Request, db: DB, user: dict = perm("ecom_orders", "view")):
    page, page_size = paginate(request)
    conditions = _filters(request)

    total = db.scalar(select(func.count()).select_from(m.orders).where(*conditions)) or 0
    rows = db.scalars(
        select(m.orders)
        .where(*conditions)
        .options(*_order_options())
        .order_by(m.orders.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    ).all()
    total_amount = db.scalar(select(func.sum(m.orders.total_amount)).where(*conditions)) or 0

    return ok({
        "rows": [map_order_row(o) for o in rows],
        "total": total,
        "page": page,
        "pageSize": page_size,
        "totalPages": total_pages(total, page_size),
        "totalAmount": int(total_amount),
    })
