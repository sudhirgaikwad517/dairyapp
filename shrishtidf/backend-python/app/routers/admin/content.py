"""Farm visit requests, content pages, coupons and app images (splash/login)."""
import uuid
from datetime import timedelta
from pathlib import Path

from fastapi import APIRouter, Request
from starlette.datastructures import UploadFile
from sqlalchemy import func, select

from ... import models as m
from ...config import UPLOADS_DIR
from ...core.dates import js_date_to_date, parse_date_only
from ...core.deps import DB, Body
from ...core.http import fail, guard, js_number, logger, ok, query, truthy
from ...routers.catalog import LOGIN_KEY, SPLASH_KEY, resolve_asset_url
from .common import csv_response, num0, paginate, perm, total_pages

router = APIRouter()


# ---- farm visits ------------------------------------------------------------------

def _visit_filters(request: Request) -> list:
    if not query(request, "visitDate"):
        return []
    day = parse_date_only(query(request, "visitDate"))
    return [m.farm_visit_requests.visit_date >= day, m.farm_visit_requests.visit_date < day + timedelta(days=1)]


def _map_visit(r) -> dict:
    return {
        "id": r.id,
        "name": r.name,
        "contactNo": r.contact_no,
        "numberOfPersons": r.number_of_persons,
        "address": r.address,
        "visitDate": r.visit_date,
        "visitTimeSlot": r.visit_time_slot,
        "reply": r.reply,
        "repliedBy": r.replied_by,
        "repliedAt": r.replied_at,
        "createdAt": r.created_at,
    }


@router.get("/farm-visits/export")
@guard("Server Error")
def farm_visits_export(request: Request, db: DB, user: dict = perm("farm_visit", "excel")):
    rows = db.scalars(
        select(m.farm_visit_requests).where(*_visit_filters(request)).order_by(m.farm_visit_requests.created_at.desc())
    ).all()
    return csv_response(
        ["Name", "Contact No", "Number of Persons", "Address", "Visit Date", "Time Slot", "Reply"],
        [
            [
                r.name, r.contact_no, r.number_of_persons, r.address,
                f"{r.visit_date.day}/{r.visit_date.month}/{r.visit_date.year}" if r.visit_date else "",
                r.visit_time_slot, r.reply or "",
            ]
            for r in rows
        ],
        "farm-visit-requests",
    )


@router.patch("/farm-visits/{id}/reply")
@guard("Server Error")
def farm_visits_reply(id: str, body: Body, db: DB, user: dict = perm("farm_visit", "update")):
    reply = body.get("reply")
    if not truthy(reply) or not str(reply).strip():
        return fail(422, "Reply text is required")
    visit = db.get(m.farm_visit_requests, id)
    if visit is None:
        return fail(404, "Farm visit request not found")
    now = m.utcnow()
    visit.reply = str(reply).strip()
    visit.replied_by = "Admin"
    visit.replied_at = now
    visit.updated_at = now
    db.commit()
    return ok(_map_visit(visit))


@router.get("/farm-visits")
@guard("Server Error")
def farm_visits_index(request: Request, db: DB, user: dict = perm("farm_visit", "view")):
    page, page_size = paginate(request)
    conditions = _visit_filters(request)
    total = db.scalar(select(func.count()).select_from(m.farm_visit_requests).where(*conditions)) or 0
    rows = db.scalars(
        select(m.farm_visit_requests)
        .where(*conditions)
        .order_by(m.farm_visit_requests.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    ).all()
    return ok({"rows": [_map_visit(r) for r in rows], "total": total, "page": page, "pageSize": page_size, "totalPages": total_pages(total, page_size)})


# ---- content pages ----------------------------------------------------------------

def _map_page(p) -> dict:
    return {
        "id": p.id,
        "slug": p.slug,
        "title": p.title,
        "content": p.content,
        "isActive": p.is_active,
        "sortOrder": p.sort_order,
        "updatedAt": p.updated_at,
    }


@router.get("/content-pages/{id}")
@guard("Server Error")
def content_pages_show(id: str, db: DB, user: dict = perm("content_pages", "view")):
    page = db.get(m.content_pages, id)
    if page is None:
        return fail(404, "Page not found")
    return ok(_map_page(page))


@router.patch("/content-pages/{id}")
@guard("Server Error")
def content_pages_update(id: str, body: Body, db: DB, user: dict = perm("content_pages", "update")):
    page = db.get(m.content_pages, id)
    if page is None:
        raise LookupError("Page not found")
    if "title" in body:
        page.title = body["title"]
    if "content" in body:
        page.content = body["content"]
    if "status" in body:
        page.is_active = truthy(body["status"])
    if "displayPriority" in body:
        page.sort_order = int(js_number(body["displayPriority"]))
    page.updated_at = m.utcnow()
    db.commit()
    return ok(_map_page(page))


@router.delete("/content-pages/{id}")
@guard("Server Error")
def content_pages_destroy(id: str, db: DB, user: dict = perm("content_pages", "update")):
    page = db.get(m.content_pages, id)
    if page is None:
        raise LookupError("Page not found")
    db.delete(page)
    db.commit()
    return ok({})


@router.get("/content-pages")
@guard("Server Error")
def content_pages_index(db: DB, user: dict = perm("content_pages", "view")):
    pages = db.scalars(select(m.content_pages).order_by(m.content_pages.sort_order)).all()
    return ok([_map_page(p) for p in pages])


@router.post("/content-pages")
@guard("Server Error")
def content_pages_create(body: Body, db: DB, user: dict = perm("content_pages", "create")):
    slug, title = body.get("slug"), body.get("title")
    if not truthy(slug) or not truthy(title):
        return fail(422, "Slug and title are required")
    if db.scalar(select(m.content_pages.id).where(m.content_pages.slug == slug)) is not None:
        return fail(422, "A page with this slug already exists")
    current = db.scalar(select(func.max(m.content_pages.sort_order)))
    now = m.utcnow()
    page = m.content_pages(
        id=str(uuid.uuid4()),
        slug=slug,
        title=title,
        content=body.get("content") or "",
        is_active=body.get("status") is not False,
        sort_order=(current if current is not None else -1) + 1,
        created_at=now,
        updated_at=now,
    )
    db.add(page)
    db.commit()
    return ok(_map_page(page), status=201)


# ---- coupons ------------------------------------------------------------------------

def _map_coupon(c) -> dict:
    return {
        "id": c.id,
        "code": c.code,
        "title": c.title,
        "description": c.description,
        "discountType": c.discount_type,
        "discountValue": c.discount_value,
        "minOrderAmount": c.min_order_amount,
        "maxDiscountAmount": c.max_discount_amount,
        "validFrom": c.valid_from,
        "validTo": c.valid_to,
        "usageLimitPerCustomer": c.usage_limit_per_customer,
        "isActive": c.is_active,
        "createdAt": c.created_at,
    }


def _coupon_filters(request: Request) -> list:
    conditions = []
    if query(request, "code"):
        conditions.append(m.coupons.code.ilike(f"%{query(request, 'code')}%"))
    if query(request, "status"):
        conditions.append(m.coupons.is_active.is_(query(request, "status") == "active"))
    return conditions


def _optional_date(value):
    return js_date_to_date(value) if truthy(value) else None


def _max_discount(value):
    return None if value is None or value == "" else int(js_number(value))


@router.get("/coupons/{id}")
@guard("Server Error")
def coupons_show(id: str, db: DB, user: dict = perm("coupons", "view")):
    coupon = db.get(m.coupons, id)
    if coupon is None:
        return fail(404, "Coupon not found")
    return ok(_map_coupon(coupon))


@router.patch("/coupons/{id}")
@guard("Server Error")
def coupons_update(id: str, body: Body, db: DB, user: dict = perm("coupons", "update")):
    if "discountType" in body and body["discountType"] not in ("percent", "flat"):
        return fail(422, "Discount type must be percent or flat")
    coupon = db.get(m.coupons, id)
    if coupon is None:
        raise LookupError("Coupon not found")
    if "title" in body:
        coupon.title = body["title"]
    if "description" in body:
        coupon.description = body["description"] or None
    if "discountType" in body:
        coupon.discount_type = body["discountType"]
    if "discountValue" in body:
        coupon.discount_value = int(js_number(body["discountValue"]))
    if "minOrderAmount" in body:
        coupon.min_order_amount = int(js_number(body["minOrderAmount"]))
    if "maxDiscountAmount" in body:
        coupon.max_discount_amount = _max_discount(body["maxDiscountAmount"])
    if "validFrom" in body:
        coupon.valid_from = _optional_date(body["validFrom"])
    if "validTo" in body:
        coupon.valid_to = _optional_date(body["validTo"])
    if "usageLimitPerCustomer" in body:
        coupon.usage_limit_per_customer = int(js_number(body["usageLimitPerCustomer"]))
    if "status" in body:
        coupon.is_active = truthy(body["status"])
    coupon.updated_at = m.utcnow()
    db.commit()
    return ok(_map_coupon(coupon))


@router.delete("/coupons/{id}")
@guard("Server Error")
def coupons_destroy(id: str, db: DB, user: dict = perm("coupons", "update")):
    coupon = db.get(m.coupons, id)
    if coupon is None:
        raise LookupError("Coupon not found")
    db.delete(coupon)
    db.commit()
    return ok({})


@router.get("/coupons")
@guard("Server Error")
def coupons_index(request: Request, db: DB, user: dict = perm("coupons", "view")):
    page, page_size = paginate(request)
    conditions = _coupon_filters(request)
    total = db.scalar(select(func.count()).select_from(m.coupons).where(*conditions)) or 0
    rows = db.scalars(
        select(m.coupons).where(*conditions).order_by(m.coupons.created_at.desc()).offset((page - 1) * page_size).limit(page_size)
    ).all()
    return ok({"rows": [_map_coupon(c) for c in rows], "total": total, "page": page, "pageSize": page_size, "totalPages": total_pages(total, page_size)})


@router.post("/coupons")
@guard("Server Error")
def coupons_create(body: Body, db: DB, user: dict = perm("coupons", "create")):
    code, title, discount_type = body.get("code"), body.get("title"), body.get("discountType")
    if not truthy(code) or not truthy(title):
        return fail(422, "Code and title are required")
    if truthy(discount_type) and discount_type not in ("percent", "flat"):
        return fail(422, "Discount type must be percent or flat")
    code = str(code).upper()
    if db.scalar(select(m.coupons.id).where(m.coupons.code == code)) is not None:
        return fail(422, "A coupon with this code already exists")

    now = m.utcnow()
    coupon = m.coupons(
        id=str(uuid.uuid4()),
        code=code,
        title=title,
        description=body.get("description") or None,
        discount_type=discount_type or "percent",
        discount_value=int(num0(body.get("discountValue"))),
        min_order_amount=int(num0(body.get("minOrderAmount"))),
        max_discount_amount=_max_discount(body.get("maxDiscountAmount")),
        valid_from=_optional_date(body.get("validFrom")),
        valid_to=_optional_date(body.get("validTo")),
        usage_limit_per_customer=int(num0(body.get("usageLimitPerCustomer")) or 1),
        is_active=body.get("status") is not False,
        created_at=now,
        updated_at=now,
    )
    db.add(coupon)
    db.commit()
    return ok(_map_coupon(coupon), status=201)


# ---- app images (splash + login), uploaded as files ---------------------------------

ASSET_DIR = UPLOADS_DIR / "app-assets"
ASSET_DIR.mkdir(parents=True, exist_ok=True)
MAX_UPLOAD_BYTES = 8 * 1024 * 1024


def _slot_key(slot: str) -> str | None:
    return {"splash": SPLASH_KEY, "login": LOGIN_KEY}.get(slot)


def _remove_stored_file(relative_path) -> None:
    """Best-effort cleanup of a previously uploaded file (`uploads/...` path)."""
    if not isinstance(relative_path, str) or not relative_path.startswith("uploads/"):
        return
    target = (UPLOADS_DIR / relative_path[len("uploads/"):]).resolve()
    try:
        if UPLOADS_DIR.resolve() in target.parents:
            target.unlink(missing_ok=True)
    except OSError:
        pass


@router.get("/app-assets")
@guard("Server Error")
def app_assets_show(request: Request, db: DB, user: dict = perm("app_assets", "view")):
    splash, login = db.get(m.site_settings, SPLASH_KEY), db.get(m.site_settings, LOGIN_KEY)
    return ok({
        "splashImageUrl": resolve_asset_url(request, splash.value if splash else None),
        "loginImageUrl": resolve_asset_url(request, login.value if login else None),
    })


@router.post("/app-assets/{slot}")
async def app_assets_upload(slot: str, request: Request, db: DB, user: dict = perm("app_assets", "update")):
    try:
        form = await request.form()
        image = form.get("image")
        if isinstance(image, UploadFile) and not (image.content_type or "").startswith("image/"):
            # multer's fileFilter rejected these before the handler ran.
            return fail(500, "Internal Server Error")

        key = _slot_key(slot)
        if key is None:
            return fail(422, "Unknown image slot")
        if not isinstance(image, UploadFile):
            return fail(422, "No image file uploaded")

        content = await image.read(MAX_UPLOAD_BYTES + 1)
        if len(content) > MAX_UPLOAD_BYTES:
            return fail(500, "Internal Server Error")

        ext = Path(image.filename or "").suffix.lower() or ".jpg"
        filename = f"{slot}-{uuid.uuid4()}{ext}"
        (ASSET_DIR / filename).write_bytes(content)

        relative_path = f"uploads/app-assets/{filename}"
        previous = db.get(m.site_settings, key)
        previous_path = previous.value if previous else None
        now = m.utcnow()
        if previous:
            previous.value = relative_path
            previous.updated_at = now
        else:
            db.add(m.site_settings(key=key, value=relative_path, created_at=now, updated_at=now))
        db.commit()

        _remove_stored_file(previous_path)
        return ok({"url": resolve_asset_url(request, relative_path)})
    except Exception:
        db.rollback()
        logger.exception("app asset upload failed")
        return fail(500, "Server Error")


@router.delete("/app-assets/{slot}")
@guard("Server Error")
def app_assets_destroy(slot: str, db: DB, user: dict = perm("app_assets", "update")):
    key = _slot_key(slot)
    if key is None:
        return fail(422, "Unknown image slot")
    previous = db.get(m.site_settings, key)
    previous_path = previous.value if previous else None
    if previous:
        db.delete(previous)
        db.commit()
    _remove_stored_file(previous_path)
    return ok({})
