# Compliance, Recht, Sicherheit

> SALON OS verarbeitet sensible Daten (Gesundheit, Bezahlung, Minderjährige). Compliance ist Produktmerkmal, nicht Beiwerk.

## 1. DSGVO / GDPR (EU + UK)

### Pflicht-Features

- **Verarbeitungsverzeichnis** (Art. 30) — automatisch geführt, Admin-Download als PDF
- **DPA / AVV** mit allen Tenants automatisch (beim Onboarding elektronisch unterzeichnet)
- **Sub-Prozessor-Liste** transparent auf Trust-Center, Änderungen per E-Mail 30 Tage vorher
- **Art. 15 Auskunftsrecht** — 1-Click-Export ALLER Daten eines Clients (JSON + CSV + Medien ZIP)
- **Art. 16 Berichtigung** — Client kann über Branded-Seite eigene Daten korrigieren
- **Art. 17 Löschung (Right-to-be-forgotten)** — kaskadierend, Audit-Log-Retention verkürzt
- **Art. 18 Einschränkung** — „frozen"-Flag auf Client
- **Art. 20 Datenportabilität** — standardisierter JSON-Export
- **Art. 21 Widerspruch** — Marketing-Opt-out-Flag
- **Art. 22 automatisierte Entscheidung** — KI-basierte Entscheidungen (z. B. Risk-Score) sind transparent + Opt-out möglich
- **Consent-Management:** granular, versioniert, pro Zweck (Marketing, Analytics, AR-Try-On-Fotos)
- **Cookie-Banner:** Axeptio, CookieYes oder eigener mit IAB TCF 2.2-Konformität
- **Data Retention Policies:** pro Entität konfigurierbar, automatische Löschung nach Frist

### Technische Maßnahmen

- Encryption-at-Rest (AES-256, AWS KMS)
- Encryption-in-Transit (TLS 1.3)
- Field-Level-Encryption für besonders sensible Felder (Allergien, Patch-Test, Medspa-Notes)
- Audit-Log unveränderbar
- Daten-Residency: EU-Daten bleiben in EU-Region (AWS eu-central-1 / eu-west-1)

### Data-Protection-Officer

- Interner DSB ab Mitarbeiter 20
- Externe DSB-Kanzlei zuvor (z. B. activeMind, intersoft consulting)

## 2. TSE / Kassensicherungsverordnung (DE)

- Integration mit **fiskaly** (oder Epson-TSE) für jede Kasse
- Jede Transaktion wird TSE-signiert
- **DSFinV-K-Export** per Admin-Knopfdruck (digitale Schnittstelle Finanzverwaltung)
- Belegausgabepflicht: digitaler Beleg oder gedruckt
- Meldung der Kasse beim Finanzamt: Reminder im System (Pflicht seit 2025)

## 3. Österreich (RKSV)

- Registrierkassensicherheitsverordnung
- Integration mit **A-Trust**, **eOPC** oder **fiskaly RKSV**
- Signatur mit Kreditanstalt-Zertifikat
- Starterbeleg, Monatsbeleg, Jahresbeleg

## 4. Weitere EU-Fiskal-Anforderungen

| Land | System                          | Provider-Beispiel          |
| ---- | ------------------------------- | -------------------------- |
| IT   | Memoranda elettronici, FE       | InfoCert, Amazon Business  |
| ES   | TicketBAI (Baskenland)          | LROC                       |
| PT   | SAFT-PT + Faturação certificada | PrimaveraBSS, SAGE PT      |
| HU   | NAV Online Invoice              | NAV direct                 |
| FR   | POS-Zertifikat Art. 88          | NF525 zertifizierte Kassen |
| PL   | JPK_FA + Kasse fiskalna online  | Elzab, Posnet              |
| DK   | SAF-T                           | FIK                        |
| NO   | Bokføringsloven                 | Infrasec, Kassagroup       |
| SE   | Kassaregisterlagen              | Kassagruppen, SRF          |
| GR   | myDATA                          | MyData direct              |
| RO   | e-Factura (RO)                  | SmartBill                  |

## 5. PSD2 / Strong Customer Authentication

- Alle Karten-Zahlungen via Stripe/Adyen/Mollie (Provider handhaben SCA)
- 3-D Secure 2.0 erzwungen für Kunden-Initiierte Käufe > 30 €
- **MIT (Merchant-Initiated Transactions)** korrekt gekennzeichnet (Memberships, No-Show-Fees)

## 6. PCI-DSS

- **SAQ-A-Scope** (wir speichern keine PANs) — Stripe-Hosted + Stripe Elements
- Tokens statt Kartennummer in unserer DB
- ADR: **niemals** Karten-PAN/CVV in unsere Systeme
- Stripe Terminal / Adyen Tap-to-Pay = eingeschränkter Scope
- Attestation of Compliance jährlich

## 7. HIPAA (USA, Medspa)

- Business Associate Agreement mit Providern (OpenAI, Anthropic, Twilio, Postmark, AWS, Stripe)
- PHI-Schutz:
  - Separate DB-Tabellen für PHI (verschlüsselt mit field-level keys)
  - Kein PHI in LLM-Prompts (Redaction vor LLM)
  - Access-Log pro PHI-Zugriff, min. 6 Jahre Aufbewahrung
  - Break-the-Glass-Zugriff mit Extra-Audit
- Technische Safeguards: 2FA Pflicht, Session-Timeout 15 min, IP-Allowlist optional
- Administrative Safeguards: Training für Team, Incident-Response-Plan
- Physische: AWS-SOC-2-Rechenzentren
- **BAA-Template** standardisiert für Medspa-Tenants
- **HIPAA-Ready-Audit** durch externe Kanzlei vor Medspa-Launch

## 8. SOC 2 Type II

- Ziel: Audit in Monat 12
- Via **Vanta** oder **Drata** (automatische Control-Tests)
- Controls: Access, Change Mgmt, Availability, Confidentiality, Privacy
- Jährliche Renewal

## 9. ISO 27001 (Optional, Enterprise-Signal)

- Phase 3 Ziel (Monat 18–24)
- Wichtig für Enterprise-Deals in DE/Öffentlicher Sektor

## 10. Accessibility (WCAG 2.2 AA)

- Automatisierte Tests (axe-core in Playwright)
- Manuelle Audits quartalsweise (durch externe Firma wie Level Access, AccessiBe Audit)
- VPAT (Voluntary Product Accessibility Template) als Download
- Relevant für EU Accessibility Act (2025+) und Section 508 (US-Behörden)

## 11. CCPA / CPRA (Kalifornien)

- Opt-out-Link auf Website („Do Not Sell My Info")
- Privacy-Request-Portal
- Automatisierte Löschung mit SLA 45 Tage

## 12. E-Rechnung & Faktura

- **ZUGFeRD** (DE) + **Factur-X** (FR) + **XRechnung** (DE Behörden) + **PEPPOL** (EU-Öffentlich)
- E-Invoice-Pflicht DE B2B ab 2025 → MVP muss ZUGFeRD ausgeben können (Phase 2)
- PDF + XML-Hybrid

## 13. Telefonie- & SMS-Compliance

- **TCPA (US)** — Opt-in für Marketing-SMS
- **PECR (UK)** — ähnlich
- **TKG (DE)** — klare Opt-in, Opt-out über Keyword (STOP)
- **Double-Opt-in** für Marketing-E-Mail
- **A2P 10DLC (US)** — Brand-Registration bei Twilio

## 14. Consumer-Marketplace-Specific

- **DSA (Digital Services Act, EU)** — Trusted Flagger, Transparent Ads, Content-Moderation
- **P2B-Verordnung** — faire Bedingungen für Salons
- Bewertungen echt (nur Verified-Booking)
- AGB-Vertrag klar B2B (Salons) + B2C (Endkunden)

## 15. Kinder / Minderjährige

- **COPPA (US)** / **Kinderrichtlinie EU**
- Buchungen für Kinder werden durch Eltern-Konto abgewickelt (Familien-Konto)
- Keine Marketing-Kommunikation an bekannte Minderjährige

## 16. Anti-Money-Laundering (AML)

- Stripe und Adyen handhaben primär
- Tenant-Onboarding mit KYB (Know-Your-Business) über Stripe Connect
- Ungewöhnlich hohe Trinkgeld-Einträge → Alert (Money-Laundering-Risiko)

## 17. Incident-Response

- **Notfallplan** versioniert
- 72-h-Meldepflicht bei Data-Breach (DSGVO Art. 33)
- Incident-Channel: dedicated Slack + Statuspage-Incident
- Jährliche Tabletop-Exercises
- Security-Mailing-Liste: `security@salon-os.com` + PGP-Key

## 18. Datenstandort

| Region       | Primär-DB-Standort      | Backup               |
| ------------ | ----------------------- | -------------------- |
| EU (Default) | AWS eu-central-1 (FRA)  | eu-west-1 (Dublin)   |
| UK           | AWS eu-west-2 (LON)     | eu-west-1            |
| US           | AWS us-east-1 (N.VA)    | us-west-2            |
| AP           | AWS ap-southeast-1 (SG) | ap-southeast-2 (SYD) |

- Kunden wählen Region beim Onboarding oder durch lokale Subdomain.
- Kein Daten-Transfer über Regionen ohne ausdrückliches Consent.

## 19. Audit-Trail

- Jede Änderung an Client, Appointment, Payment, Settings wird geloggt.
- Log ist **append-only**, monatlich signiert und archiviert.
- Retention: 7 Jahre Standard (Steuerpflicht DE/AT), konfigurierbar für HIPAA (6 Jahre), UK (6 Jahre nach Austritt).

## 20. Anwaltliche Checklisten (vor Launch)

- [ ] AGB-Prüfung (DE-Kanzlei + UK-Kanzlei + US-Kanzlei)
- [ ] Datenschutzerklärung (DE + EN + ES + FR)
- [ ] Cookie-Policy
- [ ] Impressum (DE, AT, CH — TMG)
- [ ] Cookie-Banner-Review (PECR/DSGVO)
- [ ] Trademark-Registrierung (EUIPO + USPTO + WIPO)
- [ ] Marketplace-T&Cs (B2B + B2C separat)
- [ ] AVV-Template (Deutsch + English)
- [ ] Standardvertragsklauseln (SCC) für US-Transfers
- [ ] DPA-Template
- [ ] BAA-Template (HIPAA)
- [ ] Employment-Verträge mit IP-Assignment
- [ ] Investor-Vertragspaket
