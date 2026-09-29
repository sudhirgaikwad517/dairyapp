-- Lets an admin/staff JWT be invalidated on logout instead of staying valid
-- for its full 7-day lifetime no matter what.
CREATE TABLE IF NOT EXISTS "revoked_admin_tokens" (
  "jti" VARCHAR(64) PRIMARY KEY,
  "expires_at" TIMESTAMP(0) NOT NULL
);
CREATE INDEX IF NOT EXISTS "revoked_admin_tokens_expires_at_index" ON "revoked_admin_tokens" ("expires_at");
