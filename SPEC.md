# SALON OS — Master Specification

> **Codename:** SALON OS (Arbeitsname, umbenennbar)
> **Vision:** Die Nr. 1-Plattform der Welt für Beauty-, Haar-, Nagel-, Spa-, Medspa-, Barber-, Tattoo- und Wellness-Businesses. Ein Produkt, das die besten Features aller Wettbewerber vereint und durch eine native KI-Schicht, einen eigenen Marktplatz und globale Skalierbarkeit übertrifft.
> **Markt:** global von Tag 1 (Multi-Currency, Multi-Language, Multi-Tax, Multi-Timezone).

---

## 1. Warum dieses Produkt existiert

Der Markt für Salon-Software ist riesig (> 1,5 Mio. Salons allein in Europa + USA) und zersplittert:

- **Fresha** ist kostenlos, aber mit Ads und Marktplatz-Lock-in.
- **Phorest** ist reich an Features, aber teuer, Ireland-zentriert, Oberfläche angestaubt.
- **Booksy** dominiert Barber/Solo, schwach im Enterprise.
- **Boulevard/Mangomint** sind Premium-US-Produkte, teuer, limitiertes EU-Angebot.
- **Zenoti** ist Enterprise/Ketten, komplex und teuer.
- **Shore/Salonized** sind DACH-stark, aber global schwach.
- **Treatwell** ist primär Marktplatz mit schwacher SaaS-Komponente.
- **GlossGenius** ist Solo-fokussiert, hat aber rasantes Wachstum.

**Keiner** bietet gleichzeitig: Enterprise-Skalierung + Solo-UX + Marktplatz + moderne KI + global + faire Preise + offene API. **Diese Lücke ist SALON OS.**

## 2. Vision & North Star

**Produktvision:** „Ein Tool, das sich wie 100 Tools anfühlt — und das zweitbeste Problem, das Salonbetreiber haben, ist, dass sie keine zusätzlichen Tools mehr brauchen."

**North-Star-Metrik:** **Completed Appointments per Salon per Week.** Alles, was diese Zahl hebt, hat Priorität:
- Schnellere Buchung (Conversion > 75 % auf Mobile)
- Weniger No-Shows (< 3 %)
- Mehr Rebooking (> 65 % der Kunden rebookt)
- Besseres Gap-Filling (> 85 % Auslastung)
- Marktplatz-Traffic (Discovery neuer Kunden)

## 3. Zielgruppen (Personas)

| Persona                     | Typ          | Stack-Tier  | Preis-Sensibilität |
| --------------------------- | ------------ | ----------- | ------------------ |
| **Solo Beauty Pro**         | Einzelperson | Starter     | sehr hoch          |
| **Small Salon (2–5 Staff)** | Kleinbetrieb | Pro         | hoch               |
| **Mid Salon (6–20 Staff)**  | Mittelstand  | Business    | mittel             |
| **Chain (2–20 Locations)**  | Kette        | Enterprise  | mittel             |
| **Franchise (20+ Loc.)**    | Großkette    | Enterprise+ | niedrig            |
| **Medspa / Dermatologist**  | Medizinisch  | Medspa      | mittel             |
| **Barber Shop**             | Barbier      | Starter/Pro | hoch               |
| **Tattoo / Piercing**       | Studio       | Pro         | hoch               |
| **Spa / Wellness Hotel**    | Hotellerie   | Enterprise  | niedrig            |

## 4. Module-Übersicht (die 100 Tools in einem)

SALON OS besteht aus **18 Modulen**. Jedes Modul hat eine eigene Spec-Datei unter `specs/features.md` und eine API-Sektion in `specs/api.md`.

| #  | Modul                    | Ersetzt                                                   |
| -- | ------------------------ | --------------------------------------------------------- |
| 1  | Calendar & Scheduling    | Google Calendar, Phorest-Diary, Acuity                    |
| 2  | Online Booking           | Booksy, Fresha, Treatwell (Widget)                        |
| 3  | Client CRM & Notes       | Salesforce für Salons, HubSpot-lite                       |
| 4  | Forms & Consultations    | Typeform, JotForm, Zentake                                |
| 5  | POS & Payments           | Square, SumUp, Stripe Terminal                            |
| 6  | Inventory & Retail       | Lightspeed Retail, Stocky                                 |
| 7  | Staff & Rostering        | Homebase, Deputy, When I Work                             |
| 8  | Payroll & Commissions    | Gusto, DATEV Lohn, Sage Payroll                           |
| 9  | Marketing & Campaigns    | Mailchimp, Klaviyo, SimpleTexting                         |
| 10 | Loyalty & Memberships    | Stamp Me, Smile.io, Kangaroo                              |
| 11 | Gift Cards & Vouchers    | GivX, Square Gift Cards                                   |
| 12 | Reviews & Reputation     | Birdeye, Podium, Trustpilot-lite                          |
| 13 | Reports & Analytics      | Looker-lite, Tableau-lite                                 |
| 14 | AI Receptionist & Flows  | Agentz, AIRA, Goodcall                                    |
| 15 | Online Store (Retail)    | Shopify-lite                                              |
| 16 | Branded Client App       | Mindbody Branded App, Phorest Salon Branded App           |
| 17 | Consumer Marketplace     | Fresha Marketplace, Booksy, Treatwell                     |
| 18 | Multi-Location & Franchise | Zenoti Enterprise, Mindbody Business                    |

## 5. Feature-Kernliste (verdichtet — vollständig in `specs/features.md`)

### 5.1 Calendar & Scheduling
- Tages-, Wochen-, Monatsansicht; Staff-Spalten, Raum-Spalten, Ressourcen (Stühle, Waschbecken, Behandlungsräume)
- Farbcodierung nach Service, Stylist oder Status
- Drag&Drop, Resize, Gruppentermine, Serientermine, Blockzeiten
- **Precision Scheduling (AI):** optimale Platzierung unter Berücksichtigung von Service-Dauer, Reinigung, Stylist-Geschwindigkeit, Laufweg
- **Smart Gap Filling:** automatischer Vorschlag für Waitlist-Kunden bei Lücken
- Kapazitätsplanung (z. B. Doppelstühle, Pedikürplätze)
- Time-off, Urlaub, Krankmeldung, Pausen mit Zustimmungs-Workflow
- Kalenderschloss (hinter X Tagen kein Neubuchen)
- Buffer-Zeiten (Setup/Cleanup) je Service
- Wiederholungstermine & Paketplanung

### 5.2 Online Booking
- Branded Booking-Seite: `book.salon-os.com/{slug}` + einbettbares Widget + Instagram/Facebook/Google Reserve mit Google/TikTok Book-Now
- Echtzeit-Verfügbarkeit, < 2 s Ladezeit
- Multi-Service-Buchung im gleichen Flow
- Mitarbeiter:in wählen oder „no preference"
- Deposit- oder Vollzahlung (variabel: risikobasiert höhere Deposits für No-Show-verdächtige Kunden)
- Up-Sell beim Buchen („Wähle eine Haarmaske dazu")
- Cross-Sell nach Buchung („Kunden wie du buchen oft auch …")
- Waitlist-Eintrag mit Priorisierung (VIP, Historie, Zahlungsbereitschaft)
- Virtual Queue (Walk-ins): SMS „Du bist jetzt 4." → „Du bist dran"
- Eigene Buchungspolicies je Service (Cancellation-Fee, Prepay %, min. Vorlaufzeit, max. Vorausbuchung)
- Reschedule-Link in Confirmation

### 5.3 Client CRM
- Unified Client Profile: Stammdaten, Geburtstag, Pronomen, Allergien, Haar-/Hautformel, Patch-Test-Status, Lebensmittelallergien, Mobilität
- Komplette Historie: Termine, Zahlungen, Produkte, Notizen, Formulare, Fotos
- Smart Tags: „Raucher-Stuhl-Präferenz", „Nur Stylist X", „bevorzugt nachmittags"
- Interne Notizen vs. Client-sichtbare Notizen
- Before/After-Fotos (DSGVO-Consent-Flow, verschlüsselt)
- **Client Lifetime Value** und **Risk Score** (No-Show-Wahrscheinlichkeit)
- „Client Reconnect": Liste von Kunden, die seit X Wochen nicht da waren + 1-Click-Kampagne
- Familien-Konten (Kind/Eltern, gemeinsam abgerechnet)

### 5.4 Forms & Consultations
- Formular-Builder (Drag&Drop, Logik, Signatur-Feld, Foto-Upload)
- Pro Service triggerbar (z. B. Consent bei Bleichen)
- Vor-Termin-Link per E-Mail/SMS („Bitte Formular ausfüllen")
- In-Shop-Tablet-Modus (Kiosk)
- Speicherung an Client-Profil, verschlüsselt, mit Versionierung
- **Medspa-Spezial:** HIPAA-konform, SOAP-Notes, Vorher-Nachher-Fotos mit Consent, Treatment-Charting-Körper-Diagramm

### 5.5 POS & Payments
- Karten-Terminal (Stripe Terminal, Adyen Tap-to-Pay, SumUp, Zettle, Clover)
- Apple/Google Pay, Kontaktlos, NFC, QR-Code, SEPA, iDEAL, Klarna, AfterPay, Cash
- Split-Payments, Split-Tickets (Kundin + Freundin zahlen anteilig)
- Trinkgeld (pro Stylist, Pool, individuelle Logik; Cash vs. Card separat erfasst)
- **Mobile Checkout:** Kundin zahlt selbst am Handy (Mangomint Client Mobile Checkout)
- **Virtual Waiting Room:** Kundin checkt sich per SMS-Link ein
- Rechnungen/Belege per E-Mail, SMS, Druck (via CUPS oder Star mPOP/Seiko)
- Fiskal: TSE (Deutschland via fiskaly), RKSV (Österreich), SAFT/SAT/CFDI (andere) — Adapter-Muster
- Mehrere Kassen je Location, Tagesabschluss, Kassen-Z-Bon
- **Multi Payment Accounts:** getrennte Konten für Booth-Renter und commission-based Stylists im selben Salon
- Rückgaben, Gutschriften, Teilrückzahlungen, Chargeback-Workflow

### 5.6 Inventory & Retail
- **Retail + Professional** getrennt (Backbar-Tracking bei z. B. Farbgebrauch, auch wenn nicht verkauft)
- Barcode-Scanning (Kamera + USB-Scanner), Lot-/Chargen-Tracking, MHD
- Echtzeit-Stock, Mindestbestand, Auto-Reorder mit Lieferanten-Anbindung (EDI/E-Mail)
- Usage-Based Pricing (Mengen für Injectables, Tattoo-Tinten, Farbe)
- Transferbuchungen zwischen Locations
- Inventur-Modus (Zählen am Tablet)
- Produkt-Empfehlungen im Checkout (KI-basiert)
- Integrierter Online-Store (Shopify-lite) mit Inventory-Sync

### 5.7 Staff & Rostering
- Rollen: Owner, Manager, Front Desk, Stylist, Booth-Renter, Trainee, Apprentice
- Arbeitszeitmodelle: Angestellt, Booth-Renter (Raummiete), Commission, Mix
- Schichten, Offene Schichten, Tauschen, Urlaubsanträge mit Approval
- Zeiterfassung (Clock-in/out), Pausen, Überstunden
- Performance-KPIs je Stylist (Auslastung, Umsatz, Rebook-Rate, NPS, Trinkgeld-Ratio)
- Provisionstufen (gleitend oder gestaffelt), Retail-Bonus
- „Booth-Renter-Dashboard": eigenes Mini-Konto, eigene Preise, getrennte Reports
- Trainings- & Onboarding-Modul (Check-Listen, Videos, Quiz)

### 5.8 Payroll & Commissions
- Lohnabrechnung mit korrekter Commission-Logik, Trinkgeldverteilung, Cash vs. Card-Steuer
- Direct Deposit (US), SEPA (EU), BACS (UK), ACH, PIX (BR)
- Exports: DATEV (DE), Lohnsteuer-Meldung (AT), Real Time Information RTI (UK), Form 941 (US)
- Integration: Gusto, Deel, Rippling, Remote, QuickBooks Payroll, Personio, ADP
- 1099-Contractor-Management

### 5.9 Marketing & Campaigns
- Kanäle: E-Mail (Postmark/Resend), SMS (Twilio/Vonage/MessageBird), Push (OneSignal/eigene), WhatsApp Business (Meta-API), iMessage Business (US)
- Drag&Drop-Editor (MJML), Template-Bibliothek
- **Automated Flows:**
  - Welcome-Serie
  - Birthday-Reward
  - Win-Back (nach 60/90/120 Tagen)
  - Post-Service-Feedback → Google-Review-Request (5-Sterne filtern: low-stars bleiben privat, 5-Sterne werden an Google weitergeleitet)
  - No-Show-Recover
  - Abandoned-Booking (Kunde hat abgebrochen)
- Segmente (KI-basiert: „VIP-Stammkunden", „6-Wochen-ohne-Besuch", „Produkt-Käufer:innen", „Farbe letztes Mal 8 Wochen her")
- UTM-Tracking je Kampagne
- **Social-Ads-Manager:** Facebook/Instagram-Ads direkt aus der Plattform (wie Phorest Ads Manager), mit optimierten Templates für Beauty-Branche, Budget-Vorschläge, ROI-Dashboard
- TikTok-Ads (Pixel-Integration + Lead-Gen)
- SEO-Mikroseiten für jede Location

### 5.10 Loyalty & Memberships
- **Points-basiert:** Pro Euro/Dollar X Punkte, Einlösung bei Y Punkten
- **Punch Card:** 10 × Termin → 1 gratis
- **Tiered (Bronze/Silver/Gold):** Rabatte, Early Access, exklusive Services
- **Memberships (Subscription):** Monatlich X € → Y Services inklusive + 10 % auf Produkte (Stripe Billing/Chargebee)
- **Package/Course:** 6× Peeling im Voraus mit Rabatt, Countdown am Profil
- **Referral:** Empfehlungscode; Empfehler + Empfohlene erhalten Rabatt/Gutschrift
- Automatische Lifecycle-Kommunikation (Tier-Upgrade, Expiring Points, Subscription Pause)

### 5.11 Gift Cards & Vouchers
- Physische + digitale Gift Cards
- Nicht-verkauft-abgelaufen-Logik (länderspezifisch, z. B. DE 3 Jahre)
- Teilweise einlösbar, übertragbar, per QR-Code am Terminal
- Gift-Card-Shop im Marktplatz und auf Branded-Seite
- Voucher-Code-Generator für Kampagnen
- Buchhaltungsrückstellung automatisch (deferred revenue)

### 5.12 Reviews & Reputation
- Automatische Review-Request nach Termin (SMS + E-Mail)
- **Smart-Routing:** 4–5 Sterne → Google/Facebook/Yelp/TripAdvisor; 1–3 Sterne → intern an Owner
- KI-generierte Antwortvorschläge (tonalität anpassbar)
- Zentralisiertes Dashboard (alle Portale)
- Reputation-Score je Stylist und Location
- Negative-Review-Recovery-Workflow (Owner → Offer → Response-Template)

### 5.13 Reports & Analytics
- Dashboards: Umsatz, Auslastung, Rebook-Rate, CLV, Produkt-Umsatz, Staff-KPIs, Marketing-ROI
- Vergleich: heute vs. gestern/letzte Woche/Monat/Jahr
- Filter nach Location, Stylist, Service, Produkt, Kunden-Segment
- **AI Analyst (wie GlossGenius AI Analyst):** Natürliche Sprache, z. B. „Wer sind meine umsatzstärksten Kunden im Q2?"
- Exports: CSV, Excel, PDF, Google Sheets
- Scheduled Reports per E-Mail (täglich/wöchentlich/monatlich)
- Anomalie-Alerts („Umsatz 30 % unter Erwartung — mögliche Ursachen …")

### 5.14 AI Receptionist & Automation Flows
Eigene Spec: `specs/ai-layer.md`.
- **Voice AI Receptionist:** beantwortet Anrufe 24/7, bucht, reschedult, beantwortet FAQs (Preise, Öffnung, Parken), nimmt Anliegen auf; Übergabe an Mensch nahtlos
- **SMS AI:** Two-way-SMS mit Booking, Confirmations, FAQs
- **Chat AI:** Web-Chat-Widget, Instagram-/Facebook-DM-Reply
- **WhatsApp AI:** komplett in-channel buchen
- **Express Booking** (wie Mangomint): Client bekommt Link, trägt sich nach, bestätigt
- **Automated Flows Builder:** Zapier-ähnlich, für Salon-Events (wenn Trigger X → tu Y)

### 5.15 Online Store & Retail
- eCom-Storefront am Brand (Shopify-lite)
- Inventory-Sync mit POS
- Click&Collect, Versand (Shippo/Sendcloud-Integration)
- Subscription-Produkte (monatliches Shampoo-Abo, monatliche Supplements)
- Cart-Abandoned-Automation
- Produkt-Empfehlungen bei Buchungsbestätigung

### 5.16 Branded Client App
- Native iOS + Android (React Native + Expo) unter der Marke des Salons (White-Label)
- Logo, Farben, Splash, Icons, Push-Sound — alles konfigurierbar
- Features: Buchen, Rebuchen, Historie, Loyalty-Punkte, Gift-Card-Kauf, Push-Reminder, Store
- Automatische App-Store-Veröffentlichung per Fastlane (wir verwalten Zertifikate als Kette)

### 5.17 Consumer Marketplace
- Eigener Consumer-Marktplatz (mobile + web): `salon-os.com` oder `beauty.salon-os.com`
- Suche nach Location, Service, Preis, Bewertung, Stylist
- Buchung ohne Konto (Magic-Link), Multi-Buchung
- Gift-Card-Shop quer über Salons
- Reviews mit Foto & Verifizierung (nur wer gebucht hat)
- Listing-Gebühr für Neukunden (z. B. fixer EUR-Betrag oder 20 % — Fresha nimmt 20 %; unser Modell erklärt in `specs/go-to-market.md`)
- Vermarktungs-Boost-Produkt (ähnlich Booksy Boost)

### 5.18 Multi-Location & Franchise
- Konzern-Dashboard (KPIs über alle Locations)
- Zentrale Service-Kataloge (mit lokaler Override-Option)
- Zentrale Preislisten mit lokalen Varianten
- Mitarbeiter können mehreren Locations zugeordnet sein
- Corporate Reporting, Benchmarks (Anonymisiert: „deine Location vs. Durchschnitt der Kette")
- Franchise-Abrechnung (Royalty-Fee automatisch berechnet)
- White-Label-Kunde kann eigene Subdomain + eigene Branded App (Marke der Kette)

## 6. UX-Prinzipien

1. **Tastatur-First am Desktop:** Jede Aktion ≤ 3 Tastaturkürzel (Command-K-Palette).
2. **3-Tap-Rebook auf Mobile:** Kund:in muss in ≤ 3 Taps eine Wiederholungsbuchung machen können.
3. **Undo everywhere:** Keine destruktive Aktion ohne 10-Sek-Undo.
4. **Offline-First für POS:** Terminal arbeitet lokal, syncht wenn online.
5. **Dark Mode + High Contrast** (Accessibility: WCAG 2.2 AA).
6. **i18n echt, nicht nur Strings:** Formate, Währungen, RTL (Arabisch, Hebräisch), Wochen-Start-Tag.
7. **Empty States mit nächstem Schritt** (nie leeres Feld ohne CTA).
8. **Ladezeit-Ziel:** P95 < 250 ms für API, < 1,5 s TTI Web, < 2 s Native-App-Startzeit.

## 7. Tech-Stack (Kurzfassung — Details in `specs/tech-stack.md`)

- **Frontend Web:** Next.js 15 (App Router, RSC) + TypeScript + Tailwind + shadcn/ui + TanStack Query
- **Frontend Mobile:** React Native + Expo (EAS) + NativeWind
- **Backend:** NestJS (oder Hono) + TypeScript + tRPC + REST + GraphQL (Yoga)
- **DB:** PostgreSQL 16 (+ pgvector, + Row-Level-Security), Prisma oder Drizzle
- **Cache/Queues:** Redis 7 + BullMQ
- **Search:** Meilisearch oder Typesense
- **Object Storage:** S3 (AWS) oder R2 (Cloudflare)
- **Auth:** WorkOS (Passkeys + SSO) oder Clerk
- **Payments:** Stripe (primär), Adyen (enterprise), Mollie (EU)
- **Messaging:** Twilio Programmable Messaging + Voice + WhatsApp; Postmark + Resend für E-Mail
- **AI:** OpenAI + Anthropic Claude (Fallback), pgvector für Embeddings, LangSmith für Eval
- **Observability:** OpenTelemetry + Grafana Cloud / Datadog
- **Infra:** AWS (primär) mit Terraform; Cloudflare (DNS, CDN, R2, Workers); ECS Fargate oder Fly.io für Services
- **CI/CD:** GitHub Actions + Changesets + Turborepo Remote Cache
- **Feature Flags:** GrowthBook (selbstgehostet) oder Statsig
- **Monorepo:** Turborepo + pnpm

## 8. Pricing-Modell (Kurzfassung — Details in `specs/go-to-market.md`)

| Plan        | Zielgruppe           | Preis (EUR/Monat) | Payment-Fee         |
| ----------- | -------------------- | ----------------- | ------------------- |
| **Starter** | 1 Person, max. 2 Staff-Logins | 0 (Free-Tier) oder 9 € | 2,6 % + 0,15 € |
| **Pro**     | Small Salon (bis 5)   | 39 €              | 2,4 % + 0,15 €      |
| **Business**| Mid Salon (bis 15)    | 99 €              | 2,2 % + 0,10 €      |
| **Enterprise** | Chain/Franchise    | ab 299 € / Location | verhandelbar       |
| **Medspa**  | HIPAA/medizinisch     | 149 €             | 2,4 %               |

Add-ons: Branded App (29 €/Monat), AI Receptionist (49 €/Monat), Marketplace-Boost (Performance-basiert).

Free-Tier-Philosophie: **kostenlos für Solos, weil Fresha das auch ist**, aber ohne Ads-Aufzwang.

## 9. Go-to-Market (Highlights — Details in `specs/go-to-market.md`)

1. **Migration aus Phorest/Fresha/Booksy** mit One-Click-Import (CSV + API-Mapping). Kostenlose Migration durch unser Team in Phase 1.
2. **„Switch & Save"-Kampagne**: drei Monate gratis, wenn alter Vertrag läuft.
3. **Beauty-School-Partnerschaften** (Ausbildungszentren) — nächste Generation lernt auf SALON OS.
4. **TikTok + Instagram** Content („Dieses Feature hat dir 400 € gespart").
5. **Affiliate/Partner-Programm** für Salon-Coaches, Industry-Accounts, Chains.
6. **Produkt-Led Growth**: viral durch die Consumer-App (jeder Buchungslink bringt SALON OS-Awareness).

## 10. Erfolgskriterien

- **Monat 6:** 500 aktive Salons, 50 k Termine/Monat, NPS > 50.
- **Monat 12:** 5.000 Salons, 1 Mio. Termine/Monat, ARR 3 Mio. €.
- **Monat 24:** 25 k Salons, 10 Mio. Termine/Monat, ARR 20 Mio. €.
- **Monat 36:** 100 k+ Salons, 50 Mio. Termine/Monat, Nr. 1 in 3 Märkten (DACH + UK + Spanien).

## 11. Was dieses Dokument NICHT ist

- Kein endgültiger UI-Entwurf (→ Figma-Projekt separat).
- Kein juristisches AGB-Dokument (→ anwaltlich prüfen vor Launch).
- Kein fertiger Businessplan für Investoren (→ kompakte Version daraus ableiten).

## 12. Nächste Schritte (Claude Code)

1. Lies `specs/roadmap.md` für die Phase-0/Phase-1-Pläne.
2. Lies `specs/tech-stack.md` für die genaue Architektur.
3. Lies `specs/data-model.md` für das Schema.
4. Folge `CLAUDE.md` — Phase 0 aufsetzen.
5. Bei Fragen: frag nach, wenn ein Widerspruch zwischen Specs auftaucht. Ansonsten: baue.

---

**Dieses Dokument ist Version 1.0.** Änderungen tragen Commit-Hash und Datum. ADRs (Architecture Decision Records) liegen in `docs/adr/`.
