-- 0006_waitlist
-- Waitlist: Kundin möchte einen Termin in einem Zeitfenster —
-- wenn etwas frei wird, Staff bietet an.

CREATE TABLE "waitlist_entry" (
  "id"               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenantId"         UUID NOT NULL REFERENCES "tenant"("id") ON DELETE CASCADE,
  "clientId"         UUID NOT NULL REFERENCES "client"("id") ON DELETE CASCADE,
  "serviceId"        UUID NOT NULL REFERENCES "service"("id") ON DELETE CASCADE,
  "locationId"      UUID NOT NULL REFERENCES "location"("id") ON DELETE CASCADE,
  "preferredStaffId" UUID REFERENCES "staff"("id") ON DELETE SET NULL,
  "earliestAt"       TIMESTAMPTZ NOT NULL,
  "latestAt"         TIMESTAMPTZ NOT NULL,
  "notes"            TEXT,
  "status"           TEXT NOT NULL DEFAULT 'ACTIVE',
  "createdAt"        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX "waitlist_tenantId_status_idx"
  ON "waitlist_entry"("tenantId", "status");
CREATE INDEX "waitlist_tenantId_earliestAt_idx"
  ON "waitlist_entry"("tenantId", "earliestAt");

ALTER TABLE "waitlist_entry" ENABLE ROW LEVEL SECURITY;
CREATE POLICY waitlist_tenant_isolation ON "waitlist_entry"
  FOR ALL
  USING ("tenantId" = app_current_tenant_id())
  WITH CHECK ("tenantId" = app_current_tenant_id());
