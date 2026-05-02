-- Migration 0028: Promo Codes, Client Memberships, POS Refunds

-- ─── Promo Codes ──────────────────────────────────────────────

CREATE TYPE "PromoCodeType" AS ENUM ('PERCENT', 'FIXED');

CREATE TABLE "promo_code" (
  "id"           UUID          NOT NULL DEFAULT gen_random_uuid(),
  "tenantId"     UUID          NOT NULL,
  "code"         TEXT          NOT NULL,
  "type"         "PromoCodeType" NOT NULL,
  "value"        DECIMAL(10,2) NOT NULL,
  "currency"     CHAR(3),
  "minOrderChf"  DECIMAL(10,2),
  "maxUsages"    INTEGER,
  "usages"       INTEGER       NOT NULL DEFAULT 0,
  "active"       BOOLEAN       NOT NULL DEFAULT true,
  "expiresAt"    TIMESTAMPTZ,
  "note"         TEXT,
  "createdAt"    TIMESTAMPTZ   NOT NULL DEFAULT now(),
  "updatedAt"    TIMESTAMPTZ   NOT NULL DEFAULT now(),

  CONSTRAINT "promo_code_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "promo_code_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenant"("id") ON DELETE CASCADE,
  CONSTRAINT "promo_code_tenantId_code_key" UNIQUE ("tenantId", "code")
);

CREATE INDEX "promo_code_tenantId_active_idx" ON "promo_code" ("tenantId", "active");

ALTER TABLE "promo_code" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation" ON "promo_code"
  USING ("tenantId" = current_setting('app.tenant_id', true)::uuid);

-- ─── Membership Plans ─────────────────────────────────────────

CREATE TYPE "BillingCycle" AS ENUM ('MONTHLY', 'QUARTERLY', 'ANNUAL');
CREATE TYPE "MembershipStatus" AS ENUM ('ACTIVE', 'PAUSED', 'CANCELLED', 'EXPIRED');

CREATE TABLE "membership_plan" (
  "id"              UUID          NOT NULL DEFAULT gen_random_uuid(),
  "tenantId"        UUID          NOT NULL,
  "name"            TEXT          NOT NULL,
  "description"     TEXT,
  "priceChf"        DECIMAL(10,2) NOT NULL,
  "billingCycle"    "BillingCycle" NOT NULL,
  "sessionCredits"  INTEGER,
  "discountPct"     INTEGER,
  "active"          BOOLEAN       NOT NULL DEFAULT true,
  "createdAt"       TIMESTAMPTZ   NOT NULL DEFAULT now(),
  "updatedAt"       TIMESTAMPTZ   NOT NULL DEFAULT now(),

  CONSTRAINT "membership_plan_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "membership_plan_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenant"("id") ON DELETE CASCADE
);

CREATE INDEX "membership_plan_tenantId_active_idx" ON "membership_plan" ("tenantId", "active");

ALTER TABLE "membership_plan" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation" ON "membership_plan"
  USING ("tenantId" = current_setting('app.tenant_id', true)::uuid);

-- ─── Client Memberships ───────────────────────────────────────

CREATE TABLE "client_membership" (
  "id"              UUID             NOT NULL DEFAULT gen_random_uuid(),
  "tenantId"        UUID             NOT NULL,
  "clientId"        UUID             NOT NULL,
  "planId"          UUID             NOT NULL,
  "status"          "MembershipStatus" NOT NULL DEFAULT 'ACTIVE',
  "startedAt"       TIMESTAMPTZ      NOT NULL DEFAULT now(),
  "nextBillingAt"   TIMESTAMPTZ,
  "cancelledAt"     TIMESTAMPTZ,
  "creditsUsed"     INTEGER          NOT NULL DEFAULT 0,
  "createdAt"       TIMESTAMPTZ      NOT NULL DEFAULT now(),
  "updatedAt"       TIMESTAMPTZ      NOT NULL DEFAULT now(),

  CONSTRAINT "client_membership_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "client_membership_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenant"("id") ON DELETE CASCADE,
  CONSTRAINT "client_membership_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "client"("id") ON DELETE CASCADE,
  CONSTRAINT "client_membership_planId_fkey" FOREIGN KEY ("planId") REFERENCES "membership_plan"("id") ON DELETE RESTRICT
);

CREATE INDEX "client_membership_tenantId_clientId_idx" ON "client_membership" ("tenantId", "clientId");
CREATE INDEX "client_membership_tenantId_status_idx" ON "client_membership" ("tenantId", "status");

ALTER TABLE "client_membership" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation" ON "client_membership"
  USING ("tenantId" = current_setting('app.tenant_id', true)::uuid);

-- ─── POS Refunds ──────────────────────────────────────────────

CREATE TABLE "pos_refund" (
  "id"              UUID          NOT NULL DEFAULT gen_random_uuid(),
  "tenantId"        UUID          NOT NULL,
  "appointmentId"   UUID          NOT NULL,
  "amount"          DECIMAL(10,2) NOT NULL,
  "paymentMethod"   TEXT          NOT NULL,
  "reason"          TEXT,
  "notes"           TEXT,
  "refundedById"    UUID,
  "refundedAt"      TIMESTAMPTZ   NOT NULL DEFAULT now(),
  "createdAt"       TIMESTAMPTZ   NOT NULL DEFAULT now(),

  CONSTRAINT "pos_refund_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "pos_refund_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenant"("id") ON DELETE CASCADE,
  CONSTRAINT "pos_refund_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "appointment"("id") ON DELETE CASCADE,
  CONSTRAINT "pos_refund_refundedById_fkey" FOREIGN KEY ("refundedById") REFERENCES "staff"("id") ON DELETE SET NULL
);

CREATE INDEX "pos_refund_tenantId_appointmentId_idx" ON "pos_refund" ("tenantId", "appointmentId");
CREATE INDEX "pos_refund_tenantId_refundedAt_idx" ON "pos_refund" ("tenantId", "refundedAt" DESC);

ALTER TABLE "pos_refund" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation" ON "pos_refund"
  USING ("tenantId" = current_setting('app.tenant_id', true)::uuid);
