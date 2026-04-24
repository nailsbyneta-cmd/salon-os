-- Service-Bundle: Cross-Sell-Upsell im Booking-Wizard.
-- Wenn Kunde den primaryService bucht, schlägt der Wizard den
-- bundledService mit Rabatt dazu vor. Beispiel: Nails + Pediküre Basis
-- = CHF 5 billiger als einzeln.

CREATE TABLE "service_bundle" (
  "id"                UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenantId"          UUID NOT NULL,
  "primaryServiceId"  UUID NOT NULL,
  "bundledServiceId"  UUID NOT NULL,
  "label"             TEXT NOT NULL,
  "discountAmount"    DECIMAL(10,2),
  "discountPct"       DECIMAL(5,2),
  "active"            BOOLEAN NOT NULL DEFAULT true,
  "sortOrder"         INTEGER NOT NULL DEFAULT 0,
  "createdAt"         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"         TIMESTAMPTZ NOT NULL,
  CONSTRAINT "service_bundle_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "service_bundle_tenantId_primaryServiceId_active_idx"
  ON "service_bundle" ("tenantId", "primaryServiceId", "active");

ALTER TABLE "service_bundle"
  ADD CONSTRAINT "service_bundle_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "tenant"("id") ON DELETE CASCADE;

ALTER TABLE "service_bundle"
  ADD CONSTRAINT "service_bundle_primaryServiceId_fkey"
  FOREIGN KEY ("primaryServiceId") REFERENCES "service"("id") ON DELETE CASCADE;

ALTER TABLE "service_bundle"
  ADD CONSTRAINT "service_bundle_bundledServiceId_fkey"
  FOREIGN KEY ("bundledServiceId") REFERENCES "service"("id") ON DELETE CASCADE;

ALTER TABLE "service_bundle" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "service_bundle" FORCE ROW LEVEL SECURITY;
CREATE POLICY service_bundle_tenant_isolation ON "service_bundle"
  FOR ALL USING ("tenantId" = app_current_tenant_id())
  WITH CHECK ("tenantId" = app_current_tenant_id());
