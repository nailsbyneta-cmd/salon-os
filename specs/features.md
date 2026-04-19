# Feature Catalogue — Exhaustive (alle Module, alle Features)

> Dieses Dokument ist die **verbindliche Feature-Liste** für Claude Code. Jede Zeile ist ein baubares Stück. Features sind priorisiert (P0/P1/P2) und phasenweise zugeordnet.

**Priorität:** P0 = MVP (muss in Phase 1), P1 = V1 (Phase 2), P2 = V2 (Phase 3).

## Modul 1 — Calendar & Scheduling

| Feature                                                | Priorität |
| ------------------------------------------------------ | :-------: |
| Tages-/Wochen-/Monats-Ansicht                          |    P0    |
| Staff-Spalten, Raum-Spalten, Ressourcen-Spalten        |    P0    |
| Farbcodierung (Status, Service, Stylist)               |    P0    |
| Drag & Drop Rescheduling                               |    P0    |
| Resize Termin                                          |    P0    |
| Blockzeiten (Pausen, Meetings, Urlaub)                 |    P0    |
| Buffer-Zeit je Service (Setup + Cleanup)               |    P0    |
| Serientermine (wöchentlich, 2-wöchentlich, monatlich)  |    P1    |
| Gruppen-Termine (Bridal-Party, Kurse)                  |    P1    |
| Kapazitätsplanung (Doppelstuhl, Pedikür-Plätze)        |    P1    |
| Kalenderschloss (X Tage im Voraus gesperrt)            |    P0    |
| Precision Scheduling AI (optimale Slot-Wahl)           |    P2    |
| Smart Gap Filling AI                                   |    P2    |
| Kalender-Sync (Google, Apple, Outlook bidirektional)   |    P1    |
| Print-Friendly Ansicht                                 |    P1    |
| Staff sehen nur eigene Spalte Option                   |    P0    |
| Raum-Konflikt-Prävention                               |    P0    |
| Overbooking-Toggle (erlauben/verbieten)                |    P0    |
| Dauerhafte Booking-Regeln je Service + je Stylist      |    P0    |
| Heatmap (Auslastung visualisiert)                      |    P1    |

## Modul 2 — Online Booking

| Feature                                                         | Priorität |
| --------------------------------------------------------------- | :-------: |
| Branded Booking-Page unter book.{brand}.com                     |    P0    |
| Einbettbares Widget (iframe + JS-Embed)                         |    P0    |
| Facebook-/Instagram-Booking-Integration                         |    P1    |
| Google Reserve with Reserve with Google                         |    P1    |
| TikTok Book Now                                                 |    P2    |
| Multi-Service-Buchung in einem Flow                             |    P0    |
| Stylist wählen oder „no preference"                             |    P0    |
| Zeit-/Preis-/Dauer-Filter                                       |    P0    |
| Up-Sell bei Buchung                                             |    P1    |
| Cross-Sell nach Buchung                                         |    P1    |
| Deposit konfigurierbar (Betrag / %)                             |    P0    |
| Risk-basiertes Deposit (Neukunde/VIP/Historie)                  |    P1    |
| Vollzahlung vorab                                               |    P0    |
| Cancellation-Fee automatisch                                    |    P0    |
| Waitlist-Eintrag mit Priorisierung                              |    P0    |
| Waitlist Smart-Notify bei Lücke                                 |    P1    |
| Virtual Queue (Walk-in SMS)                                     |    P1    |
| Buchungs-Policies je Service (min/max Vorlauf, Vorauszahlung)   |    P0    |
| Gast-Buchung (ohne Konto via Magic-Link)                        |    P0    |
| Guest → Konto-Conversion-Flow                                   |    P1    |
| Reschedule-Link in Confirmation                                 |    P0    |
| Sprach-Auto-Erkennung (Browser-Locale)                          |    P0    |
| Barrierefreiheit (Screen-Reader, Kontrast)                      |    P0    |
| SEO-Metadaten pro Salon                                         |    P0    |

## Modul 3 — Client CRM

| Feature                                                | Priorität |
| ------------------------------------------------------ | :-------: |
| Stammdaten (Name, Telefon, E-Mail, Adresse, Pronomen)  |    P0    |
| Geburtstag, Foto                                       |    P0    |
| Allergien, Unverträglichkeiten                         |    P0    |
| Haar-/Hautformel                                       |    P0    |
| Patch-Test-Status mit Ablaufdatum                      |    P1    |
| Termin-Historie                                        |    P0    |
| Zahlungs-Historie                                      |    P0    |
| Produkt-Historie                                       |    P0    |
| Notizen (intern / client-sichtbar getrennt)            |    P0    |
| Client-Tags (beliebig viele)                           |    P0    |
| Before/After-Fotos (verschlüsselt, mit Consent)        |    P1    |
| Client Lifetime Value auto-berechnet                   |    P0    |
| No-Show-Risk-Score                                     |    P1    |
| Client Reconnect (List + 1-Click Campaign)             |    P1    |
| Familien-Konten (Kind + Eltern, gemeinsam zahlend)     |    P2    |
| Automatische Deduplizierung (Telefon+E-Mail match)     |    P0    |
| Import CSV / API                                       |    P0    |
| DSGVO-Export (alle Daten als ZIP)                      |    P0    |
| DSGVO-Löschung (Right-to-be-forgotten)                 |    P0    |
| Blocklist (Kunde sperren)                              |    P0    |
| Preferred Stylist / Raum                               |    P0    |

## Modul 4 — Forms & Consultations

| Feature                                               | Priorität |
| ----------------------------------------------------- | :-------: |
| Formular-Builder (Drag & Drop)                        |    P0    |
| Logik/Branching                                       |    P1    |
| Signatur-Feld                                         |    P0    |
| Datei-/Foto-Upload                                    |    P0    |
| Template-Bibliothek (50+ Formulare)                   |    P1    |
| Pro Service triggerbar                                |    P0    |
| Vor-Termin-E-Mail / SMS mit Link                      |    P0    |
| Kiosk-/Tablet-Modus                                   |    P1    |
| Versionierung (welche Version der Client unterzeichnet)|   P1    |
| PDF-Export + Druck                                    |    P0    |
| Automatische Ablage am Client-Profil                  |    P0    |
| HIPAA-Modus (verschlüsselt, BAA)                      |    P1    |
| SOAP-Notes-Editor                                     |    P1    |
| Körper-Diagramm (Markieren Injektions-Stellen etc.)   |    P2    |

## Modul 5 — POS & Payments

| Feature                                                    | Priorität |
| ---------------------------------------------------------- | :-------: |
| Checkout-UI (Tablet + Desktop)                             |    P0    |
| Stripe Terminal Integration (Bluetooth + Smart Reader)     |    P0    |
| Adyen Integration (Enterprise)                             |    P1    |
| SumUp / Zettle / Clover Adapter                            |    P1    |
| Apple Pay / Google Pay                                     |    P0    |
| Tap-to-Pay on iPhone / Android                             |    P0    |
| SEPA Lastschrift                                           |    P0    |
| Klarna / AfterPay / Affirm                                 |    P1    |
| iDEAL, Bancontact, BLIK, MB Way, Multibanco (EU local)     |    P1    |
| Cash-Handling (Wechselgeld, Zählbon)                       |    P0    |
| Split-Payment (Bar + Karte + Voucher)                      |    P0    |
| Split-Ticket (mehrere Zahler)                              |    P1    |
| Trinkgeld (pro Stylist / Pool / Custom-Rules)              |    P0    |
| Cash-Tip vs Card-Tip getrennt                              |    P0    |
| Client Mobile Checkout (SMS-Link)                          |    P1    |
| Virtual Waiting Room Check-in                              |    P1    |
| Digital Receipts (E-Mail + SMS)                            |    P0    |
| Print Receipts (Epson + Star Adapter)                      |    P0    |
| Refund + Partial Refund                                    |    P0    |
| Chargeback Workflow                                        |    P1    |
| Multi Payment Accounts (Booth-Renter separate)             |    P1    |
| Gratuity auto-suggested (15/18/20 %)                       |    P0    |
| Tax-Handling pro Position (MwSt., Sales Tax, VAT, GST)     |    P0    |
| Tagesabschluss / Z-Bon                                     |    P0    |
| Fiskal-Adapter: fiskaly (DE TSE), SignIT (AT), FIK (DK)    |    P1    |
| DSFinV-K-Export                                            |    P1    |
| Offline-Modus mit Sync                                     |    P1    |

## Modul 6 — Inventory & Retail

| Feature                                                    | Priorität |
| ---------------------------------------------------------- | :-------: |
| Produkt-Katalog (SKU, Barcode, EAN, Lot, MHD)              |    P0    |
| Retail + Professional getrennt                             |    P0    |
| Barcode-Scan (Kamera + USB)                                |    P1    |
| Echtzeit-Bestand                                           |    P0    |
| Mindestbestand + Alert                                     |    P0    |
| Auto-Reorder an Lieferanten                                |    P2    |
| Lieferanten-Management                                     |    P1    |
| Wareneingang buchen                                        |    P0    |
| Transfer zwischen Locations                                |    P1    |
| Inventur-Modus (zählen am Tablet)                          |    P1    |
| Backbar-Verbrauch tracken (z. B. Farbe pro Termin)         |    P1    |
| Usage-Based-Pricing (Injectables, Tattoo-Tinten)           |    P2    |
| Produkt-Empfehlung im Checkout (AI)                        |    P2    |
| Online-Store (eCom) mit Inventory-Sync                     |    P2    |
| Abo-Produkte (monatliches Shampoo-Abo)                     |    P2    |

## Modul 7 — Staff & Rostering

| Feature                                                    | Priorität |
| ---------------------------------------------------------- | :-------: |
| Rollen: Owner, Manager, Front Desk, Stylist, Renter, Trainee |   P0    |
| Arbeitszeitmodelle: Angestellt, Booth-Renter, Commission   |    P0    |
| Schichtplaner                                              |    P0    |
| Offene Schichten / Shift-Swap                              |    P1    |
| Urlaubsanträge + Approval-Workflow                         |    P1    |
| Zeiterfassung Clock-in/out                                 |    P0    |
| Pausen, Überstunden                                        |    P0    |
| Performance-KPIs pro Stylist                               |    P1    |
| Provisionstufen (gleitend/gestaffelt)                      |    P1    |
| Retail-Bonus                                               |    P1    |
| Booth-Renter Dashboard (eigene Preise/Reports)             |    P1    |
| Trainings-Modul (Videos, Quiz, Checklisten)                |    P2    |

## Modul 8 — Payroll & Commissions

| Feature                                                    | Priorität |
| ---------------------------------------------------------- | :-------: |
| Lohnlauf mit Commission + Trinkgeld + Cash                 |    P1    |
| Direct Deposit (US), SEPA (EU), BACS (UK), ACH, PIX (BR)   |    P1    |
| DATEV-Export (DE)                                          |    P1    |
| RTI (UK)                                                   |    P1    |
| Form 941 (US)                                              |    P1    |
| Integration Gusto, Deel, Rippling, Personio, ADP           |    P1    |
| 1099-Contractor-Management (US)                            |    P2    |

## Modul 9 — Marketing & Campaigns

| Feature                                                    | Priorität |
| ---------------------------------------------------------- | :-------: |
| E-Mail-Campaign-Builder (MJML Drag & Drop)                 |    P1    |
| SMS-Campaign (Kurz-URL, Tracking)                          |    P1    |
| WhatsApp Business Campaigns                                |    P2    |
| Push-Notification (Branded App)                            |    P1    |
| iMessage Business (US)                                     |    P2    |
| Template-Bibliothek (50+ beauty-spezifisch)                |    P1    |
| Segment-Builder (KI-unterstützt)                           |    P1    |
| Automated Flows (Welcome, Birthday, Win-Back)              |    P1    |
| A/B-Testing                                                |    P1    |
| UTM + Conversion-Tracking                                  |    P1    |
| Facebook/Instagram-Ads-Manager                             |    P2    |
| TikTok Ads + Pixel                                         |    P2    |
| SEO-Mikroseiten pro Location                               |    P2    |
| Post-Service Review-Request (→ Smart-Routing)              |    P1    |
| Abandoned-Booking Recovery                                 |    P1    |

## Modul 10 — Loyalty & Memberships

| Feature                                                    | Priorität |
| ---------------------------------------------------------- | :-------: |
| Points-basiertes Programm                                  |    P1    |
| Punch Card (10×Service → 1 gratis)                         |    P1    |
| Tiered Programs (Bronze/Silver/Gold)                       |    P1    |
| Memberships (monatliches Subscription via Stripe Billing)  |    P1    |
| Package / Course (6×Peeling vorab)                         |    P1    |
| Referral-Programm (Code, Reward)                           |    P1    |
| Tier-Auto-Upgrade                                          |    P1    |
| Expiring-Points-Reminder                                   |    P1    |
| Subscription Pause / Skip                                  |    P2    |

## Modul 11 — Gift Cards & Vouchers

| Feature                                                    | Priorität |
| ---------------------------------------------------------- | :-------: |
| Digitale Gift Cards (kaufbar online + in-store)            |    P1    |
| Physische Gift Cards (Druck via Partner, QR-Code)          |    P1    |
| Teilweise einlösbar, übertragbar                           |    P1    |
| Länderspezifische Verfall-Regeln                           |    P1    |
| Deferred-Revenue-Buchhaltung                               |    P1    |
| Voucher-Code-Generator (Kampagnen, Influencer)             |    P1    |
| Marketplace-Gift-Card (salon-übergreifend)                 |    P2    |

## Modul 12 — Reviews & Reputation

| Feature                                                    | Priorität |
| ---------------------------------------------------------- | :-------: |
| Auto-Request nach Termin (SMS + E-Mail)                    |    P0    |
| Smart-Routing (4–5★ → Google, 1–3★ → intern)               |    P1    |
| Google-Profil-Sync (GMB API)                               |    P1    |
| Facebook, Yelp, TripAdvisor, TrustPilot                    |    P1    |
| Zentrales Dashboard                                        |    P1    |
| KI-Antwortvorschläge                                        |    P1    |
| Reputation-Score je Stylist + Location                     |    P1    |
| Recovery-Workflow für negative Reviews                     |    P1    |

## Modul 13 — Reports & Analytics

| Feature                                                    | Priorität |
| ---------------------------------------------------------- | :-------: |
| Umsatz-Dashboard (heute / Woche / Monat / Jahr)            |    P0    |
| Auslastung %                                               |    P0    |
| Rebook-Rate                                                |    P0    |
| Top-Kunden                                                 |    P0    |
| Produkt-Umsatz                                             |    P1    |
| Staff-KPIs (Umsatz, Trinkgeld, Rebook, NPS)                |    P1    |
| Marketing-ROI (je Kampagne)                                |    P1    |
| Benchmarks (anonymisiert: deine Location vs. Chain-Avg)    |    P2    |
| AI Analyst (Natural-Language-Queries)                      |    P1    |
| Scheduled Reports per E-Mail                               |    P1    |
| Exports: CSV, XLSX, PDF, Google Sheets                     |    P0    |
| Anomalie-Alerts                                            |    P2    |

## Modul 14 — AI Receptionist & Automation Flows

| Feature                                                    | Priorität |
| ---------------------------------------------------------- | :-------: |
| Voice AI Receptionist (24/7 Anruf, Buchung, FAQ)           |    P1    |
| Two-Way SMS AI (Confirmations, Umbuchung)                  |    P1    |
| Web Chat Widget mit AI                                     |    P1    |
| Instagram/Facebook-DM-Reply AI                             |    P1    |
| WhatsApp AI (in-channel buchen)                            |    P2    |
| Express Booking (Link, selbst-nachtragen)                  |    P1    |
| Automation Flows (wie Zapier, salon-spezifisch)            |    P1    |
| Handoff-to-Human (nahtlose Übergabe + Kontext)             |    P1    |
| Multi-Language Voice (20+ Sprachen)                        |    P1    |
| Anpassbare Persönlichkeit/Tonalität                        |    P1    |
| Call-Recording + Transcription                             |    P1    |

## Modul 15 — Online Store (Retail eCom)

| Feature                                                    | Priorität |
| ---------------------------------------------------------- | :-------: |
| Storefront unter shop.{brand}.com                          |    P2    |
| Sync mit POS-Inventar                                      |    P2    |
| Click & Collect                                            |    P2    |
| Versand-Integration (Shippo, Sendcloud)                    |    P2    |
| Abo-Produkte                                               |    P2    |
| Cart-Abandoned-Mail                                        |    P2    |
| Produkt-Empfehlungen                                       |    P2    |

## Modul 16 — Branded Client App

| Feature                                                    | Priorität |
| ---------------------------------------------------------- | :-------: |
| Native iOS + Android (RN + Expo)                           |    P1    |
| White-Label: Logo, Farben, Splash, Icon, Push-Sound        |    P1    |
| Automatisches App-Store-Deployment (Fastlane)              |    P1    |
| Buchen, Rebuchen, Historie, Loyalty, Store, Push           |    P1    |
| Gift-Card-Kauf                                             |    P1    |
| AR Try-On (Hair Color, Makeup, Nail Art)                   |    P2    |
| Deep-Links zu Termin & Formular                            |    P1    |
| Biometrics-Login (Face/Touch ID)                           |    P1    |

## Modul 17 — Consumer Marketplace

| Feature                                                    | Priorität |
| ---------------------------------------------------------- | :-------: |
| Marktplatz-Web unter salon-os.com                          |    P2    |
| Consumer-Mobile-App (iOS + Android)                        |    P2    |
| Geo-Search + Service-Filter                                |    P2    |
| Ranking-Algorithmus (Rating, Distanz, Aktualität)          |    P2    |
| Buchung ohne Konto (Magic-Link)                            |    P2    |
| Marketplace-Gift-Cards                                     |    P2    |
| Verifizierte Reviews (nur gebuchte Kunden)                 |    P2    |
| Paid Boost (Booksy-Boost-Style)                            |    P2    |
| Neukunden-Commission 10 % (einmalig)                       |    P2    |
| Wallet (Kunde sammelt Credits salon-übergreifend)          |    P2    |

## Modul 18 — Multi-Location & Franchise

| Feature                                                    | Priorität |
| ---------------------------------------------------------- | :-------: |
| Konzern-Dashboard                                          |    P1    |
| Zentraler Service-Katalog (mit Override je Location)       |    P1    |
| Zentrale Preislisten                                       |    P1    |
| Mitarbeiter über mehrere Locations                         |    P1    |
| Corporate Reporting + Benchmarks                           |    P2    |
| Franchise-Royalty-Engine                                   |    P2    |
| White-Label Subdomain + Custom-Branding                    |    P2    |
| Multi-Country-Rollup (konsolidiert in Reporting)           |    P2    |
| SSO über SAML/OIDC (Enterprise)                            |    P2    |
| IP-Whitelisting + Audit-Log (Enterprise)                   |    P2    |

## Querschnitts-Features (alle Module)

| Feature                                                    | Priorität |
| ---------------------------------------------------------- | :-------: |
| Multi-Tenant mit Postgres RLS                              |    P0    |
| i18n mit ICU-MessageFormat (20+ Sprachen, inkl. RTL)       |    P0    |
| Multi-Currency (alle Währungen, Live-FX-Rate)              |    P0    |
| Multi-Timezone (Termine in Location-TZ, UI in User-TZ)     |    P0    |
| Multi-Tax (MwSt/VAT/GST/Sales-Tax pro Jurisdiktion)        |    P0    |
| Dark Mode                                                  |    P0    |
| Accessibility WCAG 2.2 AA                                  |    P0    |
| Command-K-Palette                                          |    P1    |
| Keyboard-Shortcuts (dokumentiert)                          |    P1    |
| Undo (10 s) für destruktive Aktionen                       |    P1    |
| Offline-First für POS + Staff-App                          |    P1    |
| Real-time Sync (Supabase Realtime / Postgres LISTEN)       |    P0    |
| Audit-Log (wer hat was wann geändert)                      |    P0    |
| Feature-Flags (GrowthBook)                                 |    P0    |
| A/B-Testing-Framework                                      |    P1    |
| In-App-Help (Walkthrough + Video-Tutorials)                |    P1    |
| Support-Chat (Intercom oder eigener)                       |    P0    |
| Status-Page (status.salon-os.com)                          |    P0    |
| Public Roadmap (Canny oder ProductLane)                    |    P1    |
| Changelog (public)                                         |    P0    |

## Integrations-Liste (Partner)

- Stripe, Adyen, Mollie, Braintree, PayPal, Square, SumUp, Zettle, Clover, Worldpay
- Twilio, Vonage, MessageBird, Plivo, 3CX
- Postmark, Resend, SendGrid
- WorkOS, Clerk, Auth0
- Google Calendar, Microsoft Outlook, Apple Calendar
- Meta Business (FB+IG), TikTok Business, Google Business Profile
- QuickBooks, Xero, DATEV, Sage, Wave
- Gusto, Deel, Rippling, Personio, ADP
- Mailchimp, Klaviyo (Export), HubSpot (CRM-Sync optional)
- Zapier, Make (Integromat), n8n
- Shopify (Produkt-Sync), WooCommerce
- Perfect Corp / ModiFace (AR)
- OpenAI, Anthropic (KI)
- fiskaly (TSE DE), SignIT (AT), FIK (DK), Infrasec (NO)
- Shippo, Sendcloud, EasyPost
- Cloudinary oder UploadThing (Foto-CDN)
