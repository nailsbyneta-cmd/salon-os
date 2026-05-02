-- Migration 0030: Rename snake_case columns in staff_commission to camelCase
-- (consistent with all other tenant-scoped tables)

ALTER TABLE "staff_commission"
  RENAME COLUMN "tenant_id"      TO "tenantId";

ALTER TABLE "staff_commission"
  RENAME COLUMN "staff_id"       TO "staffId";

ALTER TABLE "staff_commission"
  RENAME COLUMN "appointment_id" TO "appointmentId";

ALTER TABLE "staff_commission"
  RENAME COLUMN "revenue_chf"    TO "revenueChf";

ALTER TABLE "staff_commission"
  RENAME COLUMN "commission_chf" TO "commissionChf";

ALTER TABLE "staff_commission"
  RENAME COLUMN "recorded_at"    TO "recordedAt";

ALTER TABLE "staff_commission"
  RENAME COLUMN "paid_at"        TO "paidAt";

-- Recreate indexes with corrected column names
DROP INDEX IF EXISTS "idx_staff_commission_tenant_staff";
DROP INDEX IF EXISTS "idx_staff_commission_paid";

CREATE INDEX "idx_staff_commission_tenant_staff" ON "staff_commission" ("tenantId", "staffId", "recordedAt" DESC);
CREATE INDEX "idx_staff_commission_paid"         ON "staff_commission" ("tenantId", "paidAt") WHERE "paidAt" IS NULL;
