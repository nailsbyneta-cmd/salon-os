-- 0005_gift_cards
-- Gift Cards: verkaufbarer Gutschein mit Code, Balance und optionalem
-- Empfänger für iMessage/WhatsApp-Teilen (Diff #19).

CREATE TABLE "gift_card" (
  "id"             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenantId"       UUID NOT NULL REFERENCES "tenant"("id") ON DELETE CASCADE,
  "code"           TEXT NOT NULL UNIQUE,
  "amount"         DECIMAL(10,2) NOT NULL,
  "balance"        DECIMAL(10,2) NOT NULL,
  "currency"       CHAR(3) NOT NULL DEFAULT 'CHF',
  "purchasedById"  UUID REFERENCES "client"("id") ON DELETE SET NULL,
  "purchasedAt"    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "redeemedAt"     TIMESTAMPTZ,
  "expiresAt"      TIMESTAMPTZ,
  "recipientEmail" TEXT,
  "recipientName"  TEXT,
  "message"        TEXT,
  "createdAt"      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX "gift_card_tenantId_idx" ON "gift_card"("tenantId");
CREATE INDEX "gift_card_code_idx" ON "gift_card"("code");

ALTER TABLE "gift_card" ENABLE ROW LEVEL SECURITY;
CREATE POLICY gift_card_tenant_isolation ON "gift_card"
  FOR ALL
  USING ("tenantId" = app_current_tenant_id())
  WITH CHECK ("tenantId" = app_current_tenant_id());
