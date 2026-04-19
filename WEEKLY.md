# WEEKLY.md

## Woche 0 — 2026-04-19 — Phase 0 Start

**Fertig**
- Monorepo-Scaffold (Turborepo + pnpm 9 + TypeScript strict)
- Apps-Skelette: `api` (NestJS + Fastify), `web` (Next.js 15), `worker` (BullMQ)
- Packages-Skelette: `db` (Prisma), `auth` (WorkOS-Stub), `ui`, `types`, `utils`, `config`
- Prisma-Schema: Tenant, Location, User, TenantMembership, AuditLog
- RLS-Migration: `0001_rls_init` — Policies für Location, Tenant-Membership, Audit-Log, Tenant
- Docker-Compose: Postgres 16 (pgvector), Redis 7, Mailhog, Minio
- GitHub-Actions-CI: Typecheck, Lint, Build, Test (mit Postgres+Redis Services), Trivy-Scan
- Seed-Script: Demo-Tenant „Beautycenter by Neta" + Owner-User
- ADRs: 0001 Turborepo, 0002 Prisma, 0003 Fastify

**In Arbeit**
- —

**Blockiert**
- Keine Blocker.

**Nächste Woche (Phase 0 Ende)**
- `pnpm install` muss sauber durchlaufen (User-Task)
- `pnpm db:up && pnpm db:migrate && pnpm db:seed` erfolgreich
- `pnpm dev` startet web + api + worker lokal
- WorkOS-Integration fertig — Login-Flow funktioniert
- Sentry + PostHog in `apps/api` + `apps/web` eingehängt
- Vercel-Projekt für `apps/web`, Fly.io-App für `apps/api` angelegt
- Erster grüner CI-Run auf `main`
- Demo-Run: `npm run dev` → Login mit Seed-User → Dashboard zeigt „SALON OS" + Health-Check grün

**Business-Entscheidungen bestätigt (2026-04-19)**
- Brand: SALON OS (final, nicht Codename)
- Tenant #1 / Design-Partner: Beautycenter by Neta
- Primärregion: eu-central-2 (Zürich)

**Offene Business-Fragen**
- Vercel-Team + Fly.io-Org-Handles (für CI-Secrets)
- WorkOS-Account-Setup — Org-Name, Branding
- Doppler-Projekt: `salon-os-dev` / `salon-os-prod` Aufteilung ok?
