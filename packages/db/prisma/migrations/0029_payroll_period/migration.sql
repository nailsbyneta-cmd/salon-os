-- Migration 0029: Payroll Period tracking

CREATE TYPE "PayrollStatus" AS ENUM ('OPEN', 'CLOSED', 'EXPORTED');

CREATE TABLE "payroll_period" (
  "id"              UUID          NOT NULL DEFAULT gen_random_uuid(),
  "tenantId"        UUID          NOT NULL,
  "staffId"         UUID,
  "fromDate"        DATE          NOT NULL,
  "toDate"          DATE          NOT NULL,
  "status"          "PayrollStatus" NOT NULL DEFAULT 'OPEN',
  "totalRevenueChf" DECIMAL(10,2) NOT NULL,
  "totalCommChf"    DECIMAL(10,2) NOT NULL,
  "commissionCount" INTEGER       NOT NULL,
  "exportedAt"      TIMESTAMPTZ,
  "closedAt"        TIMESTAMPTZ,
  "createdAt"       TIMESTAMPTZ   NOT NULL DEFAULT now(),

  CONSTRAINT "payroll_period_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "payroll_period_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenant"("id") ON DELETE CASCADE,
  CONSTRAINT "payroll_period_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "staff"("id") ON DELETE SET NULL
);

CREATE INDEX "payroll_period_tenantId_fromDate_idx" ON "payroll_period" ("tenantId", "fromDate" DESC);
CREATE INDEX "payroll_period_tenantId_staffId_idx" ON "payroll_period" ("tenantId", "staffId");

ALTER TABLE "payroll_period" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation" ON "payroll_period"
  USING ("tenantId" = current_setting('app.tenant_id', true)::uuid);
