-- Complaint support: reuse customer_feedback for complaints via a type flag + subject line
ALTER TABLE "customer_feedback" ADD COLUMN IF NOT EXISTS "type" VARCHAR(20) NOT NULL DEFAULT 'feedback';
ALTER TABLE "customer_feedback" ADD COLUMN IF NOT EXISTS "subject" VARCHAR(255);
ALTER TABLE "customer_feedback" ALTER COLUMN "rating" DROP NOT NULL;
CREATE INDEX IF NOT EXISTS "customer_feedback_type_index" ON "customer_feedback" ("type");

-- Admin-managed content: About Us, Terms & Conditions, Privacy Policy, and any future page
CREATE TABLE IF NOT EXISTS "content_pages" (
  "id" UUID PRIMARY KEY,
  "slug" VARCHAR(100) NOT NULL UNIQUE,
  "title" VARCHAR(255) NOT NULL,
  "content" TEXT NOT NULL DEFAULT '',
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "sort_order" INT NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(0),
  "updated_at" TIMESTAMP(0)
);
CREATE INDEX IF NOT EXISTS "content_pages_sort_order_index" ON "content_pages" ("sort_order");

INSERT INTO "content_pages" ("id", "slug", "title", "content", "sort_order", "created_at", "updated_at")
VALUES
  (gen_random_uuid(), 'about_us', 'About Us', 'Shrishti Dairy Farm delivers farm-fresh, A2 milk and dairy products straight from our farm to your doorstep every day.', 0, now(), now()),
  (gen_random_uuid(), 'terms_conditions', 'Terms & Conditions', 'These are the terms and conditions governing the use of the Shrishti Dairy Farm app and services. Please contact us if you have any questions.', 1, now(), now()),
  (gen_random_uuid(), 'privacy_policy', 'Privacy Policy', 'We respect your privacy. Your personal data is used only to fulfil your orders and subscriptions and is never shared with third parties without consent.', 2, now(), now())
ON CONFLICT ("slug") DO NOTHING;

-- Coupons
CREATE TABLE IF NOT EXISTS "coupons" (
  "id" UUID PRIMARY KEY,
  "code" VARCHAR(50) NOT NULL UNIQUE,
  "title" VARCHAR(255) NOT NULL,
  "description" VARCHAR(500),
  "discount_type" VARCHAR(10) NOT NULL DEFAULT 'percent',
  "discount_value" INT NOT NULL DEFAULT 0,
  "min_order_amount" INT NOT NULL DEFAULT 0,
  "max_discount_amount" INT,
  "valid_from" DATE,
  "valid_to" DATE,
  "usage_limit_per_customer" INT NOT NULL DEFAULT 1,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(0),
  "updated_at" TIMESTAMP(0)
);
CREATE INDEX IF NOT EXISTS "coupons_is_active_index" ON "coupons" ("is_active");
CREATE INDEX IF NOT EXISTS "coupons_valid_to_index" ON "coupons" ("valid_to");

CREATE TABLE IF NOT EXISTS "coupon_redemptions" (
  "id" UUID PRIMARY KEY,
  "coupon_id" UUID NOT NULL,
  "customer_id" UUID NOT NULL,
  "order_id" UUID,
  "created_at" TIMESTAMP(0),
  CONSTRAINT "coupon_redemptions_coupon_id_foreign" FOREIGN KEY ("coupon_id") REFERENCES "coupons" ("id") ON DELETE CASCADE,
  CONSTRAINT "coupon_redemptions_customer_id_foreign" FOREIGN KEY ("customer_id") REFERENCES "customers" ("id") ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS "coupon_redemptions_coupon_id_index" ON "coupon_redemptions" ("coupon_id");
CREATE INDEX IF NOT EXISTS "coupon_redemptions_customer_id_index" ON "coupon_redemptions" ("customer_id");
