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

**Fertig — Phase 0 Abschluss + Start Modul 1 (selber Tag)**
- ESLint-Configs + Vitest-Configs + erste grüne Tests (utils/types/api-health)
- Deploy: `apps/api/fly.toml` + `Dockerfile`, `apps/worker/fly.toml` + `Dockerfile`,
  `apps/web/vercel.json` (alle Zürich-Region)
- API-Infrastruktur:
  - `ProblemDetailsFilter` (RFC 7807) als globaler Exception-Filter
  - `ZodValidationPipe` für Controller-Input
  - `TenantMiddleware` + AsyncLocalStorage-Context
  - `DbModule` (prisma + withTenant als DI-Provider)
- Prisma-Schema erweitert um Modul 1 (Calendar & Scheduling): Staff, StaffLocation,
  Room, ServiceCategory, Service, ServiceVariant, StaffService, Client,
  Appointment, AppointmentItem, Shift, TimeOff (+ zugehörige Enums).
- Migration `0002_phase1_module1`: DDL + vollständige RLS-Policies +
  GiST-Exclusion-Constraint `appointment_no_overlap_per_staff` gegen
  Staff-Doppelbuchung.
- Zod-Domain-Schemas in `@salon-os/types`: Client, Service, Appointment
  (create/update/reschedule/cancel).
- Erstes vollständiges API-Modul: `/v1/clients` (Controller + Service +
  Zod-Validation + RLS-aware Prisma via withTenant).
- Docs: `docs/modules/clients.md`, `docs/modules/calendar-scheduling.md`.

**Nächste Woche (Phase 0 final → Phase 1 Fortsetzung)**
User-seitige Schritte zum Demo-Run:
- `pnpm install`
- `pnpm db:up && pnpm --filter @salon-os/db db:migrate && pnpm --filter @salon-os/db db:seed`
- `pnpm dev`
- WorkOS-Account anlegen, API-Keys in `.env` → Tenant-Middleware auf
  Cookie-Session umstellen (aktuell Platzhalter via `x-tenant-id`-Header)
- Sentry/PostHog/Datadog-Accounts bei Bedarf
- Vercel + Fly.io + Doppler-Projekte einrichten

Claude-seitig (nächster Arbeitsblock):
- Staff + Services + Appointments-Module analog zu Clients aufbauen ✅ Services + Appointments erledigt (Commit 58b8a0d)
- Kalender-UI in `apps/web` (Day/Week-View, Drag&Drop) — ✅ Day-View read-only erledigt (Commit 0cc5a87), Drag&Drop folgt in Woche 5
- Branded Booking-Page (`/book/[tenant-slug]`) — offen (Woche 6)

---

## Session-Ende 2026-04-19 — Gesamtstand

**Repo-Stats**
- 5 Commits
- 135 getrackte Files
- `main`-Branch, noch kein Remote (kein Push)

**Was läuft nach `pnpm install` + `db:up` + `db:migrate` + `db:seed`**
- API: NestJS + Fastify + RFC-7807-Filter + ZodValidationPipe +
  TenantMiddleware (Platzhalter-Header) + DbModule
- API-Module: `/health`, `/v1/clients`, `/v1/services`, `/v1/service-categories`,
  `/v1/appointments` (mit vollem Lifecycle: create, reschedule, cancel,
  confirm, check-in, start, complete)
- Web: Next.js 15 Admin-Layout + Clients-Liste + Kalender-Tagesansicht
  (read-only, Server-Components, eigener API-Client)
- Worker: BullMQ-Bootstrap-Stub (Heartbeat, Queues folgen)
- DB: 13 Tabellen mit RLS, GiST-Exclusion-Constraint gegen Staff-Doppelbuchung,
  Trigram-Index auf Client-Namen, vollständige Policies pro Rolle

**Noch nicht gebaut (Phase-1-Fortsetzung)**
- Staff-CRUD-Modul (analog Clients)
- Rooms-CRUD-Modul
- Shifts / TimeOff-Admin-UI
- Drag&Drop-Kalender-Komponente (client-side)
- Branded Booking-Page (public, Magic-Link-Buchung)
- WorkOS-Session-Integration (ersetzt `x-tenant-id`-Header)
- POS-Modul, Forms, Giftcards, Invoices, Reports, Marketing, Loyalty, AI
- Mobile-Apps (`apps/mobile-staff`, `apps/mobile-client`) — Expo-Init offen
- Observability-Hooks (Sentry/OTel/PostHog) — no-op bis Keys da sind

**Deliverable-Checkliste (PROMPT.md § "Woran wir den Erfolg messen")**
- [ ] 1. Echter Salon löst Phorest ab — UI/Flows fehlen
- [ ] 2. Kunden buchen online über Branded-Link — Booking-Page fehlt
- [ ] 3. Mobile-App für Staff — Apps leer, Expo-Init fehlt
- [ ] 4. Owner-Dashboard — Reports-Modul fehlt
- [x] 5. Multi-tenant mit RLS — Policies & Middleware fertig, noch nicht E2E-getestet
- [ ] 6. DSGVO-Export + Löschung — Endpoints fehlen
- [ ] 7. Fiskal/TSE via fiskaly — Adapter fehlt

**Klare nächste Iteration (wenn du „weiter" sagst)**
1. Staff-Modul + Rooms-Modul + Staff-UI auf `/staff` und `/locations`
2. WorkOS-Integration → Auth-Flow → TenantMiddleware auf Cookie-Session
3. Drag&Drop-Kalender (react-dnd oder dnd-kit) auf `/calendar`
4. Booking-Page unter `/book/[slug]` mit Multi-Service-Flow

**Business-Entscheidungen bestätigt (2026-04-19)**
- Brand: SALON OS (final, nicht Codename)
- Tenant #1 / Design-Partner: Beautycenter by Neta
- Primärregion: eu-central-2 (Zürich)

**Offene Business-Fragen**
- Vercel-Team + Fly.io-Org-Handles (für CI-Secrets)
- WorkOS-Account-Setup — Org-Name, Branding
- Doppler-Projekt: `salon-os-dev` / `salon-os-prod` Aufteilung ok?
