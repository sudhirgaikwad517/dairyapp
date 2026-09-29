-- Pending login OTPs move out of process memory, so a restart mid-login
-- doesn't invalidate an OTP the customer just received.
CREATE TABLE IF NOT EXISTS "customer_otps" (
  "id" UUID PRIMARY KEY,
  "phone" VARCHAR(20) NOT NULL UNIQUE,
  "otp" VARCHAR(10) NOT NULL,
  "expires_at" TIMESTAMP NOT NULL,
  "created_at" TIMESTAMP(0)
);
CREATE INDEX IF NOT EXISTS "customer_otps_expires_at_index" ON "customer_otps" ("expires_at");
