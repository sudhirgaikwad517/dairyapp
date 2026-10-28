"""
Sample catalogue so the app has something to show: dairy products in five categories, home-screen
banners, a banner video and product reviews. Every row it makes is marked as sample, so it can be
taken out again without touching real data.

Run inside the backend container:
    docker compose exec backend python -m sample_data.load                # add / refresh
    docker compose exec backend python -m sample_data.load --remove       # take it out again

Pictures and videos are copied to uploads/sample/ and linked as <base-url>/uploads/sample/<file>
(--base-url, default https://shrishtidairyfarm.com). Photo credits: sample_data/CREDITS.md.
"""
import argparse
import shutil
import uuid
from pathlib import Path

from sqlalchemy import delete, select, update
from sqlalchemy.exc import IntegrityError

from app import models as m
from app.config import UPLOADS_DIR
from app.db import SessionLocal

MEDIA = Path(__file__).resolve().parent / "media"
NS = uuid.UUID("5d1c1f0e-6a51-4c55-9a43-2f1e0c0de001")


def sid(*parts) -> str:
    """The same uuid every run, so running again updates the sample rows instead of adding more."""
    return str(uuid.uuid5(NS, ":".join(parts)))


CATEGORIES = [
    # id, label, tile, picture, note
    ("sample_cat_curd", "Curd & Paneer", "var(--tile-2)", "paneer.jpg", "Made fresh every day"),
    ("sample_cat_ghee", "Ghee & Butter", "var(--tile-3)", "ghee.jpg", "30 days subscription"),
    ("sample_cat_drinks", "Chaas & Lassi", "var(--tile-4)", "lassi.jpg", "30 days subscription"),
    ("sample_cat_sweets", "Dairy Sweets", "var(--tile-5)", "shrikhand.jpg", "Order a day ahead"),
]

# Milk goes in the existing Milk category (cat_milk); the others in the sample categories above.
# sizes: (label, buy once, subscription, mrp, grams/ml)
PRODUCTS = [
    dict(id="sample_cow_milk", cat="cat_milk", name="Cow Milk", picture="cow-milk.jpg", badge="Popular", gst=0,
         sizes=[("1 L", 72, 68, 76, 1000), ("500 ML", 37, 35, 39, 500)], subscribe=True, shelf="short", storage="chilled",
         video="cow-milk-video.mp4", poster="cow-milk-video-poster.jpg",
         text="Fresh cow milk, chilled right after milking and delivered the same morning. Boil before use.",
         specs={"Fat": "3.5% or more", "Shelf life": "2 days in the fridge", "Storage": "Keep below 4°C"}),
    dict(id="sample_full_cream_milk", cat="cat_milk", name="Full Cream Milk", picture="farm-milk.jpg", badge="New", gst=0,
         sizes=[("1 L", 78, 74, 82, 1000), ("500 ML", 40, 38, 42, 500)], subscribe=True, shelf="short", storage="chilled",
         text="Rich, creamy whole milk for tea, coffee and sweets.",
         specs={"Fat": "6% or more", "Shelf life": "2 days in the fridge"}),
    dict(id="sample_curd", cat="sample_cat_curd", name="Fresh Curd", picture="curd.jpg", badge="", gst=0,
         sizes=[("500 G", 45, 42, 48, 500), ("1 KG", 85, 80, 90, 1000)], subscribe=True, shelf="short", storage="chilled",
         text="Thick, mildly sour dahi set from our own milk.",
         specs={"Shelf life": "3 days in the fridge"}),
    dict(id="sample_matka_dahi", cat="sample_cat_curd", name="Matka Dahi", picture="matka-dahi.jpg", badge="Must Try", gst=0,
         sizes=[("400 G", 60, 0, 65, 400)], subscribe=False, shelf="short", storage="chilled",
         text="Curd set in a clay pot, the old way. Creamy on top, firm inside.",
         specs={"Shelf life": "2 days in the fridge"}),
    dict(id="sample_paneer", cat="sample_cat_curd", name="Fresh Paneer", picture="paneer.jpg", badge="Popular", gst=5,
         sizes=[("200 G", 90, 0, 95, 200), ("500 G", 210, 0, 225, 500)], subscribe=False, shelf="short", storage="chilled",
         text="Soft malai paneer made every morning. Ideal for curries, tikka and bhurji.",
         specs={"Shelf life": "3 days in the fridge"}),
    dict(id="sample_khoa", cat="sample_cat_curd", name="Khoa (Mawa)", picture="khoa.jpg", badge="Seasonal", gst=5,
         sizes=[("250 G", 120, 0, 130, 250)], subscribe=False, shelf="short", storage="chilled",
         text="Slow-cooked milk solids for pedas, barfi and gulab jamun.",
         specs={"Shelf life": "4 days in the fridge"}),
    dict(id="sample_ghee", cat="sample_cat_ghee", name="Desi Cow Ghee", picture="ghee.jpg", badge="Best Value", gst=12,
         sizes=[("500 ML", 450, 0, 480, 500), ("1 L", 880, 0, 940, 1000)], subscribe=False, shelf="long", storage="ambient",
         text="Ghee made from cultured cream, with a grainy texture and rich aroma.",
         specs={"Shelf life": "9 months", "Storage": "Cool, dry place"}),
    dict(id="sample_butter", cat="sample_cat_ghee", name="Table Butter", picture="butter.jpg", badge="", gst=12,
         sizes=[("100 G", 58, 0, 60, 100), ("500 G", 270, 0, 285, 500)], subscribe=False, shelf="long", storage="chilled",
         text="Creamy salted butter for toast, parathas and baking.",
         specs={"Shelf life": "3 months in the fridge"}),
    dict(id="sample_chaas", cat="sample_cat_drinks", name="Masala Chaas", picture="chaas.jpg", badge="", gst=0,
         sizes=[("200 ML", 15, 14, 16, 200), ("500 ML", 30, 28, 32, 500)], subscribe=True, shelf="short", storage="chilled",
         text="Cool spiced buttermilk with cumin, ginger and coriander.",
         specs={"Shelf life": "2 days in the fridge"}),
    dict(id="sample_lassi", cat="sample_cat_drinks", name="Sweet Lassi", picture="lassi.jpg", badge="Seasonal", gst=12,
         sizes=[("200 ML", 35, 0, 38, 200)], subscribe=False, shelf="short", storage="chilled",
         text="Thick sweet lassi topped with malai.",
         specs={"Shelf life": "2 days in the fridge"}),
    dict(id="sample_shrikhand", cat="sample_cat_sweets", name="Kesar Shrikhand", picture="shrikhand.jpg", badge="Seasonal", gst=12,
         sizes=[("250 G", 110, 0, 120, 250)], subscribe=False, shelf="short", storage="chilled",
         text="Hung curd sweetened with sugar, saffron and cardamom, topped with pistachio.",
         specs={"Shelf life": "5 days in the fridge"}),
]

REVIEWS = {
    "sample_cow_milk": [("Priya S.", 5, "Fresh every morning, my kids love it."),
                        ("Rahul P.", 5, "Tastes like the milk from my village."),
                        ("Anita K.", 4, "Good milk, delivery always on time.")],
    "sample_paneer": [("Sneha J.", 5, "Very soft paneer, perfect for paneer butter masala."),
                      ("Amit D.", 5, "Fresh and does not break while cooking.")],
    "sample_ghee": [("Meena R.", 5, "Smells just like homemade ghee."),
                    ("Vikas T.", 4, "Good taste, a little costly but worth it.")],
    "sample_matka_dahi": [("Kiran M.", 5, "Thick and creamy, just like the old days.")],
    "sample_shrikhand": [("Pooja N.", 5, "Perfect sweetness, lots of kesar.")],
}

# Home screen: picture banners (in this order) and one banner video
BANNERS = [("Farm fresh milk", "banner-1.jpg"), ("Subscribe & save", "banner-2.jpg"), ("Paneer, curd & ghee", "banner-3.jpg")]
BANNER_VIDEO = ("Our cows", "banner-video.mp4")

# Photos under a Creative Commons licence that asks for credit (see CREDITS.md)
PHOTO_CREDITS = {
    "paneer.jpg": "Sonja Pauen, CC BY 2.0 DE",
    "ghee.jpg": "Phadke09, CC BY-SA 4.0",
    "curd.jpg": "Vivekdoshi11, CC BY-SA 4.0",
    "matka-dahi.jpg": "Goumisao, CC BY-SA 4.0",
    "chaas.jpg": "Dr. Satish Upalkar, CC BY-SA 4.0",
    "lassi.jpg": "Ravi Dwivedi, CC BY-SA 4.0",
    "butter.jpg": "Qwertyxp2000, CC BY 4.0",
}


def media_url(base: str, name: str) -> str:
    return f"{base}/uploads/sample/{name}"


def copy_media() -> None:
    target = UPLOADS_DIR / "sample"
    target.mkdir(parents=True, exist_ok=True)
    for f in MEDIA.iterdir():
        shutil.copy2(f, target / f.name)


def load(base: str) -> None:
    copy_media()
    now = m.utcnow()
    with SessionLocal() as db:
        milk = db.get(m.product_categories, "cat_milk")
        if milk is None:
            db.merge(m.product_categories(id="cat_milk", label="Milk", tile="var(--tile-1)", image_url=media_url(base, "cow-milk.jpg"),
                                          is_active=True, subscription_note="30 days subscription", sort_order=1,
                                          created_at=now, updated_at=now))
        for k, (cid, label, tile, picture, note) in enumerate(CATEGORIES, start=2):
            db.merge(m.product_categories(id=cid, label=label, tile=tile, image_url=media_url(base, picture), is_active=True,
                                          subscription_note=note, sort_order=k, created_at=now, updated_at=now))
        db.flush()

        for order, p in enumerate(PRODUCTS, start=1):
            first = p["sizes"][0]
            credit = PHOTO_CREDITS.get(p["picture"])
            description = p["text"] + (f"\n\nPhoto: {credit}, via Wikimedia Commons." if credit else "")
            db.merge(m.products(
                id=p["id"], category_id=p["cat"], name=p["name"], size=first[0], buy_once=first[1],
                subscription=first[2] or first[1], mrp=first[3], badge=p["badge"] or None,
                discount=round((first[3] - first[1]) * 100 / first[3]) if first[3] > first[1] else 0,
                video_url=media_url(base, p["video"]) if p.get("video") else None,
                video_poster=media_url(base, p["poster"]) if p.get("poster") else None,
                image_url=media_url(base, p["picture"]), description=description,
                specifications=[{"key": k, "value": v} for k, v in p["specs"].items()],
                shelf_life_type=p["shelf"], storage_type=p["storage"], gst_rate=p["gst"], is_tax_inclusive=True,
                allow_subscription=p["subscribe"], prepaid_subscribe=p["subscribe"], postpaid_subscribe=p["subscribe"],
                stock_quantity=100, low_stock_threshold=5, is_active=True, food_type="veg", sort_order=order,
                created_at=now, updated_at=now,
            ))
            db.flush()
            for k, (label, once, sub, mrp, amount) in enumerate(p["sizes"]):
                db.merge(m.product_variants(
                    id=sid("variant", p["id"], label), product_id=p["id"], sku=f"{p['id'].upper()}-{label.replace(' ', '')}",
                    size_label=label, buy_once=once, subscription=sub or once, mrp_ecom=mrp, weight_grams=amount,
                    ltrs=amount / 1000 if label.endswith("L") else None, sort_order=k, is_default=(k == 0),
                    stock_quantity=100, created_at=now, updated_at=now,
                ))
            db.merge(m.product_images(id=sid("image", p["id"]), product_id=p["id"], image_url=media_url(base, p["picture"]),
                                      sort_order=0, created_at=now))
            for k, (who, stars, comment) in enumerate(REVIEWS.get(p["id"], [])):
                db.merge(m.product_reviews(id=sid("review", p["id"], str(k)), product_id=p["id"], customer_name=who, rating=stars,
                                           comment=comment, is_published=True, sort_order=k, created_at=now, updated_at=now))

        for k, (title, file) in enumerate(BANNERS):
            db.merge(m.app_banners(id=sid("banner", file), banner_type="image", title=f"{title} (sample)", media_url=media_url(base, file),
                                   is_active=True, sort_order=k, created_at=now, updated_at=now))
        db.merge(m.app_banners(id=sid("banner", BANNER_VIDEO[1]), banner_type="video", title=f"{BANNER_VIDEO[0]} (sample)",
                               media_url=media_url(base, BANNER_VIDEO[1]), is_active=True, sort_order=0, created_at=now, updated_at=now))
        db.commit()
    print(f"Sample data added: {len(CATEGORIES)} categories, {len(PRODUCTS)} products, {len(BANNERS)} banners and a banner video.")


def remove() -> None:
    with SessionLocal() as db:
        ids = [p["id"] for p in PRODUCTS]
        banner_ids = [sid("banner", f) for _, f in BANNERS] + [sid("banner", BANNER_VIDEO[1])]
        db.execute(delete(m.app_banners).where(m.app_banners.id.in_(banner_ids)))
        db.execute(delete(m.product_reviews).where(m.product_reviews.product_id.in_(ids)))
        db.execute(delete(m.product_images).where(m.product_images.product_id.in_(ids)))
        db.commit()
        kept = []
        for pid in ids:
            try:
                with db.begin_nested():
                    db.execute(delete(m.product_variants).where(m.product_variants.product_id == pid))
                    db.execute(delete(m.products).where(m.products.id == pid))
            except IntegrityError:
                # Ordered or in a cart already: switch it off instead, orders keep it
                db.execute(update(m.products).where(m.products.id == pid).values(is_active=False))
                kept.append(pid)
        for cid, *_ in CATEGORIES:
            in_use = db.scalar(select(m.products.id).where(m.products.category_id == cid).limit(1))
            if in_use:
                db.execute(update(m.product_categories).where(m.product_categories.id == cid).values(is_active=False))
            else:
                db.execute(delete(m.product_categories).where(m.product_categories.id == cid))
        db.commit()
    shutil.rmtree(UPLOADS_DIR / "sample", ignore_errors=True)
    print("Sample data removed." + (f" Switched off (already ordered): {', '.join(kept)}." if kept else ""))


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--remove", action="store_true", help="take the sample data out again")
    parser.add_argument("--base-url", default="https://shrishtidairyfarm.com", help="site the pictures are served from")
    args = parser.parse_args()
    remove() if args.remove else load(args.base_url.rstrip("/"))
