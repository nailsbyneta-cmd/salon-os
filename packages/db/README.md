# @salon-os/db

Prisma-Schema + Migrations + typed Client.

## Nutzung

```ts
import { prisma, withTenant } from '@salon-os/db';

// Alle Queries innerhalb dieses Blocks sehen nur Tenant X:
const locations = await withTenant(tenantId, userId, 'OWNER', async (tx) => {
  return tx.location.findMany();
});
```

Ohne `withTenant()` schlagen tenant-skoped Queries fehl (RLS greift — keine Row).

## Phase 0 — Aktuelle Entitäten

- `Tenant` — Der Salon/die Kette
- `Location` — Standort
- `User` — Person mit Login (WorkOS-projiziert)
- `TenantMembership` — `User ↔ Tenant` mit Rolle
- `AuditLog` — append-only Änderungs-Trail

Die restlichen Modelle (Staff, Service, Appointment, Payment, Client, Product, …)
kommen modul-weise in Phase 1.
Vollständiges Ziel-Schema: [specs/data-model.md](../../specs/data-model.md).

## Migrations

```bash
# Lokal neue Migration erstellen (bearbeitet schema.prisma, dann):
pnpm db:migrate

# Production (im CD-Pipeline):
pnpm db:migrate:deploy

# Komplett zurücksetzen (nur dev):
pnpm db:reset

# Seed:
pnpm db:seed
```

## RLS

Die erste Migration `0001_rls_init` aktiviert RLS auf `location`, `tenant_membership`,
`audit_log` und `tenant`. Details: [prisma/migrations/0001_rls_init/migration.sql](prisma/migrations/0001_rls_init/migration.sql).

**Regel:** Jede neue tenant-skoped Tabelle in `schema.prisma` MUSS in derselben
Migration eine `ENABLE ROW LEVEL SECURITY` + Policy bekommen. Review-Checklist
im PR: „RLS-Policy für neue Tabelle vorhanden?"

## DB-Rollen

- `salon` — Migrations-User (BYPASSRLS). Läuft nur im CD-Pipeline.
- `salon_app` — Application-Connection (NICHT BYPASSRLS). Wird vom API-Server benutzt.
  Jede Query setzt vorher `app.current_tenant_id` per `SET LOCAL`.
