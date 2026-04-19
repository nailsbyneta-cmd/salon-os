# Modul: Clients (CRM)

Teil von [specs/features.md §Modul 3](../../specs/features.md) — Client CRM.

## Was das Modul tut

Stammdaten und Historie der Salon-Kundinnen. CRUD, Suche, Preferences, Tags,
Allergien, Familien-Verknüpfung, DSGVO-Exports (Phase 2).

## Datenmodell

- `Client` (`packages/db/prisma/schema.prisma`) — alle Stammdaten, tenant-skoped.
- Relationen: → `Appointment` (1:N), → `Client` self (Family), → `Staff` (preferredStaffId, nullable).

## API-Endpoints (Phase 1)

Alle unter `/v1/clients`, JSON, Bearer-Auth, Tenant-skoped.
Siehe [specs/api.md §Clients](../../specs/api.md) für das volle Set.

| Method | Path             | Request                                | Response          |
|--------|------------------|----------------------------------------|-------------------|
| GET    | `/v1/clients`    | `?q=<search>&limit=<n>`                | `{ clients: Client[] }` |
| GET    | `/v1/clients/:id`| —                                       | `Client`          |
| POST   | `/v1/clients`    | `createClientSchema`                    | `Client` (201)    |
| PATCH  | `/v1/clients/:id`| `updateClientSchema`                    | `Client`          |
| DELETE | `/v1/clients/:id`| —                                       | 204 (soft-delete) |

Alle Writes akzeptieren `Idempotency-Key`-Header (Phase 2: tatsächliche Deduplication
über Redis-Cache mit 24h-TTL).

## UI-Seiten

Phase 1 Woche 10 — admin-side. Routes:
- `/clients` — Liste + Suche
- `/clients/:id` — Detail-Drawer

## Zod-Schemas

- `createClientSchema` / `updateClientSchema` in [`packages/types/src/domain.ts`](../../packages/types/src/domain.ts).

## RLS

`client`-Tabelle hat `client_tenant_isolation` Policy (tenantId = app_current_tenant_id).
Siehe [migration 0002](../../packages/db/prisma/migrations/0002_phase1_module1/migration.sql).

## Integrationen

- **Phase 2:** Phorest-Migrator (ETL-Script, Teil des Design-Partner-Onboardings
  für Beautycenter by Neta).
- **Phase 2:** Twilio für SMS-Opt-in-Doppelchecks.

## Tests

- `packages/types/src/index.test.ts` deckt Zod-Primitives ab.
- TODO: Integration-Test für `ClientsService` mit echter Postgres (CI-Service).
- TODO: E2E via Playwright auf `/clients`-Page.

## Open Questions

- Phone-Normalisierung: aktuell simpler CH-Fallback in `clients.service.ts`.
  Sobald mehrere Länder: `libphonenumber-js` in `@salon-os/utils`.
- Familien-Flows: welche Berechtigungen hat ein Parent-Client für Child-Buchungen?
  (Spec unklar — später festlegen.)
- DSGVO-Export-Format: JSON + Medien-ZIP genügt für Art. 20?
  Siehe [specs/compliance.md §Art.20](../../specs/compliance.md).
