import re
import uuid
from datetime import timedelta

from sqlalchemy import delete, select
from sqlalchemy.orm import Session, selectinload

from .. import models as m
from ..core.dates import js_date_to_date, local_today, utc_today
from ..core.http import ServiceError, js_number, js_round, truthy
from . import razorpay
from .activity_log import log_activity
from .cart import get_cart_by_session


def checkout_settings(db: Session) -> dict:
    min_order = db.get(m.site_settings, "min_order_value")
    free_delivery = db.get(m.site_settings, "free_delivery_threshold")
    wallet_enabled = db.get(m.site_settings, "wallet_enabled")
    return {
        # No minimum unless one is set (per delivery zone in the admin panel, or the min_order_value setting)
        "minOrderValue": js_number(min_order.value) if min_order else 0,
        "freeDeliveryThreshold": js_number(free_delivery.value) if free_delivery else 50000,
        "walletEnabled": truthy(wallet_enabled.value) if wallet_enabled else True,
    }


def get_active_slots(db: Session) -> list[dict]:
    slots = db.scalars(
        select(m.delivery_slots).where(m.delivery_slots.is_active.is_(True)).order_by(m.delivery_slots.sort_order)
    ).all()
    return [
        {"id": s.id, "label": s.label, "startTime": s.start_time, "endTime": s.end_time, "routeId": s.route_id}
        for s in slots
    ]


def validate_pincode(db: Session, pincode: str) -> dict:
    pincode = re.sub(r"\D+", "", pincode or "")
    settings = checkout_settings(db)

    if len(pincode) != 6:
        return {
            "serviceable": False,
            "pincode": pincode,
            "city": None,
            "areaName": None,
            "deliveryFee": 0,
            "minOrderValue": settings["minOrderValue"],
            "routeId": None,
            "message": "Enter a valid 6-digit PIN code",
        }

    zone = db.scalar(select(m.delivery_zones).where(m.delivery_zones.pincode == pincode))
    if zone is None or not zone.is_serviceable:
        return {
            "serviceable": False,
            "pincode": pincode,
            "city": (zone.city if zone else None) or None,
            "areaName": (zone.area_name if zone else None) or None,
            "deliveryFee": 0,
            "minOrderValue": settings["minOrderValue"],
            "routeId": None,
            "message": "Sorry, we do not deliver to this PIN code yet.",
        }

    return {
        "serviceable": True,
        "pincode": pincode,
        "city": zone.city,
        "areaName": zone.area_name,
        "deliveryFee": zone.delivery_fee,
        "minOrderValue": zone.min_order_value if zone.min_order_value is not None else settings["minOrderValue"],
        "routeId": zone.route_id,
        "message": None,
    }


def quote(db: Session, session_id: str, pincode: str) -> dict:
    cart = get_cart_by_session(db, session_id)
    zone = validate_pincode(db, pincode)
    settings = checkout_settings(db)
    lines = _build_line_totals(db, cart["items"])

    # `subtotal` is the pre-tax base — it, `taxAmount` and `deliveryFee` add
    # up exactly to `totalAmount`, so the bill shown to the customer is fully
    # transparent. Minimum order / free delivery are measured against what
    # the customer spends on the items themselves, tax included.
    subtotal = sum(line["baseAmount"] for line in lines)
    tax_amount = sum(line["taxAmount"] for line in lines)
    items_total = subtotal + tax_amount

    delivery_fee = 0
    if zone["serviceable"] and items_total < settings["freeDeliveryThreshold"]:
        delivery_fee = zone["deliveryFee"]

    min_order_value = zone["minOrderValue"]
    return {
        "cart": cart,
        "pincode": zone,
        "subtotal": subtotal,
        "taxAmount": tax_amount,
        "deliveryFee": delivery_fee,
        "totalAmount": subtotal + tax_amount + delivery_fee,
        "minOrderValue": min_order_value,
        "meetsMinimum": items_total >= min_order_value,
        "freeDeliveryThreshold": settings["freeDeliveryThreshold"],
        "walletEnabled": settings["walletEnabled"],
    }


def place_order(db: Session, session_id: str, body: dict, customer) -> dict:
    cart = get_cart_by_session(db, session_id)
    if not cart["items"]:
        raise ServiceError("CART_EMPTY")

    pincode = re.sub(r"\D+", "", str(body.get("pincode") or ""))
    zone = validate_pincode(db, pincode)
    if not zone["serviceable"]:
        raise ServiceError("PINCODE_NOT_SERVICEABLE")

    lines = _build_line_totals(db, cart["items"])
    subtotal = sum(line["baseAmount"] for line in lines)
    tax_amount = sum(line["taxAmount"] for line in lines)
    items_total = subtotal + tax_amount
    if items_total < zone["minOrderValue"]:
        raise ServiceError("BELOW_MINIMUM_ORDER")

    settings = checkout_settings(db)
    delivery_fee = zone["deliveryFee"] if items_total < settings["freeDeliveryThreshold"] else 0

    payment_method = body.get("paymentMethod") or "cod"
    total_amount = items_total + delivery_fee

    # Paying by wallet means the wallet covers the whole order — the amount is
    # computed here rather than taken from the request, so a client can't ask
    # for a "wallet" order while deducting nothing.
    if payment_method == "wallet":
        wallet_use = total_amount
    else:
        requested = js_number(body.get("walletAmount")) if "walletAmount" in body else 0
        wallet_use = max(0, requested if requested == requested else 0)

    if wallet_use > 0 and customer is None:
        raise ServiceError("WALLET_REQUIRES_LOGIN")
    wallet_use = min(wallet_use, total_amount)

    customer_wallet = None
    if wallet_use > 0 and customer is not None:
        customer_wallet = db.scalar(select(m.customer_wallets).where(m.customer_wallets.customer_id == customer.id))
        balance = int(customer_wallet.balance) if customer_wallet else 0
        if balance < wallet_use:
            raise ServiceError("INSUFFICIENT_WALLET_BALANCE")

    if payment_method == "wallet" and wallet_use < total_amount:
        raise ServiceError("INSUFFICIENT_WALLET_BALANCE")

    if payment_method == "razorpay":
        if not _verify_razorpay_payment(
            body.get("razorpayOrderId") or "", body.get("razorpayPaymentId") or "", body.get("razorpaySignature") or ""
        ):
            raise ServiceError("RAZORPAY_VERIFICATION_FAILED")

    payment_status = "paid" if (payment_method == "razorpay" or wallet_use >= total_amount) else "pending"
    now = m.utcnow()
    order_id = str(uuid.uuid4())
    invoice_number = f"SDF-{local_today().strftime('%Y%m%d')}-{order_id[:8].upper()}"
    delivery_date = (
        js_date_to_date(body.get("deliveryDate")) if truthy(body.get("deliveryDate")) else utc_today() + timedelta(days=1)
    )

    try:
        db.add(m.orders(
            id=order_id,
            session_id=session_id,
            customer_id=customer.id if customer else None,
            customer_name=str(body.get("customerName") or (customer.name if customer else "") or "").strip(),
            phone=re.sub(r"\D+", "", str(body.get("phone") or (customer.phone if customer else "") or "")),
            address=str(body.get("address") or (customer.address if customer else "") or "").strip(),
            pincode=pincode,
            delivery_date=delivery_date,
            delivery_slot_id=body.get("deliverySlotId") or None,
            route_id=zone["routeId"],
            status="PENDING",
            subtotal=subtotal,
            tax_amount=tax_amount,
            delivery_fee=delivery_fee,
            wallet_amount_used=wallet_use,
            total_amount=total_amount - wallet_use,
            payment_method=payment_method,
            payment_status=payment_status,
            razorpay_order_id=body.get("razorpayOrderId") if payment_method == "razorpay" else None,
            razorpay_payment_id=body.get("razorpayPaymentId") if payment_method == "razorpay" else None,
            invoice_number=invoice_number,
            created_at=now,
            updated_at=now,
        ))
        db.flush()

        for line in lines:
            batch_number = None
            # Very basic batch assignment: the soonest-expiring batch with stock.
            batch_query = select(m.inventory_batches).where(
                m.inventory_batches.product_id == line["productId"],
                m.inventory_batches.expiry_date > utc_today(),
                m.inventory_batches.quantity > 0,
            )
            if line["variantId"]:
                batch_query = batch_query.where(m.inventory_batches.variant_id == line["variantId"])
            batch = db.scalar(batch_query.order_by(m.inventory_batches.expiry_date).limit(1))
            if batch is not None:
                batch_number = batch.batch_number
                batch.quantity = max(0, batch.quantity - 1)

            db.add(m.order_items(
                id=str(uuid.uuid4()),
                order_id=order_id,
                product_id=line["productId"],
                variant_id=line["variantId"],
                product_name=line["name"],
                size=line["size"],
                batch_number=batch_number,
                quantity=line["quantity"],
                unit_price=line["unitPrice"],
                purchase_type=line["purchaseType"],
                line_total=line["lineTotal"],
                gst_rate=line["gstRate"],
                tax_amount=line["taxAmount"],
                created_at=now,
                updated_at=now,
            ))

        if cart["id"]:
            db.execute(delete(m.cart_items).where(m.cart_items.cart_id == cart["id"]))

        if wallet_use > 0 and customer is not None:
            current_balance = int(customer_wallet.balance) if customer_wallet else 0
            customer_wallet.balance = current_balance - wallet_use
            customer_wallet.updated_at = now
            db.add(m.wallet_transactions(
                id=str(uuid.uuid4()),
                customer_id=customer.id,
                type="debit",
                amount=wallet_use,
                balance_after=current_balance - wallet_use,
                reference_type="order",
                reference_id=order_id,
                created_at=now,
                updated_at=now,
            ))

        if customer is not None:
            customer.orders_count = m.customers.orders_count + 1

        db.commit()
    except Exception:
        db.rollback()
        raise

    order = db.scalar(select(m.orders).options(selectinload(m.orders.order_items)).where(m.orders.id == order_id))
    mapped = _map_order(order)

    if any(item["purchaseType"] == "BUY_ONCE" for item in mapped["items"]):
        names = ", ".join(item["productName"] for item in mapped["items"])
        log_activity(
            db,
            type="one_time_order",
            title="One Time Order Request",
            message=f"{mapped['customerName'] or 'Customer'}, order for {names} placed successfully ({mapped['invoiceNumber']}).",
            customer_id=customer.id if customer else None,
        )
    return mapped


def _build_line_totals(db: Session, items: list[dict]) -> list[dict]:
    lines = []
    for item in items:
        product = db.get(m.products, item["productId"])
        if product is None:
            continue
        variant = db.get(m.product_variants, item["variantId"]) if item.get("variantId") else None

        purchase_type = item.get("purchaseType") or "BUY_ONCE"
        source = variant if variant is not None else product
        unit_price = int(source.subscription if purchase_type == "SUBSCRIPTION" else source.buy_once)

        # `baseAmount` (pre-tax) and `taxAmount` always add up to `lineTotal`
        # (what's actually charged) — kept separate so the bill breakdown is
        # additive instead of hiding the tax already folded into a
        # tax-inclusive price.
        gst_rate = float(product.gst_rate or 0)
        is_tax_inclusive = product.is_tax_inclusive is not False
        amount = unit_price * item["quantity"]
        tax = 0
        total = amount
        base = amount
        if gst_rate > 0:
            if is_tax_inclusive:
                tax = js_round(amount - (amount * 100) / (100 + gst_rate))
                base = amount - tax
            else:
                tax = js_round((amount * gst_rate) / 100)
                total = amount + tax

        lines.append({
            "productId": item["productId"],
            "variantId": item.get("variantId") or None,
            "name": item["name"],
            "size": (variant.size_label if variant else None) or item["size"],
            "quantity": item["quantity"],
            "unitPrice": unit_price,
            "purchaseType": purchase_type,
            "lineTotal": total,
            "baseAmount": base,
            "taxAmount": tax,
            "gstRate": gst_rate,
        })
    return lines


def _verify_razorpay_payment(order_id: str, payment_id: str, signature: str) -> bool:
    """Fails closed: an order is only marked paid when Razorpay's own signature
    checks out AND Razorpay confirms the payment was actually collected."""
    if not razorpay.verify_signature(order_id, payment_id, signature):
        return False
    return razorpay.is_payment_captured(payment_id)


def _map_order(order: "m.orders") -> dict:
    return {
        "id": order.id,
        "invoiceNumber": order.invoice_number,
        "status": order.status,
        "subtotal": int(order.subtotal),
        "taxAmount": int(order.tax_amount),
        "deliveryFee": int(order.delivery_fee),
        "walletAmountUsed": int(order.wallet_amount_used),
        "totalAmount": int(order.total_amount),
        "paymentStatus": order.payment_status,
        "paymentMethod": order.payment_method,
        "deliveryDate": order.delivery_date,
        "customerName": order.customer_name,
        "phone": order.phone,
        "address": order.address,
        "pincode": order.pincode,
        "items": [
            {
                "id": item.id,
                "productId": item.product_id,
                "productName": item.product_name,
                "size": item.size,
                "batchNumber": item.batch_number,
                "quantity": item.quantity,
                "unitPrice": int(item.unit_price),
                "purchaseType": item.purchase_type,
                "lineTotal": int(item.line_total),
                "gstRate": float(item.gst_rate),
                "taxAmount": int(item.tax_amount),
            }
            for item in order.order_items
        ],
        "createdAt": order.created_at,
    }
