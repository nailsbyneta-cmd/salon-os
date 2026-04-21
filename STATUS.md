# Status — SALON OS

**Letzte Aktualisierung:** 2026-04-21 (Block A gestartet)
**Aktuelle Phase:** Phase 1 (MVP) — Block A-Härtung läuft
**Fortschritt Phase 1:** ~35 % Baseline, ~20 % Differenzierung (siehe AUDIT.md)

## In Arbeit
- [x] Block A #1 Slice 1a — Testcontainers-Infra + erste RLS-Integration-Tests
- [x] Block A #1 Slice 1b — Pact Consumer-Contracts (web)
- [x] Block A #1 Slice 1c — Pact Provider-Verify (api)
- [x] Block A #1 Slice 1d — Playwright E2E (1/5 Golden-Path, Rest inkrementell)
- [x] Block A #1 Slice 1e — axe-core a11y-Gate (WCAG 2.1 AA)
- [x] Block A #2 OpenTelemetry Traces (Metriken-Exporter folgen, Version-Konflikt)
- [x] Block A #3 Outbox-Pattern (Infra + Poller; Producer-Migration inkrementell)
- [x] Block A #4 Rate-Limiting auf /v1/public/*
- [x] Block A #5 Server-Idempotency-Dedupe (Redis)
- [ ] Block A #6 WorkOS-Magic-Link-Auth

## Block A — Fortschritts-Log

### 2026-04-21 — Slice 1a: Test-Infra
- ✅ `apps/api/src/test-utils/pg-test-db.ts`: Testcontainers-Bootstrap für
  pgvector/pg16, optional via `TEST_DATABASE_URL` für CI
- ✅ `vitest.integration.config.ts` neben unit-Config, Include-Splitting
- ✅ Erster Integration-Test: `with-tenant-rls.integration.test.ts` prüft
  Row-Level-Security-Isolation + UUID-Validation
- ✅ CI-Job `integration` mit Postgres-Service + `prisma migrate deploy`
- ⚠️  Sandbox-Umgebung ohne Docker-Daemon → Testcontainers-Pfad lokal
  unverifiziert, CI-Pfad (`TEST_DATABASE_URL`) läuft via GH-Actions-Service

### 2026-04-21 — Slice 1b: Pact-Consumer
- ✅ `@pact-foundation/pact@15` in `apps/web` + `vitest.contract.config.ts`
- ✅ Erster Consumer-Contract `api.contract.test.ts` für `GET /v1/clients?limit=50`
  — inkl. Matcher für dynamic ID/Name-Felder
- ✅ `apiFetch()` liest `PUBLIC_API_URL` lazy (vorher const) → testbar gegen
  Pact-Mock-Server
- ✅ `.gitignore`: `pacts/` + `pact-logs/` (Artefakte, keine Quellen)
- ✅ CI-Job `contract-consumer` uploaded `pacts/` als Artifact für Provider-Verify

### 2026-04-21 — Slice 1c: Pact-Provider-Verify
- ✅ `@pact-foundation/pact@15` in `apps/api` + `vitest.contract.config.ts`
- ✅ `clients.provider.pact.test.ts` bootet NestJS-App auf ephemerem Port
  gegen Testcontainer-DB, Provider-State `tenant has clients` wird im
  stateHandler mit echten Prisma-Rows geseedet (TENANT_ID matcht Contract)
- ✅ CI-Job `contract-provider` zieht `pacts`-Artifact vom Consumer-Run,
  appliziert Migrations auf Postgres-Service und verifiziert alle Interaktionen
- ⚠️  Lokal nicht smoke-getestet (Sandbox ohne Docker-Daemon) — CI validiert
  den Gesamt-Pfad web→api end-to-end

### 2026-04-21 — Block A #1/1d+1e: Playwright E2E + a11y-Gate
- ✅ `@playwright/test@1.59` + `@axe-core/playwright@4.11` im Root
- ✅ `playwright.config.ts` mit `webServer`-Auto-Start für apps/web,
  `trace/screenshot/video`-on-failure, HTML-Report, 1 Worker (stable)
- ✅ E2E-#1 `public-booking.spec.ts`: lädt `/book/beautycenter-by-neta`,
  prüft Tenant-Name + Service-Link, axe-core 0-Violations-Gate
  (wcag2a + wcag2aa + wcag21a + wcag21aa)
- ✅ CI-Job `e2e` startet Postgres+Redis-Service, appliziert Migrations,
  seedet Demo-Tenant, bauten API + startet node dist/main.js,
  Playwright bringt Web per webServer hoch, lädt Chromium mit Deps
- ✅ `playwright-report/` als Artifact auf jeder Run-Completion (7 Tage)
- 🔜 Weitere Golden-Paths (Login, Create-Appointment, Cancel, POS-Checkout)
  folgen nach WorkOS-Integration (Slice #6)

### 2026-04-21 — Block A #2: OpenTelemetry (Tracing)
- ✅ `apps/api/src/otel.ts` + `apps/worker/src/otel.ts`: NodeSDK mit
  `auto-instrumentations-node` (HTTP, fastify, pg, ioredis, bullmq)
- ✅ OTLP-HTTP-Trace-Exporter; ohne `OTEL_EXPORTER_OTLP_ENDPOINT` läuft
  das SDK im No-Op-Mode (lokale Dev unverändert)
- ✅ Service-Name/-Version/-Environment als Resource-Attribute
- ⚠️  Metriken-Exporter (`sdk-metrics@2` vs. `exporter-metrics-otlp-http@0.57`)
  hat Paket-Versions-Konflikt, deshalb Tracing-only in dieser Runde —
  Metriken folgen sobald kompatibles Duo raus ist
- ✅ Filesystem-Instrumentierung deaktiviert (Span-Spam)

### 2026-04-21 — Block A #3: Outbox-Pattern (Infra)
- ✅ Migration `0009_outbox` + Prisma-Model `OutboxEvent` mit Partial-Index
  auf `WHERE publishedAt IS NULL` (O(log n) auch bei Millionen Rows)
- ✅ `apps/api/src/outbox/OutboxService.emit()`: schreibt Event INNERHALB
  der Caller-Transaktion → Atomarität zwischen Business-Change und Event
- ✅ `apps/worker/src/outbox-poller.ts`: `FOR UPDATE SKIP LOCKED`-Polling
  mit exponential backoff + attempts-Cap, routet `reminder.*` →
  Reminders-Queue und `marketing.*` → Marketing-Queue
- ✅ 6 Unit-Tests (3 Service, 3 Poller-Dispatch) grün
- 🔜 Producer-Migration inkrementell: `RemindersService.sendConfirmationNow()`
  und Marketing-Jobs ziehen im nächsten Slice auf Outbox um

### 2026-04-21 — Block A #5: Idempotency-Dedupe
- ✅ `IdempotencyInterceptor` als globaler APP_INTERCEPTOR: Write-Requests
  mit `Idempotency-Key`-Header werden pro `{tenant, key, method, url}`
  für 24h gecached; Replays geben identischen Status+Body zurück
- ✅ Store-Interface + `RedisIdempotencyStore` (ioredis@5) und
  `InMemoryIdempotencyStore` (für Tests); Factory wählt automatisch
  anhand `REDIS_URL` / `NODE_ENV`
- ✅ Fail-open wenn kein Store (lokale Dev ohne Redis läuft weiter)
- ✅ Key-Whitelist `[A-Za-z0-9_\-:.]`, max 255 Zeichen → 400 bei Verstoß
- ✅ 6 Unit-Tests: GET bypass, kein Header bypass, Dedup, Tenant-Isolation,
  400 bei Junk-Keys, Fail-open ohne Store

### 2026-04-21 — Block A #4: Rate-Limiting
- ✅ `@fastify/rate-limit@10` in `apps/api`, global via `app.register()` in
  `main.ts` mit `allowList`-Funktion → limitiert nur `/v1/public/*` +
  `/public/*`, Admin-Routen bleiben frei
- ✅ 60 req/min/IP Default, via `PUBLIC_RATE_LIMIT_MAX` override-bar
- ✅ 429-Response als RFC-7807 ProblemDetails
  (`type/title/status/detail`)
- ✅ 3 Unit-Tests (`rate-limit.test.ts`): limitiert public, lässt admin
  durch, liefert Problem-Payload

## P0-Bugfix-Run (2026-04-20)
- ✅ **P0-01 Business-Hours-Bug** — Booking-Seite zeigte alle Tage „geschlossen"; Slot-Generator ignorierte openingHours. Fix in `fix/p0-01-business-hours`, merged in main. Web-Parser handelt jetzt Array-of-Intervals-Shape, API availability() respektiert openingHours + TZ (DST-sicher via Intl.DateTimeFormat). Fallback „Öffnungszeiten auf Anfrage" wenn kein Datensatz. Follow-up-Hotfix: TS2538 weekday-index non-null.
- ✅ **P0-02 Time-Slot-Kontrast** — Slot-Picker hatte harte `neutral-*`-Klassen, unlesbar im Dark Mode. Fix in `fix/p0-02-time-slot-contrast`, merged in main. Jetzt Design-Tokens durchgängig, hover-Translate+Accent, focus-visible-Ring, Empty-State als Card.
- ✅ **P0-03 Confirm + Success Kontrast** — selbes Problem auf confirm + success. Fix in `fix/p0-03-confirm-success-contrast`, merged in main. Native Inputs → UI-Komponenten (Input/Textarea/Button), autocomplete-Attribute, Error-Banner auf confirm, success in Card mit success-Token-Icon.

## Fertig seit letztem Audit (2026-04-19 → 2026-04-20)
- ✅ Block A Design-System-Grundlagen: Tokens, Dark-Mode, ⌘K, Hero-Screens
- ✅ Block B: Drag-to-Reschedule, Click-to-Book, Self-Service, Confirmation-Email
- ✅ Diff #25 Command Palette (Clients + Services Live-Search)
- ✅ Diff #31 1-Klick-DSGVO-Export + Audit-Log
- ✅ Diff #24 POS-Tablet-Checkout mit Tip-Picker (UI-Teil)
- ✅ Diff #22 Staff-PWA-Skeleton unter `/m/*`
- ✅ Diff #37 Toast + Celebration-Micro-Interactions (Basis)
- ✅ Diff #1 Predictive No-Show-Scoring + Lifetime-Counters
- ✅ Diff #19 Digital Gift-Cards via iMessage/WhatsApp-Share
- ✅ Waitlist (public + admin), Inventar-Light, Loyalty Tiers+Points
- ✅ Marketing-Automation: Birthday, Rebook, Win-Back (täglich)
- ✅ Multi-Staff-Kalender-View (Tag + Woche + Monat) mit Zoom
- ✅ CSV-Import (Phorest/Fresha/Booksy) + CSV-Export Clients
- ✅ Public-Salon-Homepage `/book/[slug]` mit Branding/FAQ/Reviews/Gallery
- ✅ .ics Add-to-Calendar bei jeder Buchung

## Nächste Schritte (nach „Go-Upgrade")
1. Block A Härtung: Tests + OTel + Outbox + WorkOS + Rate-Limits + a11y-Gate
2. Block B Design-System-Härtung: Ladle + Chromatic + fehlende Komponenten
3. Block C Baseline-P0-Lücken: Forms & Consent, POS-Volltiefe, RBAC, Time-Clock

## Metriken (aktuell)
- Tests: nur 3 Test-Dateien (health.controller, types/index, utils/money) — **zu dünn**
- E2E/Playwright: **0**
- Lighthouse: ungetestet
- Bundle-Size: ungetestet
- TypeScript-Errors: unbekannt (nicht frisch geprüft diese Session)
- Axe-Violations: ungetestet

## Bemerkungen
- AUDIT.md und UPGRADE-PLAN.md auf Stand 2026-04-20 aktualisiert
- Collaboration-Dateien (STATUS/BLOCKERS/QUESTIONS/ANSWERS/DISPATCH) frisch angelegt
