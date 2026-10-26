"""Request/response plumbing shared by every router.

The Node controllers each wrapped their body in try/catch and answered
`{ success: false, message }` on failure; `guard()` does that here so
handlers can stay focused on the happy path.
"""
import logging
import math
import re
from functools import wraps
from typing import Any
from urllib.parse import parse_qs

from fastapi import Request
from fastapi.responses import HTMLResponse, Response

from .serialize import dumps

logger = logging.getLogger("app")


class ApiResponse(Response):
    media_type = "application/json; charset=utf-8"

    def render(self, content: Any) -> bytes:
        return dumps(content)


def respond(body: Any, status: int = 200, headers: dict | None = None) -> ApiResponse:
    return ApiResponse(content=body, status_code=status, headers=headers)


def ok(data: Any = None, status: int = 200, headers: dict | None = None, **extra) -> ApiResponse:
    body = {"success": True, "data": data}
    body.update(extra)
    return respond(body, status, headers)


def fail(status: int, message: str, error_code: str | None = None, data: Any = None, **extra) -> ApiResponse:
    body: dict = {"success": False}
    if error_code is not None:
        body["errorCode"] = error_code
    body["message"] = message
    if data is not None:
        body["data"] = data
    body.update(extra)
    return respond(body, status)


def fail_nested(status: int, message: str) -> ApiResponse:
    """The older `{ success: false, error: { message } }` shape a few public endpoints use."""
    return respond({"success": False, "error": {"message": message}}, status)


def html(body: str, status: int = 200) -> HTMLResponse:
    return HTMLResponse(content=body, status_code=status)


class ServiceError(Exception):
    """A service-level failure the calling handler maps to a response —
    the Python stand-in for the Node services' `throw new Error('CODE')`."""

    def __init__(self, code: str):
        super().__init__(code)
        self.code = code


class Abort(Exception):
    """Short-circuits a handler with a ready-made response."""

    def __init__(self, response: Response):
        super().__init__("abort")
        self.response = response


def guard(message: str = "Internal Server Error", status: int = 500, error_code: str | None = None, nested: bool = False):
    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            try:
                return fn(*args, **kwargs)
            except Abort as abort:
                return abort.response
            except Exception:
                logger.exception("Unhandled error in %s", fn.__name__)
                if nested:
                    return fail_nested(status, message)
                return fail(status, message, error_code)

        return wrapper

    return decorator


async def json_body(request: Request) -> dict:
    """`req.body` as Express saw it: parsed JSON or urlencoded form, `{}` otherwise."""
    content_type = request.headers.get("content-type", "")
    raw = await request.body()
    if not raw:
        return {}
    if "application/json" in content_type:
        try:
            data = await request.json()
        except Exception:
            raise Abort(fail(400, "Invalid JSON body"))
        return data if isinstance(data, dict) else {}
    if "application/x-www-form-urlencoded" in content_type:
        parsed = parse_qs(raw.decode("utf-8"), keep_blank_values=True)
        return {k: (v[0] if len(v) == 1 else v) for k, v in parsed.items()}
    return {}


def session_id(request: Request) -> str | None:
    return request.headers.get("session-id") or None


def query(request: Request, name: str) -> str | None:
    """A query param as Express exposed it (repeated params collapse to the last value)."""
    values = request.query_params.getlist(name)
    return values[-1] if values else None


# ---- JavaScript semantics the ported code relies on ------------------------

def is_number(value: Any) -> bool:
    """`typeof value === 'number'`."""
    return isinstance(value, (int, float)) and not isinstance(value, bool)


def truthy(value: Any) -> bool:
    """JS truthiness — unlike Python, empty lists/dicts are truthy, NaN is falsy."""
    if value is None or value is False:
        return False
    if isinstance(value, (list, dict)):
        return True
    if isinstance(value, float) and math.isnan(value):
        return False
    return bool(value)


_NUMERIC = re.compile(r"^[+-]?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?$")


def js_number(value: Any) -> float:
    """`Number(value)` — NaN for anything not numeric."""
    if value is None:
        return 0.0
    if isinstance(value, bool):
        return 1.0 if value else 0.0
    if isinstance(value, (int, float)):
        return float(value)
    if isinstance(value, str):
        text = value.strip()
        if text == "":
            return 0.0
        if text.lower().startswith("0x"):
            try:
                return float(int(text, 16))
            except ValueError:
                return math.nan
        if _NUMERIC.match(text):
            return float(text)
        if text in ("Infinity", "+Infinity"):
            return math.inf
        if text == "-Infinity":
            return -math.inf
        return math.nan
    try:
        return float(value)
    except (TypeError, ValueError):
        return math.nan


def num_or(value: Any, default: float = 0) -> float:
    """`Number(value) || default`."""
    n = js_number(value)
    return default if (math.isnan(n) or n == 0) else n


def js_int(value: Any, default: int | None = None) -> int | None:
    """`parseInt(value, 10)`, with `default` standing in for NaN."""
    if is_number(value):
        if isinstance(value, float) and (math.isnan(value) or math.isinf(value)):
            return default
        return int(value)
    match = re.match(r"^\s*([+-]?\d+)", str(value or ""))
    return int(match.group(1)) if match else default


def js_round(value: float) -> int:
    """`Math.round` — rounds .5 up (toward +∞), unlike Python's banker's rounding."""
    return int(math.floor(value + 0.5))


def is_unique_violation(error: BaseException) -> bool:
    """Prisma's P2002 — a unique constraint rejected the write."""
    return getattr(getattr(error, "orig", None), "pgcode", None) == "23505"


def is_fk_violation(error: BaseException) -> bool:
    """Prisma's P2003 — a foreign key constraint rejected the write/delete."""
    return getattr(getattr(error, "orig", None), "pgcode", None) == "23503"


def clean_str(value: Any) -> str:
    return value.strip() if isinstance(value, str) else ""
