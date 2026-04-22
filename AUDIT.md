# AUDIT — Ehrliche Selbstbewertung von SALON OS

> **Stand: 2026-04-20**, nach 50+ Commits seit letztem Audit.
> Gemessen gegen `specs/differentiation.md`, `specs/design-system.md`,
> `specs/feature-completeness.md`. Ersetzt den Audit vom 2026-04-19.

## TL;DR

Zwischen 2026-04-19 und 2026-04-20 wurde **massiv Fortschritt erzielt**: Block A
(Design-System, Dark-Mode, ⌘K), Block B (Drag-to-Reschedule, Click-to-Book,
Self-Service), mehrere P0-Differenziatoren (#25 ⌘K, #31 DSGVO-Export, #28
Tip-Picker-Ansatz, #22 Staff-PWA, #37 Celebrations, #24 POS), außerdem
Loyalty, Gift-Cards, Waitlist, Inventar-Light, Marketing-Automation,
Audit-Log, Public-Salon-Homepage, Multi-Staff-Tages-+Wochen-Kalender,
Predictive-No-Show-Scoring, CSV-Import.

**Das Produkt ist funktional deutlich reifer** als vor 24 h. Aber gegen die
harte Messlatte („Würde Linear das einstellen?") **fehlt immer noch viel**:
Storybook/Ladle, Chromatic, echte Expo-Apps, WorkOS-Auth, OpenTelemetry,
Outbox-Pattern, belastbare Test-Abdeckung (aktuell nur 3 Test-Dateien im
ganzen Repo), a11y-Audits, i18n, HIPAA/TSE/E-Rechnung.

**Gesamt-Score: 5,5/10** — mittlerer Weg zwischen „funktioniert" und
„Top 1%". Baseline liegt jetzt bei **~35%**, Differenzierung bei **~20%**.

## Scoring

| Dimension               | Score (vorher) | Score (jetzt) | Begründung                                                                                                                                                                                                |
| ----------------------- | -------------: | ------------: | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Code-Qualität           |           6/10 |      **6/10** | TS strict + Zod + RLS ✓, eigene Tokens ✓. Immer noch nur 3 Test-Dateien, kein OTel, keine Outbox, kein WorkOS.                                                                                            |
| Design-Polish           |           3/10 |      **6/10** | Tokens + Dark-Mode + Motion-Grundlagen + eigene Komponenten existieren. Aber: kein Storybook, keine Visual-Regression, keine Illustrationen, Empty-States noch text-only an vielen Stellen.               |
| Feature-Vollständigkeit |        ~15/100 |   **~35/100** | Kalender, Booking, CRM, POS-Lite, Reminders, DSGVO-Export, Loyalty, Gift-Cards, Waitlist, Inventar-Light, Marketing-Automation, Audit-Log da. Siehe Matrix.                                               |
| Einzigartigkeit         |           0/10 |      **4/10** | P0-Differenziatoren teilweise: ⌘K, DSGVO-1-Klick, Tip-Picker, Staff-PWA, Celebrations, Predictive-No-Show-Scoring (!). Noch fehlt echte Offline, echte Tap-to-Pay, echte Tip-Split-Automation, Expo-Apps. |

## Was NEU existiert (seit letztem Audit)

### Design-System (`packages/ui/`)

- `tokens.css` mit Brand-Tokens (Farben, Typo, Spacing, Radius, Shadows)
- `theme-provider.tsx` + Dark-Mode-Toggle
- Komponenten: Button, Input, Card, Badge, Avatar, Skeleton, Toast,
  CommandPalette, EmptyState, Stat, Price, AppointmentCard
- Tailwind 4 + eigene Design-Tokens
- **Fehlt immer noch:** Storybook/Ladle, Chromatic, Modal/Drawer/Popover
  als dedizierte Komponenten, DataTable, Combobox, DatePicker, TimePicker,
  ErrorBoundary, ClientAvatar (mit VIP-Ring), ServiceBadge (Kategorie-Farbe),
  StaffScheduleGrid, TreatmentTimer, BeforeAfterSlider

### Admin-Web (`apps/web/src/app/(admin)/`)

- Kalender: Tagesansicht + Wochenansicht + Monatsansicht mit Multi-Staff-
  Sub-Spalten, Drag-to-Reschedule, Click-to-Book, Zoom, Nur-Aktive-Toggle
- POS-Tablet-Checkout (`/pos/[id]`) mit Trinkgeld-Picker + Payment-Methods
- Audit-Log-Seite (`/audit`)
- Gift-Cards, Inventar, Waitlist als eigene Module
- Clients: Detail + Edit + Create + CSV-Import + CSV-Export + Client-Brief + Quick-Rebook
- Services: List + Create + Edit + Delete
- Staff: List + Create + Edit + Shifts
- Reports: Umsatz-Sparkline + KPIs
- Settings-Seite

### Mobile-Staff-PWA (`apps/web/src/app/(mobile)/m/`)

- Route-Prefix `/m/*` — iPhone-installierbar, separater PWA-Scope
- Seiten: `calendar`, `clients`, `more`
- **Fehlt:** echte Expo-Staff-App (nur Web-PWA).

### Public-Booking (`apps/web/src/app/(booking)/`)

- Salon-Homepage `/book/[slug]` mit Hero, Team, FAQ, Reviews, Galerie,
  Öffnungszeiten, Kontakt, Branding
- Confirm + Success-Flow
- .ics Add-to-Calendar bei jeder Buchung
- `/appointment/*` für Self-Service (Cancel/Reschedule via Link)

### API (`apps/api/src/`)

- Neue Module: `audit`, `gift-cards`, `products`, `salon-settings`,
  `waitlist`
- Bestehende erweitert: payments (Stripe Deposit + Webhook), reminders
  (BullMQ), public-bookings, clients (Export/Import)
- `app.current_user_role` statt `current_role` ✓
- GiST-Exclusion-Constraint gegen Doppelbuchung ✓

### Worker (`apps/worker/`)

- BullMQ: Reminders (24h vor startAt)
- Marketing-Automation-Job (täglich): Birthday, Rebook, Win-Back
- Lifetime-Counters + Predictive-No-Show-Scoring

### Prisma-Migrations (8 Stück)

`0001_init`, `0002_phase1_module1`, `0003_rename_role_setting`,
`0004_pos_payment`, `0005_gift_cards`, `0006_waitlist`, `0007_inventory`,
`0008_branding_faq_reviews_gallery`.

## Was NOCH IMMER FEHLT

### Design-System — **Polish fehlt**

- ❌ Storybook/Ladle — Komponenten sind nicht isoliert dokumentiert
- ❌ Chromatic / Percy — keine Visual-Regression in CI
- ❌ Modal/Drawer/Popover als dedizierte Komponenten (oft ad-hoc im Page)
- ❌ DataTable-Komponente
- ❌ Combobox, DatePicker, TimePicker
- ❌ Empty-State-Illustrationen (meist nur Text)
- ❌ Salon-spezifisch: ClientAvatar mit VIP-Ring, ServiceBadge mit
  Kategorie-Farbe, StaffScheduleGrid, TreatmentTimer, BeforeAfterSlider
- ❌ Keyboard-Shortcut-Hilfe (`?`-Dialog)
- ❌ a11y-Audit (axe-core in CI), VoiceOver-Test, Focus-Ring-Check
- ❌ Micro-Interactions-Katalog größtenteils unbedient (Shake bei
  Validation-Error, Swipe-Delete, Skeleton > 1s, Sync-wieder-da-Banner)

### Differenziatoren — **7 von 40 teilweise, 33 fehlen**

P0 (7 Stück — Ziel: alle im MVP):
| # | Feature | Status |
|---|---------|--------|
| 21 | Drag-to-Reschedule mit Haptics + Undo | ⚠️ Drag-Drop da, Haptics-Hook fehlt, Undo-Toast unklar |
| 22 | Single-Thumb-Staff-App | ⚠️ PWA-Skeleton existiert, nicht „Single-Thumb optimiert", keine echte Expo-App |
| 23 | Offline-First | ❌ kein Service-Worker-Sync, keine Offline-Queue |
| 24 | Tap-to-Pay on Phone | ⚠️ POS-UI da, Stripe Tap-to-Pay-Integration nicht verdrahtet |
| 25 | Universal Command Palette (⌘K) | ✅ existiert mit Clients + Services Live-Search |
| 28 | Tip-Split-Automation | ⚠️ Tip-Picker im POS da, Auto-Split nach Rollen fehlt |
| 31 | 1-Klick-DSGVO-Export | ✅ existiert |

P1 (18 Stück — Ziel V1):

- #1 Predictive No-Show ✅ (Scoring da, Auto-Deposit-Request fehlt)
- #4 AI Voice Receptionist ❌
- #14 Cross-Salon Wallet ❌
- #15 Verified-Reviews ❌
- #16 Live-Availability-Map ❌
- #18 Branded-App pro Salon ❌ (keine Expo-Automation)
- #19 Digital Gift-Cards via iMessage/WhatsApp ✅ (Share-Link da)
- #20 Social-Booking-First ❌
- #26 Color-Formula-Library ❌
- #27 Foto-Vor-Jeden-Service ❌
- #29 Staff-Self-Service-Scheduling ❌ (Shift-Swap/Time-Off fehlen)
- #32 TSE-Live-Monitoring ❌
- #33 E-Rechnung ❌
- #36 Payment-Dispute-Auto-Defender ❌
- #37 Celebration-Micro-Interactions ⚠️ (Toast da, Konfetti-Trigger fehlt noch)
- #38 Smart-Loyalty-Reminders ⚠️ (Loyalty-Basis da, gezielte 1x/Monat-Logik fehlt)

P2 (15 Stück): alle fehlen bewusst (AR, AI-Photo-to-Service, Technique
Coach, Dynamic Pricing, Supply-Prediction, Auto-Marketing-Generator,
Sustainability, HIPAA, Consent pro Behandlung).

## Feature-Completeness-Matrix (aktualisiert)

| #   | Kategorie                | Vor 24h |     Jetzt | Lücken                                                                                                                    |
| --- | ------------------------ | ------: | --------: | ------------------------------------------------------------------------------------------------------------------------- |
| 1   | Kalender                 |    5/20 | **10/20** | Month-View ✓, Recurring/Group/Resource/Buffer-UI/Break/Unavailability/Print/Sync/Keyboard fehlen                          |
| 2   | Online-Booking           |    8/22 | **14/22** | Widget, Multi-Service-Flow, Formular-Step, Magic-Link, Coupon, Multi-Language, WCAG-AA-geprüft fehlen                     |
| 3   | POS/Payments             |    1/23 |  **6/23** | Tap-to-Pay real, Split-Payment, Retail-Scan, Refund, Receipt-Formate, TSE, Cash-Drawer, Recurring-Billing, Dunning fehlen |
| 4   | CRM                      |    5/21 | **10/21** | Foto-Historie, Color-Formula, Allergien-Flag, VIP-Ring, Merge, Portal, Chat, Blacklist, Familien, CLV-Scoring fehlen      |
| 5   | Forms & Consent          |    0/13 |  **0/13** | Komplett offen                                                                                                            |
| 6   | Staff/HR                 |    5/15 |  **6/15** | RBAC, Time-Clock, Shift-Swap, Time-Off, Commission, Payroll, Performance, Cert-Reminders, Self-Service fehlen             |
| 7   | Inventar                 |    0/13 |  **5/13** | Barcode, Supplier, POs, Auto-Reorder, Backbar-Usage, Audit, Waste, COGS, Integrations fehlen                              |
| 8   | Marketing                |    1/17 |  **6/17** | Campaign-Editor, SMS/WhatsApp, Segmentation, Landing-Pages, UTM, Pixels, Deliverability, Referral, Brand-Kit fehlen       |
| 9   | Loyalty/Gift/Memberships |    0/11 |  **4/11** | Punch-Card, Packages, Memberships, Proration, Corporate-Accounts fehlen                                                   |
| 10  | Reporting                |    5/16 |  **7/16** | Auslastung, Rebook-Rate, Cohorts, CLV, Marge, Inventar-Turnover, Custom-Dashboard, Scheduled-Reports, Benchmarks fehlen   |
| 11  | Kommunikation            |     0/9 |   **0/9** | Komplett offen                                                                                                            |
| 12  | Multi-Location           |     1/8 |   **1/8** | Kein Switcher, keine Cross-Reports, kein Head-Office-View                                                                 |
| 13  | Marketplace              |    0/12 |  **0/12** | Phase 2                                                                                                                   |
| 14  | Mobile Apps              |    1/10 |  **3/10** | PWA ✓, Push-Notifications, echte Expo-Apps, White-Label, Offline, Biometric, Deep-Links fehlen                            |
| 15  | AI-Layer                 |    0/12 |  **1/12** | Nur No-Show-Scoring; alles andere P2                                                                                      |
| 16  | Integrations             |    2/15 |  **3/15** | Stripe + Postmark Stubs, sonst fast nichts                                                                                |
| 17  | Compliance/Security      |    1/15 |  **3/15** | RLS ✓, Audit-Log ✓, DSGVO-Export ✓. 2FA, SSO, HIPAA, PCI, TSE, E-Rechnung, SOC2, Pentests fehlen                          |
| 18  | Developer/API            |    3/11 |  **3/11** | OpenAPI, GraphQL, Webhooks, OAuth, SDK, Sandbox, Partner-Portal, Zapier/Make fehlen                                       |

**Summe Baseline: ~82 / ~236 ≈ 35 %** (vorher ~15 %).

## Code-Qualitäts-Schulden (offen)

1. **Tests immer noch dünn.** Nur `health.controller.test.ts`,
   `types/index.test.ts`, `utils/money.test.ts`. Keine E2E/Playwright,
   keine Component-Tests. Widerspricht `CLAUDE.md §7`.
2. **Outbox-Pattern fehlt.** Reminder-Enqueue + Marketing-Jobs passieren
   immer noch direkt nach Commit. Widerspricht `CLAUDE.md §Coding`.
3. **OpenTelemetry fehlt.** Widerspricht `CLAUDE.md §OTel`.
4. **Keine i18n.** Alles deutsch. Spec fordert Multi-Language.
5. **Kein WorkOS.** Tenant-Middleware liest weiterhin HTTP-Header —
   Phase-0-Shortcut, ist Tech-Debt.
6. **Idempotency serverseitig nicht dedupliziert.** Clients senden Key,
   Server wertet nicht aus.
7. **Keine Rate-Limits** auf `/v1/public/*`.
8. **Server-Actions als Durchreichung** zum API-Layer ohne eigene
   Auth-Session — funktioniert nur bis WorkOS aktiv ist.

## Positive Anerkennung

- **Design-Tokens als CSS-Vars** in `packages/ui/tokens.css` sind das
  richtige Fundament. Dark-Mode-Variante mit gespiegelten Tokens funktioniert.
- **Kalender-Wochen-+Tages-Multi-Staff-Ansicht** mit GiST-Exclusion + Drag
  - Click-to-Book ist bereits weit über Baseline — das macht Konkurrenz
    nicht besser.
- **Predictive No-Show-Scoring** ist ein echter P1-Differenziator (#1),
  der jetzt Grundlage gelegt hat.
- **Salon-Homepage** unter `/book/[slug]` mit Reviews/FAQ/Gallery/Team
  ist bereits SEO-tauglich.
- **Modulare API-Struktur** bleibt sauber — jede neue Domain hat ihren
  Controller/Service/Module-Tripel.
- **Mobile-PWA-Scope-Split** (`/m/*` separater Manifest-Scope) ist
  korrekt implementiert.
- **Predictive-No-Show + Audit-Log + DSGVO-Export + ⌘K** sind alles
  Features, die Phorest/Fresha **nicht** in der Tiefe haben.

## Fazit

Das Produkt steht gemessen an **funktionaler Breite** jetzt auf
ausreichendem Level, um Alpha-Tests beim Beautycenter zu fahren. Gemessen
an **Top-1%-Qualität** bleibt die Hauptlücke jetzt in dieser Reihenfolge:

1. **Test-Coverage + OTel + Outbox + WorkOS** (Produktionsreife)
2. **Storybook/Ladle + Chromatic + a11y-Gate** (Design-System-Härtung)
3. **Echte Expo-Apps + Offline-Sync** (P0-Differenziator #22 + #23)
4. **Tap-to-Pay real + Tip-Split real + TSE** (P0 #24, #28 + DE-Compliance)
5. **Forms & Consent + Unified-Inbox + Multi-Location-Switcher** (Baseline-Gaps)
6. **P1-Differenziatoren: Voice-Receptionist, Color-Formula, Branded-App**

Details in `UPGRADE-PLAN.md`.
