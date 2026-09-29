-- Feedback module: master categories, richer customer_feedback ticket fields, status history log

CREATE TABLE IF NOT EXISTS "feedback_categories" (
  "id" UUID PRIMARY KEY,
  "name" VARCHAR(255) NOT NULL,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(0),
  "updated_at" TIMESTAMP(0)
);
CREATE INDEX IF NOT EXISTS "feedback_categories_is_active_index" ON "feedback_categories" ("is_active");

ALTER TABLE "customer_feedback"
  ALTER COLUMN "rating" DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS "feedback_category_id" UUID,
  ADD COLUMN IF NOT EXISTS "feedback_mode" VARCHAR(20) NOT NULL DEFAULT 'app',
  ADD COLUMN IF NOT EXISTS "status" VARCHAR(20) NOT NULL DEFAULT 'new',
  ADD COLUMN IF NOT EXISTS "reply" TEXT,
  ADD COLUMN IF NOT EXISTS "replied_by" VARCHAR(255),
  ADD COLUMN IF NOT EXISTS "replied_at" TIMESTAMP(0),
  ADD COLUMN IF NOT EXISTS "entry_by" VARCHAR(20) NOT NULL DEFAULT 'customer',
  ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMP(0);

ALTER TABLE "customer_feedback"
  ADD CONSTRAINT "customer_feedback_category_id_foreign"
  FOREIGN KEY ("feedback_category_id") REFERENCES "feedback_categories" ("id");

CREATE INDEX IF NOT EXISTS "customer_feedback_status_index" ON "customer_feedback" ("status");
CREATE INDEX IF NOT EXISTS "customer_feedback_category_id_index" ON "customer_feedback" ("feedback_category_id");

CREATE TABLE IF NOT EXISTS "feedback_status_logs" (
  "id" UUID PRIMARY KEY,
  "feedback_id" UUID NOT NULL,
  "status" VARCHAR(20) NOT NULL,
  "note" TEXT,
  "changed_by" VARCHAR(255),
  "created_at" TIMESTAMP(0),
  CONSTRAINT "feedback_status_logs_feedback_id_foreign" FOREIGN KEY ("feedback_id") REFERENCES "customer_feedback" ("id") ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS "feedback_status_logs_feedback_id_index" ON "feedback_status_logs" ("feedback_id");
