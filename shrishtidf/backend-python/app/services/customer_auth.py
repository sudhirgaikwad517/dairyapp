"""Customer (app/website) login: OTP, password, and DB-backed sessions.

OTPs and sessions live in the database (customer_otps / customer_sessions)
rather than process memory, so a restart or deploy doesn't invalidate a
pending login or sign every customer out.
"""
import random
import re
import secrets
import uuid
from datetime import timedelta

from sqlalchemy import delete, func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, selectinload

from .. import models as m
from ..config import IS_PRODUCTION
from ..core.http import ServiceError
from ..core.security import check_password, hash_password
from .activity_log import log_activity
from .customer_code import next_customer_code

OTP_TTL_SECONDS = 300
AUTH_TTL_SECONDS = 60 * 60 * 24 * 30

PROFILE_FIELDS = [
    "name", "email", "flatNo", "societyName", "streetName",
    "landmark", "city", "state", "pincode", "gstNumber", "deliveryMode", "password",
]
PROFILE_COLUMNS = {
    "flatNo": "flat_no",
    "societyName": "society_name",
    "streetName": "street_name",
    "gstNumber": "gst_number",
    "deliveryMode": "delivery_mode",
}


def normalize_phone(phone: str) -> str:
    return re.sub(r"\D+", "", phone or "")


def _customer_query():
    return select(m.customers).options(selectinload(m.customers.hubs), selectinload(m.customers.delivery_boys))


def send_otp(db: Session, phone: str) -> dict:
    phone = normalize_phone(phone)
    if len(phone) < 10:
        raise ServiceError("INVALID_PHONE")

    otp = str(secrets.randbelow(900000) + 100000)
    now = m.utcnow()
    expires_at = now + timedelta(seconds=OTP_TTL_SECONDS)

    row = db.scalar(select(m.customer_otps).where(m.customer_otps.phone == phone))
    if row:
        row.otp, row.expires_at, row.created_at = otp, expires_at, now
    else:
        db.add(m.customer_otps(id=str(uuid.uuid4()), phone=phone, otp=otp, expires_at=expires_at, created_at=now))
    db.commit()

    payload = {"phone": phone, "expiresIn": OTP_TTL_SECONDS}
    # Only ever handed back outside production — returning the real OTP in
    # the API response is a full auth bypass if this ever reaches prod.
    if not IS_PRODUCTION:
        payload["debugOtp"] = otp
    return payload


def verify_otp(db: Session, phone: str, otp: str, session_id: str) -> dict:
    phone = normalize_phone(phone)
    pending = db.scalar(select(m.customer_otps).where(m.customer_otps.phone == phone))
    is_valid = pending is not None and pending.expires_at > m.utcnow() and pending.otp == otp.strip()
    if not is_valid:
        raise ServiceError("INVALID_OTP")

    # One-time use.
    db.execute(delete(m.customer_otps).where(m.customer_otps.phone == phone))
    db.commit()

    customer = db.scalar(_customer_query().where(m.customers.phone == phone))
    is_new_user = False
    if customer is None:
        is_new_user = True
        customer = m.customers(
            id=str(uuid.uuid4()),
            code=next_customer_code(db),
            phone=phone,
            orders_count=0,
            leads_count=0,
            registered_by="customer",
        )
        db.add(customer)
        db.commit()
        log_activity(
            db,
            type="customer_registered",
            title="New Customer Registered",
            message=f"A new customer registered with phone {phone}.",
            customer_id=customer.id,
        )

    return _sign_in(db, customer, session_id, is_new_user=is_new_user or not customer.name)


def _sign_in(db: Session, customer: "m.customers", session_id: str, is_new_user: bool) -> dict:
    """Stamps last_seen_at and opens the session. The response carries the
    profile as it was read *before* this login (previous lastSeenAt), as the
    Node version did."""
    previous_last_seen = customer.last_seen_at
    customer.last_seen_at = m.utcnow()
    db.commit()

    _store_session(db, session_id, customer.id)
    _ensure_referral_code(db, customer)
    mapped = map_customer(customer)
    mapped["lastSeenAt"] = previous_last_seen
    # A customer created just now, or one who never completed their profile (no name yet),
    # should be treated as "new" so the app can prompt for their name before letting them in.
    return {"customer": mapped, "isNewUser": is_new_user}


def _store_session(db: Session, session_id: str, customer_id: str) -> None:
    now = m.utcnow()
    expires_at = now + timedelta(seconds=AUTH_TTL_SECONDS)
    row = db.scalar(select(m.customer_sessions).where(m.customer_sessions.session_id == session_id))
    if row:
        row.customer_id, row.expires_at, row.last_seen_at = customer_id, expires_at, now
    else:
        db.add(m.customer_sessions(
            id=str(uuid.uuid4()),
            session_id=session_id,
            customer_id=customer_id,
            expires_at=expires_at,
            last_seen_at=now,
            created_at=now,
        ))
    db.commit()


def logout(db: Session, session_id: str) -> None:
    db.execute(delete(m.customer_sessions).where(m.customer_sessions.session_id == session_id))
    db.commit()


def customer_for_session(db: Session, session_id: str | None) -> "m.customers | None":
    if not session_id:
        return None
    session = db.scalar(select(m.customer_sessions).where(m.customer_sessions.session_id == session_id))
    if session is None:
        return None

    now = m.utcnow()
    if session.expires_at <= now:
        db.execute(delete(m.customer_sessions).where(m.customer_sessions.session_id == session_id))
        db.commit()
        return None

    # Slide the expiry so active users stay logged in; best-effort only.
    try:
        session.last_seen_at = now
        session.expires_at = now + timedelta(seconds=AUTH_TTL_SECONDS)
        db.commit()
    except Exception:
        db.rollback()

    customer = db.scalar(_customer_query().where(m.customers.id == session.customer_id))
    if customer is None:
        return None
    _ensure_referral_code(db, customer)
    return customer


def _ensure_referral_code(db: Session, customer: "m.customers") -> None:
    """Older accounts don't have a referral code yet. Generate one lazily on
    first read rather than a one-off backfill, so it's guaranteed to exist
    by the time the profile screen asks for it."""
    if customer.referral_code:
        return
    base = re.sub(r"[^a-zA-Z]", "", customer.name or "CUST").upper().ljust(4, "X")[:4]
    for _ in range(5):
        code = f"{base}{random.randint(10000, 99999)}"[:12]
        try:
            customer.referral_code = code
            db.commit()
            return
        except IntegrityError:
            db.rollback()  # unique clash on referral_code — retry with a new suffix
    db.refresh(customer)


def update_profile(db: Session, customer: "m.customers", body: dict) -> dict:
    data: dict = {}
    for field in PROFILE_FIELDS:
        if field not in body:
            continue
        column = PROFILE_COLUMNS.get(field, field)
        value = body[field]
        if value is None or (isinstance(value, str) and value.strip() == ""):
            data[column] = None
        elif field == "password":
            data[column] = hash_password(value)
        else:
            data[column] = value.strip() if isinstance(value, str) else value

    data["last_seen_at"] = m.utcnow()

    # Same as the old syncFormattedAddress(): rebuilt from whatever address
    # parts this request carried.
    parts = [
        data.get("flat_no") or body.get("flatNo"),
        data.get("society_name") or body.get("societyName"),
        data.get("street_name") or body.get("streetName"),
        data.get("landmark") or body.get("landmark"),
        data.get("city") or body.get("city"),
        data.get("state") or body.get("state"),
        data.get("pincode") or body.get("pincode"),
    ]
    parts = [str(p) for p in parts if p]
    if parts:
        data["address"] = ", ".join(parts)

    for column, value in data.items():
        setattr(customer, column, value)
    db.commit()
    db.refresh(customer)
    return map_customer(customer)


def orders_for_customer(db: Session, phone: str) -> list[dict]:
    rows = db.scalars(
        select(m.orders)
        .options(selectinload(m.orders.order_items))
        .where(m.orders.phone == phone)
        .order_by(m.orders.created_at.desc().nulls_first())
        .limit(20)
    ).all()

    result = []
    for order in rows:
        wallet_amount_used = int(order.wallet_amount_used or 0)
        payable_amount = int(order.total_amount)
        result.append({
            "id": order.id,
            "invoiceNumber": order.invoice_number,
            "status": order.status or "pending",
            "subtotal": int(order.subtotal or 0),
            "deliveryFee": int(order.delivery_fee or 0),
            "walletAmountUsed": wallet_amount_used,
            # What the order was actually worth, before anything was taken from the
            # wallet — otherwise a fully wallet-paid order looks like it cost 0.
            "orderValue": payable_amount + wallet_amount_used,
            "totalAmount": payable_amount,
            "paymentMethod": order.payment_method or "cod",
            "paymentStatus": order.payment_status or "pending",
            "createdAt": order.created_at,
            "itemCount": sum(item.quantity for item in order.order_items),
        })
    return result


def login_with_password(db: Session, phone_or_email: str, password: str, session_id: str) -> dict:
    phone_or_email = phone_or_email.strip()
    # A phone typed or autofilled as "+91 98765 43210" is still a phone; match its last
    # 10 digits so a number saved with or without the 91 prefix both log in.
    is_phone = "@" not in phone_or_email and len(normalize_phone(phone_or_email)) >= 10
    if is_phone:
        last10 = normalize_phone(phone_or_email)[-10:]
        stored = func.right(func.regexp_replace(m.customers.phone, r"\D", "", "g"), 10)
        customer = db.scalar(_customer_query().where(stored == last10).order_by(m.customers.password.is_(None), m.customers.created_at).limit(1))
    else:
        customer = db.scalar(
            _customer_query().where(func.lower(m.customers.email) == phone_or_email.lower()).limit(1)
        )

    if customer is None:
        raise ServiceError("INVALID_CREDENTIALS")
    if not customer.password:
        raise ServiceError("PASSWORD_NOT_SET")
    if not check_password(password, customer.password):
        raise ServiceError("INVALID_CREDENTIALS")

    return _sign_in(db, customer, session_id, is_new_user=not customer.name)


def sign_up_with_password(db: Session, name: str, phone: str, password: str, session_id: str) -> dict:
    phone = normalize_phone(phone)
    if len(phone) < 10:
        raise ServiceError("INVALID_PHONE")

    existing = db.scalar(_customer_query().where(m.customers.phone == phone))
    if existing is not None:
        if existing.password:
            raise ServiceError("ALREADY_REGISTERED")
        # An existing OTP-only account: give it the password and name.
        existing.name = name.strip()
        existing.password = hash_password(password)
        existing.last_seen_at = m.utcnow()
        db.commit()
        _store_session(db, session_id, existing.id)
        _ensure_referral_code(db, existing)
        return {"customer": map_customer(existing), "isNewUser": False}

    customer = m.customers(
        id=str(uuid.uuid4()),
        code=next_customer_code(db),
        name=name.strip(),
        phone=phone,
        password=hash_password(password),
        orders_count=0,
        leads_count=0,
        registered_by="customer",
        last_seen_at=m.utcnow(),
    )
    db.add(customer)
    db.commit()

    log_activity(
        db,
        type="customer_registered",
        title="New Customer Registered",
        message=f"A new customer registered with phone {phone} and password.",
        customer_id=customer.id,
    )

    _store_session(db, session_id, customer.id)
    _ensure_referral_code(db, customer)
    return {"customer": map_customer(customer), "isNewUser": True}


def map_customer(customer: "m.customers") -> dict:
    return {
        "id": customer.id,
        "code": customer.code,
        "phone": customer.phone,
        "name": customer.name,
        "email": customer.email,
        "address": customer.address,
        "flatNo": customer.flat_no,
        "societyName": customer.society_name,
        "streetName": customer.street_name,
        "landmark": customer.landmark,
        "city": customer.city,
        "state": customer.state,
        "pincode": customer.pincode,
        "area": customer.area,
        "gstNumber": customer.gst_number,
        "deliveryMode": customer.delivery_mode,
        "referralCode": customer.referral_code,
        "customerType": customer.customer_type or "prepaid",
        "hubName": customer.hubs.name if customer.hubs else None,
        "deliveryBoyName": customer.delivery_boys.name if customer.delivery_boys else None,
        # The phone itself was OTP-verified to sign in, so the account is
        # "verified" by definition — nothing further for the customer to do.
        "isVerified": True,
        "ordersCount": customer.orders_count or 0,
        "leadsCount": customer.leads_count or 0,
        "lastSeenAt": customer.last_seen_at,
    }
