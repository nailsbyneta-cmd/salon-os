# Status — SALON OS

**Letzte Aktualisierung:** 2026-04-21 (Block A gestartet)
**Aktuelle Phase:** Phase 1 (MVP) — Block A-Härtung läuft
**Fortschritt Phase 1:** ~35 % Baseline, ~20 % Differenzierung (siehe AUDIT.md)

## In Arbeit
- [x] Block A #1 Slice 1a — Testcontainers-Infra + erste RLS-Integration-Tests
- [ ] Block A #1 Slice 1b — Pact Consumer-Driven-Contracts (web ↔ api)
- [ ] Block A #1 Slice 1c — Vitest 80% Coverage, Playwright E2E 5 Golden-Paths
- [ ] Block A #2 OpenTelemetry
- [ ] Block A #3 Outbox-Pattern
- [ ] Block A #4 Rate-Limiting auf /v1/public/*
- [ ] Block A #5 Server-Idempotency-Dedupe (Redis)
- [ ] Block A #6 WorkOS-Magic-Link-Auth
- [ ] Block A #7 a11y-Gate (axe-core in Playwright)

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
