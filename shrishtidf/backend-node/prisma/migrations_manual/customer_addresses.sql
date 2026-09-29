-- Address book: lets a customer save multiple delivery addresses instead of
-- just the single set of address fields embedded on their profile.
CREATE TABLE IF NOT EXISTS "customer_addresses" (
  "id" UUID PRIMARY KEY,
  "customer_id" UUID NOT NULL,
  "title" VARCHAR(100) NOT NULL DEFAULT 'Home',
  "flat_no" VARCHAR(255),
  "society_name" VARCHAR(255),
  "street_name" VARCHAR(255),
  "landmark" VARCHAR(255),
  "city" VARCHAR(255),
  "state" VARCHAR(255),
  "pincode" VARCHAR(10) NOT NULL,
  "is_default" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMP(0),
  "updated_at" TIMESTAMP(0),
  CONSTRAINT "customer_addresses_customer_id_foreign" FOREIGN KEY ("customer_id") REFERENCES "customers" ("id") ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS "customer_addresses_customer_id_index" ON "customer_addresses" ("customer_id");

-- Backfill: each existing customer's single embedded address becomes their
-- first, default saved address so nobody loses what they already entered.
INSERT INTO "customer_addresses" ("id", "customer_id", "title", "flat_no", "society_name", "street_name", "landmark", "city", "state", "pincode", "is_default", "created_at", "updated_at")
SELECT gen_random_uuid(), c."id", 'Home', c."flat_no", c."society_name", c."street_name", c."landmark", c."city", c."state", c."pincode", true, now(), now()
FROM "customers" c
WHERE c."pincode" IS NOT NULL AND c."pincode" <> ''
  AND NOT EXISTS (SELECT 1 FROM "customer_addresses" ca WHERE ca."customer_id" = c."id");
