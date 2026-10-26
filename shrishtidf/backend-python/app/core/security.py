"""Auth for the admin panel, office staff and delivery app, plus rate limits.

Tokens are HS256 JWTs signed with the same JWT_SECRET and payload shape the
Node backend issued, so sessions created before the switch keep working.
"""
import threading
import time
import uuid
from datetime import timedelta

import bcrypt
import jwt
from fastapi import Depends, Request
from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from .. import models as m
from ..config import JWT_SECRET
from ..db import get_db
from .access_control import ALL_MODULE_KEYS
from .http import Abort, fail, logger

TOKEN_TTL_SECONDS = 7 * 24 * 60 * 60


# ---- passwords --------------------------------------------------------------

def _pw_bytes(password: str) -> bytes:
    # bcrypt only ever looks at the first 72 bytes (bcryptjs silently
    # truncates too); newer pyca/bcrypt raises instead, so truncate here.
    return str(password).encode("utf-8")[:72]


def hash_password(password: str) -> str:
    return bcrypt.hashpw(_pw_bytes(password), bcrypt.gensalt(rounds=10)).decode("utf-8")


def check_password(password: str, hashed: str | None) -> bool:
    if not hashed:
        return False
    try:
        return bcrypt.checkpw(_pw_bytes(password), hashed.encode("utf-8"))
    except ValueError:
        return False


# ---- tokens -----------------------------------------------------------------

def _sign(payload: dict) -> str:
    now = int(time.time())
    return jwt.encode({**payload, "iat": now, "exp": now + TOKEN_TTL_SECONDS}, JWT_SECRET, algorithm="HS256")


def sign_admin_token(admin_id: str, email: str) -> str:
    return _sign({"type": "admin", "id": admin_id, "email": email, "jti": str(uuid.uuid4())})


def sign_staff_token(office_staff_id: str, staff_type_id: str, name: str) -> str:
    return _sign({
        "type": "staff",
        "officeStaffId": office_staff_id,
        "staffTypeId": staff_type_id,
        "name": name,
        "jti": str(uuid.uuid4()),
    })


def sign_delivery_boy_token(delivery_boy_id: str, phone: str) -> str:
    return _sign({"type": "delivery_boy", "id": delivery_boy_id, "phone": phone, "jti": str(uuid.uuid4())})


def revoke_token(db: Session, jti: str | None) -> None:
    """Invalidates a token immediately, independent of its 7-day expiry — called on logout."""
    if not jti:
        return
    if db.get(m.revoked_admin_tokens, jti) is None:
        db.add(m.revoked_admin_tokens(jti=jti, expires_at=m.utcnow() + timedelta(seconds=TOKEN_TTL_SECONDS)))
    db.commit()
    # Best-effort garbage collection so this table doesn't grow forever —
    # piggybacks on a revoke call rather than needing a separate cron job.
    try:
        db.execute(delete(m.revoked_admin_tokens).where(m.revoked_admin_tokens.expires_at < m.utcnow()))
        db.commit()
    except Exception:
        db.rollback()


def _bearer(request: Request) -> str | None:
    header = request.headers.get("authorization") or ""
    return header[len("Bearer "):] if header.startswith("Bearer ") else None


def _is_revoked(db: Session, jti: str | None) -> bool:
    return bool(jti) and db.scalar(select(m.revoked_admin_tokens.jti).where(m.revoked_admin_tokens.jti == jti)) is not None


def _unauthenticated(message: str) -> Abort:
    return Abort(fail(401, message, "UNAUTHENTICATED"))


# ---- admin / staff ----------------------------------------------------------

def authenticate(request: Request, db: Session = Depends(get_db)) -> dict:
    token = _bearer(request)
    if not token:
        raise _unauthenticated("Login required")
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
    except Exception:
        raise _unauthenticated("Session expired — please log in again")
    if not isinstance(payload, dict) or payload.get("type") not in ("admin", "staff"):
        raise _unauthenticated("Invalid session — please log in again")
    if _is_revoked(db, payload.get("jti")):
        raise _unauthenticated("Session has been logged out — please log in again")
    return payload


_PERMISSION_COLUMNS = {
    "view": "can_view",
    "create": "can_create",
    "update": "can_update",
    "pdf": "can_pdf",
    "excel": "can_excel",
}


def require_permission(module_key: str, action: str):
    """Gates a route behind a specific module + action permission.
    Super-admin (type: 'admin') always passes. A staff user must have an
    access_controls row with the matching permission column set to true."""
    if module_key not in ALL_MODULE_KEYS:
        raise RuntimeError(f'require_permission: unknown module key "{module_key}"')
    column = _PERMISSION_COLUMNS[action]

    def dependency(user: dict = Depends(authenticate), db: Session = Depends(get_db)) -> dict:
        if user.get("type") == "admin":
            return user
        try:
            access_control = db.scalar(
                select(m.access_controls).where(m.access_controls.office_staff_id == user.get("officeStaffId"))
            )
            if access_control is None:
                raise Abort(fail(403, "You do not have access to this module. Contact your admin.", "FORBIDDEN"))
            permission = db.scalar(
                select(m.access_control_permissions).where(
                    m.access_control_permissions.access_control_id == access_control.id,
                    m.access_control_permissions.module_key == module_key,
                )
            )
            if not (permission and getattr(permission, column)):
                raise Abort(fail(403, "You do not have permission to perform this action.", "FORBIDDEN"))
            return user
        except Abort:
            raise
        except Exception:
            logger.exception("Permission check failed")
            raise Abort(fail(500, "Server Error"))

    return dependency


def require_super_admin(user: dict = Depends(authenticate)) -> dict:
    """Super-admin only — used for the access-control module itself, so no
    staff permission can ever grant themselves more access."""
    if user.get("type") != "admin":
        raise Abort(fail(403, "Only a super-admin can manage user access control.", "FORBIDDEN"))
    return user


def actor_name(user: dict | None) -> str:
    """Who to record in `*_by` audit columns."""
    if not user:
        return "admin"
    if user.get("type") == "admin":
        return user.get("email") or "admin"
    return user.get("name") or "staff"


# ---- delivery boy -----------------------------------------------------------

def authenticate_delivery_boy(request: Request, db: Session = Depends(get_db)) -> dict:
    token = _bearer(request)
    if not token:
        raise _unauthenticated("Login required")
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
    except Exception:
        raise _unauthenticated("Session expired")
    if not isinstance(payload, dict) or payload.get("type") != "delivery_boy":
        raise _unauthenticated("Invalid session")
    if _is_revoked(db, payload.get("jti")):
        raise _unauthenticated("Session logged out")
    return payload


# ---- rate limiting ----------------------------------------------------------

class RateLimiter:
    """Fixed-window, per-IP, in-process limiter — the same model as
    express-rate-limit's default memory store."""

    def __init__(self, limit: int, window_seconds: int, message: str):
        self.limit = limit
        self.window = window_seconds
        self.message = message
        self._hits: dict[str, tuple[float, int]] = {}
        self._lock = threading.Lock()

    def __call__(self, request: Request) -> None:
        key = request.client.host if request.client else "unknown"
        now = time.monotonic()
        with self._lock:
            started, count = self._hits.get(key, (now, 0))
            if now - started >= self.window:
                started, count = now, 0
            count += 1
            self._hits[key] = (started, count)
            if len(self._hits) > 10000:
                self._hits = {k: v for k, v in self._hits.items() if now - v[0] < self.window}
        if count > self.limit:
            raise Abort(fail(429, self.message, "TOO_MANY_REQUESTS"))


# A phone number can only trigger so many OTPs before it's spam, and an
# attacker guessing a 6-digit OTP needs far more than a handful of tries —
# both are capped per IP so one abusive client can't hammer the endpoint.
otp_send_limiter = RateLimiter(5, 15 * 60, "Too many OTP requests. Please try again in a few minutes.")
otp_verify_limiter = RateLimiter(10, 15 * 60, "Too many attempts. Please try again in a few minutes.")
# Admin/staff login — slows down credential stuffing without getting in the
# way of a real admin who mistypes a password a couple of times.
login_limiter = RateLimiter(10, 15 * 60, "Too many login attempts. Please try again in a few minutes.")
