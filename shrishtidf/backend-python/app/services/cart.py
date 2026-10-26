import uuid

from sqlalchemy import delete, select, update
from sqlalchemy.orm import Session, selectinload

from .. import models as m
from ..core.http import ServiceError


def _cart_query():
    return select(m.carts).options(
        selectinload(m.carts.cart_items)
        .selectinload(m.cart_items.products)
        .selectinload(m.products.product_categories),
        selectinload(m.carts.cart_items).selectinload(m.cart_items.product_variants),
    )


def empty_cart(session_id: str) -> dict:
    return {"id": "", "sessionId": session_id, "items": [], "itemCount": 0, "totalAmount": 0}


def get_cart_by_session(db: Session, session_id: str) -> dict:
    cart = db.scalar(_cart_query().where(m.carts.session_id == session_id).execution_options(populate_existing=True))
    return _map_cart(cart) if cart else empty_cart(session_id)


_UNSET = object()


def add_cart_item(db: Session, session_id: str, product_id: str, purchase_type: str = "BUY_ONCE",
                  quantity: int = 1, variant_id=_UNSET) -> dict:
    product = db.scalar(
        select(m.products).options(selectinload(m.products.product_variants)).where(m.products.id == product_id)
    )
    if product is None:
        raise ServiceError("PRODUCT_NOT_FOUND")

    # The app and website already hide these, but the API is reachable
    # directly — a hidden or sold-out product must not enter a cart.
    if not product.is_active:
        raise ServiceError("PRODUCT_UNAVAILABLE")

    variants = product.product_variants
    if variant_id is not _UNSET and variant_id:
        variant = next((v for v in variants if v.id == variant_id), None)
    else:
        variant = next((v for v in variants if v.is_default), None) or (variants[0] if variants else None)

    if variant_id is not _UNSET and variant_id and variant is None:
        raise ServiceError("VARIANT_NOT_FOUND")
    if variant is not None and (variant.out_of_stock or variant.stock_quantity <= 0):
        raise ServiceError("OUT_OF_STOCK")
    if variant is None and product.stock_quantity <= 0:
        raise ServiceError("OUT_OF_STOCK")

    now = m.utcnow()
    cart = db.scalar(select(m.carts).where(m.carts.session_id == session_id))
    if cart is None:
        cart = m.carts(id=str(uuid.uuid4()), session_id=session_id, created_at=now, updated_at=now)
        db.add(cart)
        db.flush()

    conditions = [
        m.cart_items.cart_id == cart.id,
        m.cart_items.product_id == product_id,
        m.cart_items.purchase_type == purchase_type,
    ]
    # An omitted variantId matched any line of this product in the Node
    # version (Prisma drops `undefined` filters); an explicit null means
    # "the line without a variant".
    if variant_id is not _UNSET:
        conditions.append(m.cart_items.variant_id.is_(None) if variant_id is None else m.cart_items.variant_id == variant_id)
    item = db.scalar(select(m.cart_items).where(*conditions).limit(1))
    if variant_id is _UNSET:
        variant_id = None
    if item is not None:
        item.quantity = item.quantity + quantity
        item.updated_at = now
    else:
        db.add(m.cart_items(
            id=str(uuid.uuid4()),
            cart_id=cart.id,
            product_id=product_id,
            variant_id=variant_id,
            purchase_type=purchase_type,
            quantity=quantity,
            created_at=now,
            updated_at=now,
        ))
    db.commit()
    return get_cart_by_session(db, session_id)


def update_cart_item_quantity(db: Session, session_id: str, item_id: str, quantity: int) -> dict:
    cart = db.scalar(select(m.carts).where(m.carts.session_id == session_id))
    if cart is None:
        raise ServiceError("CART_NOT_FOUND")

    if quantity <= 0:
        db.execute(delete(m.cart_items).where(m.cart_items.cart_id == cart.id, m.cart_items.id == item_id))
    else:
        db.execute(
            update(m.cart_items)
            .where(m.cart_items.cart_id == cart.id, m.cart_items.id == item_id)
            .values(quantity=quantity, updated_at=m.utcnow())
        )
    db.commit()
    return get_cart_by_session(db, session_id)


def remove_cart_item(db: Session, session_id: str, item_id: str) -> dict:
    cart = db.scalar(select(m.carts).where(m.carts.session_id == session_id))
    if cart is None:
        raise ServiceError("CART_NOT_FOUND")
    db.execute(delete(m.cart_items).where(m.cart_items.cart_id == cart.id, m.cart_items.id == item_id))
    db.commit()
    return get_cart_by_session(db, session_id)


def clear_cart(db: Session, session_id: str) -> dict:
    cart = db.scalar(select(m.carts).where(m.carts.session_id == session_id))
    if cart is None:
        return empty_cart(session_id)
    db.execute(delete(m.cart_items).where(m.cart_items.cart_id == cart.id))
    db.commit()
    return get_cart_by_session(db, session_id)


def _map_cart(cart: "m.carts") -> dict:
    items = [_map_cart_item(item) for item in cart.cart_items]
    return {
        "id": cart.id,
        "sessionId": cart.session_id,
        "items": items,
        "itemCount": sum(i["quantity"] for i in items),
        "totalAmount": sum(i["lineTotal"] for i in items),
    }


def _map_cart_item(item: "m.cart_items") -> dict:
    product = item.products
    variant = item.product_variants
    source = variant if variant is not None else product
    unit_price = int(source.subscription if item.purchase_type == "SUBSCRIPTION" else source.buy_once)

    return {
        "id": item.id,
        "productId": product.id,
        "variantId": variant.id if variant else None,
        "name": product.name,
        "size": (variant.size_label if variant else None) or product.size,
        "imageUrl": product.image_url,
        "categoryLabel": product.product_categories.label if product.product_categories else None,
        "badge": product.badge or "",
        "quantity": item.quantity,
        "purchaseType": item.purchase_type,
        "unitPrice": unit_price,
        "lineTotal": unit_price * item.quantity,
        "storageType": product.storage_type or "chilled",
        "shelfLifeType": product.shelf_life_type or "short",
    }
