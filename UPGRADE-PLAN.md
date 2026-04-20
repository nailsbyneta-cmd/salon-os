# UPGRADE-PLAN — Von „funktional" zu „Top 1%"

> Nach `AUDIT.md` (Stand 2026-04-20). Ersetzt den Plan vom 2026-04-19.
> Reihenfolge ist streng: **Härtung zuerst, dann Lücken schließen, dann
> P0-Differenziatoren vertiefen, erst dann P1.**

---

## Behalten (keine Änderungen)

| Stück | Warum |
|-------|-------|
| Turborepo + pnpm Monorepo | Struktur passt |
| Prisma Schema (8 Migrations) + RLS + GiST-Exclusion | Datenmodell ist solide, RLS sauber |
| `withTenant()` + UUID- + Role-Whitelist | Defense-in-Depth korrekt |
| Railway-Deploy (Postgres, Redis, api, worker, web) | Funktioniert |
| Env-driven Dry-Run (Stripe + Postmark) | Elegant, bleibt |
| NestJS 11 + Fastify 5 + RFC 7807 Filter + Zod-Pipe | Bleibt |
| Tenant-Context via AsyncLocalStorage | Bleibt |
| BullMQ-Reminders-Architektur + Marketing-Automation-Job | Bleibt, Outbox davor |
| Stripe-Payments-Adapter-Shape | Bleibt |
| `packages/ui/tokens.css` + `theme-provider` + Dark-Mode-Basis | Bleibt, wird erweitert |
| Multi-Staff-Kalender-View (Tag/Woche/Monat) + Drag-to-Reschedule | Bleibt, wird poliert |
| Public-Salon-Homepage (Branding, FAQ, Reviews, Gallery) | Bleibt |
| Audit-Log + DSGVO-Export | Bleibt |
| Gift-Cards + Waitlist + Inventar-Light + Marketing-Automation | Bleibt |
| Predictive-No-Show-Scoring | Bleibt, Auto-Deposit-Trigger anbauen |
| Mobile-PWA unter `/m/*` | Bleibt, wird vorerst weiter ausgebaut, parallel Expo planen |

## Anpassen (Code bleibt, wird verbessert)

| Stück | Was ändern | Warum |
|-------|------------|-------|
| Tenant-Middleware | WorkOS-Session-Cookie statt HTTP-Header | Phase-0-Shortcut ist bekanntes Tech-Debt |
| `toLocalIso()` | Per-Location-Timezone statt hardcoded `Europe/Zurich` | Multi-Location |
| Reminders-Service + Marketing-Jobs | Outbox-Pattern: DB-Event → Outbox-Worker poolt | `CLAUDE.md` fordert Outbox |
| API global | OpenTelemetry-Traces/Metrics/Logs | `CLAUDE.md` fordert OTel |
| `apiFetch()` | Server-seitige Idempotency-Deduplizierung + Rate-Limits | Missing-Control |
| Public-Booking-Flow | Multi-Service + Magic-Link-Login + Voucher/Coupon + Formular-Step | Baseline 2.3/2.11/2.12/2.13/2.14 |
| Kalender | Recurring-Group, Multi-Service-Group, Buffer-UI, Break-Blocking | Baseline 1.7/1.8/1.11/1.12 |
| Empty-States (alle Seiten) | Text → Illustration + Next-Action-CTA | `design-system.md` §Empty-State |
| Error-UX | Strings → structured mit Copy-ID + Retry | `design-system.md` §Error-Screen |
| Toast-Komponente | Swipe-to-Dismiss + Variants (success/error/info) | `design-system.md` §Components |
| Staff-PWA (`/m/*`) | Bottom-Tab-Nav + Floating-Action-Button + Haptic-Vibration-API | `design-system.md` §Staff-Mobile |
| Tip-Picker im POS | Auto-Split nach konfigurierten Rollen (Stylist/Assistent/Shampoo) | Diff #28 vollenden |
| Predictive-No-Show | Threshold-Actions: >60 Deposit-Request, >80 Waitlist-Parallel | Diff #1 komplett |

## Rewriten (wegwerfen, neu)

| Stück | Warum |
|-------|-------|
| **Modal/Drawer/Popover** ad-hoc im Page-File | → dedizierte `packages/ui/`-Komponenten mit Radix-UI-Primitives |
| **Kunden-Liste (aktuelle Table)** | → `DataTable`-Komponente mit Sort/Filter/Search/Bulk |
| **Empty-States** | Aktuell „Noch keine X" → Illustration + CTA, einheitlich über `<EmptyState>` |
| **Reports** (aktuelle Sparkline) | → Tremor/Recharts-basierte Dashboard-Tiles (Stripe-Dashboard-Dichte) |

## Neu bauen

### Block A — Härtung (Woche 1)

**Ziel: Produktionsreife auf „Linear-würde-das-einstellen"-Niveau.**

1. **Test-Gate in CI**:
   - Vitest-Ziel: 80 % Coverage in `packages/db`, `packages/utils`,
     `packages/types`, `apps/api` (Module je 1 Controller- + 1 Service-Test)
   - Playwright E2E für 5 Golden-Paths: Login, Create-Appointment,
     Cancel, Public-Booking, POS-Checkout
   - CI-Gate: rot = kein Merge
2. **OpenTelemetry**: `@opentelemetry/*` in `apps/api` + `apps/worker`, OTLP-Export
3. **Outbox-Pattern**: `outbox_events`-Tabelle + Worker-Poller, Reminders +
   Marketing-Jobs darüber
4. **Rate-Limiting** (`@fastify/rate-limit`) auf `/v1/public/*`
5. **Server-seitige Idempotency-Dedupe** (Redis-Key über 24h)
6. **WorkOS-Auth**: Magic-Link + Session-Cookie, Tenant-Middleware wechseln
7. **a11y-Gate**: axe-core in Playwright, 0 Violations auf P0-Flows

### Block B — Design-System-Härtung (Woche 2)

1. **Ladle** aufsetzen (schneller als Storybook) mit Stories für alle
   `packages/ui/`-Komponenten
2. **Chromatic** oder Percy für Visual-Regression
3. **Fehlende Basis-Komponenten**: Modal, Drawer, Popover, Tooltip,
   Combobox, DatePicker, TimePicker, DataTable, ErrorBoundary,
   Select, Textarea, AvatarGroup
4. **Salon-spezifisch**: ClientAvatar (VIP-Ring), ServiceBadge
   (Kategorie-Farbe), StaffScheduleGrid, TreatmentTimer, BeforeAfterSlider
5. **Keyboard-Shortcut-Help** (`?`-Dialog)
6. **Micro-Interactions**: Shake-on-Validation-Error, Swipe-to-Delete,
   Sync-Banner, Skeleton-on-Load > 1s, Konfetti-Trigger bei Tip ≥ 20 €
7. **Empty-State-Illustrationen** (SVG, monochrom)

### Block C — Baseline-P0-Lücken (Woche 3–5)

1. **Forms & Consent-Modul** (komplett neu):
   - Form-Builder (Drag-Drop, 10 Feldtypen inkl. Signature)
   - Conditional-Logic
   - Photo-Upload + PDF-Export mit Unterschrift
   - Mandatory-pre-Service-Gate
   - Pre-Appointment-Link 24h vorher
   - Template-Library (10 Starter pro Branche)
   - Minor-Flag mit Sorgeberechtigten-Unterschrift
2. **POS-Volltiefe**:
   - Split-Payment (Karte + Bar + Voucher)
   - Refund (Full + Partial)
   - Receipt-Formate (Email + SMS + Print + PDF)
   - Retail-Barcode-Scan (WebRTC)
   - Recurring-Billing (Memberships)
   - Payment-Links (SMS)
3. **Staff-HR**:
   - RBAC (Admin, Manager, Stylist, Front-Desk, Assistent)
   - Time-Clock (Clock-in/out via PWA)
   - Shift-Swap-Request + Time-Off-Request + Approval-Flow
   - Commission-Rules (pro Service, pro Staff, gestaffelt)
4. **Multi-Location-Switcher** im Header + Cross-Location-Reports
5. **Unified-Inbox** (Email + SMS in V1; WhatsApp/IG später)

### Block D — P0-Differenziatoren vertiefen (Woche 6–7)

1. **Diff #21 Drag-to-Reschedule Perfekt**: Haptic-Vibration-API,
   Undo-Toast 5 s, spring-ease-Drop-Animation
2. **Diff #22 Staff-App**: Expo-App aufsetzen (React Native, shared
   `packages/ui` via Tamagui oder NativeWind), TestFlight-Build
3. **Diff #23 Offline-First**: PowerSync oder MMKV + Sync-Queue in
   Staff-App
4. **Diff #24 Tap-to-Pay real**: Stripe Terminal SDK (iOS + Android),
   Salon-Side-Setup
5. **Diff #28 Tip-Split-Automation**: Rule-Engine (Stylist 100%,
   Assistent 20% von Farben, Shampoo 10%), Payout-Ledger

### Block E — P1-Differenziatoren (Monat 2)

- #1 Predictive-No-Show vollenden: Auto-Deposit-Request + Parallel-Waitlist-Offer
- #4 AI Voice Receptionist (Vapi + Claude Sonnet)
- #15 Verified-Reviews (Review nur nach bestätigter Buchung)
- #18 Branded-App pro Salon (Expo EAS + Fastlane Automation)
- #26 Color-Formula-Library (Client-Profil + Auto-Inventar-Abzug)
- #29 Staff-Self-Service-Scheduling (Swap/Off in Staff-App)
- #32 TSE-Live-Monitoring (fiskaly-Adapter, Status-Dashboard)
- #33 E-Rechnung (XRechnung/ZUGFeRD auto)
- #36 Payment-Dispute-Auto-Defender (Stripe Disputes API + KI-Paket)
- #38 Smart-Loyalty-Reminders (1×/Monat, personalisiert)

### Block F — Developer-API (Monat 3)

- OpenAPI 3.1 (auto-generiert aus NestJS-Decorators)
- GraphQL-Schema (nur Read, V1)
- Webhooks (30+ Events, HMAC-signed)
- OAuth 2.0 für Partner-Apps
- SDK (TypeScript v1)
- Sandbox-Environment
- Rate-Limit-Dashboards

### Block G — P2 / V2 (später)

AR Try-On, AI-Photo-to-Service, Dynamic-Pricing, HIPAA-Mode, Marketplace,
Multi-Location-Franchise-Dashboards, Consumer-App, Sustainability-Tracker.

## Neue MVP-Exit-Kriterien

- [ ] CI-Gate: Tests ≥ 80 % Coverage in Core-Packages, 5 Playwright E2E grün
- [ ] OTel in API + Worker, Traces sichtbar
- [ ] Outbox-Pattern für alle Event-Publishes
- [ ] WorkOS-Auth live (Magic-Link + Session-Cookie)
- [ ] Ladle läuft, Chromatic grün, 0 axe-Violations auf P0-Flows
- [ ] Dark-Mode an allen Admin- und Booking-Screens
- [ ] Lighthouse ≥ 95 auf allen Admin + Booking Flows
- [ ] Forms-Builder + Signature + Mandatory-Gate funktioniert
- [ ] POS: Split-Payment + Refund + Receipt-Formate
- [ ] RBAC + Time-Clock + Shift-Swap in Staff-PWA
- [ ] Staff-Expo-App auf TestFlight mit Offline-Sync
- [ ] Tap-to-Pay (Stripe Terminal) live im POS
- [ ] Beautycenter by Neta nutzt es produktiv für 7 Tage mit ≥ 10 Buchungen

## Nächste konkrete Schritte (nach „Go-Upgrade")

1. Branch `upgrade/block-a-haertung` erstellen
2. Vitest-Tests hinzufügen für `appointments`, `payments`, `public-bookings`,
   `reminders`, `clients` — je Controller + Service
3. Playwright-Setup + 5 E2E-Golden-Paths
4. OTel-Instrumentation
5. Outbox-Tabelle + Worker-Poller + Reminder/Marketing-Migration darauf
6. WorkOS-Integration
7. Screenshot + CI-Grüne in `DISPATCH.md` reporten
8. Bei OK → Block B (Design-System-Härtung)

## Was **nicht** mehr gebaut wird, bis Härtung steht

- Keine neuen Feature-Module ohne Test-Coverage
- Kein AI-Feature (P2), bis Baseline steht
- Kein Marketplace (Phase 2)
- Kein AR/HIPAA/Dynamic-Pricing (P2)

## Verbote bestätigt

- ❌ Eigener Payment-Code → Stripe-Adapter (✓ so gemacht)
- ❌ Eigene SMS/Email → Twilio/Postmark (✓ Postmark stub)
- ❌ Eigenes Auth → WorkOS (offen, in Block A)
- ❌ Eigene Fiskal-Logik → fiskaly (offen, in Block E / #32)
- ❌ Code aus beautyneta-* kopieren (✓ nicht gemacht)

## Warte auf „Go-Upgrade"
