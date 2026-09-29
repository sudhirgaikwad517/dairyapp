-- Catalog display fields used by the category-products screen in the app and website.
--
-- food_type  : veg / non_veg — drives the green/brown FSSAI mark next to a product name.
-- badge      : already existed as a free-text column; it is now a curated tag
--              ("Must Try", "New", ...). Nothing to migrate, kept here for context.
-- mrp        : product-level list price. The per-city variants already carry
--              mrp_ecom; this is the fallback for products sold as a single pack
--              so the app can show a struck-through MRP without inventing one.

ALTER TABLE products ADD COLUMN IF NOT EXISTS food_type VARCHAR(20) NOT NULL DEFAULT 'veg';
ALTER TABLE products ADD COLUMN IF NOT EXISTS mrp INTEGER NOT NULL DEFAULT 0;

-- Seed the new mrp column from the default variant's ecom MRP where one exists,
-- so existing products immediately show a correct strike-through price.
UPDATE products p
SET mrp = v.mrp_ecom
FROM product_variants v
WHERE v.product_id = p.id
  AND v.is_default = TRUE
  AND v.mrp_ecom > p.buy_once
  AND p.mrp = 0;

CREATE INDEX IF NOT EXISTS products_is_active_index ON products (is_active);
