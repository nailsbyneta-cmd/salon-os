-- SALON OS — RLS Bootstrap Migration
-- Aktiviert Row-Level-Security auf allen tenant-skoped Tabellen.
-- App-Middleware MUSS `SET LOCAL app.current_tenant_id = '<uuid>'` + optional
-- `SET LOCAL app.current_user_id` und `SET LOCAL app.current_role` setzen
-- BEVOR irgendeine Query läuft.
--
-- DB-Rolle: jeder App-Connection-String verwendet die Rolle `salon_app`
-- (NICHT den Postgres-Superuser). `salon_app` hat BYPASSRLS = false.
-- Der Migrations-User (`salon`) hat BYPASSRLS und kann RLS temporär umgehen
-- für seed + migrations.

-- ─── Hilfsfunktionen ──────────────────────────────────────────
CREATE OR REPLACE FUNCTION app_current_tenant_id() RETURNS uuid
LANGUAGE sql STABLE AS $$
  SELECT NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
$$;

CREATE OR REPLACE FUNCTION app_current_role() RETURNS text
LANGUAGE sql STABLE AS $$
  SELECT current_setting('app.current_role', true)
$$;

-- ─── Location ─────────────────────────────────────────────────
ALTER TABLE "location" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "location" FORCE ROW LEVEL SECURITY;

CREATE POLICY location_tenant_isolation ON "location"
  FOR ALL
  USING ("tenantId" = app_current_tenant_id())
  WITH CHECK ("tenantId" = app_current_tenant_id());

-- ─── TenantMembership ─────────────────────────────────────────
ALTER TABLE "tenant_membership" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tenant_membership" FORCE ROW LEVEL SECURITY;

CREATE POLICY membership_tenant_isolation ON "tenant_membership"
  FOR ALL
  USING ("tenantId" = app_current_tenant_id())
  WITH CHECK ("tenantId" = app_current_tenant_id());

-- ─── AuditLog ─────────────────────────────────────────────────
-- Audit ist append-only: INSERT erlaubt, UPDATE/DELETE verboten (ausser für
-- System-Rolle im DSGVO-Kontext — dann erfolgt hard-delete über separaten
-- Admin-Connection mit BYPASSRLS).
ALTER TABLE "audit_log" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "audit_log" FORCE ROW LEVEL SECURITY;

CREATE POLICY audit_tenant_read ON "audit_log"
  FOR SELECT
  USING ("tenantId" = app_current_tenant_id());

CREATE POLICY audit_append_only ON "audit_log"
  FOR INSERT
  WITH CHECK ("tenantId" = app_current_tenant_id());

-- UPDATE + DELETE bleiben ohne Policy → in RLS-Mode = deny.

-- ─── Tenant selbst ────────────────────────────────────────────
-- Die Tenant-Row darf der jeweilige Tenant lesen (eigene Row), aber nicht
-- andere Tenants. Schreiben = nur via Admin-Connection.
ALTER TABLE "tenant" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tenant" FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_self_read ON "tenant"
  FOR SELECT
  USING (id = app_current_tenant_id());

-- ─── User ─────────────────────────────────────────────────────
-- User-Rows sind NICHT tenant-skoped (ein User kann in mehreren Tenants sein).
-- Zugriff läuft über TenantMembership-Join + App-Logic, nicht über RLS.
-- Auf User-Ebene prüft die App, ob der angemeldete User die Row selbst ist
-- oder Admin-Rechte in einem gemeinsamen Tenant hat.
-- Daher: KEIN RLS auf user-Tabelle — Sicherheit via Application-Layer.
