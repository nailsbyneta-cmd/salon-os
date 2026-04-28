-- Tenant-Level Google-Ads-Integration. Pro Tenant ein Datensatz mit:
--   * Google-Ads Customer-ID (+ optional MCC login_customer_id)
--   * verschlüsseltem OAuth-Refresh-Token (AES-256-GCM via @salon-os/utils)
--   * Conversion-Action-Mapping (interner event-name → AW-X/Label)
-- Wird vom outbox-Worker (server-side conversion upload) und vom
-- daily-spend-sync gelesen.

CREATE TABLE "tenant_ads_integration" (
  "id"                       UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenantId"                 UUID NOT NULL,
  "provider"                 TEXT NOT NULL DEFAULT 'google_ads',
  "customerId"               TEXT NOT NULL,
  "loginCustomerId"          TEXT,
  "refreshTokenEncrypted"    TEXT NOT NULL,
  "oauthScope"               TEXT,
  "conversionActions"        JSONB NOT NULL DEFAULT '{}'::jsonb,
  "enabled"                  BOOLEAN NOT NULL DEFAULT TRUE,
  "lastSyncAt"               TIMESTAMPTZ,
  "lastSyncError"            TEXT,
  "createdAt"                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"                TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT "tenant_ads_integration_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "tenant_ads_integration_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "tenant"("id") ON DELETE CASCADE,
  CONSTRAINT "tenant_ads_integration_provider_check"
    CHECK ("provider" IN ('google_ads')),
  CONSTRAINT "tenant_ads_integration_tenant_provider_unique"
    UNIQUE ("tenantId", "provider")
);

CREATE INDEX "tenant_ads_integration_tenantId_enabled_idx"
  ON "tenant_ads_integration" ("tenantId", "enabled");

-- RLS: Worker liest cross-tenant via prismaPublic (admin-connection),
-- Admin-UI nutzt withTenant() + standard isolation.
ALTER TABLE "tenant_ads_integration" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_ads_integration_isolation" ON "tenant_ads_integration"
  USING ("tenantId" = current_setting('app.tenant_id', TRUE)::uuid);

CREATE POLICY "tenant_ads_integration_service_role" ON "tenant_ads_integration"
  USING (current_setting('app.tenant_id', TRUE) IS NULL
         OR current_setting('app.tenant_id', TRUE) = '');
