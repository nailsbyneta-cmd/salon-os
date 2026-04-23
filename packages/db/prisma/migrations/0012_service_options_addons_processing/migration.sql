-- Service-Options (Mangomint-Stil): Gruppen wie "Typ", "Länge" mit
-- Preis-, Dauer- und Processing-Time-Deltas. Erlaubt z.B. einen einzigen
-- Service "Nägel" mit Varianten Gel/Acryl × Neu/Auffüllen × Kurz/Mittel/Lang
-- statt 12 flachen Services.
--
-- Service-AddOns (Phorest-Stil): optionale Zusatz-Services (French, Paraffin,
-- LED-Therapie), die mit einem Primär-Service gebucht werden. 0 Min möglich.
--
-- Processing-Time auf Service (Square-Stil): Färben hat z.B. 30 Min
-- Einwirkzeit wo der Stylist frei für andere Buchungen ist.

-- 1) Processing-Time Felder auf service
ALTER TABLE "service" ADD COLUMN "processingTimeMin" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "service" ADD COLUMN "activeTimeBefore"  INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "service" ADD COLUMN "activeTimeAfter"   INTEGER NOT NULL DEFAULT 0;

-- 2) Option-Groups
CREATE TABLE "service_option_group" (
  "id"         UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenantId"   UUID NOT NULL,
  "serviceId"  UUID NOT NULL,
  "name"       TEXT NOT NULL,
  "required"   BOOLEAN NOT NULL DEFAULT true,
  "multi"      BOOLEAN NOT NULL DEFAULT false,
  "sortOrder"  INTEGER NOT NULL DEFAULT 0,
  "createdAt"  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"  TIMESTAMPTZ NOT NULL,
  CONSTRAINT "service_option_group_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "service_option_group_tenantId_serviceId_idx"
  ON "service_option_group" ("tenantId", "serviceId");

ALTER TABLE "service_option_group"
  ADD CONSTRAINT "service_option_group_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "tenant"("id") ON DELETE CASCADE;

ALTER TABLE "service_option_group"
  ADD CONSTRAINT "service_option_group_serviceId_fkey"
  FOREIGN KEY ("serviceId") REFERENCES "service"("id") ON DELETE CASCADE;

-- 3) Options
CREATE TABLE "service_option" (
  "id"                 UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenantId"           UUID NOT NULL,
  "groupId"            UUID NOT NULL,
  "label"              TEXT NOT NULL,
  "priceDelta"         DECIMAL(10,2) NOT NULL DEFAULT 0,
  "durationDeltaMin"   INTEGER NOT NULL DEFAULT 0,
  "processingDeltaMin" INTEGER NOT NULL DEFAULT 0,
  "isDefault"          BOOLEAN NOT NULL DEFAULT false,
  "sortOrder"          INTEGER NOT NULL DEFAULT 0,
  "createdAt"          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"          TIMESTAMPTZ NOT NULL,
  CONSTRAINT "service_option_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "service_option_tenantId_groupId_idx"
  ON "service_option" ("tenantId", "groupId");

ALTER TABLE "service_option"
  ADD CONSTRAINT "service_option_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "tenant"("id") ON DELETE CASCADE;

ALTER TABLE "service_option"
  ADD CONSTRAINT "service_option_groupId_fkey"
  FOREIGN KEY ("groupId") REFERENCES "service_option_group"("id") ON DELETE CASCADE;

-- 4) Add-Ons
CREATE TABLE "service_addon" (
  "id"               UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenantId"         UUID NOT NULL,
  "serviceId"        UUID NOT NULL,
  "name"             TEXT NOT NULL,
  "priceDelta"       DECIMAL(10,2) NOT NULL DEFAULT 0,
  "durationDeltaMin" INTEGER NOT NULL DEFAULT 0,
  "sortOrder"        INTEGER NOT NULL DEFAULT 0,
  "createdAt"        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"        TIMESTAMPTZ NOT NULL,
  CONSTRAINT "service_addon_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "service_addon_tenantId_serviceId_idx"
  ON "service_addon" ("tenantId", "serviceId");

ALTER TABLE "service_addon"
  ADD CONSTRAINT "service_addon_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "tenant"("id") ON DELETE CASCADE;

ALTER TABLE "service_addon"
  ADD CONSTRAINT "service_addon_serviceId_fkey"
  FOREIGN KEY ("serviceId") REFERENCES "service"("id") ON DELETE CASCADE;

-- 5) RLS analog zu bestehenden Service-Tabellen
ALTER TABLE "service_option_group" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "service_option_group" FORCE ROW LEVEL SECURITY;
CREATE POLICY service_option_group_tenant_isolation ON "service_option_group"
  FOR ALL USING ("tenantId" = app_current_tenant_id())
  WITH CHECK ("tenantId" = app_current_tenant_id());

ALTER TABLE "service_option" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "service_option" FORCE ROW LEVEL SECURITY;
CREATE POLICY service_option_tenant_isolation ON "service_option"
  FOR ALL USING ("tenantId" = app_current_tenant_id())
  WITH CHECK ("tenantId" = app_current_tenant_id());

ALTER TABLE "service_addon" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "service_addon" FORCE ROW LEVEL SECURITY;
CREATE POLICY service_addon_tenant_isolation ON "service_addon"
  FOR ALL USING ("tenantId" = app_current_tenant_id())
  WITH CHECK ("tenantId" = app_current_tenant_id());
