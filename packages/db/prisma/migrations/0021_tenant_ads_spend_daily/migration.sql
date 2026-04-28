-- Daily Google-Ads-Spend-Snapshot pro Tenant + Kampagne. Cron-Worker
-- pullt täglich via GAQL die Vortageszahlen und upsertet hier rein.
-- Dashboard liest aus dieser Tabelle (kein on-the-fly GAQL-Call).
--
-- Source-of-Truth für: Spend, Clicks, Impressions, Google-eigene
-- Conversions (für Sanity-Check vs unsere salon-os Booking-Conversions).

CREATE TABLE "tenant_ads_spend_daily" (
  "id"                  UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenantId"            UUID NOT NULL,
  "date"                DATE NOT NULL,
  "campaignId"          TEXT,
  "campaignName"        TEXT,
  "clicks"              INTEGER NOT NULL DEFAULT 0,
  "impressions"         INTEGER NOT NULL DEFAULT 0,
  "costChf"             NUMERIC(10,2) NOT NULL DEFAULT 0,
  "conversions"         NUMERIC(10,2) NOT NULL DEFAULT 0,
  "conversionValueChf"  NUMERIC(10,2) NOT NULL DEFAULT 0,
  "pulledAt"            TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT "tenant_ads_spend_daily_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "tenant_ads_spend_daily_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "tenant"("id") ON DELETE CASCADE
);

-- Idempotency: re-run pulls überschreiben den gleichen Tag/Kampagne.
-- campaignId kann NULL sein (z.B. "account-level"-Aggregat) — daher
-- COALESCE-Trick im Unique-Index.
CREATE UNIQUE INDEX "tenant_ads_spend_daily_tenant_date_campaign_unique"
  ON "tenant_ads_spend_daily" ("tenantId", "date", COALESCE("campaignId", ''));

CREATE INDEX "tenant_ads_spend_daily_tenantId_date_idx"
  ON "tenant_ads_spend_daily" ("tenantId", "date" DESC);

ALTER TABLE "tenant_ads_spend_daily" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_ads_spend_daily_isolation" ON "tenant_ads_spend_daily"
  USING ("tenantId" = current_setting('app.tenant_id', TRUE)::uuid);

CREATE POLICY "tenant_ads_spend_daily_service_role" ON "tenant_ads_spend_daily"
  USING (current_setting('app.tenant_id', TRUE) IS NULL
         OR current_setting('app.tenant_id', TRUE) = '');
