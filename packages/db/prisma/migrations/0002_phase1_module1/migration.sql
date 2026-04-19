-- SALON OS — Phase 1 Module 1 (Calendar & Scheduling)
-- Erweitert das Schema um Staff, Services, Rooms, Appointments, Clients,
-- Shifts, TimeOff. Enables RLS für alle neuen tenant-skoped Tabellen.
--
-- Hinweis: In einer typischen Prisma-Dev-Workflow wird diese Datei durch
-- `prisma migrate dev --name phase1_module1` automatisch aus dem Diff
-- erzeugt + dann wird der unten stehende RLS-Block manuell angehängt.
-- Da wir hier greenfield sind und die Rohdatei schreiben, enthält sie
-- direkt DDL + RLS in einem Schritt.

-- ─── ENUMs ─────────────────────────────────────────────────────
CREATE TYPE "EmploymentType" AS ENUM ('EMPLOYEE', 'CONTRACTOR', 'BOOTH_RENTER', 'COMMISSION', 'OWNER');
CREATE TYPE "Gender" AS ENUM ('FEMALE', 'MALE', 'NEUTRAL', 'KIDS');
CREATE TYPE "AppointmentStatus" AS ENUM ('BOOKED', 'CONFIRMED', 'CHECKED_IN', 'IN_SERVICE', 'COMPLETED', 'CANCELLED', 'NO_SHOW', 'WAITLIST');
CREATE TYPE "BookingChannel" AS ENUM (
  'ONLINE_BRANDED', 'ONLINE_WIDGET', 'MARKETPLACE', 'INSTAGRAM', 'FACEBOOK',
  'GOOGLE_RESERVE', 'TIKTOK', 'WHATSAPP', 'PHONE_AI', 'PHONE_MANUAL', 'SMS',
  'WALK_IN', 'STAFF_INTERNAL'
);
CREATE TYPE "TimeOffStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- ─── Room ─────────────────────────────────────────────────────
CREATE TABLE "room" (
  "id"         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenantId"   UUID NOT NULL,
  "locationId" UUID NOT NULL REFERENCES "location"("id") ON DELETE CASCADE,
  "name"       TEXT NOT NULL,
  "capacity"   INTEGER NOT NULL DEFAULT 1,
  "features"   TEXT[] NOT NULL DEFAULT '{}',
  "active"     BOOLEAN NOT NULL DEFAULT TRUE,
  "createdAt"  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX "room_tenant_location_idx" ON "room" ("tenantId", "locationId");

-- ─── Staff ────────────────────────────────────────────────────
CREATE TABLE "staff" (
  "id"             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenantId"       UUID NOT NULL REFERENCES "tenant"("id") ON DELETE CASCADE,
  "userId"         UUID NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "firstName"      TEXT NOT NULL,
  "lastName"       TEXT NOT NULL,
  "displayName"    TEXT,
  "email"          TEXT NOT NULL,
  "phone"          TEXT,
  "role"           "StaffRole" NOT NULL,
  "employmentType" "EmploymentType" NOT NULL,
  "commissionRate" NUMERIC(5, 2),
  "boothRent"      NUMERIC(10, 2),
  "hourlyRate"     NUMERIC(10, 2),
  "color"          TEXT,
  "photoUrl"       TEXT,
  "bio"            TEXT,
  "startsAt"       TIMESTAMPTZ,
  "active"         BOOLEAN NOT NULL DEFAULT TRUE,
  "createdAt"      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "deletedAt"      TIMESTAMPTZ
);
CREATE INDEX "staff_tenant_idx" ON "staff" ("tenantId");
CREATE INDEX "staff_tenant_active_idx" ON "staff" ("tenantId", "active");

CREATE TABLE "staff_location" (
  "staffId"    UUID NOT NULL REFERENCES "staff"("id") ON DELETE CASCADE,
  "locationId" UUID NOT NULL REFERENCES "location"("id") ON DELETE CASCADE,
  "isPrimary"  BOOLEAN NOT NULL DEFAULT FALSE,
  PRIMARY KEY ("staffId", "locationId")
);

-- ─── Services ─────────────────────────────────────────────────
CREATE TABLE "service_category" (
  "id"        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenantId"  UUID NOT NULL REFERENCES "tenant"("id") ON DELETE CASCADE,
  "name"      TEXT NOT NULL,
  "order"     INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX "service_category_tenant_idx" ON "service_category" ("tenantId");

CREATE TABLE "service" (
  "id"                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenantId"          UUID NOT NULL REFERENCES "tenant"("id") ON DELETE CASCADE,
  "categoryId"        UUID NOT NULL REFERENCES "service_category"("id") ON DELETE RESTRICT,
  "name"              TEXT NOT NULL,
  "slug"              TEXT NOT NULL,
  "description"       TEXT,
  "durationMinutes"   INTEGER NOT NULL,
  "bufferBeforeMin"   INTEGER NOT NULL DEFAULT 0,
  "bufferAfterMin"    INTEGER NOT NULL DEFAULT 0,
  "basePrice"         NUMERIC(10, 2) NOT NULL,
  "taxClass"          TEXT,
  "bookable"          BOOLEAN NOT NULL DEFAULT TRUE,
  "requiresConsult"   BOOLEAN NOT NULL DEFAULT FALSE,
  "requiresPatchTest" BOOLEAN NOT NULL DEFAULT FALSE,
  "gender"            "Gender",
  "color"             TEXT,
  "order"             INTEGER NOT NULL DEFAULT 0,
  "minDepositAmount"  NUMERIC(10, 2),
  "minDepositPct"     NUMERIC(5, 2),
  "createdAt"         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "deletedAt"         TIMESTAMPTZ,
  UNIQUE ("tenantId", "slug")
);
CREATE INDEX "service_tenant_category_idx" ON "service" ("tenantId", "categoryId");

CREATE TABLE "service_variant" (
  "id"              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenantId"        UUID NOT NULL,
  "locationId"      UUID NOT NULL REFERENCES "location"("id") ON DELETE CASCADE,
  "serviceId"       UUID NOT NULL REFERENCES "service"("id") ON DELETE CASCADE,
  "price"           NUMERIC(10, 2) NOT NULL,
  "durationMinutes" INTEGER,
  "active"          BOOLEAN NOT NULL DEFAULT TRUE,
  UNIQUE ("locationId", "serviceId")
);
CREATE INDEX "service_variant_tenant_idx" ON "service_variant" ("tenantId");

CREATE TABLE "staff_service" (
  "staffId"          UUID NOT NULL REFERENCES "staff"("id") ON DELETE CASCADE,
  "serviceId"        UUID NOT NULL REFERENCES "service"("id") ON DELETE CASCADE,
  "priceOverride"    NUMERIC(10, 2),
  "durationOverride" INTEGER,
  PRIMARY KEY ("staffId", "serviceId")
);

-- ─── Client ───────────────────────────────────────────────────
CREATE TABLE "client" (
  "id"               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenantId"         UUID NOT NULL REFERENCES "tenant"("id") ON DELETE CASCADE,
  "firstName"        TEXT NOT NULL,
  "lastName"         TEXT NOT NULL,
  "email"            TEXT,
  "phone"            TEXT,
  "phoneE164"        TEXT,
  "birthday"         DATE,
  "pronouns"         TEXT,
  "photoUrl"         TEXT,
  "address"          JSONB,
  "language"         TEXT DEFAULT 'de-CH',
  "marketingOptIn"   BOOLEAN NOT NULL DEFAULT FALSE,
  "smsOptIn"         BOOLEAN NOT NULL DEFAULT FALSE,
  "emailOptIn"       BOOLEAN NOT NULL DEFAULT FALSE,
  "notesInternal"    TEXT,
  "allergies"        TEXT[] NOT NULL DEFAULT '{}',
  "tags"             TEXT[] NOT NULL DEFAULT '{}',
  "preferredStaffId" UUID,
  "noShowRisk"       NUMERIC(5, 2),
  "lifetimeValue"    NUMERIC(12, 2) NOT NULL DEFAULT 0,
  "lastVisitAt"      TIMESTAMPTZ,
  "totalVisits"      INTEGER NOT NULL DEFAULT 0,
  "blocked"          BOOLEAN NOT NULL DEFAULT FALSE,
  "familyParentId"   UUID REFERENCES "client"("id"),
  "source"           TEXT,
  "createdAt"        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "deletedAt"        TIMESTAMPTZ
);
CREATE INDEX "client_tenant_phone_idx" ON "client" ("tenantId", "phoneE164");
CREATE INDEX "client_tenant_email_idx" ON "client" ("tenantId", "email");
CREATE INDEX "client_tenant_lastvisit_idx" ON "client" ("tenantId", "lastVisitAt");
-- Trigram-Index für Schnell-Suche auf Namen (specs/tech-stack.md → Meilisearch
-- kommt später; Postgres-Trigram reicht für MVP mit < 50k Clients/Tenant).
CREATE INDEX "client_name_trgm_idx" ON "client" USING gin (
  ("firstName" || ' ' || "lastName") gin_trgm_ops
);

-- ─── Appointment ──────────────────────────────────────────────
CREATE TABLE "appointment" (
  "id"                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenantId"          UUID NOT NULL REFERENCES "tenant"("id") ON DELETE CASCADE,
  "locationId"        UUID NOT NULL REFERENCES "location"("id") ON DELETE RESTRICT,
  "clientId"          UUID REFERENCES "client"("id") ON DELETE SET NULL,
  "staffId"           UUID NOT NULL REFERENCES "staff"("id") ON DELETE RESTRICT,
  "roomId"            UUID REFERENCES "room"("id") ON DELETE SET NULL,
  "status"            "AppointmentStatus" NOT NULL DEFAULT 'BOOKED',
  "startAt"           TIMESTAMPTZ NOT NULL,
  "endAt"             TIMESTAMPTZ NOT NULL,
  "bookedAt"          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "bookedVia"         "BookingChannel" NOT NULL DEFAULT 'STAFF_INTERNAL',
  "notes"             TEXT,
  "internalNotes"     TEXT,
  "depositAmount"     NUMERIC(10, 2),
  "depositPaid"       BOOLEAN NOT NULL DEFAULT FALSE,
  "depositPaidAt"     TIMESTAMPTZ,
  "cancelledAt"       TIMESTAMPTZ,
  "cancelReason"      TEXT,
  "noShow"            BOOLEAN NOT NULL DEFAULT FALSE,
  "rescheduledFromId" UUID,
  "checkedInAt"       TIMESTAMPTZ,
  "completedAt"       TIMESTAMPTZ,
  "sourceCampaignId"  UUID,
  "language"          TEXT,
  "createdAt"         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK ("endAt" > "startAt")
);
CREATE INDEX "appointment_tenant_start_idx" ON "appointment" ("tenantId", "startAt");
CREATE INDEX "appointment_tenant_staff_start_idx" ON "appointment" ("tenantId", "staffId", "startAt");
CREATE INDEX "appointment_tenant_client_start_idx" ON "appointment" ("tenantId", "clientId", "startAt");
CREATE INDEX "appointment_tenant_status_idx" ON "appointment" ("tenantId", "status");

-- Double-Booking-Prevention via GiST-Exclusion-Constraint:
-- ein Staff-Member kann im selben Tenant zu überlappenden Zeiten nur dann
-- einen Termin haben, wenn ein Status CANCELLED/NO_SHOW ist.
CREATE EXTENSION IF NOT EXISTS "btree_gist";
ALTER TABLE "appointment"
  ADD CONSTRAINT "appointment_no_overlap_per_staff"
  EXCLUDE USING gist (
    "tenantId" WITH =,
    "staffId" WITH =,
    tstzrange("startAt", "endAt", '[)') WITH &&
  )
  WHERE ("status" NOT IN ('CANCELLED', 'NO_SHOW', 'WAITLIST'));

CREATE TABLE "appointment_item" (
  "id"            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "appointmentId" UUID NOT NULL REFERENCES "appointment"("id") ON DELETE CASCADE,
  "serviceId"     UUID NOT NULL REFERENCES "service"("id") ON DELETE RESTRICT,
  "staffId"       UUID NOT NULL REFERENCES "staff"("id") ON DELETE RESTRICT,
  "price"         NUMERIC(10, 2) NOT NULL,
  "duration"      INTEGER NOT NULL,
  "taxClass"      TEXT,
  "notes"         TEXT
);
CREATE INDEX "appointment_item_appointment_idx" ON "appointment_item" ("appointmentId");

-- ─── Shifts + TimeOff ─────────────────────────────────────────
CREATE TABLE "shift" (
  "id"         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenantId"   UUID NOT NULL,
  "staffId"    UUID NOT NULL REFERENCES "staff"("id") ON DELETE CASCADE,
  "locationId" UUID NOT NULL REFERENCES "location"("id") ON DELETE CASCADE,
  "startAt"    TIMESTAMPTZ NOT NULL,
  "endAt"      TIMESTAMPTZ NOT NULL,
  "isOpen"     BOOLEAN NOT NULL DEFAULT FALSE,
  "claimedAt"  TIMESTAMPTZ,
  "createdAt"  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK ("endAt" > "startAt")
);
CREATE INDEX "shift_tenant_staff_start_idx" ON "shift" ("tenantId", "staffId", "startAt");

CREATE TABLE "time_off" (
  "id"        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenantId"  UUID NOT NULL,
  "staffId"   UUID NOT NULL REFERENCES "staff"("id") ON DELETE CASCADE,
  "startAt"   TIMESTAMPTZ NOT NULL,
  "endAt"     TIMESTAMPTZ NOT NULL,
  "reason"    TEXT,
  "status"    "TimeOffStatus" NOT NULL DEFAULT 'PENDING',
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK ("endAt" > "startAt")
);
CREATE INDEX "time_off_tenant_staff_start_idx" ON "time_off" ("tenantId", "staffId", "startAt");

-- ─── RLS: neue Tabellen ───────────────────────────────────────
-- Alle haben dieselbe Policy-Form: tenant_id MUSS mit app.current_tenant_id
-- übereinstimmen. Admin-Connection umgeht RLS via BYPASSRLS.

ALTER TABLE "room" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "room" FORCE ROW LEVEL SECURITY;
CREATE POLICY room_tenant_isolation ON "room"
  FOR ALL USING ("tenantId" = app_current_tenant_id())
  WITH CHECK ("tenantId" = app_current_tenant_id());

ALTER TABLE "staff" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "staff" FORCE ROW LEVEL SECURITY;
CREATE POLICY staff_tenant_isolation ON "staff"
  FOR ALL USING ("tenantId" = app_current_tenant_id())
  WITH CHECK ("tenantId" = app_current_tenant_id());

ALTER TABLE "staff_location" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "staff_location" FORCE ROW LEVEL SECURITY;
-- Sicht nur, wenn der verknüpfte Staff zum aktuellen Tenant gehört:
CREATE POLICY staff_location_via_staff ON "staff_location"
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM "staff" s
      WHERE s."id" = "staff_location"."staffId"
      AND s."tenantId" = app_current_tenant_id()
    )
  );

ALTER TABLE "service_category" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "service_category" FORCE ROW LEVEL SECURITY;
CREATE POLICY service_category_tenant_isolation ON "service_category"
  FOR ALL USING ("tenantId" = app_current_tenant_id())
  WITH CHECK ("tenantId" = app_current_tenant_id());

ALTER TABLE "service" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "service" FORCE ROW LEVEL SECURITY;
CREATE POLICY service_tenant_isolation ON "service"
  FOR ALL USING ("tenantId" = app_current_tenant_id())
  WITH CHECK ("tenantId" = app_current_tenant_id());

ALTER TABLE "service_variant" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "service_variant" FORCE ROW LEVEL SECURITY;
CREATE POLICY service_variant_tenant_isolation ON "service_variant"
  FOR ALL USING ("tenantId" = app_current_tenant_id())
  WITH CHECK ("tenantId" = app_current_tenant_id());

ALTER TABLE "staff_service" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "staff_service" FORCE ROW LEVEL SECURITY;
CREATE POLICY staff_service_via_staff ON "staff_service"
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM "staff" s
      WHERE s."id" = "staff_service"."staffId"
      AND s."tenantId" = app_current_tenant_id()
    )
  );

ALTER TABLE "client" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "client" FORCE ROW LEVEL SECURITY;
CREATE POLICY client_tenant_isolation ON "client"
  FOR ALL USING ("tenantId" = app_current_tenant_id())
  WITH CHECK ("tenantId" = app_current_tenant_id());

ALTER TABLE "appointment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "appointment" FORCE ROW LEVEL SECURITY;
CREATE POLICY appointment_tenant_isolation ON "appointment"
  FOR ALL USING ("tenantId" = app_current_tenant_id())
  WITH CHECK ("tenantId" = app_current_tenant_id());

-- Stylisten sehen standardmässig nur eigene Termine (ausser sie sind
-- OWNER/MANAGER/FRONT_DESK). RLS-Policy kombiniert beides.
CREATE POLICY appointment_staff_scope ON "appointment"
  FOR SELECT USING (
    "tenantId" = app_current_tenant_id() AND (
      app_current_role() IN ('OWNER', 'MANAGER', 'FRONT_DESK')
      OR "staffId"::text = current_setting('app.current_user_id', true)
    )
  );

ALTER TABLE "appointment_item" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "appointment_item" FORCE ROW LEVEL SECURITY;
CREATE POLICY appointment_item_via_appointment ON "appointment_item"
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM "appointment" a
      WHERE a."id" = "appointment_item"."appointmentId"
      AND a."tenantId" = app_current_tenant_id()
    )
  );

ALTER TABLE "shift" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "shift" FORCE ROW LEVEL SECURITY;
CREATE POLICY shift_tenant_isolation ON "shift"
  FOR ALL USING ("tenantId" = app_current_tenant_id())
  WITH CHECK ("tenantId" = app_current_tenant_id());

ALTER TABLE "time_off" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "time_off" FORCE ROW LEVEL SECURITY;
CREATE POLICY time_off_tenant_isolation ON "time_off"
  FOR ALL USING ("tenantId" = app_current_tenant_id())
  WITH CHECK ("tenantId" = app_current_tenant_id());
