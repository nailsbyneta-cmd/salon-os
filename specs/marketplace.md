# Consumer Marketplace

## Ziel

Ein Consumer-Zugang, der **Fresha, Treatwell und Booksy** vereint — aber fairer für Salons (10 % nur auf echte Neukunden statt 20 %) und technisch moderner.

## Oberflächen

- **Web:** `salon-os.com` (Top-Level-Domain oder `beauty.salon-os.com`, je nach Branding)
- **Mobile:** iOS + Android native Apps (siehe `specs/mobile-apps.md`)

## Funktionen

### Discovery

- Geo-basierte Suche (Geolocation + Postleitzahl + Stadt)
- Service-Filter (Haar, Nägel, Kosmetik, Spa, Barber, Tattoo, Massage …)
- Preisfilter, Verfügbarkeitsfilter („heute", „morgen", „diese Woche")
- Sortierung: Empfehlungen, Distanz, Preis, Bewertung
- Karte-Ansicht mit Pins
- „Jetzt verfügbar"-Modus (Walk-in-tauglich: Barber)

### Salon-Profil-Seite

- Fotos, Branding, Bewertungen, Team, Services, Preise
- Buchungs-Button (öffnet Buchungsflow direkt im Marktplatz)
- „Verfizierte Reviews"-Badge (nur Kunden mit echter Buchung)
- Social-Links
- AR Try-On wenn verfügbar
- Über uns, Öffnungszeiten, Anfahrt, Parken

### Buchungs-Flow

- Magic-Link-Buchung ohne Konto (optional Konto für Loyalty-Punkte)
- Multi-Service-Auswahl
- Gutschein-/Voucher-Eingabe
- Deposit/Vorauszahlung transparent
- Confirmation per E-Mail + SMS

### Wallet

- Kunde sammelt Credits salon-übergreifend (Plattform-Credit)
- Einlösbar bei allen teilnehmenden Salons
- Onboarding-Bonus: 5 € Credit für 1. Buchung

### Gift-Cards

- Salon-spezifische Gift-Cards
- Marketplace-Gift-Cards (bei jedem teilnehmenden Salon einlösbar)
- Versand digital (SMS, WhatsApp, E-Mail, iMessage Extension), Druck als Postkarte optional

### Boost (Bezahlte Sichtbarkeit)

- Inspiriert von **Booksy Boost**
- Salons können bestimmte Dienstleistungen oder Slots boosten
- CPA-Modell: 5 € pro verifiziertem Neukunden (einmalig)
- Transparente Metriken im Salon-Dashboard

## Ranking-Algorithmus

Scoring-Faktoren (gewichtet):

1. **Relevanz** (Service-Match, Zeit-Verfügbarkeit)
2. **Distanz** (Geolocation-Score)
3. **Bewertung** (Durchschnitt + Anzahl + Frische)
4. **Aktivität** (wie oft online buchbar, Antwortzeit des Salons)
5. **Boost** (bezahlt)
6. **Qualitäts-Signale:** vollständiges Profil, Fotos, Response-Rate, No-Show-Quote

**Wichtig:** Boost kann ein Salon **maximal 2 Plätze** nach oben pushen (Vertrauen der Nutzer nicht zerstören).

## Commerce-Modell

| Szenario                                      | Gebühr                                              |
| --------------------------------------------- | --------------------------------------------------- |
| Bestandskunde (kennt den Salon, bucht direkt) | 0 %                                                 |
| Neukunde über Marktplatz-Discovery            | 10 % einmalig auf 1. Buchung                        |
| Marktplatz-Boost                              | CPA 5 €/Neukunde                                    |
| Plattform-Gift-Card                           | 3 % Abwicklungsgebühr                               |
| Wallet-Credit-Einlösung                       | 0 % (wir tragen Credit-Kosten aus Marketing-Budget) |

## Trust & Safety

- Verifizierte Buchung → verifiziertes Review
- Fake-Review-Detection (ML-Filter, manuelle Review bei Alert)
- Identitätsprüfung für Salon-Owner (KYB via Stripe)
- Content-Moderation für Fotos (NSFW-Filter, AWS Rekognition)
- Streitfall-Schlichtungsprozess (24 h SLA für Antwort)

## SEO-Strategie

- Eine Seite pro Stadt pro Service: `/nagelstudio/berlin-prenzlauer-berg`
- Strukturierte Daten (Schema.org LocalBusiness + Service)
- Server-Side-Rendered (Next.js SSR + ISR)
- Lighthouse-Score ≥ 95
- Internationaler URL-Suffix (`/de-de/`, `/en-gb/`, `/es-es/`)

## Multi-Language

- 12 Sprachen zum Launch: DE, EN, ES, FR, IT, NL, PT, PL, CS, TR, AR, JA
- Automatische Übersetzung von Salon-Descriptions per KI (optional, vom Salon freigegeben)

## KPIs

- Monatliche Nutzer (Consumer)
- Buchungen über Marktplatz / Monat
- Neukunden-Conversion-Rate (Salon)
- NPS Consumer + NPS Salon
- Wallet-Aktivierungsrate
- Boost-ROAS
