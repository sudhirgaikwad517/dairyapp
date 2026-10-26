"""Talks to the real Razorpay Orders API. Everything fails closed: if the keys
aren't configured we never pretend a payment succeeded."""
import hashlib
import hmac
import os
import re

import httpx

from ..core.http import logger

RAZORPAY_API = "https://api.razorpay.com/v1"


class RazorpayError(Exception):
    def __init__(self, code: str):
        super().__init__(code)
        self.code = code


def _key_id() -> str:
    return (os.getenv("RAZORPAY_KEY_ID") or "").strip()


def _key_secret() -> str:
    return (os.getenv("RAZORPAY_KEY_SECRET") or "").strip()


def is_configured() -> bool:
    """True only when both keys look like real Razorpay credentials."""
    key_id, secret = _key_id(), _key_secret()
    if not key_id or not secret:
        return False
    # Reject the placeholder values the repo ships with.
    if not re.match(r"^rzp_(test|live)_[A-Za-z0-9]{8,}$", key_id):
        return False
    if re.match(r"^x+$", secret, re.IGNORECASE):
        return False
    return True


def publishable_key_id() -> str | None:
    return _key_id() if is_configured() else None


def _auth() -> tuple[str, str]:
    return (_key_id(), _key_secret())


def create_order(amount_paise: float, receipt: str, notes: dict | None = None) -> dict:
    """Creates a real order on Razorpay. `amount_paise` must be positive."""
    if not is_configured():
        raise RazorpayError("RAZORPAY_NOT_CONFIGURED")
    response = httpx.post(
        f"{RAZORPAY_API}/orders",
        auth=_auth(),
        json={
            "amount": int(round(amount_paise)),
            "currency": "INR",
            "receipt": receipt,
            "notes": notes or {},
            "payment_capture": 1,
        },
        timeout=20,
    )
    if response.status_code >= 400:
        logger.error("Razorpay createOrder failed: %s %s", response.status_code, response.text)
        raise RazorpayError("RAZORPAY_ORDER_FAILED")
    return response.json()


def fetch_order(order_id: str | None) -> dict | None:
    """Fetches an order back from Razorpay — used to trust the amount, never the client."""
    if not is_configured() or not order_id:
        return None
    response = httpx.get(f"{RAZORPAY_API}/orders/{order_id}", auth=_auth(), timeout=20)
    return response.json() if response.status_code < 400 else None


def verify_signature(order_id, payment_id, signature) -> bool:
    """Confirms Razorpay actually signed this payment. Fails closed."""
    if not is_configured():
        return False
    if not order_id or not payment_id or not signature:
        return False
    expected = hmac.new(_key_secret().encode(), f"{order_id}|{payment_id}".encode(), hashlib.sha256).hexdigest()
    # Constant-time compare to avoid leaking the signature byte by byte.
    return hmac.compare_digest(expected.encode(), str(signature).encode())


def is_payment_captured(payment_id) -> bool:
    """A payment is only "captured/paid" if Razorpay says so."""
    if not is_configured() or not payment_id:
        return False
    response = httpx.get(f"{RAZORPAY_API}/payments/{payment_id}", auth=_auth(), timeout=20)
    if response.status_code >= 400:
        return False
    return response.json().get("status") in ("captured", "authorized")
