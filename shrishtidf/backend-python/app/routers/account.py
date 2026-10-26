"""/api/v1 endpoints for a logged-in customer: subscriptions, vacations,
wallet, addresses, notifications, billing, referrals and feedback."""
import re
import uuid
from datetime import timedelta

from fastapi import APIRouter, Request
from sqlalchemy import func, select, update
from sqlalchemy.orm import Session, selectinload

from .. import models as m
from ..core.dates import (
    format_date_only,
    js_date,
    js_date_to_date,
    local_today,
    parse_date_only,
    try_parse_date_only,
)
from ..core.deps import DB, Body, current_customer
from ..core.http import (
    Abort,
    fail,
    guard,
    is_number,
    js_number,
    js_round,
    ok,
    query,
    respond,
    truthy,
)
from ..services import razorpay
from ..services.activity_log import log_activity
from ..services.cutoff import get_earliest_effective_date
from ..services.subscription_lifecycle import (
    SUBSCRIPTION_FREQUENCIES,
    add_frequency_days,
    day_wise_input,
    parse_day_wise_days,
    serialize_day_wise_days,
)
from ..services.subscription_pricing import QuoteFailure, compute_subscription_quote

router = APIRouter()

DAY_LABELS = {1: "Mon", 2: "Tue", 3: "Wed", 4: "Thu", 5: "Fri", 6: "Sat", 7: "Sun"}


def frequency_label(frequency: str, day_wise_days: list[int]) -> str:
    if frequency == "daily":
        return "Every day"
    if frequency == "alternate_days":
        return "Alternate day"
    if frequency == "every_3_days":
        return "Every 3 days"
    if frequency == "day_wise":
        return f"Day wise ({', '.join(DAY_LABELS[d] for d in day_wise_days)})" if day_wise_days else "Day wise"
    if frequency == "weekly":
        return "Weekly"
    return frequency


def _display_name(customer) -> str:
    return customer.name or customer.phone


def _wallet_balance(db: Session, customer_id: str) -> int:
    wallet = db.scalar(select(m.customer_wallets).where(m.customer_wallets.customer_id == customer_id))
    return int(wallet.balance) if wallet else 0


def _own_subscription(db: Session, sub_id: str, customer_id: str) -> "m.subscriptions":
    """Prisma's `update({ where: { id, customer_id } })` threw when nothing
    matched, which the handlers turned into a 500."""
    sub = db.scalar(select(m.subscriptions).where(m.subscriptions.id == sub_id, m.subscriptions.customer_id == customer_id))
    if sub is None:
        raise LookupError("Subscription not found")
    return sub


# ---- subscriptions ----------------------------------------------------------

@router.get("/subscriptions")
@guard()
def subscriptions_index(request: Request, db: DB):
    customer = current_customer(db, request)
    rows = db.scalars(
        select(m.subscriptions)
        .where(m.subscriptions.customer_id == customer.id)
        .options(
            selectinload(m.subscriptions.products).selectinload(m.products.product_categories),
            selectinload(m.subscriptions.product_variants),
            selectinload(m.subscriptions.delivery_slots),
        )
        .order_by(m.subscriptions.created_at.desc())
    ).all()

    result = []
    for sub in rows:
        days = parse_day_wise_days(sub.day_wise_days)
        slot = sub.delivery_slots
        result.append({
            "id": sub.id,
            "productId": sub.product_id,
            "variantId": sub.variant_id,
            "productName": sub.products.name,
            "size": (sub.product_variants.size_label if sub.product_variants else None) or sub.products.size,
            "imageUrl": sub.products.image_url,
            "status": sub.status,
            "frequency": sub.frequency,
            "frequencyLabel": frequency_label(sub.frequency, days),
            "dayWiseDays": days,
            "quantity": sub.quantity,
            "rate": sub.rate,
            "startDate": sub.start_date,
            "endDate": sub.expires_at,
            "nextDeliveryDate": sub.next_delivery_date,
            "pausedFrom": sub.paused_from,
            "pausedUntil": sub.paused_until,
            "walletAutoDebit": sub.wallet_auto_debit,
            "hasPendingChange": bool(sub.change_effective_date),
            "pendingQuantity": sub.pending_quantity,
            "changeEffectiveDate": sub.change_effective_date,
            "deliverySlot": {
                "id": slot.id,
                "label": slot.label,
                "startTime": slot.start_time,
                "endTime": slot.end_time,
            } if slot else None,
            "createdAt": sub.created_at,
        })
    return ok({"subscriptions": result})


def _quote_failure(result: QuoteFailure):
    return fail(result.status, result.message, result.error_code, result.data)


@router.post("/subscriptions/quote")
@guard()
def subscriptions_quote(request: Request, body: Body, db: DB):
    """Lets the app show "You'll pay ₹X for N deliveries" (prepaid) before the
    customer commits — same math `store` uses to actually charge."""
    customer = current_customer(db, request)
    result = compute_subscription_quote(db, customer.id, body)
    if isinstance(result, QuoteFailure):
        return _quote_failure(result)

    wallet_balance = _wallet_balance(db, customer.id)
    return ok({
        "isPrepaid": result.is_prepaid,
        "rate": result.rate,
        "quantity": result.quantity,
        "occurrences": result.occurrences,
        "totalCost": result.total_cost,
        "effectiveFrom": format_date_only(result.effective_start),
        "walletBalance": wallet_balance,
        "walletSufficient": wallet_balance >= result.total_cost,
    })


@router.post("/subscriptions")
@guard("Unable to create subscription", status=422, error_code="SUBSCRIPTION_ERROR")
def subscriptions_store(request: Request, body: Body, db: DB):
    customer = current_customer(db, request)
    q = compute_subscription_quote(db, customer.id, body)
    if isinstance(q, QuoteFailure):
        return _quote_failure(q)

    payment_method = body.get("paymentMethod")
    razorpay_order_id = body.get("razorpayOrderId")
    razorpay_payment_id = body.get("razorpayPaymentId")
    razorpay_signature = body.get("razorpaySignature")

    # Postpaid is billed per delivery as it happens — nothing to pay now, so
    # auto-debit is switched on unconditionally. Prepaid pays the full plan below.
    wallet_auto_debit = not q.is_prepaid
    payment_reference_id = None

    if q.is_prepaid and q.total_cost > 0:
        if payment_method == "wallet":
            balance = _wallet_balance(db, customer.id)
            if balance < q.total_cost:
                return fail(
                    422,
                    f"Your wallet balance (₹{balance}) is less than the plan total (₹{q.total_cost}). Add money or pay online instead.",
                    "INSUFFICIENT_WALLET_BALANCE",
                    {"totalCost": q.total_cost, "walletBalance": balance},
                )
        elif payment_method == "online":
            if not razorpay.is_configured():
                return fail(503, "Online payment is not available right now", "RAZORPAY_NOT_CONFIGURED")
            if not razorpay.verify_signature(razorpay_order_id, razorpay_payment_id, razorpay_signature):
                return fail(422, "Payment could not be verified", "PAYMENT_VERIFICATION_FAILED")
            if not razorpay.is_payment_captured(razorpay_payment_id):
                return fail(422, "Payment has not been completed", "PAYMENT_NOT_CAPTURED")
            paid_order = razorpay.fetch_order(razorpay_order_id)
            if paid_order is None:
                return fail(422, "Payment could not be verified", "PAYMENT_NOT_FOUND")
            if js_round(js_number(paid_order.get("amount"))) / 100 != q.total_cost:
                return fail(422, "Paid amount does not match the plan total", "AMOUNT_MISMATCH")
            # A payment already spent on another subscription can't pay for this one too.
            used = db.scalar(
                select(m.wallet_transactions.id).where(m.wallet_transactions.reference_id == razorpay_payment_id).limit(1)
            )
            if used is not None:
                return fail(422, "This payment has already been used", "PAYMENT_ALREADY_USED")
            payment_reference_id = razorpay_payment_id
        else:
            return fail(422, 'Choose "Pay from Wallet" or "Pay Online" to subscribe.', "PAYMENT_METHOD_REQUIRED")

    plan_valid_days = (q.expires_at - q.effective_start).days + 1 if q.expires_at else None
    now = m.utcnow()
    sub = m.subscriptions(
        id=str(uuid.uuid4()),
        customer_id=customer.id,
        product_id=q.product.id,
        variant_id=q.variant.id if q.variant is not None else None,
        frequency=q.frequency,
        day_wise_days=serialize_day_wise_days(q.day_wise_days) if q.frequency == "day_wise" else None,
        quantity=q.quantity,
        delivery_slot_id=body.get("deliverySlotId") or None,
        wallet_auto_debit=wallet_auto_debit,
        status="active",
        start_date=q.effective_start,
        next_delivery_date=q.effective_start,
        rate=q.rate,
        plan_valid_days=plan_valid_days,
        expires_at=q.expires_at,
        created_at=now,
        updated_at=now,
    )
    db.add(sub)
    db.flush()

    plan_note = f"{q.product.name} × {q.quantity} for {q.occurrences} deliveries"
    if q.is_prepaid and q.total_cost > 0 and payment_method == "wallet":
        # Prepaid via wallet: charge the whole plan now.
        wallet = db.scalar(select(m.customer_wallets).where(m.customer_wallets.customer_id == customer.id))
        new_balance = int(wallet.balance if wallet else 0) - q.total_cost
        wallet.balance = new_balance
        wallet.updated_at = now
        db.add(m.wallet_transactions(
            id=str(uuid.uuid4()),
            customer_id=customer.id,
            type="debit",
            amount=q.total_cost,
            balance_after=new_balance,
            reference_type="subscription_prepaid",
            reference_id=sub.id,
            notes=f"Prepaid subscription: {plan_note}",
            created_at=now,
            updated_at=now,
        ))
    elif q.is_prepaid and q.total_cost > 0 and payment_reference_id:
        # Keep a record of the Razorpay payment even though it never touched
        # the wallet balance, so reuse is caught and the history shows it.
        db.add(m.wallet_transactions(
            id=str(uuid.uuid4()),
            customer_id=customer.id,
            type="debit",
            amount=0,
            balance_after=_wallet_balance(db, customer.id),
            reference_type="subscription_prepaid_online",
            reference_id=payment_reference_id,
            notes=f"Paid online for subscription: {plan_note} (₹{q.total_cost})",
            created_at=now,
            updated_at=now,
        ))
    db.commit()

    paid_note = f" Paid ₹{q.total_cost} upfront for {q.occurrences} deliveries." if q.is_prepaid and q.total_cost > 0 else ""
    log_activity(
        db,
        type="subscription",
        subtype="create",
        title="Subscribe Request",
        message=(
            f"{_display_name(customer)}, order for {q.product.name} : {q.quantity} starting "
            f"{format_date_only(q.effective_start)} on {frequency_label(q.frequency, q.day_wise_days)} basis "
            f"is placed successfully.{paid_note}"
        ),
        customer_id=customer.id,
        subscription_id=sub.id,
        effective_date=q.effective_start,
    )

    return ok(
        {"subscription": sub, "effectiveFrom": format_date_only(q.effective_start), "totalCost": q.total_cost, "occurrences": q.occurrences},
        status=201,
    )


@router.post("/subscriptions/{id}/change-request")
@guard("Internal error")
def subscriptions_change_request(id: str, request: Request, body: Body, db: DB):
    """Lets a customer change the quantity, packaging (variant) or frequency of a
    plan themselves — the same cutoff-aware pending-change mechanism as the
    admin Change Request, so an already-locked-in delivery is never altered."""
    customer = current_customer(db, request)
    existing = db.get(m.subscriptions, id)
    if existing is None or existing.customer_id != customer.id:
        return fail(404, "Subscription not found")
    if existing.status == "cancelled":
        return fail(422, "A cancelled subscription cannot be changed")

    quantity = body.get("quantity")
    variant_id = body.get("variantId")
    frequency = body.get("frequency")
    if truthy(variant_id):
        variant = db.get(m.product_variants, variant_id)
        if variant is None or variant.product_id != existing.product_id:
            return fail(422, "Selected packaging does not belong to this product")
    if "frequency" in body and frequency not in SUBSCRIPTION_FREQUENCIES:
        return fail(422, "Please choose a valid delivery schedule")
    if frequency == "day_wise" and not day_wise_input(body.get("dayWiseDays")):
        return fail(422, "Choose at least one day for a Day wise plan")

    if not ("quantity" in body or "variantId" in body or "frequency" in body):
        return fail(422, "Nothing to change")

    _, earliest = get_earliest_effective_date(db)
    if "quantity" in body:
        existing.pending_quantity = int(js_number(quantity))
    if "variantId" in body:
        existing.pending_variant_id = variant_id or None
    if "frequency" in body:
        existing.pending_frequency = frequency
        existing.pending_day_wise_days = (
            serialize_day_wise_days(day_wise_input(body.get("dayWiseDays"))) if frequency == "day_wise" else None
        )
    existing.change_effective_date = earliest
    existing.updated_at = m.utcnow()
    db.commit()

    log_activity(
        db,
        type="change_request",
        subtype="change_request",
        title="Change Request",
        message=f"{_display_name(customer)} requested a change to their subscription, effective {format_date_only(earliest)}.",
        customer_id=customer.id,
        subscription_id=id,
        effective_date=earliest,
    )
    return ok({"subscription": existing, "effectiveFrom": format_date_only(earliest)})


@router.post("/subscriptions/{id}/pause")
@guard("Internal error")
def subscriptions_pause(id: str, request: Request, body: Body, db: DB):
    customer = current_customer(db, request)

    # A holiday requested before the cutoff starts the very next day; at/after
    # the cutoff, tomorrow's delivery is already locked in, so the earliest it
    # can start is pushed one day further.
    _, earliest = get_earliest_effective_date(db)
    requested_from = js_date_to_date(body.get("pausedFrom")) if truthy(body.get("pausedFrom")) else earliest
    if requested_from is None:
        raise ValueError("Invalid pausedFrom")
    effective_from = max(requested_from, earliest)

    sub = _own_subscription(db, id, customer.id)
    sub.status = "paused"
    sub.paused_from = effective_from
    sub.paused_until = js_date_to_date(body.get("pausedUntil")) if truthy(body.get("pausedUntil")) else None
    sub.updated_at = m.utcnow()
    db.commit()

    until = f" until {format_date_only(sub.paused_until)}" if sub.paused_until else ""
    log_activity(
        db,
        type="subscription",
        subtype="pause",
        title="Subscribe Pause Request",
        message=f"{_display_name(customer)}, pause request received. Plan will be paused from {format_date_only(effective_from)}{until}.",
        customer_id=customer.id,
        subscription_id=sub.id,
        effective_date=effective_from,
    )
    return ok({"subscription": sub, "effectiveFrom": format_date_only(effective_from)})


@router.post("/subscriptions/{id}/resume")
@guard("Internal error")
def subscriptions_resume(id: str, request: Request, db: DB):
    customer = current_customer(db, request)
    sub = _own_subscription(db, id, customer.id)
    sub.status = "active"
    sub.paused_from = None
    sub.paused_until = None
    sub.updated_at = m.utcnow()
    db.commit()

    log_activity(
        db,
        type="subscription",
        subtype="resume",
        title="Subscribe Resumed Request",
        message=f"{_display_name(customer)}, resume request received. Plan will be resumed immediately.",
        customer_id=customer.id,
        subscription_id=sub.id,
        effective_date=m.utcnow().date(),
    )
    return ok({"subscription": sub})


@router.get("/subscriptions/upcoming")
@guard()
def subscriptions_upcoming(request: Request, db: DB):
    """"Upcoming Order" tab — projects each active subscription's next deliveries
    forward from its `next_delivery_date`, the same field the admin daily
    delivery workflow keeps up to date, so this never drifts from reality."""
    customer = current_customer(db, request)
    raw_days = query(request, "days")
    requested = js_number(raw_days) if raw_days is not None else float("nan")
    days = int(min(30, max(1, requested if truthy(requested) else 14)))
    today = local_today()
    range_end = today + timedelta(days=days - 1)

    subs = db.scalars(
        select(m.subscriptions)
        .where(m.subscriptions.customer_id == customer.id, m.subscriptions.status == "active")
        .options(selectinload(m.subscriptions.products), selectinload(m.subscriptions.product_variants))
    ).all()

    by_date: dict[str, list] = {}
    for sub in subs:
        day_wise = parse_day_wise_days(sub.day_wise_days)
        cursor = sub.next_delivery_date or sub.start_date
        if cursor is None:
            continue

        guard_count = 0
        while cursor < today and guard_count < 2000:
            cursor = add_frequency_days(cursor, sub.frequency, day_wise)
            guard_count += 1

        guard_count = 0
        while cursor <= range_end and guard_count < 2000:
            if sub.expires_at and cursor > sub.expires_at:
                break
            by_date.setdefault(format_date_only(cursor), []).append({
                "subscriptionId": sub.id,
                "productId": sub.product_id,
                "productName": sub.products.name,
                "imageUrl": sub.products.image_url,
                "size": (sub.product_variants.size_label if sub.product_variants else None) or sub.products.size,
                "quantity": sub.quantity,
            })
            cursor = add_frequency_days(cursor, sub.frequency, day_wise)
            guard_count += 1

    return ok({"days": [{"date": d, "items": by_date[d]} for d in sorted(by_date)]})


@router.get("/subscriptions/history")
@guard()
def subscriptions_history(request: Request, db: DB):
    """"Order History" tab — actual marked deliveries, most recent first."""
    customer = current_customer(db, request)
    to_param, from_param = query(request, "to"), query(request, "from")
    to_date = parse_date_only(to_param) if to_param else m.utcnow().date()
    from_date = parse_date_only(from_param) if from_param else to_date - timedelta(days=29)

    records = db.scalars(
        select(m.delivery_records)
        .where(
            m.delivery_records.customer_id == customer.id,
            m.delivery_records.delivery_date >= from_date,
            m.delivery_records.delivery_date <= to_date,
        )
        .options(selectinload(m.delivery_records.products), selectinload(m.delivery_records.product_variants))
        .order_by(m.delivery_records.delivery_date.desc())
    ).all()

    return ok([
        {
            "id": r.id,
            "date": r.delivery_date,
            "productName": r.products.name,
            "imageUrl": r.products.image_url,
            "size": (r.product_variants.size_label if r.product_variants else None) or r.products.size,
            "quantityOrdered": float(r.quantity_ordered),
            "quantityDelivered": float(r.quantity_delivered),
            "status": r.status,
        }
        for r in records
    ])


@router.post("/subscriptions/{id}/cancel")
@guard("Internal error")
def subscriptions_cancel(id: str, request: Request, body: Body, db: DB):
    customer = current_customer(db, request)
    cancel_reason_id = body.get("cancelReasonId")

    sub = _own_subscription(db, id, customer.id)
    sub.status = "cancelled"
    sub.next_delivery_date = None
    sub.paused_from = None
    sub.paused_until = None
    sub.cancel_reason_id = cancel_reason_id or None
    sub.cancel_note = body.get("cancelNote") or None
    sub.updated_at = m.utcnow()
    db.commit()

    reason_text = ""
    if cancel_reason_id:
        reason = db.get(m.cancel_reasons, cancel_reason_id)
        reason_text = f" Reason: {reason.reason}." if reason else ""

    log_activity(
        db,
        type="subscription",
        subtype="cancel",
        title="Subscription Cancelled",
        message=f"{_display_name(customer)} cancelled their subscription.{reason_text}",
        customer_id=customer.id,
        subscription_id=sub.id,
    )
    return ok({"subscription": sub})


# ---- vacations --------------------------------------------------------------
# "Vacation Mode" pauses every delivery for the customer across a date range —
# distinct from pausing one subscription. It writes the same `vacations` table
# the admin panel manages, so an admin sees and can override it.

def _map_vacation(v) -> dict:
    today = format_date_only(local_today())
    start, end = format_date_only(v.from_date), format_date_only(v.to_date)
    return {
        "id": v.id,
        "fromDate": start,
        "toDate": end,
        "remark": v.remark,
        "isEnded": bool(v.ended_by),
        "isActive": not v.ended_by and start <= today <= end,
        "isUpcoming": not v.ended_by and start > today,
        "createdAt": v.created_at,
    }


@router.get("/vacations")
@guard()
def vacations_index(request: Request, db: DB):
    customer = current_customer(db, request)
    rows = db.scalars(
        select(m.vacations).where(m.vacations.customer_id == customer.id).order_by(m.vacations.from_date.desc()).limit(30)
    ).all()
    mapped = [_map_vacation(v) for v in rows]
    return ok({
        "vacations": mapped,
        "active": next((v for v in mapped if v["isActive"]), None),
        "upcoming": [v for v in mapped if v["isUpcoming"]],
    })


@router.post("/vacations")
@guard()
def vacations_create(request: Request, body: Body, db: DB):
    customer = current_customer(db, request)
    from_raw, to_raw = body.get("fromDate"), body.get("toDate")
    if not truthy(from_raw) or not truthy(to_raw):
        return fail(422, "From Date and To Date are required")

    start, end = try_parse_date_only(from_raw), try_parse_date_only(to_raw)
    if start is None or end is None:
        return fail(422, "Please choose valid dates")
    if start > end:
        return fail(422, "From Date must be on or before To Date")

    # Tomorrow's route may already be locked in — don't let a customer
    # schedule a start date the delivery team can no longer act on.
    _, earliest = get_earliest_effective_date(db)
    if start < earliest:
        return fail(
            422,
            f"The earliest available start date is {format_date_only(earliest)}.",
            "BEFORE_CUTOFF",
            {"earliestEffectiveDate": format_date_only(earliest)},
        )

    # Two vacations can't overlap — the delivery-skip logic keys off date
    # ranges per customer, so overlapping rows would just be confusing.
    overlapping = db.scalar(
        select(m.vacations).where(
            m.vacations.customer_id == customer.id,
            m.vacations.ended_by.is_(None),
            m.vacations.from_date <= end,
            m.vacations.to_date >= start,
        ).limit(1)
    )
    if overlapping is not None:
        return fail(
            422,
            f"This overlaps a vacation already scheduled from {format_date_only(overlapping.from_date)} to {format_date_only(overlapping.to_date)}.",
        )

    now = m.utcnow()
    remark = body.get("remark")
    vacation = m.vacations(
        id=str(uuid.uuid4()),
        customer_id=customer.id,
        from_date=start,
        to_date=end,
        remark=str(remark).strip()[:500] if truthy(remark) else None,
        entry_by="customer",
        created_at=now,
        updated_at=now,
    )
    db.add(vacation)
    db.commit()

    log_activity(
        db,
        type="holiday",
        subtype="vacation_start",
        title="Vacation Scheduled",
        message=f"{_display_name(customer)} scheduled a vacation from {format_date_only(start)} to {format_date_only(end)} via the app.",
        customer_id=customer.id,
        effective_date=start,
        actor="customer",
    )
    return ok(_map_vacation(vacation), status=201)


@router.post("/vacations/{id}/cancel")
@guard()
def vacations_cancel(id: str, request: Request, db: DB):
    """Upcoming (not yet started) -> cancelled outright. Already active ->
    shortened to end today, same as the admin's "end early" action."""
    customer = current_customer(db, request)
    vacation = db.get(m.vacations, id)
    if vacation is None or vacation.customer_id != customer.id:
        return fail(404, "Vacation not found")
    if vacation.ended_by:
        return fail(422, "This vacation has already ended")

    today = local_today()
    not_started = vacation.from_date > today
    updated = None
    if not_started:
        # Nothing has happened yet — remove it rather than leaving a
        # zero-length "ended" row behind.
        db.delete(vacation)
    else:
        vacation.to_date = today
        vacation.ended_by = "customer"
        vacation.ended_at = m.utcnow()
        vacation.updated_at = m.utcnow()
        updated = vacation
    db.commit()

    log_activity(
        db,
        type="holiday",
        subtype="vacation_end",
        title="Vacation Cancelled" if not_started else "Vacation Ended Early",
        message=f"{_display_name(customer)} {'cancelled their upcoming' if not_started else 'ended their'} vacation via the app.",
        customer_id=customer.id,
        actor="customer",
    )
    return ok(_map_vacation(updated) if updated else None)


# ---- wallet -----------------------------------------------------------------
# "Pay Online" credits the wallet instantly against a verified Razorpay
# payment. "Request Cash" instead flags that the customer will hand cash to
# the delivery staff — pending (held in reservedBalance) until an admin
# approves it, when it becomes a normal wallet_transactions credit.
ONLINE_TOPUP_MIN, ONLINE_TOPUP_MAX = 1, 30000
CASH_REQUEST_MIN, CASH_REQUEST_MAX = 1, 10000


@router.get("/wallet")
@guard()
def wallet_show(request: Request, db: DB):
    customer = current_customer(db, request)
    balance = _wallet_balance(db, customer.id)
    transactions = db.scalars(
        select(m.wallet_transactions)
        .where(m.wallet_transactions.customer_id == customer.id)
        .order_by(m.wallet_transactions.created_at.desc())
        .limit(50)
    ).all()
    cash_requests = db.scalars(
        select(m.wallet_cash_requests)
        .where(m.wallet_cash_requests.customer_id == customer.id)
        .order_by(m.wallet_cash_requests.created_at.desc())
        .limit(20)
    ).all()

    # Only pending requests hold money aside; once approved the credit shows
    # up as a normal transaction, and once rejected nothing is held.
    reserved = sum(int(r.amount) for r in cash_requests if r.status == "pending")

    mapped_transactions = [
        {
            "id": tx.id,
            "kind": "transaction",
            "type": tx.type,
            "amount": int(tx.amount),
            "balanceAfter": int(tx.balance_after),
            "referenceType": tx.reference_type,
            "referenceId": tx.reference_id,
            "notes": tx.notes,
            "status": "completed",
            "createdAt": tx.created_at,
        }
        for tx in transactions
    ]
    # An approved request already has its own wallet_transactions row
    # (reference_type "topup_cash") — listing it again would duplicate it.
    mapped_cash = [
        {
            "id": r.id,
            "kind": "cash_request",
            "type": "credit",
            "amount": int(r.amount),
            "balanceAfter": None,
            "referenceType": "cash_request",
            "referenceId": None,
            "notes": (r.notes or "Cash request was declined")
            if r.status == "rejected"
            else f"Cash pickup requested for {format_date_only(r.requested_date)}",
            "status": r.status,
            "createdAt": r.created_at,
        }
        for r in cash_requests
        if r.status != "approved"
    ]
    history = sorted(
        mapped_transactions + mapped_cash,
        key=lambda e: e["createdAt"].timestamp() if e["createdAt"] else 0,
        reverse=True,
    )

    return ok({
        "balance": balance,
        "reservedBalance": reserved,
        "transactions": mapped_transactions,
        "cashRequests": mapped_cash,
        "history": history,
        "limits": {
            "online": {"min": ONLINE_TOPUP_MIN, "max": ONLINE_TOPUP_MAX},
            "cash": {"min": CASH_REQUEST_MIN, "max": CASH_REQUEST_MAX},
        },
    })


@router.post("/wallet/topup")
@guard("Unable to top up wallet", status=422, error_code="WALLET_ERROR")
def wallet_topup(request: Request, body: Body, db: DB):
    customer = current_customer(db, request)
    amount = body.get("amount")
    order_id, payment_id, signature = body.get("razorpayOrderId"), body.get("razorpayPaymentId"), body.get("razorpaySignature")

    if not amount or not is_number(amount) or amount < ONLINE_TOPUP_MIN or amount > ONLINE_TOPUP_MAX:
        return fail(422, f"Amount must be between {ONLINE_TOPUP_MIN} and {ONLINE_TOPUP_MAX}")

    # A top-up may only credit the wallet against a payment Razorpay actually
    # signed — otherwise anyone logged in could hand themselves free balance.
    if not razorpay.is_configured():
        return fail(503, "Online payment is not available right now", "RAZORPAY_NOT_CONFIGURED")
    if not razorpay.verify_signature(order_id, payment_id, signature):
        return fail(422, "Payment could not be verified", "PAYMENT_VERIFICATION_FAILED")
    # Signature alone only proves the payload was signed — also confirm the
    # money was actually collected before crediting.
    if not razorpay.is_payment_captured(payment_id):
        return fail(422, "Payment has not been completed", "PAYMENT_NOT_CAPTURED")

    # Trust Razorpay's amount, never the client's.
    paid_order = razorpay.fetch_order(order_id)
    if paid_order is None:
        return fail(422, "Payment could not be verified", "PAYMENT_NOT_FOUND")
    if js_round(js_number(paid_order.get("amount"))) / 100 != amount:
        return fail(422, "Paid amount does not match the requested top-up", "AMOUNT_MISMATCH")

    # Guard against the same payment being submitted twice.
    already = db.scalar(
        select(m.wallet_transactions.id).where(
            m.wallet_transactions.customer_id == customer.id, m.wallet_transactions.reference_id == payment_id
        ).limit(1)
    )
    if already is not None:
        return ok({"balance": _wallet_balance(db, customer.id), "alreadyCredited": True})

    now = m.utcnow()
    wallet = db.scalar(
        select(m.customer_wallets).where(m.customer_wallets.customer_id == customer.id).with_for_update()
    )
    if wallet is None:
        wallet = m.customer_wallets(id=str(uuid.uuid4()), customer_id=customer.id, balance=0, created_at=now, updated_at=now)
        db.add(wallet)
        db.flush()
    new_balance = int(wallet.balance) + amount
    wallet.balance = new_balance
    wallet.updated_at = now
    db.add(m.wallet_transactions(
        id=str(uuid.uuid4()),
        customer_id=customer.id,
        type="credit",
        amount=amount,
        balance_after=new_balance,
        reference_type="topup_online",
        reference_id=payment_id,
        created_at=now,
        updated_at=now,
    ))
    db.commit()

    log_activity(
        db,
        type="wallet",
        title="Wallet Credited",
        message=f"{_display_name(customer)} added ₹{amount} into the wallet.",
        customer_id=customer.id,
    )
    return ok({"balance": new_balance})


EMAIL_RE = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]+$")


@router.post("/wallet/cash-request")
@guard("Unable to submit your request")
def wallet_cash_request(request: Request, body: Body, db: DB):
    """"Request Cash" — flags that the customer will hand cash to the delivery
    staff. Nothing is credited until an admin approves it."""
    customer = current_customer(db, request)
    amount = body.get("amount")
    if not amount or not is_number(amount) or amount < CASH_REQUEST_MIN or amount > CASH_REQUEST_MAX:
        return fail(422, f"Amount must be between {CASH_REQUEST_MIN} and {CASH_REQUEST_MAX}")

    parsed = js_date(body.get("requestedDate"))
    if parsed is None:
        return fail(422, "Please choose a valid date")
    # A pickup can't be requested for a day that has already passed.
    if parsed.date() < local_today():
        return fail(422, "Pickup date cannot be in the past")

    email = body.get("email")
    trimmed_email = email.strip() if isinstance(email, str) else ""
    if trimmed_email and not EMAIL_RE.match(trimmed_email):
        return fail(422, "Please enter a valid email")

    now = m.utcnow()
    db.add(m.wallet_cash_requests(
        id=str(uuid.uuid4()),
        customer_id=customer.id,
        amount=js_round(amount),
        requested_date=parsed.date(),
        email=trimmed_email or None,
        status="pending",
        created_at=now,
        updated_at=now,
    ))
    db.commit()

    log_activity(
        db,
        type="wallet",
        title="Cash Pickup Requested",
        message=f"{_display_name(customer)} requested a ₹{amount} cash pickup for the wallet.",
        customer_id=customer.id,
    )
    return respond({"success": True, "message": "Your cash request has been sent for approval."})


# ---- addresses --------------------------------------------------------------

def _compose_address(a) -> str:
    parts = [a.flat_no, a.society_name, a.street_name, a.landmark, a.city, a.state, a.pincode]
    return ", ".join(str(p) for p in parts if p and str(p).strip())


def _map_address(a) -> dict:
    return {
        "id": a.id,
        "title": a.title,
        "flatNo": a.flat_no or "",
        "societyName": a.society_name or "",
        "streetName": a.street_name or "",
        "landmark": a.landmark or "",
        "city": a.city or "",
        "state": a.state or "",
        "pincode": a.pincode or "",
        "address": _compose_address(a),
        "isDefault": a.is_default,
    }


def _sync_default_address(db: Session, customer_id: str) -> None:
    """Mirrors the default address onto the customer row (what checkout and
    the admin panel read)."""
    db.flush()
    default = db.scalar(
        select(m.customer_addresses).where(
            m.customer_addresses.customer_id == customer_id, m.customer_addresses.is_default.is_(True)
        ).limit(1)
    )
    customer = db.get(m.customers, customer_id)
    fields = ("flat_no", "society_name", "street_name", "landmark", "city", "state", "pincode")
    for field in fields:
        setattr(customer, field, getattr(default, field) if default else None)
    customer.address = _compose_address(default) if default else None


def _owned_address(db: Session, address_id: str, customer_id: str):
    address = db.get(m.customer_addresses, address_id)
    if address is None or address.customer_id != customer_id:
        raise Abort(fail(404, "Address not found"))
    return address


@router.get("/addresses")
@guard()
def addresses_index(request: Request, db: DB):
    customer = current_customer(db, request)
    rows = db.scalars(
        select(m.customer_addresses)
        .where(m.customer_addresses.customer_id == customer.id)
        .order_by(m.customer_addresses.is_default.desc(), m.customer_addresses.created_at.asc())
    ).all()
    return ok([_map_address(a) for a in rows])


@router.post("/addresses")
@guard()
def addresses_create(request: Request, body: Body, db: DB):
    customer = current_customer(db, request)
    clean_pincode = re.sub(r"\D+", "", str(body.get("pincode") or ""))
    if len(clean_pincode) != 6:
        return fail(422, "A valid 6-digit pincode is required")
    if not truthy(body.get("flatNo")) and not truthy(body.get("streetName")):
        return fail(422, "Flat/House No. and Street/Area are required")

    existing_count = db.scalar(
        select(func.count()).select_from(m.customer_addresses).where(m.customer_addresses.customer_id == customer.id)
    )
    # The very first address is always the default — there's no meaningful
    # "non-default" state when it's the only one saved.
    make_default = existing_count == 0 or body.get("isDefault") is True

    now = m.utcnow()
    if make_default:
        db.execute(
            update(m.customer_addresses).where(m.customer_addresses.customer_id == customer.id).values(is_default=False)
        )
    address = m.customer_addresses(
        id=str(uuid.uuid4()),
        customer_id=customer.id,
        title=str(body.get("title") or "Home").strip(),
        flat_no=body.get("flatNo") or None,
        society_name=body.get("societyName") or None,
        street_name=body.get("streetName") or None,
        landmark=body.get("landmark") or None,
        city=body.get("city") or None,
        state=body.get("state") or None,
        pincode=clean_pincode,
        is_default=make_default,
        created_at=now,
        updated_at=now,
    )
    db.add(address)
    _sync_default_address(db, customer.id)
    db.commit()
    return ok(_map_address(address), status=201)


@router.patch("/addresses/{id}")
@guard()
def addresses_update(id: str, request: Request, body: Body, db: DB):
    customer = current_customer(db, request)
    address = _owned_address(db, id, customer.id)

    if "pincode" in body:
        clean_pincode = re.sub(r"\D+", "", str(body.get("pincode")))
        if len(clean_pincode) != 6:
            return fail(422, "A valid 6-digit pincode is required")
        address.pincode = clean_pincode
    if "title" in body:
        address.title = str(body["title"]).strip()
    for key, column in (
        ("flatNo", "flat_no"), ("societyName", "society_name"), ("streetName", "street_name"),
        ("landmark", "landmark"), ("city", "city"), ("state", "state"),
    ):
        if key in body:
            setattr(address, column, body[key] or None)
    address.updated_at = m.utcnow()

    if address.is_default:
        _sync_default_address(db, customer.id)
    db.commit()
    return ok(_map_address(address))


@router.delete("/addresses/{id}")
@guard()
def addresses_destroy(id: str, request: Request, db: DB):
    customer = current_customer(db, request)
    address = _owned_address(db, id, customer.id)
    was_default = address.is_default
    db.delete(address)
    db.flush()

    # Deleting the default address promotes the most recent remaining one, so
    # checkout always has an address to fall back on when one exists.
    if was_default:
        nxt = db.scalar(
            select(m.customer_addresses)
            .where(m.customer_addresses.customer_id == customer.id)
            .order_by(m.customer_addresses.created_at.desc())
            .limit(1)
        )
        if nxt is not None:
            nxt.is_default = True
        _sync_default_address(db, customer.id)
    db.commit()
    return ok({})


@router.patch("/addresses/{id}/default")
@guard()
def addresses_set_default(id: str, request: Request, db: DB):
    customer = current_customer(db, request)
    address = _owned_address(db, id, customer.id)
    db.execute(update(m.customer_addresses).where(m.customer_addresses.customer_id == customer.id).values(is_default=False))
    db.refresh(address)
    address.is_default = True
    address.updated_at = m.utcnow()
    _sync_default_address(db, customer.id)
    db.commit()
    return ok({})


# ---- notifications ----------------------------------------------------------

@router.get("/notifications")
@guard()
def notifications_index(request: Request, db: DB):
    customer = current_customer(db, request)
    rows = db.scalars(
        select(m.notification_recipients)
        .where(m.notification_recipients.customer_id == customer.id)
        .options(selectinload(m.notification_recipients.notifications))
        .order_by(m.notification_recipients.created_at.desc())
        .limit(50)
    ).all()
    return ok([
        {
            "id": r.id,
            "title": r.notifications.title,
            "message": r.notifications.message,
            "isRead": r.is_read,
            "readAt": r.read_at,
            "createdAt": r.created_at,
        }
        for r in rows
    ])


@router.get("/notifications/unread-count")
@guard()
def notifications_unread_count(request: Request, db: DB):
    customer = current_customer(db, request)
    count = db.scalar(
        select(func.count()).select_from(m.notification_recipients).where(
            m.notification_recipients.customer_id == customer.id, m.notification_recipients.is_read.is_(False)
        )
    )
    return ok({"count": count})


@router.patch("/notifications/read-all")
@guard()
def notifications_read_all(request: Request, db: DB):
    customer = current_customer(db, request)
    db.execute(
        update(m.notification_recipients)
        .where(m.notification_recipients.customer_id == customer.id, m.notification_recipients.is_read.is_(False))
        .values(is_read=True, read_at=m.utcnow())
    )
    db.commit()
    return ok({"updated": True})


@router.patch("/notifications/{id}/read")
@guard()
def notifications_read(id: str, request: Request, db: DB):
    customer = current_customer(db, request)
    recipient = db.get(m.notification_recipients, id)
    if recipient is None or recipient.customer_id != customer.id:
        return fail(404, "Notification not found")
    recipient.is_read = True
    recipient.read_at = m.utcnow()
    db.commit()
    return ok({"id": recipient.id, "isRead": recipient.is_read})


# ---- billing, referrals, feedback -------------------------------------------

@router.get("/billing")
@guard()
def billing_index(request: Request, db: DB):
    """"Billing History" screen — postpaid customers' periodic bills."""
    customer = current_customer(db, request)
    bills = db.scalars(
        select(m.customer_billings)
        .where(m.customer_billings.customer_id == customer.id)
        .order_by(m.customer_billings.from_date.desc())
    ).all()
    return ok([
        {
            "id": b.id,
            "billAmount": b.bill_amount,
            "paidAmount": b.paid_amount,
            "remainingAmount": b.remaining_amount,
            "fromDate": b.from_date,
            "toDate": b.to_date,
            "status": b.status,
            "createdAt": b.created_at,
        }
        for b in bills
    ])


DEFAULT_REFERRAL_PLAN = (
    "Invite your friends and family to Shrishti Dairy Farm. When they place their first order "
    "using your referral code, you both earn ₹50 wallet credit."
)


@router.get("/referrals")
@guard()
def referrals_index(request: Request, db: DB):
    customer = current_customer(db, request)
    referrals = db.scalars(
        select(m.referrals)
        .where(m.referrals.referrer_customer_id == customer.id)
        .order_by(m.referrals.created_at.desc())
    ).all()
    setting = db.get(m.site_settings, "referral_plan")

    plan_value = setting.value if setting else None
    if isinstance(plan_value, str):
        plan_text = plan_value
    elif isinstance(plan_value, dict) and plan_value.get("text"):
        plan_text = plan_value["text"]
    else:
        plan_text = DEFAULT_REFERRAL_PLAN

    return ok({
        "referralCode": customer.referral_code,
        "totalReferrals": len(referrals),
        "pendingReferrals": sum(1 for r in referrals if r.status == "pending"),
        "totalEarned": sum(r.reward_amount for r in referrals if r.status == "rewarded"),
        "planText": plan_text,
        "referrals": [
            {
                "id": r.id,
                "phone": r.referred_phone,
                "status": r.status,
                "rewardAmount": r.reward_amount,
                "createdAt": r.created_at,
            }
            for r in referrals
        ],
    })


@router.post("/feedback")
@guard()
def feedback_create(request: Request, body: Body, db: DB):
    customer = current_customer(db, request)
    rating, comment, subject = body.get("rating"), body.get("comment"), body.get("subject")
    feedback_type = "complaint" if body.get("type") == "complaint" else "feedback"

    rating_num = None
    if feedback_type == "feedback":
        rating_num = js_number(rating)
        if not truthy(rating_num) or rating_num < 1 or rating_num > 5:
            return fail(422, "Rating must be between 1 and 5")
        rating_num = int(rating_num)
    elif not truthy(comment) or not str(comment).strip():
        return fail(422, "Please describe your complaint")

    feedback = m.customer_feedback(
        id=str(uuid.uuid4()),
        customer_id=customer.id,
        rating=rating_num,
        comment=comment or None,
        type=feedback_type,
        subject=subject or None,
        created_at=m.utcnow(),
    )
    db.add(feedback)
    db.commit()
    db.refresh(feedback)

    who = _display_name(customer)
    if feedback_type == "complaint":
        message = f"{who} raised a complaint{f' ({subject})' if subject else ''}: {comment}"
    else:
        message = f"{who} rated {rating_num}/5{f': {comment}' if comment else '.'}"
    log_activity(
        db,
        type=feedback_type,
        title="New Complaint" if feedback_type == "complaint" else "New Feedback",
        message=message,
        customer_id=customer.id,
    )
    return ok({"feedback": feedback}, status=201)
