# Roadmap — Phasen, MVP, V1, V2

## Prinzipien
1. **Zuerst 1 Salon glücklich machen**, dann 10, dann 100. Kein Premature-Scaling.
2. **Messe Aktivierung:** ein Salon ist „aktiviert", wenn innerhalb 7 Tagen nach Anmeldung ≥ 10 Termine online gebucht wurden.
3. **Kein Feature-Release ohne Enablement:** Anleitung + Video + E-Mail-Sequenz.
4. **Alle Phasen:** Bug-Fix-Rate ≤ 10 % der Dev-Kapazität, Feature ≥ 70 %, Tech-Debt ≤ 20 %.

## Phase 0 — Foundation (1 Woche)

**Ziel:** Monorepo steht, CI grün, Hello-World deployed.

Deliverables:
- Monorepo (Turborepo, pnpm, TS strict)
- Docker Compose (Postgres + Redis + Mailhog + Minio)
- CI (GitHub Actions: build+test+lint+types+security-scan)
- Auth-Gerüst (WorkOS oder Clerk)
- Multi-Tenant-Middleware + RLS-Beispiel-Schema
- Staging-Deployment auf AWS/Fly.io
- Status-Page eingerichtet, Slack-Alerts
- Basis-Skript zum Seed: 1 Demo-Tenant mit 1 Location

## Phase 1 — MVP (Woche 2–12, ~3 Monate)

**Ziel:** Ein Salon kann vollständig mit SALON OS arbeiten (Buchen, Bedienen, Bezahlen, Reporting-Basics).

### Woche 2–3: Core-Datenmodell + Service-Katalog
- Prisma-Schema Kern-Entitäten
- Admin-UI für Tenants, Locations, Staff, Services
- i18n-Setup + 3 Sprachen (DE, EN, ES)
- Multi-Currency / Multi-Tax-Grundgerüst

### Woche 4–5: Kalender + Booking-UI
- Kalender-Ansicht (Tag/Woche) mit Staff-Spalten
- Drag & Drop, Resize
- Termin-Erstellung intern
- Blockzeiten, Buffer-Zeiten
- Room / Resource-Zuweisung

### Woche 6: Online Booking + Branded Page
- `book.{slug}.salon-os.com` oder eigene Domain
- Widget zum Einbetten
- Guest-Booking per Magic-Link
- Multi-Service-Flow
- Mobile-First-Design

### Woche 7: Reminders + Automated Messages
- E-Mail (Postmark) + SMS (Twilio) Confirmations + Reminder (24 h / 2 h vorher)
- Opt-Out-Management
- Template-Engine (Handlebars + MJML)

### Woche 8–9: POS + Payments
- Stripe-Integration (Online + Terminal)
- Checkout-UI
- Trinkgeld, Cash, Split
- Belege per E-Mail/SMS
- Rückerstattung
- Anbindung an Appointment-Flow (nach „completed" → Checkout)

### Woche 10: CRM + Notes + History
- Client-Profile
- Termin-, Zahlungs-, Produkt-Historie
- Interne Notizen
- Tags, Allergien
- DSGVO-Export/Delete-Funktionen

### Woche 11: Reports v1
- Tagesumsatz, Wochenumsatz
- Auslastung
- Top-Kunden
- Staff-Performance
- Export CSV

### Woche 12: Polish, Onboarding-Wizard, Launch
- Onboarding (15-Minuten-Flow)
- Help-Center (Notion oder Docusaurus)
- In-App-Walkthrough (Intro.js oder Shepherd)
- Pricing-Page
- Sign-up-Flow mit Credit-Card (Stripe Billing)
- Status-Page Launch
- **Soft-Launch mit 5 Design-Partner-Salons**

### MVP-Exit-Kriterien
- [ ] 5 echte Salons nutzen es für ihre tägliche Arbeit.
- [ ] 500 Termine pro Woche durch die Plattform.
- [ ] NPS ≥ 40.
- [ ] P95 API-Latenz < 300 ms.
- [ ] 99.9 % Uptime über 30 Tage.
- [ ] Kein P1-Bug offen > 48 h.

## Phase 2 — V1 (Monat 4–6)

**Ziel:** Alle Kern-Features eines „besseren Phorest", offizieller Marktstart DACH+UK.

### Monat 4
- Inventar + Retail-POS
- Barcode-Scan (Kamera)
- Backbar-Tracking
- Lieferanten-Management

### Monat 5
- Loyalty (Points + Tiered)
- Memberships (Stripe Billing)
- Gift Cards (digital + physisch)
- Referral-Programm
- Forms & Consultations
- Vor-Termin-E-Mails
- HIPAA-ready (für spätere Medspa-Tenants)

### Monat 6
- Marketing-Modul (E-Mail + SMS Campaigns)
- Automated Flows
- Reviews-Automation + Smart-Routing
- Branded Client App (iOS + Android, via Expo + Fastlane)
- Voice AI Receptionist (Beta)
- TSE-Anbindung (fiskaly DE)
- DATEV-Export
- QuickBooks + Xero Export
- Marktstart DACH + UK
- 500 zahlende Salons Ziel

## Phase 3 — V2 (Monat 7–12)

**Ziel:** Marktplatz, Enterprise, AI-Vorsprung, echte Skalierung.

### Monat 7–8
- Multi-Location (Chain-Dashboard)
- Franchise-Royalty-Engine (Beta)
- Payroll (Gusto + DATEV + RTI)
- Commissions-Engine (mit Retail-Bonus, Cash-Tip vs. Card-Tip)
- Shift-Swap, Time-Off-Approval
- Staff-App iOS + Android

### Monat 9–10
- Consumer-Marktplatz (salon-os.com)
- Marketplace-Suche, Geo, Reviews, Boost
- Marktplatz-Mobile-App (iOS + Android)
- Precision Scheduling (AI)
- Smart Gap Filling
- AI Analyst
- Dynamic Pricing (Opt-in)

### Monat 11–12
- AR Try-On (Perfect Corp)
- Public API + Webhooks + Partner-Portal
- Zapier + Make Apps
- White-Label-Branded-Apps für Ketten
- SSO + SAML + IP-Whitelisting (Enterprise)
- SOC 2 Type II-Audit
- Expansion US, FR, IT, ES

## Team-Setup (empfohlen)

| Rolle                              | Anzahl Phase 1 | Anzahl Phase 2 | Anzahl Phase 3 |
| ---------------------------------- | :------------: | :------------: | :------------: |
| Founder / CEO                      | 1              | 1              | 1              |
| CTO                                | 1              | 1              | 1              |
| Senior Full-Stack (FE+BE TypeScript)| 2             | 3              | 5              |
| Senior Mobile (RN)                 | 0              | 1              | 2              |
| Designer (Product + UX)            | 1              | 1              | 2              |
| DevOps / Platform                  | 0              | 1              | 2              |
| QA / Test Automation               | 0              | 1              | 2              |
| AI/ML Engineer                     | 0              | 1              | 2              |
| Customer Success (Salon-Experts)   | 1              | 2              | 5              |
| Sales                              | 0              | 1              | 3              |
| Marketing                          | 1              | 2              | 4              |
| Support                            | 0              | 2              | 5              |
| **Summe**                          | **6**          | **17**         | **34**         |

## Budget-Grobrahmen

- Phase 1 (3 Monate): ~250 k € (Team + Infra + Tools)
- Phase 2 (3 Monate): ~500 k €
- Phase 3 (6 Monate): ~1,5 Mio. €

Gesamt bis Marktführerschaft-Start: ~2,25 Mio. € — finanzierbar via Angel/Seed-Runde (Pre-Seed 300–500 k, Seed 2–3 Mio.).

## Risiken & Gegenmaßnahmen

| Risiko                                             | Gegenmaßnahme                                                                 |
| -------------------------------------------------- | ----------------------------------------------------------------------------- |
| Big Player (Fresha/Booksy) preiswerter             | Freemium + offene API + Migration-Service gratis                              |
| Migration von Phorest scheitert                    | Dediziertes Migrations-Team, SLA 7 Tage, geld-zurück-Garantie                 |
| Zahlungsanbieter-Lock-in                           | Multi-Provider-Adapter von Tag 1, Stripe + Adyen + Mollie                     |
| HIPAA-Audit schlägt fehl                           | Von Beginn HIPAA-ready bauen, auch wenn erst in Phase 2 aktiviert             |
| AI-Kosten explodieren                              | Budget-Limits je Tenant, Cache, günstigere Modelle für Standard-Flows         |
| TSE/Fiskalisierung landesspezifisch zu aufwendig   | Adapter-Muster, Partner wie fiskaly nutzen                                    |
| Mitarbeiterbindung                                 | Equity, flexible Arbeit, klare Mission, kein Korrupt-Code-Debt                |
| Regulatorische Änderungen (DSGVO/HIPAA)            | In-House Data-Protection-Officer + Anwaltskanzlei auf Retainer                |
