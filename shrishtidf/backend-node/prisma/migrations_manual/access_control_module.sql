-- User Access Control module: per-employee permission matrix across admin panel modules

CREATE TABLE IF NOT EXISTS "access_controls" (
  "id" UUID PRIMARY KEY,
  "staff_type_id" UUID NOT NULL,
  "office_staff_id" UUID NOT NULL UNIQUE,
  "created_at" TIMESTAMP(0),
  "updated_at" TIMESTAMP(0),
  CONSTRAINT "access_controls_staff_type_id_foreign" FOREIGN KEY ("staff_type_id") REFERENCES "staff_types" ("id"),
  CONSTRAINT "access_controls_office_staff_id_foreign" FOREIGN KEY ("office_staff_id") REFERENCES "office_staff" ("id") ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS "access_controls_staff_type_id_index" ON "access_controls" ("staff_type_id");

CREATE TABLE IF NOT EXISTS "access_control_permissions" (
  "id" UUID PRIMARY KEY,
  "access_control_id" UUID NOT NULL,
  "module_key" VARCHAR(100) NOT NULL,
  "can_create" BOOLEAN NOT NULL DEFAULT false,
  "can_update" BOOLEAN NOT NULL DEFAULT false,
  "can_view" BOOLEAN NOT NULL DEFAULT false,
  "can_pdf" BOOLEAN NOT NULL DEFAULT false,
  "can_excel" BOOLEAN NOT NULL DEFAULT false,
  CONSTRAINT "access_control_permissions_access_control_id_foreign" FOREIGN KEY ("access_control_id") REFERENCES "access_controls" ("id") ON DELETE CASCADE,
  CONSTRAINT "access_control_permissions_access_control_id_module_key_unique" UNIQUE ("access_control_id", "module_key")
);
CREATE INDEX IF NOT EXISTS "access_control_permissions_access_control_id_index" ON "access_control_permissions" ("access_control_id");
