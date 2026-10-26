"""Product categories, sub-categories and app banners."""
import re
import uuid
from datetime import datetime

from fastapi import APIRouter, Request
from sqlalchemy import func, select
from sqlalchemy.orm import selectinload

from ... import models as m
from ...core.dates import format_date_only, js_date_to_date
from ...core.deps import DB, Body
from ...core.http import fail, guard, js_number, ok, query, respond, truthy
from ...core.serialize import to_dict
from .common import csv_response, paginate, perm, total_pages

router = APIRouter()


def _slug_id(prefix: str, name) -> str:
    return re.sub(r"[^a-z0-9_]+", "_", f"{prefix}_{name}".lower())


def _next_sort(db, column, *conditions) -> int:
    current = db.scalar(select(func.max(column)).where(*conditions))
    return (current if current is not None else -1) + 1


# ---- product categories -------------------------------------------------------

def _category_filters(request: Request) -> list:
    conditions = []
    name, status = query(request, "name"), query(request, "status")
    if name:
        conditions.append(m.product_categories.label.ilike(f"%{name}%"))
    if status:
        conditions.append(m.product_categories.is_active.is_(status == "active"))
    return conditions


@router.get("/product-categories/export")
@guard("Server Error")
def categories_export(request: Request, db: DB, user: dict = perm("product_category", "excel")):
    rows = db.scalars(
        select(m.product_categories).where(*_category_filters(request)).order_by(m.product_categories.sort_order)
    ).all()
    return csv_response(
        ["Category Name", "Display Priority", "Status"],
        [[c.label, c.sort_order, "Activated" if c.is_active else "Deactivated"] for c in rows],
        "categories",
    )


@router.get("/product-categories/{id}")
@guard("Server Error")
def categories_show(id: str, db: DB, user: dict = perm("product_category", "view")):
    category = db.get(m.product_categories, id)
    if category is None:
        return fail(404, "Category not found")
    return ok(category)


@router.patch("/product-categories/{id}")
@guard("Server Error")
def categories_update(id: str, body: Body, db: DB, user: dict = perm("product_category", "update")):
    category = db.get(m.product_categories, id)
    if category is None:
        return fail(404, "Category not found")
    if "name" in body:
        category.label = body["name"]
    if "imageUrl" in body:
        category.image_url = body["imageUrl"] or None
    if "status" in body:
        category.is_active = truthy(body["status"])
    if "displayPriority" in body:
        category.sort_order = int(js_number(body["displayPriority"]))
    category.updated_at = m.utcnow()
    db.commit()
    return ok({"category": category})


@router.get("/product-categories")
@guard("Server Error")
def categories_index(request: Request, db: DB, user: dict = perm("product_category", "view")):
    page, page_size = paginate(request)
    conditions = _category_filters(request)
    total = db.scalar(select(func.count()).select_from(m.product_categories).where(*conditions)) or 0
    rows = db.scalars(
        select(m.product_categories)
        .where(*conditions)
        .order_by(m.product_categories.sort_order)
        .offset((page - 1) * page_size)
        .limit(page_size)
    ).all()
    mapped = [
        {
            "id": c.id,
            "label": c.label,
            "image": c.image_url,
            "description": c.description,
            "isActive": c.is_active,
            "displayPriority": c.sort_order,
        }
        for c in rows
    ]
    return ok({"rows": mapped, "total": total, "page": page, "pageSize": page_size, "totalPages": total_pages(total, page_size)})


@router.post("/product-categories")
@guard("Server Error")
def categories_create(body: Body, db: DB, user: dict = perm("product_category", "create")):
    if not truthy(body.get("name")):
        return fail(422, "Category name is required")
    category_id = _slug_id("cat", body["name"])
    if db.get(m.product_categories, category_id) is not None:
        return fail(422, "A category with this name already exists")

    now = m.utcnow()
    category = m.product_categories(
        id=category_id,
        label=body["name"],
        tile="var(--tile-1)",
        image_url=body.get("imageUrl") or None,
        is_active=body.get("status") is not False,
        sort_order=_next_sort(db, m.product_categories.sort_order),
        created_at=now,
        updated_at=now,
    )
    db.add(category)
    db.commit()
    db.refresh(category)
    return ok({"category": category}, status=201)


# ---- product sub-categories ---------------------------------------------------

def _sub_category_filters(request: Request) -> list:
    conditions = []
    name, category_id, status = query(request, "name"), query(request, "categoryId"), query(request, "status")
    if name:
        conditions.append(m.product_sub_categories.label.ilike(f"%{name}%"))
    if category_id:
        conditions.append(m.product_sub_categories.category_id == category_id)
    if status:
        conditions.append(m.product_sub_categories.is_active.is_(status == "active"))
    return conditions


def _sub_category_query(request: Request):
    return (
        select(m.product_sub_categories)
        .where(*_sub_category_filters(request))
        .options(selectinload(m.product_sub_categories.product_categories))
        .order_by(m.product_sub_categories.category_id, m.product_sub_categories.sort_order)
    )


@router.get("/product-sub-categories/export")
@guard("Server Error")
def sub_categories_export(request: Request, db: DB, user: dict = perm("product_sub_category", "excel")):
    rows = db.scalars(_sub_category_query(request)).all()
    return csv_response(
        ["Category", "Sub Category", "Display Priority", "Status"],
        [
            [
                s.product_categories.label if s.product_categories else "",
                s.label,
                s.sort_order,
                "Activated" if s.is_active else "Deactivated",
            ]
            for s in rows
        ],
        "sub-categories",
    )


@router.get("/product-sub-categories/{id}")
@guard("Server Error")
def sub_categories_show(id: str, db: DB, user: dict = perm("product_sub_category", "view")):
    sub = db.get(m.product_sub_categories, id)
    if sub is None:
        return fail(404, "Sub category not found")
    return ok(sub)


@router.patch("/product-sub-categories/{id}")
@guard("Server Error")
def sub_categories_update(id: str, body: Body, db: DB, user: dict = perm("product_sub_category", "update")):
    sub = db.get(m.product_sub_categories, id)
    if sub is None:
        return fail(404, "Sub category not found")
    if truthy(body.get("categoryId")) and db.get(m.product_categories, body["categoryId"]) is None:
        return fail(422, "Selected category does not exist")

    if "name" in body:
        sub.label = body["name"]
    if "categoryId" in body:
        sub.category_id = body["categoryId"]
    if "imageUrl" in body:
        sub.image_url = body["imageUrl"] or None
    if "status" in body:
        sub.is_active = truthy(body["status"])
    if "displayPriority" in body:
        sub.sort_order = int(js_number(body["displayPriority"]))
    sub.updated_at = m.utcnow()
    db.commit()
    return ok({"subCategory": sub})


@router.get("/product-sub-categories")
@guard("Server Error")
def sub_categories_index(request: Request, db: DB, user: dict = perm("product_sub_category", "view")):
    page, page_size = paginate(request)
    total = db.scalar(
        select(func.count()).select_from(m.product_sub_categories).where(*_sub_category_filters(request))
    ) or 0
    rows = db.scalars(_sub_category_query(request).offset((page - 1) * page_size).limit(page_size)).all()
    mapped = [
        {
            "id": s.id,
            "label": s.label,
            "image": s.image_url,
            "categoryId": s.category_id,
            "category": s.product_categories.label if s.product_categories else "",
            "isActive": s.is_active,
            "displayPriority": s.sort_order,
        }
        for s in rows
    ]
    return ok({"rows": mapped, "total": total, "page": page, "pageSize": page_size, "totalPages": total_pages(total, page_size)})


@router.post("/product-sub-categories")
@guard("Server Error")
def sub_categories_create(body: Body, db: DB, user: dict = perm("product_sub_category", "create")):
    if not truthy(body.get("name")) or not truthy(body.get("categoryId")):
        return fail(422, "Sub category name and category are required")
    if db.get(m.product_categories, body["categoryId"]) is None:
        return fail(422, "Selected category does not exist")
    sub_id = _slug_id("sub", body["name"])
    if db.get(m.product_sub_categories, sub_id) is not None:
        return fail(422, "A sub category with this name already exists")

    now = m.utcnow()
    sub = m.product_sub_categories(
        id=sub_id,
        category_id=body["categoryId"],
        label=body["name"],
        image_url=body.get("imageUrl") or None,
        is_active=body.get("status") is not False,
        sort_order=_next_sort(db, m.product_sub_categories.sort_order, m.product_sub_categories.category_id == body["categoryId"]),
        created_at=now,
        updated_at=now,
    )
    db.add(sub)
    db.commit()
    db.refresh(sub)
    return ok({"subCategory": sub}, status=201)


# ---- banners ----------------------------------------------------------------

def banner_status(banner) -> str:
    if not banner.is_active:
        return "Deactivated"
    now = m.utcnow()
    if banner.from_date and datetime(banner.from_date.year, banner.from_date.month, banner.from_date.day) > now:
        return "Scheduled"
    if banner.to_date and datetime(banner.to_date.year, banner.to_date.month, banner.to_date.day) < now:
        return "Expired"
    return "Activated"


def _banner_filters(request: Request) -> list:
    conditions = []
    title, banner_type, status = query(request, "title"), query(request, "bannerType"), query(request, "status")
    if title:
        conditions.append(m.app_banners.title.ilike(f"%{title}%"))
    if banner_type:
        conditions.append(m.app_banners.banner_type == banner_type)
    if status:
        conditions.append(m.app_banners.is_active.is_(status == "active"))
    return conditions


def _banner_query(request: Request):
    return select(m.app_banners).where(*_banner_filters(request)).order_by(m.app_banners.banner_type, m.app_banners.sort_order)


@router.get("/banners/export")
@guard("Server Error")
def banners_export(request: Request, db: DB, user: dict = perm("banner", "excel")):
    rows = db.scalars(_banner_query(request)).all()
    return csv_response(
        ["Title", "Type", "From Date", "To Date", "Display Priority", "Status"],
        [
            [
                b.title,
                b.banner_type,
                format_date_only(b.from_date) if b.from_date else "",
                format_date_only(b.to_date) if b.to_date else "",
                b.sort_order,
                banner_status(b),
            ]
            for b in rows
        ],
        "banners",
    )


@router.get("/banners/{id}")
@guard("Server Error")
def banners_show(id: str, db: DB, user: dict = perm("banner", "view")):
    banner = db.get(m.app_banners, id)
    if banner is None:
        return fail(404, "Banner not found")
    return ok({**to_dict(banner), "status": banner_status(banner)})


def _optional_date(value):
    return js_date_to_date(value) if truthy(value) else None


@router.patch("/banners/{id}")
@guard("Server Error")
def banners_update(id: str, body: Body, db: DB, user: dict = perm("banner", "update")):
    banner = db.get(m.app_banners, id)
    if banner is None:
        return fail(404, "Banner not found")
    if "title" in body:
        banner.title = body["title"]
    if "mediaUrl" in body:
        banner.media_url = body["mediaUrl"]
    if "fromDate" in body:
        banner.from_date = _optional_date(body["fromDate"])
    if "toDate" in body:
        banner.to_date = _optional_date(body["toDate"])
    if "status" in body:
        banner.is_active = truthy(body["status"])
    if "displayPriority" in body:
        banner.sort_order = int(js_number(body["displayPriority"]))
    banner.updated_at = m.utcnow()
    db.commit()
    return ok({"banner": banner})


@router.delete("/banners/{id}")
@guard("Server Error")
def banners_remove(id: str, db: DB, user: dict = perm("banner", "update")):
    banner = db.get(m.app_banners, id)
    if banner is None:
        raise LookupError("Banner not found")
    db.delete(banner)
    db.commit()
    return respond({"success": True})


@router.get("/banners")
@guard("Server Error")
def banners_index(request: Request, db: DB, user: dict = perm("banner", "view")):
    page, page_size = paginate(request)
    total = db.scalar(select(func.count()).select_from(m.app_banners).where(*_banner_filters(request))) or 0
    rows = db.scalars(_banner_query(request).offset((page - 1) * page_size).limit(page_size)).all()
    mapped = [
        {
            "id": b.id,
            "bannerType": b.banner_type,
            "title": b.title,
            "mediaUrl": b.media_url,
            "fromDate": b.from_date,
            "toDate": b.to_date,
            "isActive": b.is_active,
            "displayPriority": b.sort_order,
            "status": banner_status(b),
        }
        for b in rows
    ]
    return ok({"rows": mapped, "total": total, "page": page, "pageSize": page_size, "totalPages": total_pages(total, page_size)})


@router.post("/banners")
@guard("Server Error")
def banners_create(body: Body, db: DB, user: dict = perm("banner", "create")):
    title, media_url, banner_type = body.get("title"), body.get("mediaUrl"), body.get("bannerType")
    if not truthy(title) or not truthy(media_url) or not truthy(banner_type):
        return fail(422, "Title, media URL and banner type are required")
    if banner_type not in ("image", "video"):
        return fail(422, "Banner type must be image or video")

    now = m.utcnow()
    banner = m.app_banners(
        id=str(uuid.uuid4()),
        banner_type=banner_type,
        title=title,
        media_url=media_url,
        from_date=_optional_date(body.get("fromDate")),
        to_date=_optional_date(body.get("toDate")),
        is_active=body.get("status") is not False,
        sort_order=_next_sort(db, m.app_banners.sort_order, m.app_banners.banner_type == banner_type),
        created_at=now,
        updated_at=now,
    )
    db.add(banner)
    db.commit()
    db.refresh(banner)
    return ok({"banner": banner}, status=201)
