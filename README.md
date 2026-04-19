# SALON OS — The All-in-One Beauty Business Operating System

> Working codename: **SALON OS** (umbenennbar). Spätere Marken-Kandidaten im Abschnitt 22 der SPEC.md.

## Was ist das?

SALON OS ist eine komplette Neuentwicklung einer Salon-Management-Plattform, die **alle Features der 15 größten Wettbewerber vereint** (Phorest, Fresha, Treatwell, Booksy, Mangomint, Vagaro, GlossGenius, Boulevard, Zenoti, Timely, Square Appointments, Shore, Salonized, Mindbody, DaySmart) — plus einer nativen KI-Schicht, globaler Multi-Tenant-Architektur und einem eigenen Marktplatz.

Ziel: **Nr. 1 weltweit** für Nägel, Haar, Kosmetik, Spa, Barber, Medspa, Tattoo und Wellness.

## Was ist in diesem Paket enthalten?

| Datei                         | Zweck                                                                    |
| ----------------------------- | ------------------------------------------------------------------------ |
| `README.md`                   | Dieses Dokument — schnelle Übersicht                                     |
| `CLAUDE.md`                   | Einstiegspunkt für Claude Code (Arbeitsanweisungen, Reihenfolge)         |
| `SPEC.md`                     | **Master-Spezifikation** (Features, Module, UX-Prinzipien, Vision, GTM)  |
| `specs/competitive-analysis.md` | Feature-Matrix aller Wettbewerber + Lücken, die SALON OS schließt      |
| `specs/features.md`           | Exhaustive Liste aller Features gruppiert nach Modul                     |
| `specs/data-model.md`         | Datenbank-Schema (Postgres) mit allen Entitäten und Relationen           |
| `specs/api.md`                | Öffentliche + interne APIs (REST + GraphQL + Webhooks)                   |
| `specs/tech-stack.md`         | Architektur, Stack, Skalierung, Infrastruktur                            |
| `specs/ai-layer.md`           | KI-Features: Receptionist, Precision Scheduling, Dynamic Pricing, AR     |
| `specs/compliance.md`         | DSGVO, TSE, DSFinV-K, DATEV, PSD2, HIPAA, PCI-DSS, SOC2, 2FA             |
| `specs/integrations.md`       | Zahlungen, Buchhaltung, Social, Kalender, E-Mail, Telefonie, Zapier      |
| `specs/mobile-apps.md`        | iOS + Android Native + Branded Client Apps + Staff App                   |
| `specs/marketplace.md`        | Consumer-Marktplatz (wie Fresha/Treatwell/Booksy)                        |
| `specs/roadmap.md`            | Phasen, MVP (12 Wochen), V1 (6 Monate), V2 (12 Monate)                   |
| `specs/go-to-market.md`       | Pricing, Positionierung, Vertrieb, Content, Partnerprogramm              |
| `specs/glossary.md`           | Fachbegriffe Beauty-Industrie (backbar, booth rental, formula, etc.)     |

## Live gehen — Deploy

**Kürzeste Variante (Railway, ~10 Min):**
Komplette Schritt-für-Schritt-Anleitung: [`DEPLOY.md`](./DEPLOY.md).

Ein-Klick-Button (nach erstem Push auf GitHub einsetzbar):

[![Deploy on Railway](https://railway.com/button.svg)](https://railway.com/new)

Fly.io + Vercel Alternative ebenfalls in [`DEPLOY.md`](./DEPLOY.md).

## So startest du mit Claude Code

```bash
# 1. In den Projektordner wechseln
cd salon-os

# 2. Claude Code starten
claude

# 3. Claude Code lädt automatisch CLAUDE.md und SPEC.md und führt die
#    in CLAUDE.md beschriebene Build-Reihenfolge aus.
```

Claude Code soll mit dem **MVP (Phase 1, 12 Wochen)** starten, nicht sofort alles bauen. Siehe `specs/roadmap.md`.

## Nordstern („North-Star-Metric")

**Anzahl der abgeschlossenen Termine pro Salon pro Woche.** Alles, was diese Zahl hebt (schnellere Buchung, weniger No-Shows, bessere Gap-Füllung, mehr Rebooking, Marktplatz-Traffic), hat Priorität.
