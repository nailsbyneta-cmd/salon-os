-- Recurring Appointments — "Stamm-Kundin alle 4 Wochen Auffüllen".
-- Generator legt initial 3 Termine an, Cron-Job rollt nach.
-- Edit-Modi: this-only / this-and-following / all (Google-Calendar-Pattern).

CREATE TABLE "appointment_series" (
  "id"              UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenantId"        UUID NOT NULL,
  "clientId"        UUID NOT NULL,
  "staffId"         UUID NOT NULL,
  "serviceId"       UUID NOT NULL,
  "locationId"      UUID NOT NULL,
  "intervalWeeks"   INTEGER NOT NULL,
  "firstStartAt"    TIMESTAMPTZ NOT NULL,
  "durationMinutes" INTEGER NOT NULL,
  "endsAt"          TIMESTAMPTZ,
  "occurrences"     INTEGER,
  "active"          BOOLEAN NOT NULL DEFAULT true,
  "lastGeneratedAt" TIMESTAMPTZ,
  "generatedUntil"  TIMESTAMPTZ,
  "notes"           TEXT,
  "createdAt"       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"       TIMESTAMPTZ NOT NULL,
  CONSTRAINT "appointment_series_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "appointment_series_interval_weeks_check"
    CHECK ("intervalWeeks" >= 1 AND "intervalWeeks" <= 52)
);

CREATE INDEX "appointment_series_tenantId_clientId_active_idx"
  ON "appointment_series" ("tenantId", "clientId", "active");

CREATE INDEX "appointment_series_tenantId_active_lastGeneratedAt_idx"
  ON "appointment_series" ("tenantId", "active", "lastGeneratedAt");

ALTER TABLE "appointment_series"
  ADD CONSTRAINT "appointment_series_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "tenant"("id") ON DELETE CASCADE;

ALTER TABLE "appointment_series"
  ADD CONSTRAINT "appointment_series_clientId_fkey"
  FOREIGN KEY ("clientId") REFERENCES "client"("id") ON DELETE CASCADE;

ALTER TABLE "appointment_series"
  ADD CONSTRAINT "appointment_series_staffId_fkey"
  FOREIGN KEY ("staffId") REFERENCES "staff"("id") ON DELETE RESTRICT;

ALTER TABLE "appointment_series"
  ADD CONSTRAINT "appointment_series_serviceId_fkey"
  FOREIGN KEY ("serviceId") REFERENCES "service"("id") ON DELETE RESTRICT;

ALTER TABLE "appointment_series"
  ADD CONSTRAINT "appointment_series_locationId_fkey"
  FOREIGN KEY ("locationId") REFERENCES "location"("id") ON DELETE RESTRICT;

-- RLS analog zu appointment
ALTER TABLE "appointment_series" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "appointment_series" FORCE ROW LEVEL SECURITY;
CREATE POLICY appointment_series_tenant_isolation ON "appointment_series"
  FOR ALL USING ("tenantId" = app_current_tenant_id())
  WITH CHECK ("tenantId" = app_current_tenant_id());

-- Verbindung von einzelnen Appointments zur Serie (nullable — Single-Termine
-- bleiben weiterhin möglich)
ALTER TABLE "appointment" ADD COLUMN "seriesId" UUID;
ALTER TABLE "appointment" ADD COLUMN "occurrenceIndex" INTEGER;

ALTER TABLE "appointment"
  ADD CONSTRAINT "appointment_seriesId_fkey"
  FOREIGN KEY ("seriesId") REFERENCES "appointment_series"("id") ON DELETE SET NULL;

CREATE INDEX "appointment_seriesId_idx" ON "appointment" ("seriesId");
