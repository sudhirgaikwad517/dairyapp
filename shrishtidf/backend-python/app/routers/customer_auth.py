"""/api/v1/auth — customer OTP / password login and profile."""
import uuid

from fastapi import APIRouter, Depends, Request
from fastapi.responses import Response

from ..core.deps import DB, Body, current_customer
from ..core.http import ServiceError, fail, guard, logger, ok, session_id
from ..core.security import otp_send_limiter, otp_verify_limiter
from ..services import customer_auth as auth_service

router = APIRouter(prefix="/auth")

SESSION_COOKIE_MAX_AGE = 30 * 24 * 60 * 60


@router.post("/otp/send", dependencies=[Depends(otp_send_limiter)])
def send_otp(body: Body, db: DB):
    phone = body.get("phone")
    if not phone or not isinstance(phone, str) or len(phone) > 20:
        return fail(422, "Invalid phone number")
    try:
        return ok(auth_service.send_otp(db, phone))
    except ServiceError as e:
        if e.code == "INVALID_PHONE":
            return fail(422, "Enter a valid 10-digit mobile number", "INVALID_PHONE")
        raise
    except Exception:
        logger.exception("send_otp failed")
        return fail(500, "Unable to send OTP", "OTP_ERROR")


@router.post("/otp/verify", dependencies=[Depends(otp_verify_limiter)])
def verify_otp(request: Request, body: Body, db: DB):
    sid = session_id(request)
    phone, otp = body.get("phone"), body.get("otp")
    if (
        not phone or not isinstance(phone, str) or len(phone) > 20
        or not otp or not isinstance(otp, str) or len(otp) != 6
    ):
        return fail(422, "Invalid request data")
    if not sid:
        return fail(401, "Missing session ID")
    try:
        return ok(auth_service.verify_otp(db, phone, otp, sid))
    except ServiceError as e:
        if e.code == "INVALID_OTP":
            return fail(422, "Invalid or expired OTP", "INVALID_OTP")
        logger.exception("verify_otp failed")
        return fail(500, "Unable to verify OTP", "AUTH_ERROR")
    except Exception:
        logger.exception("verify_otp failed")
        return fail(500, "Unable to verify OTP", "AUTH_ERROR")


def _session_or_new(request: Request) -> tuple[str, bool]:
    sid = session_id(request)
    return (sid, False) if sid else (str(uuid.uuid4()), True)


def _with_session_cookie(response: Response, sid: str, is_new: bool) -> Response:
    if is_new:
        response.set_cookie("session_id", sid, httponly=True, max_age=SESSION_COOKIE_MAX_AGE, path="/")
    return response


@router.post("/login", dependencies=[Depends(otp_verify_limiter)])
def login_with_password(request: Request, body: Body, db: DB):
    sid, is_new = _session_or_new(request)
    phone_or_email, password = body.get("phoneOrEmail"), body.get("password")
    if not phone_or_email or not isinstance(phone_or_email, str) or not password or not isinstance(password, str):
        return fail(422, "Invalid request data. phoneOrEmail and password are required.")
    try:
        result = auth_service.login_with_password(db, phone_or_email, password, sid)
        return _with_session_cookie(ok({**result, "sessionId": sid}), sid, is_new)
    except ServiceError as e:
        if e.code == "INVALID_CREDENTIALS":
            return fail(401, "Invalid phone/email or password", "INVALID_CREDENTIALS")
        if e.code == "PASSWORD_NOT_SET":
            return fail(
                401,
                "Password is not set for this account. Please login with OTP and set a password in your profile.",
                "PASSWORD_NOT_SET",
            )
        logger.exception("login failed")
        return fail(500, "Unable to login", "AUTH_ERROR")
    except Exception:
        logger.exception("login failed")
        return fail(500, "Unable to login", "AUTH_ERROR")


@router.post("/signup", dependencies=[Depends(otp_verify_limiter)])
def sign_up(request: Request, body: Body, db: DB):
    sid, is_new = _session_or_new(request)
    name, phone, password = body.get("name"), body.get("phone"), body.get("password")
    if (
        not name or not isinstance(name, str)
        or not phone or not isinstance(phone, str)
        or not password or not isinstance(password, str)
    ):
        return fail(422, "Invalid request data. Name, phone, and password are required.")
    try:
        result = auth_service.sign_up_with_password(db, name, phone, password, sid)
        return _with_session_cookie(ok({**result, "sessionId": sid}), sid, is_new)
    except ServiceError as e:
        if e.code == "ALREADY_REGISTERED":
            return fail(409, "An account with this phone number already exists. Please login instead.", "ALREADY_REGISTERED")
        if e.code == "INVALID_PHONE":
            return fail(422, "Enter a valid mobile number", "INVALID_PHONE")
        logger.exception("signup failed")
        return fail(500, "Unable to sign up", "AUTH_ERROR")
    except Exception:
        logger.exception("signup failed")
        return fail(500, "Unable to sign up", "AUTH_ERROR")


@router.get("/me")
@guard()
def me(request: Request, db: DB):
    customer = current_customer(db, request)
    mapped = auth_service.map_customer(customer)
    return ok({"customer": mapped, "orders": auth_service.orders_for_customer(db, mapped["phone"])})


@router.patch("/profile")
@guard()
def update_profile(request: Request, body: Body, db: DB):
    customer = current_customer(db, request)
    return ok({"customer": auth_service.update_profile(db, customer, body)})


@router.post("/logout")
@guard()
def logout(request: Request, db: DB):
    sid = session_id(request)
    if sid:
        auth_service.logout(db, sid)
    return ok({"loggedOut": True})
