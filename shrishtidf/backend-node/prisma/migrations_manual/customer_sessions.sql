-- Customer app sessions move from process memory into the database, so a
-- backend restart / deploy no longer logs every customer out.

CREATE TABLE IF NOT EXISTS "customer_sessions" (
  "id" UUID PRIMARY KEY,
  "session_id" VARCHAR(255) NOT NULL UNIQUE,
  "customer_id" UUID NOT NULL,
  "expires_at" TIMESTAMP NOT NULL,
  "last_seen_at" TIMESTAMP,
  "created_at" TIMESTAMP(0),
  CONSTRAINT "customer_sessions_customer_id_foreign" FOREIGN KEY ("customer_id") REFERENCES "customers" ("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "customer_sessions_customer_id_index" ON "customer_sessions" ("customer_id");
CREATE INDEX IF NOT EXISTS "customer_sessions_expires_at_index" ON "customer_sessions" ("expires_at");
