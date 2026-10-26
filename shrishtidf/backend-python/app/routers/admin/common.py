"""Shared bits for the /api/admin routers."""
import time
from datetime import date, datetime
from decimal import Decimal
from typing import Any, Iterable

from fastapi import Depends, Request
from fastapi.responses import Response

from ...core.http import js_int, js_number, query, truthy
from ...core.security import authenticate, require_permission, require_super_admin
from ...core.serialize import decimal_str, iso_date, iso_datetime


def perm(module_key: str, action: str):
    """`user: dict = perm("customers", "view")` — the Express
    `requirePermission(module, action)` middleware as a dependency."""
    return Depends(require_permission(module_key, action))


AuthUser = Depends(authenticate)
SuperAdmin = Depends(require_super_admin)


def paginate(request: Request, default_size: int = 10, max_size: int = 100) -> tuple[int, int]:
    """`page` / `pageSize` query params, clamped the way every admin list did."""
    page = max(1, js_int(query(request, "page") or "1", 1))
    page_size = min(max_size, max(1, js_int(query(request, "pageSize") or str(default_size), default_size)))
    return page, page_size


def total_pages(total: int, page_size: int) -> int:
    return max(1, -(-total // page_size))


def num0(value: Any) -> float:
    """`Number(value || 0)`."""
    return js_number(value) if truthy(value) else 0


def coalesce(*values: Any) -> Any:
    """`a ?? b ?? c`."""
    for value in values:
        if value is not None:
            return value
    return None


def js_str(value: Any) -> str:
    """`String(value)` for the scalar types that end up in CSV cells."""
    if value is None:
        return "null"
    if isinstance(value, bool):
        return "true" if value else "false"
    if isinstance(value, float):
        return str(int(value)) if value.is_integer() else repr(value)
    if isinstance(value, Decimal):
        return decimal_str(value)
    if isinstance(value, datetime):
        return iso_datetime(value)
    if isinstance(value, date):
        return iso_date(value)
    return str(value)


def csv_response(header: list[str], rows: Iterable[list[Any]], filename_prefix: str) -> Response:
    """The quoted-every-cell CSV the admin panel's export buttons download."""
    lines = [header, *rows]
    body = "\n".join(",".join('"' + js_str(v).replace('"', '""') + '"' for v in row) for row in lines)
    filename = f"{filename_prefix}-{int(time.time() * 1000)}.csv"
    return Response(
        content=body.encode("utf-8"),
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
