# AUDIT — Ehrliche Selbstbewertung von SALON OS

> Stand: 2026-04-19, nach Session-Marathon. Gegenübergestellt mit
> `specs/differentiation.md`, `specs/design-system.md`,
> `specs/feature-completeness.md`.

## TL;DR

Ich habe in dieser Session die **Plumbing-Schicht** solide hingesetzt
(Railway-Deploy, Prisma + RLS, NestJS-API, Next-Web, Worker, Reminders,
Stripe-Stub) und ein **minimal-funktionales Admin + Booking**. Aber gemessen
an den 3 neuen Specs ist das ein **"Phase 0 + 20 % Phase 1"-Stand**, nicht
mehr. Design ist Tailwind-Default, 0 der 40 Differenziatoren existieren,
baseline-Completeness liegt bei geschätzt **15 %**.

**Linear würde das nicht akzeptieren.** Es sieht aus wie ein generischer
Next.js-Admin, nicht wie eine $100/Monat-SaaS.

## Scoring

| Dimension              | Score | Begründung                                        |
| ---------------------- | ----: | ------------------------------------------------- |
| Code-Qualität          | **6/10** | TS strict + Zod + RLS ✓, aber 0 Tests, 0 a11y, kein OTel, Outbox-Pattern fehlt |
| Design-Polish          | **3/10** | Tailwind-Default, kein Dark-Mode, kein Motion-System, keine Micro-Interactions, keine Brand-Tokens |
| Feature-Vollständigkeit | **~15/100** | Siehe Matrix unten. Das meiste fehlt. |
| Einzigartigkeit        | **0/10** | Null der 40 Differenziatoren implementiert |

## Was existiert (ehrliche Bestandsaufnahme)

### Infrastruktur (das ist solide)
- Turborepo + pnpm 9 Monorepo ✓
- Docker-Compose für lokales Dev ✓
- GitHub Actions CI ✓
- Railway-Deploy mit 5 Services (Postgres + Redis + api + worker + web) ✓
- 3 Prisma-Migrations inkl. RLS-Policies und GiST-Exclusion ✓
- Env-Var-Driven Config (dry-run wenn Key fehlt für Stripe / Postmark) ✓

### API (funktional, aber schmal)
- NestJS 11 + Fastify 5 ✓
- RFC 7807 Problem Details Filter ✓
- Zod-Validation-Pipe ✓
- Tenant-Middleware mit AsyncLocalStorage ✓
- Module: clients, services, appointments (+ detail, transitions, notes),
  locations, rooms, staff (+ inline user upsert), public-bookings,
  shifts (minimal CRUD), reminders (BullMQ + Postmark stub),
  payments (Stripe stub für Deposits + Webhook) ✓
- `app.current_user_role` statt `current_role` (Postgres-Reserved-Keyword-Bug behoben) ✓
- Reminders: Enqueue 24h vor startAt, Cancel bei Appointment-Cancel ✓
- Staff-Create mit inline User-Upsert ✓

### Web (pragmatisch, hässlich)
- Next.js 15 App Router, Tailwind 4 ✓
- Dashboard (`/`): 4 KPIs + Nächster-Termin-Panel ✓
- Kalender (`/calendar`): 08–18 Stundenraster + Termin-Liste mit Status-Transitionen ✓
- Appointment-Detail (`/calendar/:id`): Kontakt, Leistungen, Notizen-Edit ✓
- Kunden (`/clients`, `/clients/:id`): Liste + Detail mit Verlauf ✓
- Services (`/services`, `/services/new`): Liste + Create + Delete ✓
- Staff (`/staff`, `/staff/new`, `/staff/:id/shifts`): Liste + Create + Delete + Shifts ✓
- Reports (`/reports`): 30 Tage Umsatz-Chart + Top-5-Services + Channels ✓
- Public Booking (`/book/:slug`): Location → Service → Slot → Confirm → Success ✓
- PWA Manifest + Apple-Icon (gerade deployed) ✓

### Worker (gerade läuft)
- BullMQ ✓
- Reminders-Consumer → Postmark (real) oder Dry-Run-Log ✓

## Was **NICHT** existiert

### Design-System (Null)

Gegen `specs/design-system.md` schaue ich alt aus:

- ❌ **Design-Tokens**: ich benutze Tailwind-Default `bg-neutral-900`, `text-neutral-500`.
  Spec verlangt eigene Tokens (`--color-brand`, `--color-brand-accent`, `--space-*`, `--radius-*`, 2-Layer-Shadows).
- ❌ **Dark-Mode**: existiert nicht. Spec sagt "First-Class".
- ❌ **Typografie**: Kein Inter Display + Inter + JetBrains Mono. Fluid-Type nicht gesetzt.
- ❌ **Motion-System**: Keine Ease-Funktionen definiert, kein Respect für `prefers-reduced-motion`.
- ❌ **Haptics / Sound-Design**: fehlen komplett.
- ❌ **Signature-Moves**: Drag-to-Reschedule (mit spring-ease + scale-bounce) existiert nicht.
  Checkout-Erfolg (Konfetti bei > 50 € Tip) existiert nicht.
- ❌ **shadcn/ui**: nicht initialisiert. Komponenten sind ad-hoc im Page-File.
- ❌ **Storybook / Ladle**: existiert nicht.
- ❌ **Chromatic / Visual-Regression**: existiert nicht.
- ❌ **Command-Palette (⌘K)**: existiert nicht.
- ❌ **Empty-State-Illustrationen**: ich habe nur Text ("Noch keine Services angelegt").
- ❌ **Skeleton-States**: ich nutze Next.js Server-Render, keine Loading-States.
- ❌ **Celebration-Micro-Interactions**: nichts.
- ❌ **a11y**: kein Axe-Core, kein Focus-Ring-Styling, kein Keyboard-Nav-Test, kein VoiceOver-Test.
- ❌ **Salon-spezifische Komponenten**: AppointmentCard, ClientAvatar, ServiceBadge, PriceDisplay, StaffScheduleGrid, TreatmentTimer, BeforeAfterSlider — alle fehlen.

### Differenziatoren (0 / 40)

Gegen `specs/differentiation.md`:

| # | Feature | P | Status |
|---|---------|---|--------|
| 21 | Drag-to-Reschedule mit Haptics + Undo | P0 | ❌ |
| 22 | Single-Thumb-Staff-App | P0 | ❌ (keine Staff-App überhaupt) |
| 23 | Offline-First | P0 | ❌ |
| 24 | Tap-to-Pay on Phone | P0 | ❌ (nur Stripe-Checkout-Dryrun) |
| 25 | Universal Command Palette (⌘K) | P0 | ❌ |
| 28 | Tip-Split-Automation | P0 | ❌ (keine Tipps überhaupt) |
| 31 | 1-Klick-DSGVO-Export | P0 | ❌ |

P1- und P2-Differenziatoren: alle 33 fehlen.

### Feature-Completeness-Baseline

Siehe detaillierte Matrix in Sektion unten. Kurz:

- **Kalender** 4/20 (Day-View, List-View, Color-Status, Click-to-Book-teilweise)
- **Online-Booking** 8/22
- **POS / Payments** 1/23 (nur Stripe-Checkout-Stub)
- **CRM** 4/21
- **Forms & Consent** 0/13
- **Staff / Team / HR** 4/15
- **Inventar** 0/13
- **Marketing** 1/17 (nur 24h-Reminder-Email-Stub)
- **Loyalty / Gift-Cards / Memberships** 0/11
- **Reporting** 5/16
- **Kommunikation** 0/9
- **Multi-Location** 1/8 (schema vorhanden, UI fehlt)
- **Marketplace** 0/12
- **Mobile Apps** 1/10 (gerade PWA-Tags dazu)
- **AI-Layer** 0/12
- **Integrations** 2/15 (Stripe-Stub, Postmark-Stub)
- **Compliance & Security** 1/15 (nur RLS)
- **Developer / API** 3/11 (REST ja, OpenAPI/GraphQL/Webhooks/SDK/Partner-Portal/Zapier/Make — nein)

## Code-Qualitäts-Probleme, die ich jetzt schon sehe

1. **Keine Tests.** Null Unit, null Integration, null E2E. Das widerspricht
   `CLAUDE.md` Punkt 7 ("Keine Features ohne Tests"). Muss sofort nachgeholt
   werden.
2. **Outbox-Pattern fehlt.** Reminder-Enqueue passiert direkt in
   `AppointmentsService.create` nach dem Commit. Wenn der BullMQ-Call fehlschlägt
   nach erfolgreichem DB-Commit, verliere ich den Reminder. `CLAUDE.md` fordert Outbox.
3. **OpenTelemetry fehlt.** `CLAUDE.md` fordert "von Anfang an".
4. **Keine i18n.** Alles deutsch, trotz `multi-language` in den Specs.
5. **Timezone-Fix ist Pflaster, nicht Lösung.** `toLocalIso()` arbeitet am
   Tag-Offset, aber für Multi-Location-Salons mit unterschiedlichen Zonen
   brauchen wir tenant-level Zone-Handling.
6. **`@Get ':id'` auf Staff ohne UUID-Guard** — ich habe es eilig auditiert,
   bin aber nicht sicher, ob alle Controller das haben.
7. **Server Actions senden Role/Tenant als HTTP-Header statt Session** —
   Phase-0-Shortcut, ist bekannt. Muss mit WorkOS raus.
8. **Keine Idempotency für admin-seitige POSTs.** `apiFetch()` generiert
   Idempotency-Key, aber Server validiert/dedupliziert nicht.
9. **Keine Rate-Limits.** `/v1/public/*` ist offen, könnte spam-geflutet werden.
10. **Problem-Details aus Catches nicht konsistent.** Manche werfen String,
    manche RFC 7807 object.

## Positive Anerkennung (was gut ist)

- **RLS + `withTenant()` + SQL-Injection-Schutz** (UUID + Role-Whitelist) sind sauber.
- **GiST-Exclusion-Constraint** für Staff-No-Overlap ist das richtige Werkzeug.
- **Production-Guard** in `main.ts` (assertProductionSafety) verhindert dumme Deploys.
- **Dry-Run-Pattern** in Reminders + Payments ist elegant — Service läuft ohne Env-Secrets weiter.
- **Monorepo-Struktur** mit geteilten Packages (`@salon-os/types`, `@salon-os/utils`, `@salon-os/db`) ist korrekt.

## Baseline-Matrix (Feature-Completeness)

### 1. Kalender & Termine — **5 / 20**

| Feature | Status |
|---|---|
| Day-Ansicht | ✅ |
| Week / Month / List-Ansicht | ❌ |
| Multi-Staff-Ansicht | ❌ |
| Drag-to-Reschedule | ❌ |
| Drag-to-Extend | ❌ |
| Color-Coding | ⚠️ (nur status, nicht pro service-kategorie) |
| Click-to-Book | ❌ (Button "Neuer Termin" ja, aber kein Click-auf-Slot) |
| Recurring-Appointments | ❌ |
| Multi-Service-Appointments | ⚠️ (Schema ja, UI nein) |
| Group-Appointments | ❌ |
| Resource-Booking | ⚠️ (Room im Schema, UI nein) |
| Buffer-Time automatisch | ⚠️ (Schema ja, UI nein) |
| Break-Blocking | ❌ |
| Unavailability | ❌ |
| Conflict-Detection | ✅ (GiST-Exclusion) |
| Waitlist | ❌ |
| No-Show-Tracking | ⚠️ (Status ja, Penalty nein) |
| Print-View | ❌ |
| iCal/Google/Outlook-Sync | ❌ |
| Timezone-Handling | ⚠️ (toLocalIso helper, nicht per-Tenant) |
| Keyboard-Navigation | ❌ |

### 2. Online-Booking — **8 / 22**

| Feature | Status |
|---|---|
| Widget einbettbar | ❌ |
| Stand-alone Booking-Page | ✅ |
| Multi-Service-Auswahl | ❌ (1 Service pro Flow) |
| Stylist-Auswahl mit Fotos/Reviews | ⚠️ (IDs, keine Fotos/Reviews) |
| "Nächster verfügbarer Stylist" | ✅ |
| Service-Filter | ❌ |
| Preis-Anzeige | ✅ |
| Deposit-Einforderung | ❌ (Stripe-Checkout-Stub da, nicht verdrahtet) |
| Guest-Checkout | ✅ |
| Account-Flow | ❌ |
| Magic-Link-Login | ❌ |
| Gutschein/Voucher | ❌ |
| Coupon-Code | ❌ |
| Formular-Ausfüllen | ❌ |
| Confirmation-Email + SMS | ⚠️ (24h-Reminder ja, sofort-Confirm nein) |
| Add-to-Calendar | ❌ |
| Cancellation-Link | ❌ |
| Reschedule-Link | ❌ |
| Multi-Language | ❌ |
| Multi-Currency | ⚠️ (Schema ja, UI nein) |
| Mobile-First | ✅ |
| WCAG AA | ❌ (nicht getestet) |

### 3. POS / Payments — **1 / 23**

Nur Stripe-Checkout-Session-Endpoint als Dry-Run-Stub. Alles andere fehlt.

### 4. CRM — **5 / 21**

Full-Profile ✅, Service-Historie ✅, Client-Import ❌, Photo-Historie ❌,
Color-Formula ❌, Allergien-Flag ❌, VIP/Tags-UI ❌, Merge ❌, Portal ❌,
In-App-Chat ❌, Notiz-Timeline ❌, Blacklist ❌, Familien ❌,
Birthday/Win-Back ❌.

### 5. Forms & Consent — **0 / 13**

Nichts.

### 6. Staff / Team / HR — **5 / 15**

Profile ✅, Schichten-MVP ✅, Time-Clock ❌, Commission-Rules ❌, Payroll ❌,
RBAC ❌, Staff-Portal ❌.

### 7. Inventar — **0 / 13**

Nichts.

### 8. Marketing — **1 / 17**

Nur 24h-Email-Reminder-Stub.

### 9. Loyalty / Gift / Memberships — **0 / 11**

Nichts.

### 10. Reporting — **5 / 16**

Umsatz, Top-Services, Channels ✅. Auslastung/Rebook/CLV/Cohorts/Custom-Dashboard ❌.

### 11. Kommunikation — **0 / 9**

Nichts.

### 12. Multi-Location — **1 / 8**

Schema unterstützt, UI nicht.

### 13. Marketplace — **0 / 12**

Nichts.

### 14. Mobile Apps — **1 / 10**

Nur PWA-Manifest heute hinzugefügt. Keine echte Staff-App, keine
Consumer-App, keine White-Label.

### 15. AI-Layer — **0 / 12**

Nichts.

### 16. Integrations — **2 / 15**

Stripe-Stub + Postmark-Stub.

### 17. Compliance & Security — **1 / 15**

Nur RLS. DSGVO-Export ❌, HIPAA ❌, PCI ❌, TSE ❌, E-Rechnung ❌,
Audit-Log ❌, 2FA/Passkeys ❌.

### 18. Developer / API — **3 / 11**

REST endpoints ✅, OpenAPI-doc ❌, GraphQL ❌, Webhooks-System ❌,
OAuth ❌, SDK ❌, Sandbox ❌, Partner-Portal ❌, Zapier/Make-App ❌.

## Fazit

Ich habe in ~4h eine **funktionale Phase-0 + kleine Phase-1-Stub** deployed.
Das Produkt läuft, Kunden können buchen, Termine sehen, stornieren. Das ist
real. Aber:

1. **Nichts davon überrascht jemanden.** Design-seitig ist es generisch.
2. **Nichts davon ist einzigartig.** Phorest hat alles bessere außer Design.
3. **Viel fehlt auch an Baseline.** Recurring, Multi-Staff-View,
   Offline, POS, Loyalty, Inventar, Marketing, Chat — das ist das,
   was Salon-Inhaber wirklich buchen. Ohne das sind wir nicht im Spiel.

Ich schlage vor im **UPGRADE-PLAN.md**:
- **Behalten**: Plumbing, Prisma-Schema, RLS, Deploy-Pipeline, Public-Booking-API,
  Staff-Module, Reminders-Architektur, Stripe-Adapter-Shape.
- **Rewriten**: komplettes Design-System (packages/ui neu, shadcn-Setup),
  Kalender-UI (mit dnd-kit Drag-to-Reschedule), Admin-Layout (Sidebar nach Spec).
- **Neu bauen**: Command-Palette, Dark-Mode, Motion-Layer, Offline-Sync,
  Tap-to-Pay-Stub, Tip-Split, 1-Klick-DSGVO, Staff-Mobile-App (Expo),
  Consumer-App (Expo), Marketplace-Skeleton.
- **Streng pausieren**: AI-Features (P2), AR (P2), Dynamic-Pricing (P2) —
  erst nachdem Baseline + P0-Differenziatoren stehen.

Details im `UPGRADE-PLAN.md`.
