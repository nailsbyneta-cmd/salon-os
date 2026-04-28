-- Loyalty: klassische Stempelkarte. Pro Tenant ein LoyaltyProgram, pro
-- Kundin Stamps. earnRule entscheidet wieviele Stamps pro Termin/CHF.
-- redeemThreshold = N Stamps werden in 1 Reward umgewandelt (= 1 free
-- Service o. Discount-Voucher).
--
-- Stamps-Lifecycle:
--   AWARD (delta>0)  ← bei Termin-COMPLETED autom. (manuell auch möglich)
--   REDEEM (delta<0) ← Reward eingelöst
--   ADJUST (delta±)  ← Manager-Korrektur
--   EXPIRE (delta<0) ← Auto-Expiry (Phase 2, optional)

CREATE TABLE "loyalty_program" (
  "id"                 UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenantId"           UUID NOT NULL,
  "name"               TEXT NOT NULL,
  "active"             BOOLEAN NOT NULL DEFAULT TRUE,
  -- earnRule: 'per_appointment' = 1 Stamp pro Termin, oder
  --           'per_chf' = 1 Stamp pro X CHF Umsatz (siehe earnPerUnit)
  "earnRule"           TEXT NOT NULL DEFAULT 'per_appointment',
  "earnPerUnit"        INTEGER NOT NULL DEFAULT 1,
  -- N Stamps = 1 Reward
  "redeemThreshold"    INTEGER NOT NULL DEFAULT 10,
  -- Wert des Rewards in CHF (information für Display, nicht enforced)
  "rewardValueChf"     NUMERIC(10,2) NOT NULL DEFAULT 0,
  "rewardLabel"        TEXT NOT NULL DEFAULT 'Gratis-Service',
  "createdAt"          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"          TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT "loyalty_program_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "loyalty_program_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "tenant"("id") ON DELETE CASCADE,
  CONSTRAINT "loyalty_program_earnRule_check"
    CHECK ("earnRule" IN ('per_appointment', 'per_chf'))
);

CREATE UNIQUE INDEX "loyalty_program_tenantId_unique"
  ON "loyalty_program" ("tenantId");

CREATE TYPE "LoyaltyStampReason" AS ENUM (
  'AWARD',
  'REDEEM',
  'ADJUST',
  'EXPIRE'
);

CREATE TABLE "loyalty_stamp" (
  "id"            UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenantId"      UUID NOT NULL,
  "programId"     UUID NOT NULL,
  "clientId"      UUID NOT NULL,
  "delta"         INTEGER NOT NULL,
  "balanceAfter"  INTEGER NOT NULL,
  "reason"        "LoyaltyStampReason" NOT NULL,
  "appointmentId" UUID,
  "performedBy"   UUID,
  "notes"         TEXT,
  "createdAt"     TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT "loyalty_stamp_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "loyalty_stamp_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "tenant"("id") ON DELETE CASCADE,
  CONSTRAINT "loyalty_stamp_programId_fkey"
    FOREIGN KEY ("programId") REFERENCES "loyalty_program"("id") ON DELETE CASCADE,
  CONSTRAINT "loyalty_stamp_clientId_fkey"
    FOREIGN KEY ("clientId") REFERENCES "client"("id") ON DELETE CASCADE,
  CONSTRAINT "loyalty_stamp_appointmentId_fkey"
    FOREIGN KEY ("appointmentId") REFERENCES "appointment"("id") ON DELETE SET NULL,
  CONSTRAINT "loyalty_stamp_performedBy_fkey"
    FOREIGN KEY ("performedBy") REFERENCES "user"("id") ON DELETE SET NULL
);

-- Idempotency: pro (programId, appointmentId) max 1 AWARD-Eintrag.
-- Verhindert Doppel-Stamp wenn ein Appointment versehentlich 2× COMPLETED
-- markiert wird.
CREATE UNIQUE INDEX "loyalty_stamp_appointment_award_unique"
  ON "loyalty_stamp" ("programId", "appointmentId")
  WHERE "appointmentId" IS NOT NULL AND "reason" = 'AWARD';

CREATE INDEX "loyalty_stamp_tenantId_clientId_createdAt_idx"
  ON "loyalty_stamp" ("tenantId", "clientId", "createdAt" DESC);

CREATE INDEX "loyalty_stamp_tenantId_createdAt_idx"
  ON "loyalty_stamp" ("tenantId", "createdAt" DESC);

ALTER TABLE "loyalty_program" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "loyalty_program_isolation" ON "loyalty_program"
  USING ("tenantId" = current_setting('app.tenant_id', TRUE)::uuid);
CREATE POLICY "loyalty_program_service_role" ON "loyalty_program"
  USING (current_setting('app.tenant_id', TRUE) IS NULL
         OR current_setting('app.tenant_id', TRUE) = '');

ALTER TABLE "loyalty_stamp" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "loyalty_stamp_isolation" ON "loyalty_stamp"
  USING ("tenantId" = current_setting('app.tenant_id', TRUE)::uuid);
CREATE POLICY "loyalty_stamp_service_role" ON "loyalty_stamp"
  USING (current_setting('app.tenant_id', TRUE) IS NULL
         OR current_setting('app.tenant_id', TRUE) = '');
