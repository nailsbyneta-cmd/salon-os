# Status — SALON OS

**Letzte Aktualisierung:** 2026-04-20 (Session-Start)
**Aktuelle Phase:** Phase 1 (MVP) — Block A-Härtung steht an
**Fortschritt Phase 1:** ~35 % Baseline, ~20 % Differenzierung (siehe AUDIT.md)

## In Arbeit
- [ ] Auf P0-03 warten (nach User-Ansage)

## P0-Bugfix-Run (2026-04-20)
- ✅ **P0-01 Business-Hours-Bug** — Booking-Seite zeigte alle Tage „geschlossen"; Slot-Generator ignorierte openingHours. Fix in `fix/p0-01-business-hours`, merged in main. Web-Parser handelt jetzt Array-of-Intervals-Shape, API availability() respektiert openingHours + TZ (DST-sicher via Intl.DateTimeFormat). Fallback „Öffnungszeiten auf Anfrage" wenn kein Datensatz. Follow-up-Hotfix: TS2538 weekday-index non-null.
- ✅ **P0-02 Time-Slot-Kontrast** — Slot-Picker hatte harte `neutral-*`-Klassen, unlesbar im Dark Mode. Fix in `fix/p0-02-time-slot-contrast`, merged in main. Jetzt Design-Tokens durchgängig, hover-Translate+Accent, focus-visible-Ring, Empty-State als Card.

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
