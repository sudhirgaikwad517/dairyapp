"""Every rule that decides what a subscription is allowed to be and what it
costs, in one place — so the endpoint that only quotes a price (for a
Razorpay order) and the endpoint that actually creates the subscription
can never disagree about the amount."""
from dataclasses import dataclass
from datetime import date
from typing import Any

from sqlalchemy.orm import Session

from .. import models as m
from ..core.dates import parse_date_only
from ..core.http import js_number, truthy
from .cutoff import get_earliest_effective_date
from .subscription_lifecycle import SUBSCRIPTION_FREQUENCIES, count_occurrences, day_wise_input


@dataclass
class SubscriptionQuote:
    customer: Any
    product: Any
    variant: Any
    is_prepaid: bool
    frequency: str
    day_wise_days: list[int]
    quantity: int
    effective_start: date
    expires_at: date | None
    # Deliveries in [effective_start, expires_at] — 0 for postpaid (open-ended,
    # nothing to pre-charge) or when no end date was given.
    occurrences: int
    rate: int
    # What a prepaid customer must pay now. Always 0 for postpaid — they're
    # billed per delivery instead, never upfront.
    total_cost: int


@dataclass
class QuoteFailure:
    status: int
    message: str
    error_code: str | None = None
    data: Any = None


def compute_subscription_quote(db: Session, customer_id: str, body: dict) -> SubscriptionQuote | QuoteFailure:
    customer = db.get(m.customers, customer_id)
    if customer is None:
        return QuoteFailure(401, "Not logged in", "UNAUTHORIZED")

    product_id = body.get("productId")
    if not truthy(product_id):
        return QuoteFailure(422, "Product ID required")

    frequency = body.get("frequency") or "daily"
    if frequency not in SUBSCRIPTION_FREQUENCIES:
        return QuoteFailure(422, "Please choose a valid delivery schedule")

    day_wise_days = day_wise_input(body.get("dayWiseDays")) if frequency == "day_wise" else []
    if frequency == "day_wise" and not day_wise_days:
        return QuoteFailure(422, "Choose at least one day for a Day wise plan")

    raw_quantity = js_number(body.get("quantity")) if "quantity" in body else float("nan")
    quantity = int(raw_quantity) if raw_quantity == raw_quantity and raw_quantity > 0 else 1

    variant_id = body.get("variantId")
    product = db.get(m.products, product_id)
    variant = db.get(m.product_variants, variant_id) if truthy(variant_id) else None
    if product is None:
        return QuoteFailure(404, "Product not found")
    if truthy(variant_id) and (variant is None or variant.product_id != product_id):
        return QuoteFailure(422, "Selected packaging does not belong to this product")

    is_prepaid = customer.customer_type == "prepaid"
    if not product.allow_subscription or not (product.prepaid_subscribe if is_prepaid else product.postpaid_subscribe):
        return QuoteFailure(422, f"{product.name} is not available for subscription right now.")
    if variant is not None and variant.stock_quantity <= 0:
        return QuoteFailure(422, f"{product.name} is currently out of stock.")

    # A plan requested before the cut-off starts the very next day; at or
    # after the cut-off, tomorrow's route is already locked in, so the
    # earliest possible start is pushed one day further.
    _, earliest = get_earliest_effective_date(db)
    requested_start = parse_date_only(body["startDate"]) if truthy(body.get("startDate")) else earliest
    effective_start = max(requested_start, earliest)

    expires_at = None
    if truthy(body.get("toDate")):
        expires_at = parse_date_only(body["toDate"])
        if expires_at < effective_start:
            return QuoteFailure(422, "End date must be on or after the start date")

    # Prepaid pays upfront for the whole plan, so we need a known number of
    # deliveries to charge for — postpaid is billed per delivery as it happens.
    if is_prepaid and expires_at is None:
        return QuoteFailure(
            422,
            "Please choose an end date so we can calculate the total for your plan.",
            "END_DATE_REQUIRED",
        )

    occurrences = count_occurrences(effective_start, expires_at, frequency, day_wise_days) if is_prepaid and expires_at else 0
    rate = int(variant.subscription if variant is not None else product.subscription)
    total_cost = rate * quantity * occurrences if is_prepaid else 0

    return SubscriptionQuote(
        customer=customer,
        product=product,
        variant=variant,
        is_prepaid=is_prepaid,
        frequency=frequency,
        day_wise_days=day_wise_days,
        quantity=quantity,
        effective_start=effective_start,
        expires_at=expires_at,
        occurrences=occurrences,
        rate=rate,
        total_cost=total_cost,
    )
