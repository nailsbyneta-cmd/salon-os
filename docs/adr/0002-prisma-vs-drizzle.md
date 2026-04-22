# ADR 0002 — Prisma statt Drizzle für das ORM

**Status:** Accepted
**Datum:** 2026-04-19
**Kontext:** Phase 0 — packages/db

## Entscheidung

Wir nutzen **Prisma 6** als ORM für Postgres.

## Warum

- `specs/tech-stack.md` erlaubt Prisma _oder_ Drizzle, sagt: ADR treffen.
- Prisma hat:
  - **Bessere Migrations-Story** (shadow-DB, review-friendly SQL-Output,
    `prisma migrate deploy` für CD).
  - **Typed Client** out of the box ohne separates Codegen.
  - **Prisma Studio** für lokales DB-Browsing (wertvoll während Dev).
  - Schema-First: `schema.prisma` ist eine sehr kompakte Single-Source-of-Truth,
    die man leicht in Reviews lesen kann.
- Drizzle wäre schneller und erlaubt feinere SQL-Kontrolle, aber Prisma
  ist für ein Team, das RLS + Multi-Tenant korrekt durchziehen will, die
  risikoärmere Wahl.
- RLS-Policies werden ohnehin als **rohes SQL** in `prisma/migrations/*/migration.sql`
  beigemischt — Prisma blockiert das nicht.

## Was wir tun, wenn Prisma performance-mässig knapp wird

- Hot-Read-Pfade dürfen direkt `prisma.$queryRaw` oder `pg`-Pool benutzen.
- Langfristig können wir einzelne Services (z. B. Reporting-Read-API) auf
  Drizzle umstellen, wenn nötig. Shared-Types bleiben unverändert, da
  `@salon-os/types` das Zod-Schema diktiert, nicht das ORM.

## Konsequenzen

- Prisma-Client wird im `packages/db`-Build via `prisma generate` erzeugt.
- Post-install in Apps (api, worker) triggert evtl. den generate-Schritt
  — wir fügen einen `turbo run db:generate`-Schritt in die Build-Pipeline ein.
- pgvector + pg_trgm + unaccent werden über `previewFeatures = ["postgresqlExtensions"]`
  und `extensions = [...]` im Datasource-Block referenziert.
