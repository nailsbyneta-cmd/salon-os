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

---

## Session 2 — Audit + Phase 1 Expansion (selbe Sitzung, später)

**5 parallele Audit-Agenten** (Architecture / Code-Quality / Security /
Spec-Conformance / Build-Readiness) haben den Phase-0/M1-Stand durchleuchtet.
Konsolidierte Befunde + Fixes:

**Audit-Blocker alle gefixt** (Commit `chore(fix): audit`):
- 🔴 B1 Migration-Ordering: `0001_rls_init` löschte RLS auf nicht-existierende
  Tabellen. Ersetzt durch `0001_init` mit komplettem DDL für tenant/user/
  location/tenant_membership/audit_log + Enums + RLS-Hilfsfunktionen + Policies
  in einer atomaren Migration.
- 🔴 B2 SQL-Injection-Vektor in `withTenant`: UUID-Regex + StaffRole-Whitelist
  vor jeder SET-LOCAL-Interpolation. Defense-in-Depth in TenantMiddleware.
- 🔴 B3 `apps/web` fehlte `"type": "module"` — gesetzt, engines ergänzt.
- 🔴 B4 `packages/config` listete nicht-existierendes `tsconfig/` — entfernt.
- 🟡 B5 tsconfig.base `moduleResolution: bundler` + `verbatimModuleSyntax`
  Konflikt — auf `NodeNext` umgestellt.
- 🟡 B6 Kein Production-Guard — `assertProductionSafety()` in main.ts:
  wenn NODE_ENV=production und WorkOS-Keys fehlen → Startup-Abbruch.
- 🟡 B7 Mailhog deprecated → `axllent/mailpit`.
- 🟡 B8 `_prisma` dead fields in Services — entfernt.
- 🟡 B9 Mobile-Apps aus pnpm-workspace.yaml entfernt bis Expo-Init.

**Phase 1 M1 komplettiert (3 Commits):**
- **Locations-Modul** (`/v1/locations` CRUD + Zod-Schemas inkl. openingHours)
- **Rooms-Modul** (`/v1/rooms` CRUD, `?locationId`-Filter, soft-deactivate)
- **Staff-Modul** (`/v1/staff` CRUD + Location-Assignments + Service-Links
  als transactional replace-all-on-change)

**Public Booking End-to-End** (entscheidender Meilenstein, Commit `feat: public-booking`):
- Backend `apps/api/src/public-bookings/`:
  - `GET /v1/public/:tenantSlug/locations` + `services`
  - `GET /v1/public/:tenantSlug/services/:id/slots?date=&locationId=`
    → Slot-Generator (MVP: 09–18h im 30-Min-Raster, Staff-Filter auf Service
    + Location, Overlap-Check gegen existierende Termine)
  - `POST /v1/public/:tenantSlug/bookings` → Client-Dedup via email/phone,
    Appointment + Item transaktional, Exclusion-Constraint-Conflict → 409
    `slot_taken`. "no preference" staffId pickt ersten qualifizierten Staff.
  - `PRISMA_PUBLIC`-Provider für den initialen Tenant-Slug-Lookup vor RLS.
  - TenantMiddleware exkludiert `/v1/public/` von der Auth-Pflicht.
- Frontend `apps/web/src/app/(booking)/`:
  - Mobile-First Layout ohne Admin-Chrom
  - `/book/[slug]` — Service + Location-Picker
  - `/book/[slug]/service/[id]` — Slot-Picker (Vormittag/Nachmittag/Abend)
  - `/book/[slug]/confirm` — Kontakt-Formular, Server-Action mit
    Idempotency-Key, Fehler → Query-Param-Rückkanal
  - `/book/[slug]/success` — Bestätigungsseite
- Reichweite: nach `db:seed` erreichbar unter
  `http://localhost:3000/book/beautycenter-by-neta`.

**Phase-1-Erfolgskriterien nach Session 2:**
- ✅ 1. „Ein echter Salon kann Phorest ablösen" — Owner-Admin (Staff,
  Services, Kalender, Clients) + Online-Buchung end-to-end lauffähig.
  Fehlt: Reminders, POS, Reports, Phorest-Import-Script.
- ✅ 2. „Kunden buchen online über Branded-Link" — **Fertig** (ohne
  Auth/Magic-Link-Follow-up für Reschedule/Cancel, das kommt Wo 7).
- ❌ 3. Mobile-App für Staff — Expo-Init pending.
- 🟡 4. Owner-Dashboard — Clients-List + Calendar read-only. Reports-Modul
  fehlt (Umsatz, Auslastung, No-Show).
- ✅ 5. Multi-tenant mit RLS — Policies + UUID-Validation + Prod-Guard.
- ❌ 6. DSGVO-Export + Löschung — Endpoints fehlen.
- ❌ 7. Fiskal/TSE via fiskaly — Adapter fehlt.

**Was bewusst offen bleibt (folgt iterativ):**
- Reminder-Worker (BullMQ: confirmation E-Mail/SMS 24h/2h vorher)
- POS-Modul (Stripe-Adapter, Checkout-UI, Tagesabschluss)
- Forms & Consultations (Schablonetechnik-Consent etc.)
- Loyalty / Memberships / Gift Cards (Phase 2)
- Marketing / Automated Flows (Phase 2)
- i18n-Infrastruktur (next-intl, blockierend erst ab Phase 2)
- OpenAPI-3.1-Generator (`@nestjs/swagger`)
- Idempotency-Backend-Cache (Redis)
- WorkOS-Session (ersetzt x-tenant-id-Header)

Der Stack ist stabil und erweiterbar — Pattern pro Modul (Controller +
Service + Zod-Schema + Tests) ist etabliert, alle weiteren Module folgen
dem gleichen Blueprint.

**Business-Entscheidungen bestätigt (2026-04-19)**
- Brand: SALON OS (final, nicht Codename)
- Tenant #1 / Design-Partner: Beautycenter by Neta
- Primärregion: eu-central-2 (Zürich)

**Offene Business-Fragen**
- Vercel-Team + Fly.io-Org-Handles (für CI-Secrets)
- WorkOS-Account-Setup — Org-Name, Branding
- Doppler-Projekt: `salon-os-dev` / `salon-os-prod` Aufteilung ok?
