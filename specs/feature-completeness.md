# Feature-Completeness-Checklist

> Diese Liste ist das Nicht-Vergessen-Radar. Vor jedem Phasen-Abschluss: Matrix durchgehen, nichts vergessen.

## Regel

Für jedes ✅ unten **muss** SALON OS das Feature haben. Es ist nicht Option — es ist Baseline. **Plus** die Features aus `specs/differentiation.md` (das sind die Extras, die uns einzigartig machen).

Wenn Claude Code ein Feature auslässt weil "nicht so wichtig": **falsch**. Jedes ✅ ist bereits bewährter Salon-Standard. Ohne sie sind wir nicht mal im Spiel.

---

## 1. KALENDER & TERMINE

- [ ] Day / Week / Month / List-Ansicht
- [ ] Multi-Staff-Ansicht (alle Stylists parallel, horizontal scrollbar)
- [ ] Drag-to-Reschedule (alle Richtungen, mit Snap auf 5 min-Raster)
- [ ] Drag-to-Extend (Termin-Dauer verlängern durch Ziehen am unteren Rand)
- [ ] Color-Coding (pro Service-Kategorie + pro Status)
- [ ] Click-to-Book (leerer Slot → Buchungs-Modal mit Pre-Fill Zeit + Stylist)
- [ ] Recurring-Appointments (wöchentlich, monatlich, custom)
- [ ] Multi-Service-Appointments (3 Services hintereinander in 1 Termin)
- [ ] Group-Appointments (Hochzeits-Party, 5 Personen gleichzeitig)
- [ ] Resource-Booking (Raum, Gerät, nicht nur Staff)
- [ ] Buffer-Time automatisch (nach Farbe 15 min Putz-Zeit)
- [ ] Break-Blocking (Mittagspause pro Stylist)
- [ ] Unavailability (Urlaub, Krankheit, Fortbildung)
- [ ] Conflict-Detection (Doppelbuchung unmöglich)
- [ ] Waitlist (automatisch Slot-Fill bei Cancel)
- [ ] No-Show-Tracking + Penalty-Rules
- [ ] Print-View (für Offline-Salons)
- [ ] iCal/Google/Outlook-Sync
- [ ] Timezone-Handling korrekt (Multi-Location)
- [ ] Keyboard-Navigation (Pfeiltasten, n für neuer Termin, etc.)

## 2. ONLINE BOOKING

- [ ] Widget einbettbar auf jeder Website (1 Script-Tag)
- [ ] Stand-alone Booking-Page pro Salon (schön, seo-optimiert)
- [ ] Multi-Service-Auswahl in einem Flow
- [ ] Stylist-Auswahl (mit Fotos, Specs, Bewertungen)
- [ ] "Nächster verfügbarer Stylist"-Option (round-robin)
- [ ] Service-Filter (Damen, Herren, Kids, Farbe, Schnitt, …)
- [ ] Preis-Anzeige (Range wenn variabel)
- [ ] Deposit-Einforderung (konfigurierbar pro Service)
- [ ] Guest-Checkout (ohne Account)
- [ ] Account-Flow (Loyalty-Punkte sammeln)
- [ ] Magic-Link-Login (kein Passwort nötig)
- [ ] Gutschein/Voucher-Eingabe
- [ ] Coupon-Code
- [ ] Formular-Ausfüllen direkt im Flow (Intake, Consent)
- [ ] Confirmation-Email + SMS
- [ ] Add-to-Calendar (iCal, Google, Outlook)
- [ ] Cancellation-Link (mit Policy sichtbar)
- [ ] Reschedule-Link (self-service)
- [ ] Multi-Language (min. 12 Sprachen)
- [ ] Multi-Currency
- [ ] Mobile-First Design (Single-Thumb)
- [ ] WCAG AA

## 3. POS / CHECKOUT / PAYMENTS

- [ ] Tablet-POS (iPad-first)
- [ ] Tap-to-Pay on iPhone/Android (ohne Terminal)
- [ ] Stripe Terminal Hardware-Support
- [ ] Split-Payment (50 % Karte, 50 % Bar, 50 % Voucher)
- [ ] Multi-Item-Rechnung (Services + Retail + Trinkgeld)
- [ ] Quick-Service (1-Tap-Häufig-Services)
- [ ] Retail-Barcode-Scan
- [ ] Inventar-Abzug automatisch bei Verkauf
- [ ] Trinkgeld-Picker (auf Gerät + auf Kunden-Phone)
- [ ] Tip-Split-Rules (Assistent, Shampoo)
- [ ] Refund (Full + Partial + Teilrückgabe)
- [ ] Receipt (Email, SMS, Print, PDF)
- [ ] Fiskal-Signatur (DE: fiskaly TSE)
- [ ] Cash-Drawer-Support
- [ ] Reconciliation-Report (End of Day)
- [ ] Tax-Calculation (inkl./zzgl., Multi-Rate)
- [ ] Gift-Card-Einlösung
- [ ] Membership-Benefit-Auto-Apply
- [ ] Deposit-Einlösung (Guthaben)
- [ ] Payment-Links (Zahlen per Link via SMS)
- [ ] Recurring-Billing (Memberships)
- [ ] Failed-Payment-Retry
- [ ] Dunning (Mahnung automatisiert)

## 4. CLIENT MANAGEMENT (CRM)

- [ ] Full Client-Profile (Kontakt, Geburtstag, Präferenzen, Notizen)
- [ ] Service-Historie
- [ ] Foto-Historie (Before/After organisiert)
- [ ] Formular-Historie (Intake, Consent, SOAP)
- [ ] Color-Formula-Log
- [ ] Allergien-Flag (rot, nicht übersehbar)
- [ ] VIP-Tagging
- [ ] Custom-Tags
- [ ] Duplicate-Detection + Merge
- [ ] Client-Import (CSV, Phorest, Square, Fresha)
- [ ] Client-Export (CSV, JSON)
- [ ] Client-Portal (web + app)
- [ ] In-App-Chat mit Kunde
- [ ] SMS/Email aus Profil direkt
- [ ] Notiz-Timeline (wer, wann, was)
- [ ] Blacklist (gesperrte Kunden, mit Begründung)
- [ ] Familien-Verknüpfung (Mutter + 2 Kinder)
- [ ] Tenant-Übergreifende-ID (mit Konsent)
- [ ] Birthday-Automation
- [ ] Win-Back-Automation (nicht gesehen seit X Tagen)
- [ ] Client-Scoring (CLV, Rebook-Rate, Gross-Margin)

## 5. FORMS & CONSENT

- [ ] Form-Builder (Drag-Drop, alle Feldtypen)
- [ ] Conditional-Logic
- [ ] Photo-Upload-Fields (Vorher/Nachher)
- [ ] Signature-Field (Finger/Stylus)
- [ ] Mandatory vor Service
- [ ] Pre-Appointment (1 Woche vorher via Link)
- [ ] Consent-Versioning (DSGVO: welche Version wurde unterschrieben)
- [ ] Multi-Language per Form
- [ ] PDF-Export inkl. Unterschrift
- [ ] HIPAA-Mode (verschlüsselt, BAA)
- [ ] Minor-Flagging (Sorgeberechtigten-Unterschrift)
- [ ] Auto-fill aus Client-Profile
- [ ] Template-Library (Start mit 30+ fertigen Formularen pro Branche)

## 6. STAFF / TEAM / HR

- [ ] Staff-Profile (Foto, Bio, Specs, Zertifikate)
- [ ] Role-Based-Access-Control (Admin, Manager, Stylist, Front-Desk, Assistent)
- [ ] Schichtplanung (Week/Month-View)
- [ ] Shift-Swap-Request
- [ ] Time-Off-Request
- [ ] Time-Clock (Clock-in/out via App, Biometrie)
- [ ] Break-Tracking
- [ ] Overtime-Alerts
- [ ] Commission-Rules (pro Service, pro Staff, gestaffelt)
- [ ] Hourly + Salary + Booth-Rent-Modelle
- [ ] Payroll-Export (Gusto, DATEV, Personio)
- [ ] Performance-Dashboard pro Stylist
- [ ] Goal-Tracking (Ziele pro Monat)
- [ ] Certification-Reminders
- [ ] Staff-Self-Service-Portal

## 7. INVENTAR

- [ ] Produkt-Liste (Backbar + Retail getrennt)
- [ ] Barcode-Support
- [ ] Supplier-Management
- [ ] Stock-Level pro Location
- [ ] Low-Stock-Alerts
- [ ] Purchase-Orders (POs) erstellen + empfangen
- [ ] Auto-Reorder-Rules
- [ ] Backbar-Usage-Tracking pro Service
- [ ] Retail-Sales-Tracking
- [ ] Inventar-Audit (physischer Count vs. System)
- [ ] Waste-Tracking
- [ ] Cost-of-Goods-Reporting
- [ ] Integrations: SalonInteractive, Amazon Business, lokale Distributoren

## 8. MARKETING

- [ ] Email-Campaigns (Editor, Templates, A/B)
- [ ] SMS-Campaigns
- [ ] WhatsApp-Campaigns (via offizielles Business API)
- [ ] Segmentation (tags, CLV, last-visit, services, spending, …)
- [ ] Automation-Flows (triggers + actions)
- [ ] Rebook-Automation
- [ ] Birthday-Automation
- [ ] Win-Back-Automation
- [ ] Post-Appointment-Survey-Automation
- [ ] Referral-Program (Freund-wirbt-Freund)
- [ ] Landing-Pages-Builder
- [ ] Utm-Tracking
- [ ] Conversion-Tracking (Pixels: Meta, Google, TikTok, Pinterest, Snap)
- [ ] Deliverability-Dashboard
- [ ] Unsubscribe + Preference-Center (DSGVO)
- [ ] Integrations: Mailchimp, Klaviyo, HubSpot
- [ ] Brand-Kit (Fonts, Colors, Logos zentral verwaltet)

## 9. LOYALTY, GIFT-CARDS, MEMBERSHIPS, PACKAGES

- [ ] Points-Based Loyalty (Euro → Punkte-Umrechnung konfigurierbar)
- [ ] Tier-Based Loyalty (Bronze, Silber, Gold)
- [ ] Punch-Card (10. Termin gratis)
- [ ] Referral-Credits
- [ ] Gift-Cards (physisch + digital)
- [ ] Packages (Service-Bundle mit Rabatt, z. B. 6× Maniküre –10 %)
- [ ] Memberships (monatliche Abos: 1 Schnitt/Monat inkl.)
- [ ] Auto-Renew + Cancel-Flow
- [ ] Proration bei Upgrade/Downgrade
- [ ] Membership-Only-Services
- [ ] Corporate-Accounts (Firma kauft 100 Termine)

## 10. REPORTING & ANALYTICS

- [ ] Umsatz (Day, Week, Month, Year, Custom)
- [ ] Umsatz pro Stylist / pro Service / pro Kunde
- [ ] Auslastung (Occupancy)
- [ ] No-Show-Rate
- [ ] Rebook-Rate
- [ ] Neukunden vs. Bestand
- [ ] Retention-Cohorts
- [ ] Client-Lifetime-Value
- [ ] Produkt-Marge
- [ ] Inventar-Turnover
- [ ] Staff-Productivity
- [ ] Marketing-ROI (pro Kampagne)
- [ ] Custom-Dashboard-Builder
- [ ] Export (CSV, PDF, Excel)
- [ ] Scheduled-Email-Reports
- [ ] Benchmarks vs. Branche (anonymisiert)

## 11. KOMMUNIKATION

- [ ] Unified-Inbox (SMS + Email + WhatsApp + In-App-Chat + Instagram-DM)
- [ ] Thread-Ansicht pro Kunde
- [ ] Quick-Replies / Snippets
- [ ] Auto-Responder (Bürozeiten)
- [ ] Sentiment-Tagging (KI: positiv/negativ/neutral)
- [ ] Escalation-Workflow
- [ ] Staff-Assignment pro Thread
- [ ] Read-Receipts
- [ ] Typing-Indicators (bei In-App-Chat)

## 12. MULTI-LOCATION / FRANCHISE

- [ ] Location-Switcher (Header-Dropdown)
- [ ] Globale + Lokale Einstellungen
- [ ] Cross-Location-Reports
- [ ] Client-Sharing zwischen Locations (mit Consent)
- [ ] Brand-Standards-Enforcement
- [ ] Franchise-Revenue-Share-Automation
- [ ] Pro-Location Pricing + Staff + Services
- [ ] Master-Admin-View (Head-Office)

## 13. CONSUMER MARKETPLACE (für Plattform-Launch)

- [ ] Geo-Suche (GPS + PLZ + Stadt)
- [ ] Service-Filter
- [ ] Map-View + List-View
- [ ] Ranking-Algorithmus transparent
- [ ] Salon-Profil (Fotos, Team, Services, Reviews)
- [ ] Booking direkt aus Marketplace
- [ ] Wallet (Plattform-Credits)
- [ ] Gift-Cards übergreifend
- [ ] Boost (bezahlte Sichtbarkeit, CPA-Modell)
- [ ] Trust & Safety (Review-Moderation, KYB)
- [ ] SEO (pro Stadt pro Service eigene Seite)
- [ ] Multi-Sprache

## 14. MOBILE APPS

- [ ] Staff-App (iOS + Android, Tablet-optimiert)
- [ ] Consumer-Marketplace-App (iOS + Android)
- [ ] White-Label-Branded-App pro Salon (iOS + Android, automatisiert)
- [ ] Push-Notifications
- [ ] Offline-Mode
- [ ] Biometric-Login
- [ ] Deep-Linking
- [ ] Universal-Links
- [ ] App-Clips (iOS)
- [ ] Instant-Apps (Android)

## 15. AI-LAYER

- [ ] AI Voice Receptionist (Vapi/Retell)
- [ ] AI Chat Receptionist (Website + App)
- [ ] Smart-Search-Booking
- [ ] Predictive No-Show
- [ ] Dynamic Pricing Suggestions
- [ ] Client-Preference-Brief
- [ ] AR Try-On (Perfect Corp)
- [ ] Auto-Marketing-Content
- [ ] Sentiment-Analysis auf Messages
- [ ] Photo-to-Service
- [ ] Supply-Prediction
- [ ] Review-Response-Generator

## 16. INTEGRATIONS

- [ ] Stripe, Adyen, Mollie, Square (Payments)
- [ ] Twilio, Vonage (SMS/Voice)
- [ ] Postmark, Resend (Email)
- [ ] Google Calendar, Outlook, Apple Calendar
- [ ] Google Business Profile, Yelp, Meta
- [ ] QuickBooks, Xero, DATEV, Sage
- [ ] Gusto, Deel, Personio, DATEV Lohn
- [ ] Mailchimp, Klaviyo
- [ ] Meta Ads, Google Ads, TikTok Ads
- [ ] fiskaly (TSE DE+AT)
- [ ] Perfect Corp (AR)
- [ ] Zapier, Make, n8n
- [ ] Salon-Interactive (Drop-ship)
- [ ] Mindbody / SalonBiz / Phorest / Fresha (Migration)

## 17. COMPLIANCE & SECURITY

- [ ] DSGVO (Export + Delete + Consent)
- [ ] HIPAA-Mode
- [ ] PCI-DSS SAQ-A
- [ ] PSD2/SCA
- [ ] SOC 2 Type II Ready
- [ ] ISO 27001 Preparable
- [ ] TSE (DE), RKSV (AT), NF525 (FR), …
- [ ] E-Rechnung (DE: XRechnung/ZUGFeRD, EU: PEPPOL)
- [ ] Audit-Log (tenant-exportierbar)
- [ ] 2FA + Passkeys + SSO (SAML, OIDC)
- [ ] Role-Based-Access-Control
- [ ] Data-Residency-Options (EU, US, Canada)
- [ ] Penetration-Testing jährlich
- [ ] Backup + Disaster-Recovery (RPO 1h, RTO 4h)
- [ ] Incident-Response-Plan

## 18. DEVELOPER / API / EXTENSIBILITY

- [ ] REST API v1 dokumentiert (OpenAPI 3.1)
- [ ] GraphQL-Schema
- [ ] Webhooks (30+ Events)
- [ ] OAuth 2.0 für Partner-Apps
- [ ] Rate-Limiting + Usage-Dashboards
- [ ] SDK (TypeScript, Python, PHP)
- [ ] Sandbox-Environment
- [ ] Changelog + Migrations-Notes
- [ ] Partner-Portal
- [ ] Zapier-App (offiziell)
- [ ] Make-App (offiziell)

## Verwendung dieser Checklist

Vor jedem Phasen-Ende liest Claude Code diese Datei durch und markiert **ehrlich**, was vorhanden ist und was fehlt. Dann:
- Rot (fehlt, P0): sofort nachholen vor Phase-End
- Gelb (fehlt, P1/P2): in Phase-Plan einsortieren, nicht vergessen
- Grün (da): weiter

**Die Hälfte dieser Liste ist in P0/P1 (MVP + V1) zu bauen. Die andere Hälfte spätestens in V2.** Kein Feature ist "nice to have". Alle sind Baseline. Was uns *einzigartig* macht, ist separat in `differentiation.md`.
