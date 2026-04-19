# UPGRADE-PLAN — Von „generic SaaS" zu „Top 1%"

> Nach `AUDIT.md`. Reihenfolge ist streng: **Design-System zuerst, dann
> Baseline schliessen, dann P0-Differenziatoren, erst dann P1.**

---

## Behalten (keine Änderungen)

| Stück | Warum |
|-------|-------|
| Turborepo + pnpm Monorepo | Struktur passt zur Spec |
| Docker-Compose (Postgres + Redis + Mailpit + Minio) | Solides lokales Dev |
| Prisma Schema + 3 Migrations inkl. RLS | Das Datenmodell + RLS-Policies sind richtig |
| `withTenant()` mit UUID- und Role-Whitelist (Defense-in-Depth) | Korrekt gegen SQL-Injection geschützt |
| GiST-Exclusion-Constraint `appointment_no_overlap_per_staff` | Das ist der richtige Weg gegen Doppelbuchung |
| Railway-Deploy-Pipeline (Dockerfile pro Service, Monorepo-Runtime) | Funktioniert, sauber |
| Env-Var-Driven Dry-Run-Pattern (Stripe + Postmark) | Elegant; behalten auch in „echt" |
| NestJS + Fastify-Adapter-Setup | Schnell genug, gute Middleware-Unterstützung |
| Problem-Details-Filter (RFC 7807) | Bleibt |
| Zod-Validation-Pipe + Schemas in `@salon-os/types` | Bleibt |
| Tenant-Context via AsyncLocalStorage | Korrekt |
| BullMQ-Reminders-Architektur (Producer in API, Consumer in Worker) | Bleibt — nur Outbox davor einfügen |
| Stripe-Payments-Adapter-Shape | Bleibt |

## Anpassen (Code bleibt, wird verbessert)

| Stück | Was ändern | Warum |
|-------|------------|-------|
| Public-Booking-Flow | Multi-Service + Magic-Link-Login + Voucher-Feld + Formular-Step | Baseline-Completeness 2.x |
| Appointment-Schema | Felder `recurring_group_id`, `multi_service_group_id`, `waitlist_rank` | Recurring + Group + Waitlist |
| Tenant-Middleware | Fallback auf WorkOS-Session-Cookie sobald konfiguriert | Phase-0-Header-Mode ist bekanntes Tech-Debt |
| `toLocalIso()` | Per-Tenant / Per-Location-Timezone statt hardcoded `Europe/Zurich` | Multi-Location |
| Reminders-Service | Outbox-Pattern: Event in DB-Transaktion → Outbox-Worker poolt in Queue | `CLAUDE.md` fordert Outbox |
| Calendar (`/calendar`) | Von Text-Liste zu echtem Grid mit Multi-Staff-Spalten | Baseline 1.x |
| Admin-Layout | Sidebar 240 px einklappbar → 56 px Icons, Top-Bar mit ⌘K, Bottom-Status-Bar | `design-system.md` §Layout-Prinzipien |
| `apiFetch()` | Optimistic-Updates + Client-side-Query-Cache (TanStack Query) | `design-system.md` §UX-Prinzipien #1 |
| Empty-States (alle Seiten) | Text → Illustration + Next-Action-CTA | `design-system.md` §Empty-State |
| Error-UX | String-Errors → Structured mit Copy-ID + Retry-CTA | `design-system.md` §Error-Screen |

## Rewriten (wegwerfen, neu mit Spec-Compliance)

| Stück | Warum |
|-------|-------|
| **Komplettes UI-Design** | Tailwind-Default ist nicht die Messlatte. Neu: shadcn/ui + eigene Design-Tokens in `packages/ui/` + Tailwind-Config mit Brand-Palette |
| **Alle Buttons / Inputs / Cards** | Ad-hoc im Page-File → 10 Basis-Komponenten in `packages/ui/` mit Varianten + Storybook-Stories |
| **Kalender-Komponente** | Aktuelle absolute-positionierte Divs → dnd-kit mit Drag-to-Reschedule + spring-ease + Haptics (mobile) + Undo-Toast |
| **Dashboard** | Aktueller Hallo-Dashboard → Stripe-Dashboard-Dichte mit echten Charts (Recharts oder Tremor) |
| **Booking-Flow** | Aktueller Fullscreen-Flow → Bottom-Sheet-Flow nach Resy/OpenTable (`design-system.md` §Layout Consumer) |
| **Kunden-Liste** | Einfache Tabelle → DataTable-Komponente mit Sort/Filter/Search/Bulk-Actions (`design-system.md` §DataTable) |
| **Public-Booking-Page** | Aktueller Flow → SEO-optimiert + Add-to-Calendar + Cancellation-/Reschedule-Link + Multi-Language + Schema.org-Markup |

## Neu bauen (existiert nicht)

### Block A — Design-System + Plumbing (Wochen 1–2)

1. `packages/ui/` initialisieren:
   - Tailwind-Config mit Design-Tokens aus `design-system.md`
   - shadcn/ui init
   - 10 Basis-Komponenten: Button, Input, Select, Combobox, DatePicker,
     TimePicker, Badge, Card, Modal, Drawer, Toast, Avatar, Skeleton,
     DataTable, CommandPalette, EmptyState, ErrorBoundary
   - Salon-spezifisch: AppointmentCard, ClientAvatar, ServiceBadge,
     PriceDisplay, StaffScheduleGrid, TreatmentTimer, BeforeAfterSlider
2. **Ladle** (schneller als Storybook) als Komponenten-Showcase
3. **Chromatic** oder Percy für Visual-Regression in CI
4. **Dark-Mode** via `next-themes`, Tokens gespiegelt (`dark:` + CSS-Vars)
5. **Motion-Layer** via `motion` (früher Framer Motion) + Ease-Presets in `packages/ui/motion.ts`
6. **Hero-Screens neu bauen**: Login, Dashboard, Calendar-Day — pixelgenau,
   Screenshot + Ladle-Link in PR
7. **Warten auf „Go-Upgrade"** bevor Block B startet

### Block B — Baseline-P0-Lücken (Wochen 3–6)

(In Reihenfolge der Salon-Critical-Need)

1. **Kalender Multi-Staff-Spalten** (Baseline 1.2) mit Day/Week-Ansicht
2. **Drag-to-Reschedule mit dnd-kit + Haptics + Undo** (Diff #21 + Baseline 1.3)
3. **Click-to-Book** (leerer Slot → Modal mit Pre-Fill)
4. **Multi-Service-Appointment-Flow** (Baseline 1.8)
5. **Recurring-Appointments** (Baseline 1.7)
6. **Waitlist** (Baseline 1.15)
7. **Buffer-Time + Break-Blocking + Unavailability** (Baseline 1.11–13)
8. **iCal-Sync + Add-to-Calendar-Link** (Baseline 1.18 + 2.16)
9. **POS-Grundgerüst**: Tablet-Checkout-UI + Split-Payment + Trinkgeld-Picker +
   Tap-to-Pay-Stripe-Stub (Baseline 3.1/3.4/3.9/3.2 + Diff #24)
10. **Confirmation-Email + Cancellation/Reschedule-Self-Service-Links**
    (Baseline 2.15/2.17/2.18)
11. **Forms-Builder (Intake + Consent)** mit Drag-Drop + Conditional-Logic +
    Signature + Pre-Appointment (Baseline 5.1–8)

### Block C — P0-Differenziatoren (Wochen 7–9)

1. **Universal Command Palette (⌘K)** mit Fuzzy-Search über Clients,
   Services, Staff, Navigation (Diff #25)
2. **1-Klick-DSGVO-Export + Löschung** mit Audit-Log-Proof (Diff #31,
   Baseline 17.1)
3. **Tip-Split-Automation** (Trinkgeld → Stylist + Assistent + Shampoo-
   Prozentual) (Diff #28, Baseline 3.10)
4. **Single-Thumb-Staff-App (Expo)** mit Heute/Kalender/Kunden-Tabs,
   Bottom-Nav, Haptics (Diff #22)
5. **Offline-First (Staff-App)** mit PowerSync oder MMKV + Sync-Queue
   (Diff #23)
6. **Celebration-Micro-Interactions** (Konfetti bei Tip > 20 €, Konfetti
   bei Tages-Ziel erreicht) (`design-system.md` §Signature-Moves)

### Block D — Marketing / Loyalty / Inventar-Grundlage (Wochen 10–12)

1. **Loyalty**: Points + Tiers + Punch-Card (Baseline 9.1–3)
2. **Gift-Cards digital** mit iMessage/WhatsApp-Link (Diff #19, Baseline 9.5)
3. **Marketing-Automation-Flows**: Rebook + Birthday + Win-Back
   (Baseline 8.6–9)
4. **Inventar-Light**: Produkt-Liste, Backbar vs Retail, Low-Stock
   (Baseline 7.1–5)

### Block E — P1-Differenziatoren (Monat 4)

In dieser Reihenfolge, je 1–2 Wochen:

- #13 Fair Fee Structure (Marketplace-Preise) + Transparenz-Dashboard
- #4 AI Voice Receptionist (Vapi + Claude Sonnet 4)
- #18 Branded-App pro Salon (Expo EAS + Fastlane Automatisierung)
- #32 TSE-Live-Monitoring (DE) + fiskaly-Adapter
- #33 E-Rechnung automatisch (XRechnung/ZUGFeRD)
- #1 Predictive No-Show-Scoring (ML-Pipeline)
- #26 Color-Formula-Library (Client-Profil + Auto-Inventar-Abzug)
- #36 Payment-Dispute-Auto-Defender (Stripe-Disputes-API + KI-Paket)
- #19 Digital Gift-Cards via iMessage
- #38 Smart-Loyalty-Reminders (1×/Monat personalisiert)

## Komplett fehlt (Must-in-V1, nicht MVP)

Liste aller Baseline-Features aus `feature-completeness.md`, die
**auch nach MVP fehlen würden**, sortiert nach Kategorie — als Phase-2-
Einstieg für monthly review.

Kategorien mit ≥ 80 % Fehlquote nach MVP-Abschluss (müssen in V1 rein):

- Forms & Consent (bleibt 0 % nach MVP → Block B2 erweitern)
- POS-Volltiefe: Split-Payment, Refund, Fiskal, Cash-Drawer, Payment-Links
- CRM: Photo-Historie, Color-Formula, Allergien-Flag, VIP, Duplicate-Detect
- Staff: Time-Clock, Commission-Rules, Payroll-Export
- Kommunikation: Unified-Inbox (SMS + Email + WhatsApp + Instagram-DM)
- Marketplace: komplett (geplant Phase 2)
- AI-Layer: alle 12 Features
- Compliance: HIPAA-Mode, PCI-SAQ-A, 2FA, SOC-2-Prep, Audit-Log,
  Data-Residency
- Developer-API: OpenAPI-3.1, GraphQL, Webhooks, OAuth, SDK

## Neue MVP-Definition nach diesem Upgrade

**MVP-Exit-Kriterien (statt dem alten Phase-1-Ziel):**

- [ ] Design-System steht, 10 Basis-Komponenten + 7 Salon-spezifische
- [ ] Ladle + Chromatic in CI grün
- [ ] Dark-Mode an allen Screens
- [ ] Lighthouse ≥ 95 auf allen Admin- und Booking-Flows
- [ ] a11y axe-core in CI, 0 Violations auf P0-Flows
- [ ] Drag-to-Reschedule + Undo funktioniert mobile + desktop
- [ ] ⌘K Command Palette öffnet in < 100 ms
- [ ] 1-Klick-DSGVO-Export funktioniert
- [ ] Staff-Expo-App auf TestFlight
- [ ] 1 echter Salon (Beautycenter by Neta) nutzt es für 7 Tage
  mit ≥ 10 realen Buchungen

## Nächste konkrete Schritte (nach „Go-Upgrade")

1. **Branch `upgrade/design-system`** erstellen
2. `packages/ui/` Setup inkl. Tailwind-Config-Tokens
3. 10 Basis-Komponenten + Ladle
4. Hero-Screens neu bauen: Login (WorkOS Magic-Link),
   Dashboard, Calendar-Day
5. Screenshots + Ladle-Link in AUDIT reviewen
6. Bei „OK" → Block B

## Was **nicht** mehr gebaut wird, bis Design-System steht

- Keine neuen Feature-Pages im aktuellen Tailwind-Default-Style
- Kein AI-Feature (P2), bis Baseline steht
- Kein Marketplace (Phase 2)
- Kein AR/HIPAA/Dynamic-Pricing (P2)

## Verbote bestätigt

- ❌ Eigener Payment-Code → Stripe-Adapter (✓ schon so gemacht)
- ❌ Eigene SMS/Email → Twilio/Postmark (✓ Postmark)
- ❌ Eigenes Auth → WorkOS (noch nicht integriert, ist in Anpassen)
- ❌ Eigene Fiskal-Logik → fiskaly (noch nicht)
- ❌ Code aus beautyneta-web kopieren (✓ nicht gemacht)

## Warte auf „Go-Upgrade"
