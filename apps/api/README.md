# @salon-os/api

NestJS backend for SALON OS. Provides REST + (later) GraphQL + (later) tRPC.

## Stack

- NestJS 11 mit Fastify-Adapter (schneller als Express)
- Prisma 6 für DB (via `@salon-os/db`)
- Zod für Validierung (Boundary-Check an jedem Controller)
- WorkOS-Auth via `@salon-os/auth`
- OpenTelemetry für Traces (wird in Phase 0 Ende nachgerüstet)

## Lokal laufen lassen

```bash
# aus dem Repo-Root:
pnpm db:up              # Postgres + Redis + Mailhog + Minio via Docker
pnpm --filter @salon-os/api dev
```

API lauscht auf `http://localhost:4000`.
Health-Check: `curl http://localhost:4000/health`.

## Struktur

```
src/
├── main.ts              # Fastify bootstrap
├── app.module.ts        # Root-Modul
└── health/              # Liveness + Readiness
```

Feature-Module (Bookings, Clients, Appointments, Payments, …) kommen in Phase 1 dazu —
jedes Modul nach Spec-Vorlage in specs/features.md.

## Coding-Standards

Siehe Root-[CLAUDE.md](../../CLAUDE.md). TL;DR:

- Jeder Controller validiert Input mit Zod bevor er die Service-Schicht erreicht.
- Jeder Write-Endpoint liest `Idempotency-Key`-Header.
- Jede DB-Operation läuft unter RLS mit gesetzter `app.current_tenant_id`.
- Fehler-Format: RFC 7807 Problem Details.
