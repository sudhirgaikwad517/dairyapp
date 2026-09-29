-- Farm Visit Request module: public request form + admin reply

CREATE TABLE IF NOT EXISTS "farm_visit_requests" (
  "id" UUID PRIMARY KEY,
  "name" VARCHAR(255) NOT NULL,
  "contact_no" VARCHAR(20) NOT NULL,
  "number_of_persons" INTEGER NOT NULL,
  "address" TEXT NOT NULL,
  "visit_date" DATE NOT NULL,
  "visit_time_slot" VARCHAR(50) NOT NULL,
  "reply" TEXT,
  "replied_by" VARCHAR(255),
  "replied_at" TIMESTAMP(0),
  "created_at" TIMESTAMP(0),
  "updated_at" TIMESTAMP(0)
);
CREATE INDEX IF NOT EXISTS "farm_visit_requests_visit_date_index" ON "farm_visit_requests" ("visit_date");
CREATE INDEX IF NOT EXISTS "farm_visit_requests_created_at_index" ON "farm_visit_requests" ("created_at");
