-- Notifications module: bulk/filtered notifications + per-customer delivery + read tracking

CREATE TABLE IF NOT EXISTS "notifications" (
  "id" UUID PRIMARY KEY,
  "title" VARCHAR(255) NOT NULL,
  "message" TEXT NOT NULL,
  "is_active_filter" VARCHAR(10),
  "customer_type" VARCHAR(20),
  "city" VARCHAR(255),
  "subscription_status" VARCHAR(20),
  "delivery_boy_id" UUID,
  "recipient_count" INTEGER NOT NULL DEFAULT 0,
  "sent_by" VARCHAR(255),
  "created_at" TIMESTAMP(0)
);
CREATE INDEX IF NOT EXISTS "notifications_created_at_index" ON "notifications" ("created_at");

CREATE TABLE IF NOT EXISTS "notification_recipients" (
  "id" UUID PRIMARY KEY,
  "notification_id" UUID NOT NULL,
  "customer_id" UUID NOT NULL,
  "is_read" BOOLEAN NOT NULL DEFAULT false,
  "read_at" TIMESTAMP(0),
  "created_at" TIMESTAMP(0),
  CONSTRAINT "notification_recipients_notification_id_foreign" FOREIGN KEY ("notification_id") REFERENCES "notifications" ("id") ON DELETE CASCADE,
  CONSTRAINT "notification_recipients_customer_id_foreign" FOREIGN KEY ("customer_id") REFERENCES "customers" ("id") ON DELETE CASCADE,
  CONSTRAINT "notification_recipients_notification_id_customer_id_unique" UNIQUE ("notification_id", "customer_id")
);
CREATE INDEX IF NOT EXISTS "notification_recipients_notification_id_index" ON "notification_recipients" ("notification_id");
CREATE INDEX IF NOT EXISTS "notification_recipients_customer_id_index" ON "notification_recipients" ("customer_id");

CREATE INDEX IF NOT EXISTS "notifications_delivery_boy_id_index" ON "notifications" ("delivery_boy_id");
ALTER TABLE "notifications"
  ADD CONSTRAINT "notifications_delivery_boy_id_foreign"
  FOREIGN KEY ("delivery_boy_id") REFERENCES "delivery_boys" ("id");
