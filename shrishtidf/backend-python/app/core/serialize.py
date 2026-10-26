"""JSON encoding that matches what the Node backend's `res.json()` produced.

Every client (admin panel, website, delivery app, Flutter app) was written
against Prisma + JSON.stringify output, so values are encoded the same way:

- `timestamp` columns  -> "2026-10-26T09:15:00.000Z" (stored as UTC, like Prisma)
- `date` columns       -> "2026-10-26T00:00:00.000Z" (Prisma returns UTC midnight)
- `time` columns       -> "1970-01-01T05:00:00.000Z"
- `numeric` columns    -> "12.5" (Prisma's Decimal serializes as a string)
- whole-number floats  -> 5, never 5.0 (JS has one number type; Dart's
  `as int` would throw on 5.0)
- NaN / Infinity       -> null (what JSON.stringify does)
"""
import json
import math
import uuid
from datetime import date, datetime, time, timezone
from decimal import Decimal
from typing import Any

from sqlalchemy.orm import selectinload


def iso_datetime(value: datetime) -> str:
    if value.tzinfo is not None:
        value = value.astimezone(timezone.utc).replace(tzinfo=None)
    return value.strftime("%Y-%m-%dT%H:%M:%S.") + f"{value.microsecond // 1000:03d}Z"


def iso_date(value: date) -> str:
    return f"{value.isoformat()}T00:00:00.000Z"


def iso_time(value: time) -> str:
    return f"1970-01-01T{value.strftime('%H:%M:%S')}.{value.microsecond // 1000:03d}Z"


def decimal_str(value: Decimal) -> str:
    if not value.is_finite():
        return str(value)
    text = format(value, "f")
    if "." in text:
        text = text.rstrip("0").rstrip(".")
    return "0" if text in ("", "-0") else text


def is_model(obj: Any) -> bool:
    return hasattr(obj, "__table__") and hasattr(obj, "__mapper__")


def to_dict(obj: Any, include: dict | None = None, select: list[str] | None = None) -> dict | None:
    """A model row as Prisma would return it: every scalar column, plus any
    relations named in `include` (Prisma's `include`), or only the columns
    named in `select`.

    `include` values are `True` or a nested spec: `{"include": {...}}` /
    `{"select": [...]}`.
    """
    if obj is None:
        return None
    if select is not None:
        out = {}
        for name in select:
            out[name] = getattr(obj, name)
        return out

    out = {c.key: getattr(obj, c.key) for c in obj.__mapper__.column_attrs}
    for name, spec in (include or {}).items():
        value = getattr(obj, name)
        sub_include = spec.get("include") if isinstance(spec, dict) else None
        sub_select = spec.get("select") if isinstance(spec, dict) else None
        if isinstance(value, list):
            out[name] = [to_dict(v, sub_include, sub_select) for v in value]
        else:
            out[name] = to_dict(value, sub_include, sub_select)
    return out


def eager(model, include: dict, _parent=None) -> list:
    """selectinload() options for an `include` spec, so serializing a list of
    rows doesn't issue one query per row per relation."""
    options = []
    for name, spec in include.items():
        attr = getattr(model, name)
        loader = selectinload(attr) if _parent is None else _parent.selectinload(attr)
        options.append(loader)
        if isinstance(spec, dict) and spec.get("include"):
            target = attr.property.mapper.class_
            options.extend(eager(target, spec["include"], loader))
    return options


def jsonable(obj: Any) -> Any:
    if obj is None or isinstance(obj, (str, bool)):
        return obj
    if isinstance(obj, int):
        return obj
    if isinstance(obj, float):
        if math.isnan(obj) or math.isinf(obj):
            return None
        return int(obj) if obj.is_integer() and abs(obj) < 2**53 else obj
    if isinstance(obj, Decimal):
        return decimal_str(obj)
    if isinstance(obj, datetime):
        return iso_datetime(obj)
    if isinstance(obj, date):
        return iso_date(obj)
    if isinstance(obj, time):
        return iso_time(obj)
    if isinstance(obj, uuid.UUID):
        return str(obj)
    if isinstance(obj, dict):
        return {str(k): jsonable(v) for k, v in obj.items()}
    if isinstance(obj, (list, tuple, set)):
        return [jsonable(v) for v in obj]
    if is_model(obj):
        return jsonable(to_dict(obj))
    if hasattr(obj, "_asdict"):  # SQLAlchemy Row
        return jsonable(obj._asdict())
    return str(obj)


def dumps(obj: Any) -> bytes:
    return json.dumps(jsonable(obj), ensure_ascii=False, separators=(",", ":")).encode("utf-8")
