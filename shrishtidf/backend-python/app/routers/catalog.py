"""Public, no-login endpoints: catalog, banners, content, enquiries."""
import uuid

from fastapi import APIRouter, Request
from sqlalchemy import and_, or_, select

from .. import models as m
from ..core.dates import format_date_only, parse_date_only, utc_today
from ..core.deps import DB, Body
from ..core.http import fail, fail_nested, guard, js_number, ok, query, truthy
from ..services import product as product_service
from ..services.activity_log import log_activity
from ..services.cutoff import get_earliest_effective_date

router = APIRouter()

PUBLIC_CACHE = {"Cache-Control": "public, s-maxage=60, stale-while-revalidate=300"}


@router.get("/products")
@guard()
def products_index(request: Request, db: DB):
    listing = product_service.get_products_list(db)
    category_id = query(request, "category")
    search = query(request, "q")

    products = listing["data"]["products"]
    if isinstance(search, str) and search.strip() != "":
        products = product_service.search_products(db, search)
    elif category_id:
        products = [p for p in products if p["categoryId"] == category_id]

    return ok(
        {"categories": listing["data"]["categories"], "products": products, "source": listing["source"]},
        headers=PUBLIC_CACHE,
    )


@router.get("/products/{id}")
@guard()
def products_show(id: str, db: DB):
    product = product_service.get_product_by_id(db, id)
    if product is None:
        return fail(404, "Product not found", "NOT_FOUND")
    return ok(product, headers=PUBLIC_CACHE)


@router.get("/categories")
@guard()
def categories_index(db: DB):
    return ok(product_service.get_categories(db), headers=PUBLIC_CACHE)


@router.get("/categories/{id}")
@guard()
def categories_show(id: str, request: Request, db: DB):
    """Category header + sub-category chips + products, for the category screen."""
    sub_category = query(request, "subCategory") or None
    result = product_service.get_category_with_products(db, id, sub_category)
    if result is None:
        return fail(404, "Category not found", "NOT_FOUND")
    return ok(result, headers=PUBLIC_CACHE)


@router.get("/site-content")
@guard(nested=True)
def site_content():
    return ok({
        "heroBadge": "Farm Fresh Certified A2 Milk",
        "freeSampleButtonLabel": "Request Free Sample",
        "whatsappNumber": "+919876543210",
        "promoMessages": ["Free Delivery on all orders", "Subscribe & Save 10%"],
    })


@router.post("/leads")
@guard(nested=True)
def leads_create(body: Body, db: DB):
    name, phone, message = body.get("name"), body.get("phone"), body.get("message")
    if not truthy(name) or not truthy(phone):
        return fail_nested(400, "Name and phone are required")

    now = m.utcnow()
    db.add(m.leads(
        id=str(uuid.uuid4()),
        name=name,
        phone=phone,
        source=body.get("source") or "free_sample",
        status="new",
        message=message or None,
        created_at=now,
        updated_at=now,
    ))
    db.commit()

    log_activity(
        db,
        type="enquiry",
        title="New Enquiry",
        message=f"{name} ({phone}) submitted an enquiry{': ' + str(message) if message else '.'}",
    )
    return ok({})


@router.get("/banners")
@guard(nested=True)
def banners(db: DB):
    today = utc_today()
    date_filter = or_(
        and_(m.app_banners.from_date.is_(None), m.app_banners.to_date.is_(None)),
        and_(m.app_banners.from_date <= today, m.app_banners.to_date.is_(None)),
        and_(m.app_banners.from_date.is_(None), m.app_banners.to_date >= today),
        and_(m.app_banners.from_date <= today, m.app_banners.to_date >= today),
    )
    base = select(m.app_banners).where(m.app_banners.is_active.is_(True), date_filter).order_by(m.app_banners.sort_order)
    images = db.scalars(base.where(m.app_banners.banner_type == "image")).all()
    video = db.scalar(base.where(m.app_banners.banner_type == "video").limit(1))
    return ok({
        "topBanners": [b.media_url for b in images],
        "secondBannerVideo": video.media_url if video else "",
    })


@router.get("/cutoff-info")
@guard()
def cutoff_info(db: DB):
    cutoff_time, earliest = get_earliest_effective_date(db)
    return ok({"cutoffTime": cutoff_time, "earliestEffectiveDate": format_date_only(earliest)})


@router.post("/farm-visits")
@guard()
def farm_visit_create(body: Body, db: DB):
    name = body.get("name")
    contact_no = body.get("contactNo")
    number_of_persons = body.get("numberOfPersons")
    address = body.get("address")
    visit_date = body.get("visitDate")
    visit_time_slot = body.get("visitTimeSlot")
    if not all(truthy(v) for v in (name, contact_no, number_of_persons, address, visit_date, visit_time_slot)):
        return fail(422, "All fields are required")

    persons = js_number(number_of_persons)
    if not truthy(persons) or persons < 1:
        return fail(422, "Number of persons must be at least 1")
    persons = int(persons)

    now = m.utcnow()
    row = m.farm_visit_requests(
        id=str(uuid.uuid4()),
        name=name,
        contact_no=contact_no,
        number_of_persons=persons,
        address=address,
        visit_date=parse_date_only(visit_date),
        visit_time_slot=visit_time_slot,
        created_at=now,
        updated_at=now,
    )
    db.add(row)
    db.commit()

    log_activity(
        db,
        type="enquiry",
        title="Farm Visit Request",
        message=f"{name} ({contact_no}) requested a farm visit on {visit_date}, {visit_time_slot} for {persons} person(s).",
    )
    return ok({"id": row.id}, status=201)


@router.get("/content-pages")
@guard()
def content_pages_index(request: Request, db: DB):
    """"Policies" list screen — every active page except the one excluded
    (About Us, which the app links to directly from the menu)."""
    stmt = select(m.content_pages).where(m.content_pages.is_active.is_(True))
    exclude = query(request, "exclude")
    if exclude:
        stmt = stmt.where(m.content_pages.slug != exclude)
    pages = db.scalars(stmt.order_by(m.content_pages.sort_order)).all()
    return ok([{"id": p.id, "slug": p.slug, "title": p.title} for p in pages])


@router.get("/content-pages/{slug}")
@guard()
def content_pages_show(slug: str, db: DB):
    page = db.scalar(
        select(m.content_pages).where(m.content_pages.slug == slug, m.content_pages.is_active.is_(True)).limit(1)
    )
    if page is None:
        return fail(404, "Page not found")
    return ok({"slug": page.slug, "title": page.title, "content": page.content, "updatedAt": page.updated_at})


@router.get("/coupons")
@guard()
def coupons_index(db: DB):
    """"All Coupons" screen — active coupons whose validity window covers today."""
    today = utc_today()
    rows = db.scalars(
        select(m.coupons)
        .where(
            m.coupons.is_active.is_(True),
            or_(m.coupons.valid_from.is_(None), m.coupons.valid_from <= today),
            or_(m.coupons.valid_to.is_(None), m.coupons.valid_to >= today),
        )
        .order_by(m.coupons.created_at.desc())
    ).all()
    return ok([
        {
            "id": c.id,
            "code": c.code,
            "title": c.title,
            "description": c.description,
            "discountType": c.discount_type,
            "discountValue": c.discount_value,
            "minOrderAmount": c.min_order_amount,
            "maxDiscountAmount": c.max_discount_amount,
            "validTo": c.valid_to,
        }
        for c in rows
    ])


SPLASH_KEY = "splash_image_url"
LOGIN_KEY = "login_image_url"


def resolve_asset_url(request: Request, relative_path) -> str | None:
    if not relative_path:
        return None
    return f"{request.url.scheme}://{request.headers.get('host')}/{relative_path}"


@router.get("/app-assets")
@guard()
def app_assets(request: Request, db: DB):
    """Splash + login screen images, when the admin uploaded a custom one —
    the app falls back to its bundled default when either is null."""
    splash = db.get(m.site_settings, SPLASH_KEY)
    login = db.get(m.site_settings, LOGIN_KEY)
    return ok({
        "splashImageUrl": resolve_asset_url(request, splash.value if splash else None),
        "loginImageUrl": resolve_asset_url(request, login.value if login else None),
    })


@router.get("/cancel-reasons")
@guard("Server Error")
def cancel_reasons(request: Request, db: DB):
    from .admin.settings import cancel_reasons_list

    return cancel_reasons_list(request, db, active_only=True)


@router.get("/delivery-modes")
@guard("Server Error")
def delivery_modes(request: Request, db: DB):
    from .admin.masters import delivery_modes_list

    return delivery_modes_list(request, db, active_only=True)
