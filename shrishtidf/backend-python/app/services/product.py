import json
import re

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from .. import models as m
from ..core.http import js_round

# Curated tags an admin can pin on a product. Kept here (rather than free
# text) so the app and website can style each one consistently.
PRODUCT_BADGES = ["Must Try", "New", "Popular", "Best Value", "Combo", "Seasonal"]


def _product_options(path=None):
    """Everything a product summary/detail reads, loaded up front."""
    def load(attr):
        return selectinload(attr) if path is None else path.selectinload(attr)

    cross = load(m.products.product_cross_sells_product_cross_sells_product_idToproducts)
    return [
        load(m.products.product_reviews),
        load(m.products.product_variants),
        cross,
        cross.selectinload(m.product_cross_sells.products_product_cross_sells_related_product_idToproducts),
    ]


def _visible_products(products: list, sub_category_id: str | None = None) -> list:
    """Only products a customer is allowed to see, in display order."""
    rows = [p for p in products if p.is_active and (sub_category_id is None or p.sub_category_id == sub_category_id)]
    return sorted(rows, key=lambda p: p.sort_order)


def get_products_list(db: Session) -> dict:
    products_path = selectinload(m.product_categories.products)
    rows = db.scalars(
        select(m.product_categories)
        .where(m.product_categories.is_active.is_(True))
        .order_by(m.product_categories.sort_order)
        .options(products_path, *_product_options(products_path))
    ).all()

    categories = [_map_category(c) for c in rows]
    return {"source": "database", "data": {"categories": categories, "products": _flatten_products(categories)}}


def get_category_with_products(db: Session, category_id: str, sub_category_id: str | None = None) -> dict | None:
    """Everything the category screen needs in one round trip: the category
    header, its sub-categories (used as filter chips) and its products."""
    products_path = selectinload(m.product_categories.products)
    category = db.scalar(
        select(m.product_categories)
        .where(m.product_categories.id == category_id, m.product_categories.is_active.is_(True))
        .options(products_path, *_product_options(products_path), selectinload(m.product_categories.product_sub_categories))
        .limit(1)
    )
    if category is None:
        return None

    visible = _visible_products(category.products, sub_category_id)
    products = [
        {**map_product_summary(p), "categoryId": category.id, "categoryLabel": category.label} for p in visible
    ]

    # A sub-category with nothing visible in it would be a dead filter chip.
    counts: dict[str, int] = {}
    for product in visible:
        if product.sub_category_id:
            counts[product.sub_category_id] = counts.get(product.sub_category_id, 0) + 1

    sub_categories = sorted(
        (s for s in category.product_sub_categories if s.is_active), key=lambda s: s.sort_order
    )
    return {
        "category": {
            "id": category.id,
            "label": category.label,
            "tile": category.tile,
            "imageUrl": category.image_url,
            "description": category.description,
            "subscriptionNote": category.subscription_note,
        },
        "subCategories": [
            {"id": s.id, "label": s.label, "productCount": counts.get(s.id, 0)}
            for s in sub_categories
            if sub_category_id is not None or s.id in counts
        ],
        "products": products,
        "total": len(products),
    }


def get_product_by_id(db: Session, product_id: str) -> dict | None:
    product = db.scalar(
        select(m.products)
        .where(m.products.id == product_id)
        .options(selectinload(m.products.product_categories), *_product_options())
    )
    return _map_product_detail(product) if product else None


def get_categories(db: Session) -> list[dict]:
    categories = get_products_list(db)["data"]["categories"]
    return [
        {
            "id": c["id"],
            "label": c["label"],
            "tile": c["tile"],
            "imageUrl": c["imageUrl"],
            "subscriptionNote": c["subscriptionNote"] or "30 days subscription",
            "productCount": len(c["items"]) if c.get("items") else 0,
        }
        for c in categories
    ]


def search_products(db: Session, query_text: str, limit: int = 24) -> list[dict]:
    needle = query_text.strip().lower()
    if needle == "":
        return []
    matches = []
    for product in get_products_list(db)["data"]["products"]:
        haystack = " ".join(
            str(v) for v in [product["name"], product["size"], product["badge"], product["categoryLabel"], product["description"]] if v
        ).lower()
        if needle in haystack:
            matches.append(product)
    return matches[: max(1, min(limit, 50))]


def _map_category(category) -> dict:
    products = _visible_products(category.products)
    return {
        "id": category.id,
        "label": category.label,
        "tile": category.tile,
        "imageUrl": category.image_url,
        "subscriptionNote": category.subscription_note,
        "productCount": len(products),
        "items": [map_product_summary(p) for p in products],
    }


def _flatten_products(categories: list[dict]) -> list[dict]:
    return [
        {**item, "categoryId": c["id"], "categoryLabel": c["label"]}
        for c in categories
        for item in c["items"]
    ]


def _app_variants(product) -> list:
    return [v for v in (product.product_variants or []) if v.app_visibility is not False]


def _default_variant(product):
    """The variant the app should price against: the default one, else the first
    app-visible variant. Variants hidden from the app must not set the price."""
    variants = _app_variants(product)
    if not variants:
        return None
    return next((v for v in variants if v.is_default), variants[0])


def _badge_label(raw) -> str:
    """Older rows store badges as raw uppercase ("POPULAR"). Map them onto the
    curated list so every client renders one consistent label."""
    badge = str(raw or "").strip()
    if badge == "":
        return ""
    normalized = re.sub(r"[\s_-]+", "", badge.lower())
    for b in PRODUCT_BADGES:
        if re.sub(r"\s+", "", b.lower()) == normalized:
            return b
    return badge


def _list_price(product, variant, selling_price: int) -> int:
    """List price, never invented — only a figure the admin actually entered.
    The variant's own ecom MRP wins; the product-level `mrp` is the fallback.
    Returns 0 when there is nothing valid to show ("render only the selling price")."""
    variant_mrp = int(variant.mrp_ecom or 0) if variant is not None else 0
    mrp = variant_mrp if variant_mrp > 0 else int(product.mrp or 0)
    return mrp if mrp > selling_price else 0


def _specifications(value):
    if isinstance(value, str):
        return json.loads(value)
    return value or []


def map_product_summary(product) -> dict:
    reviews = [r for r in (product.product_reviews or []) if r.is_published]
    review_count = len(reviews)
    rating_avg = js_round(sum(int(r.rating) for r in reviews) / review_count * 10) / 10 if review_count else 0.0

    variant = _default_variant(product)
    selling_price = int(variant.buy_once if variant is not None and variant.buy_once is not None else product.buy_once)
    mrp = _list_price(product, variant, selling_price)
    stock_quantity = int(variant.stock_quantity or 0) if variant is not None else int(product.stock_quantity or 0)
    subscription = variant.subscription if variant is not None and variant.subscription is not None else product.subscription

    return {
        "id": product.id,
        "name": product.name,
        "size": (variant.size_label if variant else None) or product.size,
        "buyOnce": selling_price,
        # 0 means "no MRP to show" — the client must not draw a strike-through.
        "mrp": mrp,
        "discountPercent": js_round(((mrp - selling_price) / mrp) * 100) if mrp > 0 else 0,
        "subscription": int(subscription),
        "badge": _badge_label(product.badge),
        "foodType": product.food_type or "veg",
        "imageUrl": product.image_url,
        "description": product.description,
        "specifications": _specifications(product.specifications),
        "videoUrl": product.video_url,
        "videoPoster": product.video_poster,
        "ratingAvg": rating_avg,
        "reviewCount": review_count,
        "shelfLifeType": product.shelf_life_type or "short",
        "storageType": product.storage_type or "chilled",
        "gstRate": float(product.gst_rate or 0),
        "allowSubscription": bool(product.allow_subscription),
        "subscriptionFrequency": product.subscription_frequency,
        "stockQuantity": stock_quantity,
        "inStock": stock_quantity > 0,
        "isLowStock": 0 < stock_quantity <= (product.low_stock_threshold or 5),
        "subCategoryId": product.sub_category_id or None,
        "variants": [
            {
                "id": v.id,
                "sku": v.sku,
                "sizeLabel": v.size_label,
                "buyOnce": int(v.buy_once),
                "mrp": int(v.mrp_ecom) if int(v.mrp_ecom or 0) > int(v.buy_once) else 0,
                "subscription": int(v.subscription),
                "weightGrams": v.weight_grams,
                "isDefault": v.is_default,
                "stockQuantity": v.stock_quantity,
                "inStock": int(v.stock_quantity or 0) > 0,
            }
            for v in _app_variants(product)
        ],
    }


def _map_product_detail(product) -> dict:
    summary = map_product_summary(product)
    reviews = [r for r in (product.product_reviews or []) if r.is_published]
    cross_sells = []
    for cs in product.product_cross_sells_product_cross_sells_product_idToproducts or []:
        related = cs.products_product_cross_sells_related_product_idToproducts
        cross_sells.append({
            "id": related.id,
            "name": related.name,
            "size": related.size,
            "buyOnce": int(related.buy_once),
            "imageUrl": related.image_url,
        })
    return {
        **summary,
        "categoryId": product.category_id,
        "categoryLabel": product.product_categories.label if product.product_categories else "",
        "crossSells": cross_sells,
        "reviews": [
            {
                "id": r.id,
                "customerName": r.customer_name,
                "rating": r.rating,
                "comment": r.comment or "",
                "createdAt": r.created_at,
            }
            for r in reviews
        ],
    }
