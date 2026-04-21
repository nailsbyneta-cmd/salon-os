# Status — SALON OS

**Letzte Aktualisierung:** 2026-04-20 (Session-Start)
**Aktuelle Phase:** Phase 1 (MVP) — Block A-Härtung steht an
**Fortschritt Phase 1:** ~35 % Baseline, ~20 % Differenzierung (siehe AUDIT.md)

## In Arbeit
- [ ] User testet aktuelle Runde, dann nächstes Feature

## P0-Bugfix-Run (2026-04-20/21)
- ✅ **P0-01 Business-Hours-Bug** — Booking-Seite zeigte alle Tage „geschlossen"; Slot-Generator ignorierte openingHours. Web-Parser für Array-of-Intervals, API-Slot-Gen DST-safe via Intl.DateTimeFormat.
- ✅ **P0-02 Time-Slot-Kontrast** — Slot-Picker Design-Tokens, hover/focus-Ring, Card-Empty-State.
- ✅ **P0-03 Confirm + Success** — UI-Komponenten statt native, autocomplete, Error-Banner, success-Icon.

## Session 2026-04-21 — Mobile-Polish + Quick-Actions + Reminder
- ✅ **Confirm-Summary auf Booking** — Service+Preis+Staff prominent vor Formular.
- ✅ **Impressum + Datenschutz** als Public-Routes aus /v1/public/:slug/info.
- ✅ **SEO + OpenGraph** — Title 50-60ch, Description 110-160ch, heroImageUrl als OG-Image.
- ✅ **Slot-Picker 7-Day-Quick-Pills** + „geschlossen"-Tage + „Nächster freier Tag"-Banner.
- ✅ **Cookie-Consent-Banner** (DSG) auf `/book/[slug]`.
- ✅ **CSV-Import-Endpoint** funktional (wird im Settings noch nicht genutzt).
- ✅ **Waitlist-Admin-Create** — `/waitlist/new` mit Service/Staff/Zeit-Picker.
- ✅ **Reports v2** — Period-Switcher, Trends vs. Vorperiode, Per-Staff-Breakdown, Top-Kundinnen.
- ✅ **iOS-Zoom-Fix** — Inputs 16px auf Mobile.
- ✅ **Tables responsive** (Clients/Services/Gift-Cards/Inventory), Sub-Infos inline auf Mobile.
- ✅ **Admin-Shell Mobile-Burger** + klickbares Logo.
- ✅ **Admin-H1 kleiner auf Mobile** (text-2xl md:text-3xl).
- ✅ **Form-Grids mobile stacken** — alle grid-cols-2 → grid-cols-1 sm:grid-cols-2.
- ✅ **Page-Padding** p-8 → p-4 md:p-8 überall.
- ✅ **Schicht-Generator** + **wöchentliche Schicht-Vorlage** per Staff (Migration 0009, staff.weeklySchedule JSONB).
- ✅ **Quick-Contact-Buttons** auf Client-Profil UND Termin-Detail — 📞 SMS WhatsApp ✉ (tel:/sms:/wa.me/mailto:).
- ✅ **Termin-Reminder-Buttons** — vorgefertigte Nachricht SMS/WhatsApp/Email.
- ✅ **Dashboard „Grade läuft"** — IN_SERVICE-Termine mit Live-Progress-Bar.
- ✅ **Mobile-Calendar-Tap** — MouseSensor + TouchSensor mit 250ms Long-Press-Drag, Tap = Link.
- ✅ **Branding-Settings** unter `/settings` — Tagline, Logo/Hero-URL, Socials, FAQ, Reviews, Gallerie.
- ✅ **Basic-Auth-Middleware** (env-gated) für Admin bis WorkOS.
- ✅ **Staff-Detail-Page** `/staff/:id` — Profil-Edit (Bio, Foto-URL, Farbe, Aktiv).
- ✅ **Location-Settings** auf `/settings` — Adresse/Tel/Mail editierbar, fließt in Public-Booking + Impressum.
- ✅ **⌘K-Palette** findet jetzt auch Staff.
- ✅ **Dashboard „Umsatz heute"** klickbar → `/reports?period=today`.
- ✅ **Reports CSV-Export** — 14 Spalten, BOM für Excel.
- ✅ **Calendar-Header Mobile** kompakter (size=sm, „Neu" statt „Neuer Termin").

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
