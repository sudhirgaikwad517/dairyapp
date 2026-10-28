"""/api/v1 cart, checkout, orders and Razorpay payment endpoints."""
import html as html_lib
import time
from datetime import datetime, timezone

from fastapi import APIRouter, Request
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from .. import models as m
from ..core.deps import DB, Body, current_customer
from ..core.http import (
    ServiceError,
    fail,
    guard,
    html,
    is_number,
    js_number,
    js_round,
    logger,
    ok,
    query,
    session_id,
)
from ..services import cart as cart_service
from ..services import checkout as checkout_service
from ..services import razorpay
from ..services.customer_auth import customer_for_session
from ..services.subscription_pricing import QuoteFailure, compute_subscription_quote

router = APIRouter()


def _cart_session(request: Request) -> str:
    return session_id(request) or "default-session"


# ---- cart -------------------------------------------------------------------

@router.get("/cart")
@guard("Unable to load cart", error_code="CART_ERROR")
def cart_show(request: Request, db: DB):
    return ok(cart_service.get_cart_by_session(db, _cart_session(request)), headers={"Cache-Control": "private, no-store"})


@router.post("/cart/items")
def cart_store(request: Request, body: Body, db: DB):
    product_id = body.get("productId")
    if not product_id or not isinstance(product_id, str):
        return fail(422, "Invalid product ID")

    purchase_type = "SUBSCRIPTION" if body.get("purchaseType") == "SUBSCRIPTION" else "BUY_ONCE"
    quantity = body.get("quantity")
    qty = quantity if is_number(quantity) and quantity > 0 else 1
    kwargs = {"variant_id": body["variantId"]} if "variantId" in body else {}

    try:
        return ok(cart_service.add_cart_item(db, _cart_session(request), product_id, purchase_type, qty, **kwargs))
    except ServiceError as e:
        if e.code in ("PRODUCT_NOT_FOUND", "VARIANT_NOT_FOUND"):
            return fail(404, "Product not found", "NOT_FOUND")
        if e.code == "OUT_OF_STOCK":
            return fail(409, "This item is out of stock right now.", "OUT_OF_STOCK")
        if e.code == "PRODUCT_UNAVAILABLE":
            return fail(409, "This item is no longer available.", "PRODUCT_UNAVAILABLE")
        raise
    except Exception:
        logger.exception("add to cart failed")
        return fail(500, "Unable to add item to cart", "CART_ERROR")


@router.patch("/cart/items/{item_id}")
def cart_update_item(item_id: str, request: Request, body: Body, db: DB):
    quantity = body.get("quantity")
    if not is_number(quantity):
        return fail(422, "Quantity is required")
    try:
        return ok(cart_service.update_cart_item_quantity(db, _cart_session(request), item_id, quantity))
    except ServiceError as e:
        if e.code == "CART_NOT_FOUND":
            return fail(404, "Cart not found", "NOT_FOUND")
        raise
    except Exception:
        logger.exception("update cart item failed")
        return fail(500, "Unable to update cart item", "CART_ERROR")


@router.delete("/cart/items/{item_id}")
def cart_destroy_item(item_id: str, request: Request, db: DB):
    try:
        return ok(cart_service.remove_cart_item(db, _cart_session(request), item_id))
    except ServiceError as e:
        if e.code == "CART_NOT_FOUND":
            return fail(404, "Cart not found", "NOT_FOUND")
        raise
    except Exception:
        logger.exception("remove cart item failed")
        return fail(500, "Unable to remove cart item", "CART_ERROR")


@router.delete("/cart")
@guard("Unable to clear cart", error_code="CART_ERROR")
def cart_destroy(request: Request, db: DB):
    return ok(cart_service.clear_cart(db, _cart_session(request)))


# ---- checkout ---------------------------------------------------------------

@router.get("/checkout/options")
@guard()
def checkout_options(db: DB):
    return ok({"settings": checkout_service.checkout_settings(db), "deliverySlots": checkout_service.get_active_slots(db)})


@router.post("/checkout/validate-pincode")
@guard()
def checkout_validate_pincode(body: Body, db: DB):
    pincode = body.get("pincode")
    if not pincode or not isinstance(pincode, str):
        return fail(422, "Pincode is required")
    return ok(checkout_service.validate_pincode(db, pincode))


@router.post("/checkout/quote")
@guard()
def checkout_quote(request: Request, body: Body, db: DB):
    pincode = body.get("pincode")
    if not pincode or not isinstance(pincode, str):
        return fail(422, "Pincode is required")
    return ok(checkout_service.quote(db, _cart_session(request), pincode))


CHECKOUT_ERRORS = {
    "CART_EMPTY": (400, "Cart is empty"),
    "PINCODE_NOT_SERVICEABLE": (422, "Delivery not available for this PIN code"),
    "BELOW_MINIMUM_ORDER": (422, "Order does not meet minimum value"),
    "WALLET_REQUIRES_LOGIN": (401, "Login required to use wallet"),
    "INSUFFICIENT_WALLET_BALANCE": (422, "Insufficient wallet balance"),
    "RAZORPAY_VERIFICATION_FAILED": (422, "Payment verification failed"),
}


@router.post("/checkout/place")
def checkout_place(request: Request, body: Body, db: DB):
    try:
        sid = _cart_session(request)
        customer = customer_for_session(db, sid)
        if not all(body.get(k) for k in ("customerName", "phone", "address", "pincode")):
            return fail(422, "Missing required address fields")
        return ok(checkout_service.place_order(db, sid, body, customer), status=201)
    except ServiceError as e:
        if e.code in CHECKOUT_ERRORS:
            status, message = CHECKOUT_ERRORS[e.code]
            return fail(status, message, e.code)
        logger.exception("checkout failed")
        return fail(500, "Unable to place order", "CHECKOUT_ERROR")
    except Exception:
        logger.exception("checkout failed")
        return fail(500, "Unable to place order", "CHECKOUT_ERROR")


# ---- orders -----------------------------------------------------------------

@router.post("/orders")
def orders_store(request: Request, body: Body, db: DB):
    if not all(body.get(k) for k in ("customerName", "phone", "address")):
        return fail(422, "Missing fields")
    try:
        # Reuses the checkout flow, which handles the whole cart -> order conversion.
        return ok(checkout_service.place_order(db, _cart_session(request), body, None), status=201)
    except ServiceError as e:
        if e.code == "CART_EMPTY":
            return fail(400, "Cart is empty", "CART_EMPTY")
        logger.exception("order failed")
        return fail(500, "Unable to place order", "ORDER_ERROR")
    except Exception:
        logger.exception("order failed")
        return fail(500, "Unable to place order", "ORDER_ERROR")


def _money(value) -> str:
    return f"Rs. {js_number(value):.0f}"


def _invoice_date(value: datetime | None) -> str:
    dt = value.replace(tzinfo=timezone.utc).astimezone() if value else datetime.now()
    return dt.strftime("%d %b %Y")


@router.get("/orders/{id}/invoice")
def orders_invoice(id: str, request: Request, db: DB):
    """A standalone, printable invoice page — opened in the phone's browser from
    the app (or any browser from the admin panel), where "Print" / "Share"
    already offers "Save as PDF" without a PDF library here.

    The device's browser can't attach the normal auth header, so the app
    passes the same session id as a `session` query param."""
    try:
        sid = session_id(request) or query(request, "session")
        customer = customer_for_session(db, sid)
        if customer is None:
            return html("<h1>Please log in to view this invoice.</h1>", 401)

        order = db.scalar(select(m.orders).options(selectinload(m.orders.order_items)).where(m.orders.id == id))
        if order is None or order.customer_id != customer.id:
            return html("<h1>Invoice not found</h1>", 404)

        esc = lambda v: html_lib.escape(str(v or ""))  # noqa: E731
        rows = "".join(
            f"""
            <tr>
              <td>{esc(item.product_name)}{f" ({esc(item.size)})" if item.size else ""}</td>
              <td class="right">{item.quantity}</td>
              <td class="right">{_money(item.unit_price)}</td>
              <td class="right">{_money(item.line_total)}</td>
            </tr>"""
            for item in order.order_items
        )
        wallet_row = (
            f'<div><span>Wallet Used</span><span>-{_money(order.wallet_amount_used)}</span></div>'
            if int(order.wallet_amount_used or 0) > 0 else ""
        )

        page = f"""<!doctype html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Invoice {esc(order.invoice_number or order.id)}</title>
<style>
  body {{ font-family: -apple-system, Roboto, Arial, sans-serif; color: #101828; margin: 0; padding: 24px; }}
  .header {{ display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #101828; padding-bottom: 16px; margin-bottom: 20px; }}
  h1 {{ font-size: 20px; margin: 0 0 4px; }}
  .muted {{ color: #667085; font-size: 13px; }}
  table {{ width: 100%; border-collapse: collapse; margin-top: 16px; }}
  th, td {{ text-align: left; padding: 8px; border-bottom: 1px solid #EAECF0; font-size: 13px; }}
  th {{ color: #667085; font-size: 11px; text-transform: uppercase; }}
  .right {{ text-align: right; }}
  .totals {{ width: 260px; margin-left: auto; margin-top: 16px; }}
  .totals div {{ display: flex; justify-content: space-between; padding: 4px 0; font-size: 13px; }}
  .totals .grand {{ font-weight: bold; font-size: 16px; border-top: 1px solid #101828; margin-top: 6px; padding-top: 8px; }}
  .print-btn {{ margin-top: 24px; padding: 12px 20px; background: #6156F1; color: #fff; border: none; border-radius: 8px; font-size: 14px; cursor: pointer; }}
  @media print {{ .print-btn {{ display: none; }} }}
</style>
</head>
<body>
  <div class="header">
    <div>
      <h1>Shrishti Dairy Farm</h1>
      <div class="muted">Invoice {esc(order.invoice_number or '-')}</div>
    </div>
    <div class="muted" style="text-align:right">
      <div>{_invoice_date(order.created_at)}</div>
      <div>{esc(order.status)}</div>
    </div>
  </div>

  <div class="muted">Billed to</div>
  <div>{esc(order.customer_name)}</div>
  <div class="muted">{esc(order.address)}</div>
  <div class="muted">{esc(order.phone)}</div>

  <table>
    <thead><tr><th>Item</th><th class="right">Qty</th><th class="right">Rate</th><th class="right">Amount</th></tr></thead>
    <tbody>{rows}</tbody>
  </table>

  <div class="totals">
    <div><span>Subtotal</span><span>{_money(order.subtotal)}</span></div>
    <div><span>Tax</span><span>{_money(order.tax_amount)}</span></div>
    <div><span>Delivery Fee</span><span>{_money(order.delivery_fee)}</span></div>
    {wallet_row}
    <div class="grand"><span>Total</span><span>{_money(order.total_amount)}</span></div>
  </div>

  <button class="print-btn" id="printBtn">Print / Save as PDF</button>
  <script>document.getElementById('printBtn').addEventListener('click', function () {{ window.print(); }});</script>
</body>
</html>"""
        return html(page)
    except Exception:
        logger.exception("invoice failed")
        return html("<h1>Unable to load invoice</h1>", 500)


@router.get("/orders/{id}")
@guard()
def orders_show(id: str, db: DB):
    order = db.scalar(select(m.orders).options(selectinload(m.orders.order_items)).where(m.orders.id == id))
    if order is None:
        return fail(404, "Order not found", "NOT_FOUND")
    return ok({
        "id": order.id,
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
                "quantity": item.quantity,
                "unitPrice": int(item.unit_price),
                "purchaseType": item.purchase_type,
                "lineTotal": int(item.line_total),
            }
            for item in order.order_items
        ],
        "createdAt": order.created_at,
    })


# ---- payments ---------------------------------------------------------------

def _not_configured():
    return fail(503, "Online payment is not available right now", "RAZORPAY_NOT_CONFIGURED")


def _payment_start_failed(code: str):
    return fail(502, "Unable to start the payment. Please try again.", code)


def _now_ms() -> int:
    return int(time.time() * 1000)


@router.get("/payments/razorpay/status")
def payments_status():
    """Tells the app whether online payment can be offered at all."""
    return ok({"configured": razorpay.is_configured(), "keyId": razorpay.publishable_key_id()})


@router.post("/payments/razorpay/order")
@guard()
def payments_order(request: Request, body: Body, db: DB):
    """Creates a Razorpay order for the current cart (checkout flow)."""
    sid = _cart_session(request)
    if not razorpay.is_configured():
        return _not_configured()
    pincode = body.get("pincode")
    if not pincode:
        return fail(422, "Pincode required")

    try:
        quote = checkout_service.quote(db, sid, str(pincode))
    except Exception:
        return fail(400, "Unable to calculate order total", "CHECKOUT_ERROR")

    if not quote["cart"]["items"]:
        return fail(400, "Cart is empty", "CART_EMPTY")
    if not quote["pincode"]["serviceable"]:
        return fail(422, "Delivery not available", "PINCODE_NOT_SERVICEABLE")
    if not quote["meetsMinimum"]:
        return fail(422, "Order does not meet minimum value", "BELOW_MINIMUM_ORDER")

    wallet = js_number(body.get("walletAmount")) if "walletAmount" in body else 0
    wallet = max(0, wallet if wallet == wallet else 0)
    payable = max(1, quote["totalAmount"] - wallet)
    receipt = f"sdf_{sid[:8]}_{_now_ms()}"

    try:
        order = razorpay.create_order(payable * 100, receipt, {"purpose": "order"})
    except razorpay.RazorpayError as e:
        return _payment_start_failed(e.code)

    return ok({
        "razorpay": {
            "configured": True,
            "keyId": razorpay.publishable_key_id(),
            "orderId": order.get("id"),
            "amount": order.get("amount"),
            "currency": order.get("currency"),
        },
        "payableAmount": payable,
        "quoteTotal": quote["totalAmount"],
    })


@router.post("/payments/razorpay/wallet-order")
@guard()
def payments_wallet_order(request: Request, body: Body, db: DB):
    """Creates a Razorpay order for a wallet top-up."""
    customer = current_customer(db, request)
    if not razorpay.is_configured():
        return _not_configured()

    amount = js_number(body.get("amount")) if "amount" in body else 0
    if amount != amount or not amount or amount < 100 or amount > 50000:
        return fail(422, "Amount must be between 100 and 50000")

    receipt = f"sdf_wallet_{customer.id[:8]}_{_now_ms()}"
    try:
        order = razorpay.create_order(js_round(amount) * 100, receipt, {"purpose": "wallet_topup", "customerId": customer.id})
    except razorpay.RazorpayError as e:
        return _payment_start_failed(e.code)

    return ok({
        "configured": True,
        "keyId": razorpay.publishable_key_id(),
        "orderId": order.get("id"),
        "amount": order.get("amount"),
        "currency": order.get("currency"),
    })


@router.post("/payments/razorpay/subscription-order")
@guard()
def payments_subscription_order(request: Request, body: Body, db: DB):
    """Creates a Razorpay order for a prepaid subscription's upfront total.
    The amount is never taken from the client — it's the same quote
    `POST /subscriptions` will independently recompute and verify."""
    customer = current_customer(db, request)
    if not razorpay.is_configured():
        return _not_configured()

    result = compute_subscription_quote(db, customer.id, body)
    if isinstance(result, QuoteFailure):
        return fail(result.status, result.message, result.error_code)
    if not result.is_prepaid or result.total_cost <= 0:
        return fail(422, "This plan has nothing to pay upfront")

    receipt = f"sdf_sub_{customer.id[:8]}_{_now_ms()}"
    try:
        order = razorpay.create_order(
            result.total_cost * 100, receipt, {"purpose": "subscription_prepaid", "customerId": customer.id}
        )
    except razorpay.RazorpayError as e:
        return _payment_start_failed(e.code)

    return ok({
        "configured": True,
        "keyId": razorpay.publishable_key_id(),
        "orderId": order.get("id"),
        "amount": order.get("amount"),
        "currency": order.get("currency"),
        "totalCost": result.total_cost,
        "occurrences": result.occurrences,
    })


@router.post("/payments/razorpay/verify")
@guard()
def payments_verify(body: Body):
    if not razorpay.is_configured():
        return _not_configured()
    verified = razorpay.verify_signature(
        body.get("razorpayOrderId"), body.get("razorpayPaymentId"), body.get("razorpaySignature")
    )
    return ok({"verified": verified, "configured": True})
