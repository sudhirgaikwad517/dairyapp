import re
import time
import uuid

from fastapi import APIRouter, Request
from sqlalchemy import delete, func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import selectinload

from ... import models as m
from ...core.deps import DB, Body
from ...core.http import fail, guard, is_unique_violation, js_number, logger, ok, query, truthy
from ...core.serialize import to_dict
from ...services.product import PRODUCT_BADGES
from .common import coalesce, csv_response, num0, paginate, perm, total_pages

router = APIRouter()


def normalize_badge(value):
    """Only the curated tags are accepted — free text would render as an
    unstyled chip in the app."""
    badge = str(value or "").strip()
    if badge == "":
        return None
    return next((b for b in PRODUCT_BADGES if b.lower() == badge.lower()), None)


def normalize_food_type(value) -> str:
    return "non_veg" if str(value or "").lower() == "non_veg" else "veg"


def _filters(request: Request) -> list:
    conditions = []
    name, category_id, sub_category_id = query(request, "name"), query(request, "categoryId"), query(request, "subCategoryId")
    if name:
        conditions.append(m.products.name.ilike(f"%{name}%"))
    if category_id:
        conditions.append(m.products.category_id == category_id)
    if sub_category_id:
        conditions.append(m.products.sub_category_id == sub_category_id)
    return conditions


@router.get("/products/export")
@guard("Server Error")
def export_products(request: Request, db: DB, user: dict = perm("products", "excel")):
    products = db.scalars(
        select(m.products)
        .where(*_filters(request))
        .options(selectinload(m.products.product_categories), selectinload(m.products.product_sub_categories))
        .order_by(m.products.sort_order)
    ).all()
    header = ["Product Name", "Shortcode", "Discount(Rs)", "GST", "Category", "Sub Category", "HSN Code", "Display Priority", "Status"]
    return csv_response(header, [
        [
            p.name or "",
            p.short_code or "",
            p.discount or 0,
            float(p.gst_rate or 0),
            p.product_categories.label if p.product_categories else "",
            p.product_sub_categories.label if p.product_sub_categories else "",
            p.hsn_code or "",
            p.sort_order or 0,
            "Active" if p.is_active else "Inactive",
        ]
        for p in products
    ], "products")


@router.get("/products/sub-categories")
@guard("Server Error")
def sub_categories(request: Request, db: DB, user: dict = perm("products", "view")):
    stmt = select(m.product_sub_categories).where(m.product_sub_categories.is_active.is_(True))
    category_id = query(request, "categoryId")
    if category_id:
        stmt = stmt.where(m.product_sub_categories.category_id == category_id)
    rows = db.scalars(stmt.order_by(m.product_sub_categories.sort_order)).all()
    return ok([{"id": s.id, "label": s.label, "categoryId": s.category_id} for s in rows])


@router.get("/products/{id}")
@guard("Server Error")
def get_product(id: str, db: DB, user: dict = perm("products", "view")):
    product = db.scalar(
        select(m.products)
        .where(m.products.id == id)
        .options(
            selectinload(m.products.product_categories),
            selectinload(m.products.product_sub_categories),
            selectinload(m.products.product_images),
            selectinload(m.products.product_variants),
        )
    )
    if product is None:
        return fail(404, "Product not found")
    data = to_dict(product, include={
        "product_categories": True,
        "product_sub_categories": True,
        "product_images": True,
        "product_variants": True,
    })
    data["product_images"].sort(key=lambda r: r["sort_order"])
    data["product_variants"].sort(key=lambda r: r["sort_order"])
    return ok(data)


def _variant_data(v: dict, index: int, now) -> dict:
    stock_qty = js_number(coalesce(v.get("stockQuantity"), 0))
    ltrs = v.get("ltrs")
    return {
        "size_label": v.get("packaging") or "",
        "city": v.get("city") or None,
        "packets": int(num0(v.get("packets")) or 1),
        "ltrs": js_number(ltrs) if "ltrs" in v and ltrs != "" else None,
        "buy_once": int(num0(v.get("rate"))),
        "subscription": int(js_number(coalesce(v.get("subscriptionRate"), v.get("rate"), 0))),
        "mrp_ecom": int(num0(v.get("mrpEcom"))),
        "bottle_applicable": truthy(v.get("bottleApplicable")),
        "pouch_applicable": truthy(v.get("pouchApplicable")),
        "stock_quantity": int(stock_qty),
        "out_of_stock": stock_qty <= 0,
        "web_visibility": v.get("webVisibility") is not False,
        "app_visibility": v.get("appVisibility") is not False,
        "sort_order": index,
        "updated_at": now,
    }


def _replace_images(db, product_id: str, images, now) -> None:
    for index, url in enumerate(images):
        if not url:
            continue
        db.add(m.product_images(id=str(uuid.uuid4()), product_id=product_id, image_url=url, sort_order=index, created_at=now))


@router.patch("/products/{id}")
@guard("Server Error")
def update_product(id: str, body: Body, db: DB, user: dict = perm("products", "update")):
    product = db.get(m.products, id)
    if product is None:
        return fail(404, "Product not found")

    now = m.utcnow()
    variants = body["variants"] if isinstance(body.get("variants"), list) else []
    b = body

    simple = {
        "categoryId": ("category_id", lambda v: v),
        "subCategoryId": ("sub_category_id", lambda v: v or None),
        "productType": ("product_type", lambda v: v or None),
        "name": ("name", lambda v: v),
        "shortCode": ("short_code", lambda v: v),
        "discount": ("discount", lambda v: int(num0(v))),
        "mrp": ("mrp", lambda v: int(num0(v))),
        "badge": ("badge", normalize_badge),
        "foodType": ("food_type", normalize_food_type),
        "gstRate": ("gst_rate", lambda v: num0(v)),
        "description": ("description", lambda v: v or None),
        "hsnCode": ("hsn_code", lambda v: v or None),
        "imageUrl": ("image_url", lambda v: v or None),
        "prepaidGetonce": ("prepaid_getonce", truthy),
        "prepaidSubscribe": ("prepaid_subscribe", truthy),
        "postpaidGetonce": ("postpaid_getonce", truthy),
        "postpaidSubscribe": ("postpaid_subscribe", truthy),
        "displayPriority": ("sort_order", lambda v: int(js_number(v))),
        "isActive": ("is_active", truthy),
    }
    for key, (column, convert) in simple.items():
        if key in b:
            setattr(product, column, convert(b[key]))
    if variants:
        first = variants[0]
        product.buy_once = int(num0(first.get("rate")))
        product.subscription = int(js_number(coalesce(first.get("subscriptionRate"), first.get("rate"), 0)))
        product.size = first.get("packaging") or product.size
    product.updated_at = now

    if isinstance(b.get("variants"), list):
        incoming_ids = [v["id"] for v in variants if v.get("id")]
        stmt = delete(m.product_variants).where(m.product_variants.product_id == id)
        if incoming_ids:
            stmt = stmt.where(m.product_variants.id.not_in(incoming_ids))
        db.execute(stmt)

        for index, v in enumerate(variants):
            data = _variant_data(v, index, now)
            if v.get("id"):
                existing = db.get(m.product_variants, v["id"])
                if existing is None:
                    raise LookupError("Variant not found")
                for column, value in data.items():
                    setattr(existing, column, value)
            else:
                db.add(m.product_variants(
                    id=str(uuid.uuid4()),
                    product_id=id,
                    sku=f"{id}-{int(time.time() * 1000)}-{index}".upper(),
                    is_default=index == 0,
                    created_at=now,
                    **data,
                ))

    if isinstance(b.get("images"), list):
        db.execute(delete(m.product_images).where(m.product_images.product_id == id))
        _replace_images(db, id, b["images"], now)

    db.commit()
    updated = db.scalar(
        select(m.products)
        .where(m.products.id == id)
        .options(selectinload(m.products.product_variants), selectinload(m.products.product_images))
        .execution_options(populate_existing=True)
    )
    return ok({"product": to_dict(updated, include={"product_variants": True, "product_images": True})})


@router.get("/products")
@guard("Server Error")
def get_products(request: Request, db: DB, user: dict = perm("products", "view")):
    page, page_size = paginate(request)
    conditions = _filters(request)
    total = db.scalar(select(func.count()).select_from(m.products).where(*conditions)) or 0
    products = db.scalars(
        select(m.products)
        .where(*conditions)
        .options(
            selectinload(m.products.product_categories),
            selectinload(m.products.product_sub_categories),
            selectinload(m.products.product_variants),
        )
        .order_by(m.products.sort_order)
        .offset((page - 1) * page_size)
        .limit(page_size)
    ).all()

    rows = [
        {
            "id": p.id,
            "name": p.name,
            "shortCode": p.short_code,
            "badge": p.badge or "",
            "foodType": p.food_type or "veg",
            "price": int(p.buy_once or 0),
            "subscriptionPrice": int(p.subscription or 0),
            "mrp": int(p.mrp or 0),
            "discount": p.discount,
            "gst": float(p.gst_rate or 0),
            "category": p.product_categories.label if p.product_categories else "Uncategorized",
            "categoryId": p.category_id,
            "subCategory": p.product_sub_categories.label if p.product_sub_categories else "",
            "subCategoryId": p.sub_category_id,
            "description": p.description,
            "hsnCode": p.hsn_code,
            "image": p.image_url,
            "displayPriority": p.sort_order,
            "isActive": p.is_active,
            "variantCount": len(p.product_variants),
        }
        for p in products
    ]
    return ok({"rows": rows, "total": total, "page": page, "pageSize": page_size, "totalPages": total_pages(total, page_size)})


@router.post("/products")
def create_product(body: Body, db: DB, user: dict = perm("products", "create")):
    b = body
    if not truthy(b.get("categoryId")) or not truthy(b.get("name")) or not truthy(b.get("shortCode")):
        return fail(422, "Category, product name and shortcode are required")

    product_id = re.sub(r"[^a-z0-9_]+", "_", f"prod_{b['shortCode']}".lower())
    now = m.utcnow()
    variants = b["variants"] if isinstance(b.get("variants"), list) else []
    first = variants[0] if variants else {}

    try:
        product = m.products(
            id=product_id,
            category_id=b["categoryId"],
            sub_category_id=b.get("subCategoryId") or None,
            product_type=b.get("productType") or None,
            name=b["name"],
            short_code=b["shortCode"],
            size=first.get("packaging") or "N/A",
            buy_once=int(num0(first.get("rate"))),
            # Falls back to the buy-once rate only when no subscription rate
            # was given at all — an admin who deliberately sets 0 gets 0.
            subscription=int(js_number(coalesce(first.get("subscriptionRate"), first.get("rate"), 0))),
            mrp=int(num0(b.get("mrp")) or num0(first.get("mrpEcom"))),
            badge=normalize_badge(b.get("badge")) or None,
            food_type=normalize_food_type(b.get("foodType")),
            discount=int(num0(b.get("discount"))),
            gst_rate=num0(b.get("gstRate")),
            description=b.get("description") or None,
            hsn_code=b.get("hsnCode") or None,
            image_url=b.get("imageUrl") or None,
            prepaid_getonce=b.get("prepaidGetonce") is not False,
            prepaid_subscribe=b.get("prepaidSubscribe") is not False,
            postpaid_getonce=b.get("postpaidGetonce") is not False,
            postpaid_subscribe=b.get("postpaidSubscribe") is not False,
            is_active=True,
            stock_quantity=100,
            created_at=now,
            updated_at=now,
        )
        db.add(product)
        db.flush()

        for index, v in enumerate(variants):
            db.add(m.product_variants(
                id=str(uuid.uuid4()),
                product_id=product_id,
                sku=f"{product_id}-{index + 1}".upper(),
                is_default=index == 0,
                created_at=now,
                **_variant_data(v, index, now),
            ))
        if isinstance(b.get("images"), list):
            _replace_images(db, product_id, b["images"], now)
        db.commit()
        db.refresh(product)
        return ok({"product": product}, status=201)
    except IntegrityError as error:
        db.rollback()
        logger.exception("create product failed")
        if is_unique_violation(error):
            return fail(422, "A product with this shortcode already exists")
        return fail(500, "Server Error")
    except Exception:
        db.rollback()
        logger.exception("create product failed")
        return fail(500, "Server Error")


@router.get("/categories")
@guard("Server Error")
def lite_categories(db: DB):
    """Lite lookup shared across other modules' dropdowns — any logged-in staff can read it."""
    rows = db.scalars(select(m.product_categories).order_by(m.product_categories.sort_order)).all()
    return ok([
        {"id": c.id, "label": c.label, "description": c.description, "is_active": c.is_active, "sort": c.sort_order}
        for c in rows
    ])
