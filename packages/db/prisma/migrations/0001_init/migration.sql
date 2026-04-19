-- SALON OS — Initial Migration (Phase 0 Foundation)
-- Kernentitäten für Multi-Tenant + Auth + AuditLog + RLS-Basis.
-- Diese Migration MUSS vor 0002_phase1_module1 laufen.
--
-- Hinweis: Prisma würde diese Datei normalerweise per `prisma migrate dev`
-- aus schema.prisma generieren. Wir schreiben sie hier manuell, damit RLS
-- und Hilfsfunktionen in EINEN atomaren Block passen.

-- ─── Extensions (Fallback falls postgres-init nicht lief) ─────
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "unaccent";
CREATE EXTENSION IF NOT EXISTS "vector";

-- ─── ENUMs ────────────────────────────────────────────────────
CREATE TYPE "Plan" AS ENUM ('STARTER', 'PRO', 'BUSINESS', 'ENTERPRISE', 'MEDSPA');
CREATE TYPE "TenantStatus" AS ENUM ('TRIAL', 'ACTIVE', 'PAST_DUE', 'CANCELLED', 'SUSPENDED');
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'INVITED', 'SUSPENDED', 'DELETED');
CREATE TYPE "StaffRole" AS ENUM (
  'OWNER', 'MANAGER', 'FRONT_DESK', 'STYLIST',
  'BOOTH_RENTER', 'TRAINEE', 'ASSISTANT'
);

-- ─── Tenant ───────────────────────────────────────────────────
CREATE TABLE "tenant" (
  "id"           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "slug"         TEXT NOT NULL UNIQUE,
  "name"         TEXT NOT NULL,
  "legalName"    TEXT,
  "countryCode"  CHAR(2) NOT NULL,
  "currency"     CHAR(3) NOT NULL,
  "timezone"     TEXT NOT NULL,
  "locale"       TEXT NOT NULL,
  "vatId"        TEXT,
  "plan"         "Plan" NOT NULL DEFAULT 'STARTER',
  "status"       "TenantStatus" NOT NULL DEFAULT 'TRIAL',
  "billingEmail" TEXT,
  "createdAt"    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "deletedAt"    TIMESTAMPTZ
);
CREATE INDEX "tenant_status_idx" ON "tenant" ("status");

-- ─── User (Auth-Projektion aus WorkOS) ────────────────────────
CREATE TABLE "user" (
  "id"           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "workosUserId" TEXT UNIQUE,
  "email"        TEXT NOT NULL UNIQUE,
  "firstName"    TEXT,
  "lastName"     TEXT,
  "locale"       TEXT,
  "status"       "UserStatus" NOT NULL DEFAULT 'ACTIVE',
  "lastLoginAt"  TIMESTAMPTZ,
  "createdAt"    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Location ─────────────────────────────────────────────────
CREATE TABLE "location" (
  "id"                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenantId"          UUID NOT NULL REFERENCES "tenant"("id") ON DELETE CASCADE,
  "name"              TEXT NOT NULL,
  "slug"              TEXT NOT NULL,
  "address1"          TEXT,
  "address2"          TEXT,
  "city"              TEXT,
  "postalCode"        TEXT,
  "region"            TEXT,
  "countryCode"       CHAR(2) NOT NULL,
  "latitude"          NUMERIC(10, 7),
  "longitude"         NUMERIC(10, 7),
  "phone"             TEXT,
  "email"             TEXT,
  "timezone"          TEXT NOT NULL,
  "currency"          CHAR(3) NOT NULL,
  "taxConfig"         JSONB NOT NULL,
  "openingHours"      JSONB NOT NULL,
  "publicProfile"     BOOLEAN NOT NULL DEFAULT TRUE,
  "marketplaceListed" BOOLEAN NOT NULL DEFAULT FALSE,
  "createdAt"         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "deletedAt"         TIMESTAMPTZ,
  UNIQUE ("tenantId", "slug")
);
CREATE INDEX "location_tenant_idx" ON "location" ("tenantId");

-- ─── TenantMembership ─────────────────────────────────────────
CREATE TABLE "tenant_membership" (
  "id"        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenantId"  UUID NOT NULL REFERENCES "tenant"("id") ON DELETE CASCADE,
  "userId"    UUID NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "role"      "StaffRole" NOT NULL,
  "isPrimary" BOOLEAN NOT NULL DEFAULT FALSE,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE ("tenantId", "userId")
);
CREATE INDEX "tenant_membership_tenant_idx" ON "tenant_membership" ("tenantId");
CREATE INDEX "tenant_membership_user_idx" ON "tenant_membership" ("userId");

-- ─── AuditLog ─────────────────────────────────────────────────
CREATE TABLE "audit_log" (
  "id"        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenantId"  UUID REFERENCES "tenant"("id") ON DELETE SET NULL,
  "actorId"   UUID,
  "actorType" TEXT,
  "entity"    TEXT NOT NULL,
  "entityId"  TEXT NOT NULL,
  "action"    TEXT NOT NULL,
  "diff"      JSONB,
  "ip"        TEXT,
  "userAgent" TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX "audit_log_tenant_entity_idx" ON "audit_log" ("tenantId", "entity", "entityId");
CREATE INDEX "audit_log_tenant_created_idx" ON "audit_log" ("tenantId", "createdAt");

-- ─── RLS-Hilfsfunktionen ──────────────────────────────────────
-- Lesen die per `SET LOCAL` gesetzte Session-Variable. NULL-safe.
CREATE OR REPLACE FUNCTION app_current_tenant_id() RETURNS uuid
LANGUAGE sql STABLE AS $$
  SELECT NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
$$;

CREATE OR REPLACE FUNCTION app_current_role() RETURNS text
LANGUAGE sql STABLE AS $$
  SELECT current_setting('app.current_role', true)
$$;

-- ─── RLS: Tenant ──────────────────────────────────────────────
-- Tenant darf nur die eigene Row lesen. Schreiben = nur Admin-Connection
-- (mit BYPASSRLS). App-Code darf NICHT Tenants wechseln/anlegen.
ALTER TABLE "tenant" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tenant" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_self_read ON "tenant"
  FOR SELECT USING (id = app_current_tenant_id());

-- ─── RLS: Location ────────────────────────────────────────────
ALTER TABLE "location" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "location" FORCE ROW LEVEL SECURITY;
CREATE POLICY location_tenant_isolation ON "location"
  FOR ALL
  USING ("tenantId" = app_current_tenant_id())
  WITH CHECK ("tenantId" = app_current_tenant_id());

-- ─── RLS: TenantMembership ────────────────────────────────────
ALTER TABLE "tenant_membership" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tenant_membership" FORCE ROW LEVEL SECURITY;
CREATE POLICY membership_tenant_isolation ON "tenant_membership"
  FOR ALL
  USING ("tenantId" = app_current_tenant_id())
  WITH CHECK ("tenantId" = app_current_tenant_id());

-- ─── RLS: AuditLog (append-only) ──────────────────────────────
ALTER TABLE "audit_log" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "audit_log" FORCE ROW LEVEL SECURITY;
CREATE POLICY audit_tenant_read ON "audit_log"
  FOR SELECT USING ("tenantId" = app_current_tenant_id());
CREATE POLICY audit_append_only ON "audit_log"
  FOR INSERT WITH CHECK ("tenantId" = app_current_tenant_id());
-- UPDATE + DELETE haben keine Policy → deny.

-- ─── User: NO RLS (App-Layer-geprüft) ─────────────────────────
-- User-Rows sind nicht tenant-skoped. Zugriff läuft über die App-Logic
-- + TenantMembership-Join, nicht über RLS.
