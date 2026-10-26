"""SQLAlchemy mapping of the existing Postgres schema.

Class and relationship names deliberately match the Prisma model/relation
names one-to-one (the schema was originally defined with Prisma):
Prisma's `include: { hubs: true }` is `customer.hubs` here. Import this
module as `m` (`from app import models as m`) so local variables like
`customers` never shadow a model class.

Nothing here creates or migrates tables — the schema is owned by the
existing database. Relationships are read-only; writes always set the
foreign-key column directly, as the Node code did.
"""
from datetime import datetime, timezone

from sqlalchemy import (
    JSON,
    BigInteger,
    Boolean,
    Column,
    Date,
    ForeignKey,
    Integer,
    Numeric,
    SmallInteger,
    String,
    Text,
    Time,
)
from sqlalchemy.dialects.postgresql import TIMESTAMP, UUID
from sqlalchemy.orm import relationship

from .db import Base


def utcnow() -> datetime:
    """Naive UTC "now" — what Prisma writes into `timestamp without time zone` columns."""
    return datetime.now(timezone.utc).replace(tzinfo=None)


def Uuid():
    return UUID(as_uuid=False)


def Ts(precision=0):
    return TIMESTAMP(timezone=False, precision=precision)


def one(target, fk):
    return relationship(target, foreign_keys=fk, viewonly=True, uselist=False)


def many(target, fk, order_by=None):
    return relationship(target, foreign_keys=fk, viewonly=True, uselist=True, order_by=order_by)


class carts(Base):
    __tablename__ = "carts"
    id = Column(Uuid(), primary_key=True)
    session_id = Column(String(255), unique=True, nullable=False)
    created_at = Column(Ts())
    updated_at = Column(Ts())
    cart_items = many("cart_items", "cart_items.cart_id")


class cart_items(Base):
    __tablename__ = "cart_items"
    id = Column(Uuid(), primary_key=True)
    cart_id = Column(Uuid(), ForeignKey("carts.id"), nullable=False)
    product_id = Column(String(255), ForeignKey("products.id"), nullable=False)
    quantity = Column(Integer, nullable=False, default=1)
    purchase_type = Column(String(255), nullable=False, default="BUY_ONCE")
    created_at = Column(Ts())
    updated_at = Column(Ts())
    variant_id = Column(Uuid(), ForeignKey("product_variants.id"))
    carts = one("carts", "cart_items.cart_id")
    products = one("products", "cart_items.product_id")
    product_variants = one("product_variants", "cart_items.variant_id")


class customer_wallets(Base):
    __tablename__ = "customer_wallets"
    id = Column(Uuid(), primary_key=True)
    customer_id = Column(Uuid(), ForeignKey("customers.id"), unique=True, nullable=False)
    balance = Column(BigInteger, nullable=False, default=0)
    created_at = Column(Ts())
    updated_at = Column(Ts())
    customers = one("customers", "customer_wallets.customer_id")


class customer_billings(Base):
    __tablename__ = "customer_billings"
    id = Column(Uuid(), primary_key=True)
    customer_id = Column(Uuid(), ForeignKey("customers.id"), nullable=False)
    bill_amount = Column(Integer, nullable=False)
    paid_amount = Column(Integer, nullable=False, default=0)
    remaining_amount = Column(Integer, nullable=False, default=0)
    from_date = Column(Date, nullable=False)
    to_date = Column(Date, nullable=False)
    status = Column(String(20), nullable=False, default="unpaid")
    created_at = Column(Ts())
    updated_at = Column(Ts())
    customers = one("customers", "customer_billings.customer_id")


class customers(Base):
    __tablename__ = "customers"
    id = Column(Uuid(), primary_key=True)
    phone = Column(String(255), unique=True, nullable=False)
    name = Column(String(255))
    address = Column(Text)
    orders_count = Column(Integer, nullable=False, default=0)
    leads_count = Column(Integer, nullable=False, default=0)
    last_seen_at = Column(Ts())
    notes = Column(Text)
    created_at = Column(Ts())
    updated_at = Column(Ts())
    email = Column(String(255))
    password = Column(String(255))
    flat_no = Column(String(255))
    society_name = Column(String(255))
    street_name = Column(String(255))
    landmark = Column(String(255))
    city = Column(String(255))
    state = Column(String(255))
    pincode = Column(String(10))
    loyalty_points = Column(Integer, nullable=False, default=0)
    is_active = Column(Boolean, nullable=False, default=True)
    referral_code = Column(String(12), unique=True)
    code = Column(String(20), unique=True)
    alternate_phone = Column(String(20))
    date_of_birth = Column(Date)
    residence_type = Column(String(50))
    area = Column(String(255))
    delivery_mode = Column(String(50), nullable=False, default="Ring the Bell")
    customer_type = Column(String(20), nullable=False, default="prepaid")
    registered_by = Column(String(20), nullable=False, default="customer")
    hub_id = Column(Uuid(), ForeignKey("hubs.id"))
    route_id = Column(Uuid(), ForeignKey("delivery_routes.id"))
    delivery_boy_id = Column(Uuid(), ForeignKey("delivery_boys.id"))
    delivery_sequence = Column(Integer, nullable=False, default=0)
    latitude = Column(Numeric(10, 7))
    longitude = Column(Numeric(10, 7))
    gst_number = Column(String(30))

    hubs = one("hubs", "customers.hub_id")
    delivery_routes = one("delivery_routes", "customers.route_id")
    delivery_boys = one("delivery_boys", "customers.delivery_boy_id")
    customer_wallets = one("customer_wallets", "customer_wallets.customer_id")
    activity_logs = many("activity_logs", "activity_logs.customer_id")
    customer_feedback = many("customer_feedback", "customer_feedback.customer_id")
    customer_delivery_boy_changes = many("customer_delivery_boy_changes", "customer_delivery_boy_changes.customer_id")
    delivery_records = many("delivery_records", "delivery_records.customer_id")
    vacations = many("vacations", "vacations.customer_id")
    customer_billings = many("customer_billings", "customer_billings.customer_id")
    coupon_redemptions = many("coupon_redemptions", "coupon_redemptions.customer_id")
    customer_addresses = many("customer_addresses", "customer_addresses.customer_id")
    orders = many("orders", "orders.customer_id")
    subscriptions = many("subscriptions", "subscriptions.customer_id")
    wallet_transactions = many("wallet_transactions", "wallet_transactions.customer_id")
    wallet_cash_requests = many("wallet_cash_requests", "wallet_cash_requests.customer_id")
    notification_recipients = many("notification_recipients", "notification_recipients.customer_id")
    customer_sessions = many("customer_sessions", "customer_sessions.customer_id")


class hubs(Base):
    __tablename__ = "hubs"
    id = Column(Uuid(), primary_key=True)
    name = Column(String(255), nullable=False)
    city = Column(String(255))
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(Ts())
    updated_at = Column(Ts())
    customers = many("customers", "customers.hub_id")
    delivery_routes = many("delivery_routes", "delivery_routes.hub_id")
    delivery_boys = many("delivery_boys", "delivery_boys.hub_id")


class customer_delivery_boy_changes(Base):
    __tablename__ = "customer_delivery_boy_changes"
    id = Column(Uuid(), primary_key=True)
    customer_id = Column(Uuid(), ForeignKey("customers.id"), nullable=False)
    old_delivery_boy_id = Column(Uuid())
    new_delivery_boy_id = Column(Uuid())
    narration = Column(Text)
    changed_by = Column(String(255))
    changed_at = Column(Ts(3), nullable=False, default=utcnow)
    customers = one("customers", "customer_delivery_boy_changes.customer_id")


class delivery_routes(Base):
    __tablename__ = "delivery_routes"
    id = Column(Uuid(), primary_key=True)
    name = Column(String(255), nullable=False)
    route_code = Column(String(255), unique=True, nullable=False)
    # Default '05:00:00' lives in the database itself.
    dispatch_time = Column(Time, nullable=False, server_default="05:00:00")
    city = Column(String(255))
    driver_id = Column(Uuid(), ForeignKey("delivery_boys.id"))
    hub_id = Column(Uuid(), ForeignKey("hubs.id"))
    sort_order = Column(Integer, nullable=False, default=0)
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(Ts())
    updated_at = Column(Ts())
    delivery_boys = one("delivery_boys", "delivery_routes.driver_id")
    hubs = one("hubs", "delivery_routes.hub_id")
    delivery_slots = many("delivery_slots", "delivery_slots.route_id")
    delivery_zones = many("delivery_zones", "delivery_zones.route_id")
    delivery_areas = many("delivery_areas", "delivery_areas.route_id")
    orders = many("orders", "orders.route_id")
    customers = many("customers", "customers.route_id")


class delivery_boys(Base):
    __tablename__ = "delivery_boys"
    id = Column(Uuid(), primary_key=True)
    name = Column(String(255), nullable=False)
    first_name = Column(String(255))
    middle_name = Column(String(255))
    last_name = Column(String(255))
    phone = Column(String(20))
    date_of_birth = Column(Date)
    address = Column(Text)
    city = Column(String(255))
    hub_id = Column(Uuid(), ForeignKey("hubs.id"))
    photo_url = Column(String(500))
    aadhar_url = Column(String(500))
    username = Column(String(100), unique=True)
    password = Column(String(255))
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(Ts())
    updated_at = Column(Ts())
    hubs = one("hubs", "delivery_boys.hub_id")
    delivery_routes = many("delivery_routes", "delivery_routes.driver_id")
    customers = many("customers", "customers.delivery_boy_id")
    delivery_records = many("delivery_records", "delivery_records.delivery_boy_id")
    notifications = many("notifications", "notifications.delivery_boy_id")


class delivery_areas(Base):
    __tablename__ = "delivery_areas"
    id = Column(Uuid(), primary_key=True)
    state = Column(String(255))
    city = Column(String(255))
    area_name = Column(String(255), nullable=False)
    area_pin = Column(String(10))
    is_serviceable = Column(Boolean, nullable=False, default=True)
    route_id = Column(Uuid(), ForeignKey("delivery_routes.id"))
    created_at = Column(Ts())
    updated_at = Column(Ts())
    delivery_routes = one("delivery_routes", "delivery_areas.route_id")
    sub_areas = many("sub_areas", "sub_areas.delivery_area_id")


class sub_areas(Base):
    __tablename__ = "sub_areas"
    id = Column(Uuid(), primary_key=True)
    delivery_area_id = Column(Uuid(), ForeignKey("delivery_areas.id"), nullable=False)
    name = Column(String(255), nullable=False)
    created_at = Column(Ts())
    updated_at = Column(Ts())
    delivery_areas = one("delivery_areas", "sub_areas.delivery_area_id")
    apartments = many("apartments", "apartments.sub_area_id")


class apartments(Base):
    __tablename__ = "apartments"
    id = Column(Uuid(), primary_key=True)
    sub_area_id = Column(Uuid(), ForeignKey("sub_areas.id"), nullable=False)
    name = Column(String(255), nullable=False)
    created_at = Column(Ts())
    updated_at = Column(Ts())
    sub_areas = one("sub_areas", "apartments.sub_area_id")


class delivery_records(Base):
    __tablename__ = "delivery_records"
    id = Column(Uuid(), primary_key=True)
    subscription_id = Column(Uuid(), ForeignKey("subscriptions.id"), nullable=False)
    customer_id = Column(Uuid(), ForeignKey("customers.id"), nullable=False)
    delivery_boy_id = Column(Uuid(), ForeignKey("delivery_boys.id"))
    delivery_date = Column(Date, nullable=False)
    product_id = Column(String(255), ForeignKey("products.id"), nullable=False)
    variant_id = Column(Uuid(), ForeignKey("product_variants.id"))
    quantity_ordered = Column(Numeric(6, 2), nullable=False, default=0)
    quantity_delivered = Column(Numeric(6, 2), nullable=False, default=0)
    pending_qty = Column(Numeric(6, 2), nullable=False, default=0)
    remark = Column(String(255))
    bottles_collected = Column(Integer, nullable=False, default=0)
    status = Column(String(20), nullable=False, default="delivered")
    delivered_at = Column(Ts())
    leak_photo_url = Column(String(500))
    delivery_photo_url = Column(String(500))
    created_at = Column(Ts())
    updated_at = Column(Ts())
    subscriptions = one("subscriptions", "delivery_records.subscription_id")
    customers = one("customers", "delivery_records.customer_id")
    delivery_boys = one("delivery_boys", "delivery_records.delivery_boy_id")
    products = one("products", "delivery_records.product_id")
    product_variants = one("product_variants", "delivery_records.variant_id")


class delivery_slots(Base):
    __tablename__ = "delivery_slots"
    id = Column(Uuid(), primary_key=True)
    label = Column(String(255), nullable=False)
    start_time = Column(Time, nullable=False)
    end_time = Column(Time, nullable=False)
    route_id = Column(Uuid(), ForeignKey("delivery_routes.id"))
    sort_order = Column(Integer, nullable=False, default=0)
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(Ts())
    updated_at = Column(Ts())
    delivery_routes = one("delivery_routes", "delivery_slots.route_id")


class delivery_zones(Base):
    __tablename__ = "delivery_zones"
    id = Column(Uuid(), primary_key=True)
    pincode = Column(String(10), unique=True, nullable=False)
    city = Column(String(255))
    area_name = Column(String(255))
    delivery_fee = Column(Integer, nullable=False, default=0)
    min_order_value = Column(Integer)
    route_id = Column(Uuid(), ForeignKey("delivery_routes.id"))
    is_serviceable = Column(Boolean, nullable=False, default=True)
    created_at = Column(Ts())
    updated_at = Column(Ts())
    delivery_routes = one("delivery_routes", "delivery_zones.route_id")


class inventory_batches(Base):
    __tablename__ = "inventory_batches"
    id = Column(Uuid(), primary_key=True)
    product_id = Column(String(255), ForeignKey("products.id"), nullable=False)
    variant_id = Column(Uuid(), ForeignKey("product_variants.id"))
    batch_number = Column(String(255), nullable=False)
    manufacturing_date = Column(Date, nullable=False)
    expiry_date = Column(Date, nullable=False)
    quantity = Column(Integer, nullable=False, default=0)
    storage_type = Column(String(255), nullable=False, default="chilled")
    notes = Column(Text)
    created_at = Column(Ts())
    updated_at = Column(Ts())
    products = one("products", "inventory_batches.product_id")
    product_variants = one("product_variants", "inventory_batches.variant_id")


class leads(Base):
    __tablename__ = "leads"
    id = Column(Uuid(), primary_key=True)
    name = Column(String(255), nullable=False)
    phone = Column(String(255), nullable=False)
    source = Column(String(255), nullable=False, default="free_sample")
    status = Column(String(255), nullable=False, default="new")
    message = Column(Text)
    notes = Column(Text)
    created_at = Column(Ts())
    updated_at = Column(Ts())


class order_items(Base):
    __tablename__ = "order_items"
    id = Column(Uuid(), primary_key=True)
    order_id = Column(Uuid(), ForeignKey("orders.id"), nullable=False)
    product_id = Column(String(255), nullable=False)
    product_name = Column(String(255), nullable=False)
    size = Column(String(255), nullable=False)
    quantity = Column(Integer, nullable=False)
    unit_price = Column(Integer, nullable=False)
    purchase_type = Column(String(255), nullable=False)
    line_total = Column(Integer, nullable=False)
    created_at = Column(Ts())
    updated_at = Column(Ts())
    variant_id = Column(Uuid(), ForeignKey("product_variants.id"))
    batch_number = Column(String(255))
    gst_rate = Column(Numeric(5, 2), nullable=False, default=0)
    tax_amount = Column(BigInteger, nullable=False, default=0)
    orders = one("orders", "order_items.order_id")
    product_variants = one("product_variants", "order_items.variant_id")


class orders(Base):
    __tablename__ = "orders"
    id = Column(Uuid(), primary_key=True)
    session_id = Column(String(255))
    customer_name = Column(String(255))
    phone = Column(String(255))
    address = Column(Text)
    status = Column(String(255), nullable=False, default="PENDING")
    total_amount = Column(Integer, nullable=False)
    created_at = Column(Ts())
    updated_at = Column(Ts())
    razorpay_order_id = Column(String(255))
    razorpay_payment_id = Column(String(255))
    payment_status = Column(String(255), nullable=False, default="pending")
    customer_id = Column(Uuid(), ForeignKey("customers.id"))
    pincode = Column(String(10))
    delivery_date = Column(Date)
    delivery_slot_id = Column(Uuid(), ForeignKey("delivery_slots.id"))
    route_id = Column(Uuid(), ForeignKey("delivery_routes.id"))
    subtotal = Column(BigInteger, nullable=False, default=0)
    tax_amount = Column(BigInteger, nullable=False, default=0)
    delivery_fee = Column(BigInteger, nullable=False, default=0)
    wallet_amount_used = Column(BigInteger, nullable=False, default=0)
    payment_method = Column(String(255), nullable=False, default="cod")
    invoice_number = Column(String(255))
    narration = Column(String(500))
    order_items = many("order_items", "order_items.order_id")
    customers = one("customers", "orders.customer_id")
    delivery_slots = one("delivery_slots", "orders.delivery_slot_id")
    delivery_routes = one("delivery_routes", "orders.route_id")


class product_categories(Base):
    __tablename__ = "product_categories"
    id = Column(String(255), primary_key=True)
    label = Column(String(255), nullable=False)
    tile = Column(String(255), nullable=False)
    image_url = Column(String(255))
    description = Column(Text)
    is_active = Column(Boolean, nullable=False, default=True)
    subscription_note = Column(String(255), nullable=False, default="30 days subscription")
    sort_order = Column(Integer, nullable=False, default=0)
    created_at = Column(Ts())
    updated_at = Column(Ts())
    products = many("products", "products.category_id")
    product_sub_categories = many("product_sub_categories", "product_sub_categories.category_id")


class product_sub_categories(Base):
    __tablename__ = "product_sub_categories"
    id = Column(String(255), primary_key=True)
    category_id = Column(String(255), ForeignKey("product_categories.id"), nullable=False)
    label = Column(String(255), nullable=False)
    image_url = Column(String(500))
    is_active = Column(Boolean, nullable=False, default=True)
    sort_order = Column(Integer, nullable=False, default=0)
    created_at = Column(Ts())
    updated_at = Column(Ts())
    product_categories = one("product_categories", "product_sub_categories.category_id")
    products = many("products", "products.sub_category_id")


class product_images(Base):
    __tablename__ = "product_images"
    id = Column(Uuid(), primary_key=True)
    product_id = Column(String(255), ForeignKey("products.id"), nullable=False)
    image_url = Column(String(500), nullable=False)
    sort_order = Column(Integer, nullable=False, default=0)
    created_at = Column(Ts())
    products = one("products", "product_images.product_id")


class product_cross_sells(Base):
    __tablename__ = "product_cross_sells"
    id = Column(Uuid(), primary_key=True)
    product_id = Column(String(255), ForeignKey("products.id"), nullable=False)
    related_product_id = Column(String(255), ForeignKey("products.id"), nullable=False)
    sort_order = Column(Integer, nullable=False, default=0)
    created_at = Column(Ts())
    updated_at = Column(Ts())
    products_product_cross_sells_product_idToproducts = one("products", "product_cross_sells.product_id")
    products_product_cross_sells_related_product_idToproducts = one("products", "product_cross_sells.related_product_id")


class product_reviews(Base):
    __tablename__ = "product_reviews"
    id = Column(Uuid(), primary_key=True)
    product_id = Column(String(255), ForeignKey("products.id"), nullable=False)
    customer_name = Column(String(255), nullable=False)
    rating = Column(SmallInteger, nullable=False, default=5)
    comment = Column(Text)
    is_published = Column(Boolean, nullable=False, default=True)
    sort_order = Column(Integer, nullable=False, default=0)
    created_at = Column(Ts())
    updated_at = Column(Ts())
    products = one("products", "product_reviews.product_id")


class product_variants(Base):
    __tablename__ = "product_variants"
    id = Column(Uuid(), primary_key=True)
    product_id = Column(String(255), ForeignKey("products.id"), nullable=False)
    sku = Column(String(255), unique=True, nullable=False)
    size_label = Column(String(255), nullable=False)
    buy_once = Column(Integer, nullable=False)
    subscription = Column(Integer, nullable=False)
    weight_grams = Column(Integer)
    sort_order = Column(Integer, nullable=False, default=0)
    is_default = Column(Boolean, nullable=False, default=False)
    stock_quantity = Column(Integer, nullable=False, default=0)
    city = Column(String(255))
    packets = Column(Integer, nullable=False, default=1)
    ltrs = Column(Numeric(6, 2))
    mrp_ecom = Column(Integer, nullable=False, default=0)
    bottle_applicable = Column(Boolean, nullable=False, default=False)
    pouch_applicable = Column(Boolean, nullable=False, default=False)
    out_of_stock = Column(Boolean, nullable=False, default=False)
    web_visibility = Column(Boolean, nullable=False, default=True)
    app_visibility = Column(Boolean, nullable=False, default=True)
    created_at = Column(Ts())
    updated_at = Column(Ts())
    products = one("products", "product_variants.product_id")


class products(Base):
    __tablename__ = "products"
    id = Column(String(255), primary_key=True)
    category_id = Column(String(255), ForeignKey("product_categories.id"), nullable=False)
    name = Column(String(255), nullable=False)
    size = Column(String(255), nullable=False)
    buy_once = Column(Integer, nullable=False)
    subscription = Column(Integer, nullable=False)
    badge = Column(String(255))
    video_url = Column(String(255))
    video_poster = Column(String(255))
    sort_order = Column(Integer, nullable=False, default=0)
    created_at = Column(Ts())
    updated_at = Column(Ts())
    image_url = Column(String(255))
    description = Column(Text)
    specifications = Column(JSON)
    shelf_life_type = Column(String(255), nullable=False, default="short")
    storage_type = Column(String(255), nullable=False, default="chilled")
    gst_rate = Column(Numeric(5, 2), nullable=False, default=0)
    is_tax_inclusive = Column(Boolean, nullable=False, default=True)
    subscription_frequency = Column(String(255))
    allow_subscription = Column(Boolean, nullable=False, default=True)
    stock_quantity = Column(Integer, nullable=False, default=0)
    low_stock_threshold = Column(Integer, nullable=False, default=5)
    is_active = Column(Boolean, nullable=False, default=True)
    sub_category_id = Column(String(255), ForeignKey("product_sub_categories.id"))
    product_type = Column(String(100))
    short_code = Column(String(50))
    discount = Column(Integer, nullable=False, default=0)
    hsn_code = Column(String(50))
    prepaid_getonce = Column(Boolean, nullable=False, default=True)
    prepaid_subscribe = Column(Boolean, nullable=False, default=True)
    postpaid_getonce = Column(Boolean, nullable=False, default=True)
    postpaid_subscribe = Column(Boolean, nullable=False, default=True)
    food_type = Column(String(20), nullable=False, default="veg")
    mrp = Column(Integer, nullable=False, default=0)

    product_categories = one("product_categories", "products.category_id")
    product_sub_categories = one("product_sub_categories", "products.sub_category_id")
    product_variants = many("product_variants", "product_variants.product_id")
    product_images = many("product_images", "product_images.product_id")
    product_reviews = many("product_reviews", "product_reviews.product_id")
    inventory_batches = many("inventory_batches", "inventory_batches.product_id")
    product_cross_sells_product_cross_sells_product_idToproducts = many(
        "product_cross_sells", "product_cross_sells.product_id"
    )
    subscriptions = many("subscriptions", "subscriptions.product_id")
    delivery_records = many("delivery_records", "delivery_records.product_id")


class referrals(Base):
    __tablename__ = "referrals"
    id = Column(Uuid(), primary_key=True)
    referrer_customer_id = Column(Uuid(), ForeignKey("customers.id"), nullable=False)
    referred_phone = Column(String(20), nullable=False)
    referred_customer_id = Column(Uuid(), ForeignKey("customers.id"))
    reward_amount = Column(Integer, nullable=False, default=50)
    status = Column(String(255), nullable=False, default="pending")
    created_at = Column(Ts())
    updated_at = Column(Ts())


class site_settings(Base):
    __tablename__ = "site_settings"
    key = Column(String(255), primary_key=True)
    value = Column(JSON, nullable=False)
    created_at = Column(Ts())
    updated_at = Column(Ts())


class app_banners(Base):
    __tablename__ = "app_banners"
    id = Column(Uuid(), primary_key=True)
    banner_type = Column(String(20), nullable=False)
    title = Column(String(255), nullable=False)
    media_url = Column(String(500), nullable=False)
    from_date = Column(Date)
    to_date = Column(Date)
    is_active = Column(Boolean, nullable=False, default=True)
    sort_order = Column(Integer, nullable=False, default=0)
    created_at = Column(Ts())
    updated_at = Column(Ts())


class subscriptions(Base):
    __tablename__ = "subscriptions"
    id = Column(Uuid(), primary_key=True)
    customer_id = Column(Uuid(), ForeignKey("customers.id"), nullable=False)
    product_id = Column(String(255), ForeignKey("products.id"), nullable=False)
    variant_id = Column(Uuid(), ForeignKey("product_variants.id"))
    frequency = Column(String(255), nullable=False, default="daily")
    # Only set when frequency = 'day_wise' — comma-separated ISO weekdays (1=Mon..7=Sun), e.g. "1,3,5".
    day_wise_days = Column(String(20))
    pending_day_wise_days = Column(String(20))
    quantity = Column(Integer, nullable=False, default=1)
    delivery_slot_id = Column(Uuid(), ForeignKey("delivery_slots.id"))
    delivery_mode_id = Column(Uuid(), ForeignKey("delivery_modes.id"))
    status = Column(String(255), nullable=False, default="active")
    start_date = Column(Date)
    next_delivery_date = Column(Date)
    paused_from = Column(Date)
    paused_until = Column(Date)
    wallet_auto_debit = Column(Boolean, nullable=False, default=False)
    cancel_reason_id = Column(Uuid(), ForeignKey("cancel_reasons.id"))
    cancel_note = Column(Text)
    cancelled_at = Column(Date)
    inactivated_at = Column(Date)
    rate = Column(Integer)
    custom_details = Column(String(500))
    plan_valid_days = Column(Integer)
    expires_at = Column(Date)
    pending_quantity = Column(Integer)
    pending_variant_id = Column(Uuid(), ForeignKey("product_variants.id"))
    pending_frequency = Column(String(255))
    pending_delivery_slot_id = Column(Uuid(), ForeignKey("delivery_slots.id"))
    pending_delivery_mode_id = Column(Uuid(), ForeignKey("delivery_modes.id"))
    change_effective_date = Column(Date)
    created_at = Column(Ts())
    updated_at = Column(Ts())

    customers = one("customers", "subscriptions.customer_id")
    delivery_slots = one("delivery_slots", "subscriptions.delivery_slot_id")
    delivery_modes = one("delivery_modes", "subscriptions.delivery_mode_id")
    products = one("products", "subscriptions.product_id")
    product_variants = one("product_variants", "subscriptions.variant_id")
    cancel_reasons = one("cancel_reasons", "subscriptions.cancel_reason_id")
    pending_variant = one("product_variants", "subscriptions.pending_variant_id")
    pending_delivery_slot = one("delivery_slots", "subscriptions.pending_delivery_slot_id")
    pending_delivery_mode = one("delivery_modes", "subscriptions.pending_delivery_mode_id")
    delivery_records = many("delivery_records", "delivery_records.subscription_id")
    activity_logs = many("activity_logs", "activity_logs.subscription_id")


class vacations(Base):
    __tablename__ = "vacations"
    id = Column(Uuid(), primary_key=True)
    customer_id = Column(Uuid(), ForeignKey("customers.id"), nullable=False)
    from_date = Column(Date, nullable=False)
    to_date = Column(Date, nullable=False)
    remark = Column(String(500))
    entry_by = Column(String(255))
    ended_by = Column(String(255))
    ended_at = Column(Ts())
    created_at = Column(Ts())
    updated_at = Column(Ts())
    customers = one("customers", "vacations.customer_id")


class wallet_cash_requests(Base):
    """A customer's request to add money by handing cash to the delivery staff
    instead of paying online. It sits "pending" (and counts toward the
    customer's reservedBalance) until an admin approves it — approving credits
    the wallet via a normal wallet_transactions row — or rejects it."""

    __tablename__ = "wallet_cash_requests"
    id = Column(Uuid(), primary_key=True)
    customer_id = Column(Uuid(), ForeignKey("customers.id"), nullable=False)
    amount = Column(Integer, nullable=False)
    requested_date = Column(Date, nullable=False)
    email = Column(String(255))
    status = Column(String(20), nullable=False, default="pending")
    notes = Column(Text)
    reviewed_by = Column(String(255))
    reviewed_at = Column(Ts(3))
    created_at = Column(Ts())
    updated_at = Column(Ts())
    customers = one("customers", "wallet_cash_requests.customer_id")


class wallet_transactions(Base):
    __tablename__ = "wallet_transactions"
    id = Column(Uuid(), primary_key=True)
    customer_id = Column(Uuid(), ForeignKey("customers.id"), nullable=False)
    type = Column(String(255), nullable=False)
    amount = Column(BigInteger, nullable=False)
    balance_after = Column(BigInteger, nullable=False)
    reference_type = Column(String(255))
    reference_id = Column(String(255))
    notes = Column(String(255))
    created_at = Column(Ts())
    updated_at = Column(Ts())
    customers = one("customers", "wallet_transactions.customer_id")


class wastage_logs(Base):
    __tablename__ = "wastage_logs"
    id = Column(Uuid(), primary_key=True)
    product_id = Column(String(255), ForeignKey("products.id"), nullable=False)
    variant_id = Column(Uuid(), ForeignKey("product_variants.id"))
    batch_number = Column(String(255))
    quantity = Column(Integer, nullable=False)
    reason = Column(String(255), nullable=False, default="expired")
    logged_at = Column(Ts(), nullable=False)
    notes = Column(Text)
    created_at = Column(Ts())
    updated_at = Column(Ts())


class activity_logs(Base):
    __tablename__ = "activity_logs"
    id = Column(Uuid(), primary_key=True)
    type = Column(String(50), nullable=False)
    subtype = Column(String(50))
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    customer_id = Column(Uuid(), ForeignKey("customers.id"))
    subscription_id = Column(Uuid(), ForeignKey("subscriptions.id"))
    effective_date = Column(Date)
    actor = Column(String(50))
    is_dismissed = Column(Boolean, nullable=False, default=False)
    created_at = Column(Ts(3), nullable=False, default=utcnow)
    customers = one("customers", "activity_logs.customer_id")
    subscriptions = one("subscriptions", "activity_logs.subscription_id")


class customer_feedback(Base):
    __tablename__ = "customer_feedback"
    id = Column(Uuid(), primary_key=True)
    customer_id = Column(Uuid(), ForeignKey("customers.id"), nullable=False)
    rating = Column(SmallInteger)
    comment = Column(Text)
    feedback_category_id = Column(Uuid(), ForeignKey("feedback_categories.id"))
    feedback_mode = Column(String(20), nullable=False, default="app")
    status = Column(String(20), nullable=False, default="new")
    reply = Column(Text)
    replied_by = Column(String(255))
    replied_at = Column(Ts(3))
    entry_by = Column(String(20), nullable=False, default="customer")
    type = Column(String(20), nullable=False, default="feedback")
    subject = Column(String(255))
    created_at = Column(Ts(3), nullable=False, default=utcnow)
    updated_at = Column(Ts())
    customers = one("customers", "customer_feedback.customer_id")
    feedback_categories = one("feedback_categories", "customer_feedback.feedback_category_id")
    feedback_status_logs = many("feedback_status_logs", "feedback_status_logs.feedback_id")


class customer_addresses(Base):
    __tablename__ = "customer_addresses"
    id = Column(Uuid(), primary_key=True)
    customer_id = Column(Uuid(), ForeignKey("customers.id"), nullable=False)
    title = Column(String(100), nullable=False, default="Home")
    flat_no = Column(String(255))
    society_name = Column(String(255))
    street_name = Column(String(255))
    landmark = Column(String(255))
    city = Column(String(255))
    state = Column(String(255))
    pincode = Column(String(10), nullable=False)
    is_default = Column(Boolean, nullable=False, default=False)
    created_at = Column(Ts())
    updated_at = Column(Ts())


class revoked_admin_tokens(Base):
    __tablename__ = "revoked_admin_tokens"
    jti = Column(String(64), primary_key=True)
    expires_at = Column(Ts(), nullable=False)


class content_pages(Base):
    __tablename__ = "content_pages"
    id = Column(Uuid(), primary_key=True)
    slug = Column(String(100), unique=True, nullable=False)
    title = Column(String(255), nullable=False)
    content = Column(Text, nullable=False, default="")
    is_active = Column(Boolean, nullable=False, default=True)
    sort_order = Column(Integer, nullable=False, default=0)
    created_at = Column(Ts())
    updated_at = Column(Ts())


class coupons(Base):
    __tablename__ = "coupons"
    id = Column(Uuid(), primary_key=True)
    code = Column(String(50), unique=True, nullable=False)
    title = Column(String(255), nullable=False)
    description = Column(String(500))
    discount_type = Column(String(10), nullable=False, default="percent")
    discount_value = Column(Integer, nullable=False, default=0)
    min_order_amount = Column(Integer, nullable=False, default=0)
    max_discount_amount = Column(Integer)
    valid_from = Column(Date)
    valid_to = Column(Date)
    usage_limit_per_customer = Column(Integer, nullable=False, default=1)
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(Ts())
    updated_at = Column(Ts())
    coupon_redemptions = many("coupon_redemptions", "coupon_redemptions.coupon_id")


class coupon_redemptions(Base):
    __tablename__ = "coupon_redemptions"
    id = Column(Uuid(), primary_key=True)
    coupon_id = Column(Uuid(), ForeignKey("coupons.id"), nullable=False)
    customer_id = Column(Uuid(), ForeignKey("customers.id"), nullable=False)
    order_id = Column(Uuid())
    created_at = Column(Ts())


class feedback_categories(Base):
    __tablename__ = "feedback_categories"
    id = Column(Uuid(), primary_key=True)
    name = Column(String(255), nullable=False)
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(Ts())
    updated_at = Column(Ts())
    customer_feedback = many("customer_feedback", "customer_feedback.feedback_category_id")


class feedback_status_logs(Base):
    __tablename__ = "feedback_status_logs"
    id = Column(Uuid(), primary_key=True)
    feedback_id = Column(Uuid(), ForeignKey("customer_feedback.id"), nullable=False)
    status = Column(String(20), nullable=False)
    note = Column(Text)
    changed_by = Column(String(255))
    created_at = Column(Ts())


class admin_users(Base):
    __tablename__ = "admin_users"
    id = Column(Uuid(), primary_key=True)
    name = Column(Text, nullable=False)
    email = Column(Text, unique=True, nullable=False)
    password = Column(Text, nullable=False)
    created_at = Column(Ts(3), nullable=False, default=utcnow)
    updated_at = Column(Ts(3), nullable=False, default=utcnow, onupdate=utcnow)


class staff_types(Base):
    __tablename__ = "staff_types"
    id = Column(Uuid(), primary_key=True)
    name = Column(String(255), nullable=False)
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(Ts())
    updated_at = Column(Ts())
    office_staff = many("office_staff", "office_staff.staff_type_id")
    access_controls = many("access_controls", "access_controls.staff_type_id")


class office_staff(Base):
    __tablename__ = "office_staff"
    id = Column(Uuid(), primary_key=True)
    staff_type_id = Column(Uuid(), ForeignKey("staff_types.id"), nullable=False)
    name = Column(String(255), nullable=False)
    email = Column(String(255), unique=True, nullable=False)
    contact_no = Column(String(20), nullable=False)
    address = Column(Text)
    username = Column(String(100), unique=True, nullable=False)
    password = Column(String(255), nullable=False)
    photo_url = Column(String(500))
    aadhar_url = Column(String(500))
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(Ts())
    updated_at = Column(Ts())
    staff_types = one("staff_types", "office_staff.staff_type_id")
    access_controls = one("access_controls", "access_controls.office_staff_id")


class access_controls(Base):
    __tablename__ = "access_controls"
    id = Column(Uuid(), primary_key=True)
    staff_type_id = Column(Uuid(), ForeignKey("staff_types.id"), nullable=False)
    office_staff_id = Column(Uuid(), ForeignKey("office_staff.id"), unique=True, nullable=False)
    created_at = Column(Ts())
    updated_at = Column(Ts())
    staff_types = one("staff_types", "access_controls.staff_type_id")
    office_staff = one("office_staff", "access_controls.office_staff_id")
    access_control_permissions = many("access_control_permissions", "access_control_permissions.access_control_id")


class access_control_permissions(Base):
    __tablename__ = "access_control_permissions"
    id = Column(Uuid(), primary_key=True)
    access_control_id = Column(Uuid(), ForeignKey("access_controls.id"), nullable=False)
    module_key = Column(String(100), nullable=False)
    can_create = Column(Boolean, nullable=False, default=False)
    can_update = Column(Boolean, nullable=False, default=False)
    can_view = Column(Boolean, nullable=False, default=False)
    can_pdf = Column(Boolean, nullable=False, default=False)
    can_excel = Column(Boolean, nullable=False, default=False)


class delivery_modes(Base):
    __tablename__ = "delivery_modes"
    id = Column(Uuid(), primary_key=True)
    name = Column(String(255), nullable=False)
    icon_url = Column(String(500))
    is_active = Column(Boolean, nullable=False, default=True)
    sort_order = Column(Integer, nullable=False, default=0)
    created_at = Column(Ts())
    updated_at = Column(Ts())


class delivery_charge_tiers(Base):
    __tablename__ = "delivery_charge_tiers"
    id = Column(Uuid(), primary_key=True)
    charge_from = Column(Integer, nullable=False)
    charge_to = Column(Integer, nullable=False)
    charge = Column(Integer, nullable=False)
    created_at = Column(Ts())
    updated_at = Column(Ts())


class cancel_reasons(Base):
    __tablename__ = "cancel_reasons"
    id = Column(Uuid(), primary_key=True)
    reason = Column(String(255), nullable=False)
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(Ts())
    updated_at = Column(Ts())
    subscriptions = many("subscriptions", "subscriptions.cancel_reason_id")


class notifications(Base):
    __tablename__ = "notifications"
    id = Column(Uuid(), primary_key=True)
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    is_active_filter = Column(String(10))
    customer_type = Column(String(20))
    city = Column(String(255))
    subscription_status = Column(String(20))
    delivery_boy_id = Column(Uuid(), ForeignKey("delivery_boys.id"))
    recipient_count = Column(Integer, nullable=False, default=0)
    sent_by = Column(String(255))
    created_at = Column(Ts())
    delivery_boys = one("delivery_boys", "notifications.delivery_boy_id")
    notification_recipients = many("notification_recipients", "notification_recipients.notification_id")


class notification_recipients(Base):
    __tablename__ = "notification_recipients"
    id = Column(Uuid(), primary_key=True)
    notification_id = Column(Uuid(), ForeignKey("notifications.id"), nullable=False)
    customer_id = Column(Uuid(), ForeignKey("customers.id"), nullable=False)
    is_read = Column(Boolean, nullable=False, default=False)
    read_at = Column(Ts(3))
    created_at = Column(Ts())
    notifications = one("notifications", "notification_recipients.notification_id")
    customers = one("customers", "notification_recipients.customer_id")


class customer_otps(Base):
    """Pending login OTPs. In the database rather than process memory so a restart
    mid-login doesn't turn a freshly sent OTP into "invalid OTP"."""

    __tablename__ = "customer_otps"
    id = Column(Uuid(), primary_key=True)
    phone = Column(String(20), unique=True, nullable=False)
    otp = Column(String(10), nullable=False)
    expires_at = Column(Ts(3), nullable=False)
    created_at = Column(Ts())


class customer_sessions(Base):
    """Customer app login sessions. Kept in the database (not process memory) so a
    backend restart or deploy doesn't sign every customer out."""

    __tablename__ = "customer_sessions"
    id = Column(Uuid(), primary_key=True)
    session_id = Column(String(255), unique=True, nullable=False)
    customer_id = Column(Uuid(), ForeignKey("customers.id"), nullable=False)
    expires_at = Column(Ts(3), nullable=False)
    last_seen_at = Column(Ts(3))
    created_at = Column(Ts())
    customers = one("customers", "customer_sessions.customer_id")


class farm_visit_requests(Base):
    __tablename__ = "farm_visit_requests"
    id = Column(Uuid(), primary_key=True)
    name = Column(String(255), nullable=False)
    contact_no = Column(String(20), nullable=False)
    number_of_persons = Column(Integer, nullable=False)
    address = Column(Text, nullable=False)
    visit_date = Column(Date, nullable=False)
    visit_time_slot = Column(String(50), nullable=False)
    reply = Column(Text)
    replied_by = Column(String(255))
    replied_at = Column(Ts(3))
    created_at = Column(Ts())
    updated_at = Column(Ts())
