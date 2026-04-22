# Integrations — Partner & Drittsysteme

> Jede Integration wird über einen **Adapter** gebaut (Interface + Implementierung), um Provider-Austausch zu ermöglichen.

## Payments

| Provider        | Märkte        | Use-Case                             |
| --------------- | ------------- | ------------------------------------ |
| Stripe          | global        | primär — Online + Terminal + Billing |
| Adyen           | Enterprise    | globale Ketten                       |
| Mollie          | EU-lokal      | iDEAL, Bancontact, BLIK, MB Way      |
| SumUp           | EU            | leichte Hardware für Solos           |
| Zettle (PayPal) | EU + UK       | Legacy-Kunden                        |
| Clover          | US            | Legacy + Migration                   |
| Square          | US/UK/CA/AU   | Migrations-Import                    |
| PayPal          | global        | als Zahlungsmethode                  |
| Worldpay        | UK Enterprise | Großketten                           |

## Messaging (SMS + Voice + WhatsApp)

- Twilio (primär), Vonage (Fallback), MessageBird (EU-lokalisiert), Plivo (US-günstig), 3CX (Voice-PBX-Import)

## E-Mail

- Postmark (transactional), Resend (modern), SendGrid (Fallback), AWS SES (hohe Volumen)

## Kalender-Sync

- Google Calendar (bidirectional)
- Microsoft Outlook / Office 365
- Apple Calendar (via CalDAV)
- **Konflikt-Resolution:** SALON OS ist Source-of-Truth; externe Kalender-Blocker werden nur als „busy"-Marker importiert.

## Social Booking

- **Facebook** Book Now Button via Meta Graph API
- **Instagram** Action Buttons (wie Shore)
- **Google Reserve** "Reserve with Google"
- **TikTok** Book-Now-Link in Bio
- **Apple Business Connect** (Maps + iMessage Business)
- **Linktree / Beacons** Custom-Integration

## Buchhaltung

- QuickBooks Online (US/global)
- Xero (UK/AU/NZ/global)
- DATEV (DE) — XML-Export + BUCHUNGSSTAPEL-API
- Sage (UK + DE)
- Wave (US/CA, Solo)
- Lexware / sevDesk (DE)
- Fortnox (SE)

## Payroll

- Gusto (US)
- Deel (global Contractor)
- Rippling (US)
- Personio (DE-Mid)
- Remote (global)
- ADP (Enterprise)
- DATEV Lohn (DE)
- Sage Payroll (UK)

## HR & Scheduling

- Homebase (US), Deputy, When I Work

## Marketing

- Mailchimp (Opt-in/Opt-out Sync)
- Klaviyo (Event-Stream)
- HubSpot (CRM-Sync als optionales Ad-on)
- Intercom (Support-Chat alt.)
- Meta Ads Manager (via Meta-API — direktes Boosten)
- Google Ads (Conversions)
- TikTok Ads (Pixel + Events)
- Pinterest Tag
- Snapchat Ads

## Reviews

- Google Business Profile (API)
- Meta (Facebook-Reviews) API
- Yelp (API + Webhook)
- Trustpilot, TripAdvisor, Booking.com (Enterprise)

## Fiskal / TSE / Invoice

- fiskaly (DE+AT Cloud-TSE)
- Epson-TSE (Hardware-Option)
- SignIT / A-Trust (AT)
- FIK (DK), Infrasec (NO), Kassagroup (SE)
- NF525 (FR) — Zertifizierungs-Partner
- LROC (ES-TicketBAI)
- ZUGFeRD + XRechnung + Factur-X + PEPPOL

## Storage / Foto

- AWS S3, Cloudflare R2
- Cloudinary (Transformationen)
- UploadThing (Alt.)

## Auth

- WorkOS (primär) — SSO + Passkeys + Directory Sync
- Clerk (alternativ)
- Auth0 (Enterprise-Fallback)

## Analytics

- PostHog (self-hosted, GDPR-stark)
- Amplitude (Fallback)
- Segment / RudderStack (CDP)

## Error + APM

- Sentry, Datadog APM, Grafana Cloud, Better Uptime

## AR / KI

- Perfect Corp (YouCam SDK) — Try-On
- ModiFace (L’Oréal) — Try-On-Alternative
- Vapi / Retell — Voice-Agent
- OpenAI GPT-4.1/4o, Anthropic Claude Sonnet 4 — LLM
- ElevenLabs — TTS
- Deepgram / AssemblyAI — STT

## Shipping & eCom

- Shippo, Sendcloud, EasyPost (Versand)
- Shopify + WooCommerce (Produkt-Sync optional)

## Automation (Kunden-seitig)

- Zapier (offizielle App)
- Make (offizielle App)
- n8n Community-Node
- Pipedream

## Industrie-spezifisch

- **SalonInteractive** — Produkt-Dropshipping
- **ProductProCon / Eleanor** — KI-Produkt-Empfehlungen
- **SalonBiz** — Daten-Migration von Konkurrenten
- **Meevo Migration** — historische Konkurrenz

## Integrations-Marktplatz (ab Phase 3)

- Partner registrieren Apps im Partner-Portal
- OAuth 2.0 + Scopes
- Review-Prozess (Security + UX)
- Umsatzbeteiligung 20/80 (80 % an Partner)
- Featured-Apps-Section

## Integrations-Engineering-Regeln

1. **Jede Integration hat Healthcheck + Retry + Dead-Letter-Queue.**
2. **Rate-Limits respektieren** (Exponential-Backoff).
3. **Webhook-Replay** für fehlgeschlagene Events (30 Tage).
4. **Kein Creds im Code** — Doppler/Vault.
5. **Sandbox + Production getrennt**; niemals Prod-Keys lokal.
6. **Feature-Flag** pro Integration (ein-/ausschaltbar pro Tenant).
