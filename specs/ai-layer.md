# AI Layer — Native, nicht aufgeschraubt

## Leitlinie

AI ist ein **Modul** im Sinne unserer Architektur und **nicht** ein GPT-Wrapper-Feature. Es hat eine eigene Abstraktion (`packages/ai`), eigene Evals, eigene Observability und ein eigenes Budget.

## 5 KI-Produktlinien

1. **AI Receptionist** — 24/7 Anrufe + SMS + Web-Chat + WhatsApp (Booking, Rebooking, FAQ, Handoff)
2. **Precision Scheduling** — optimale Slot-Platzierung, Gap-Filling, Auto-Routing
3. **AI Analyst** — Natural-Language-Reporting (wie GlossGenius AI Analyst, aber tiefer)
4. **Dynamic Pricing** — KI-gestützte Preisempfehlungen (Peak/Off-Peak)
5. **AR Try-On** — Haarfarbe / Makeup / Nail-Art virtuell (Perfect Corp / ModiFace)

## 1. AI Receptionist

### Funktion
Ein Agent, der 24/7 verfügbar ist und Kunden über alle Kanäle betreut.

### Kanäle
- **Voice** (eingehende + ausgehende Anrufe) via **Vapi** oder **Retell** + **Twilio Voice**
- **SMS** (2-Way) via Twilio
- **Web-Chat** (Widget auf Branded-Seite)
- **WhatsApp** via Meta Business API
- **Instagram-DM + Facebook Messenger** via Meta Graph API
- **Apple Business Chat** (USA)

### Fähigkeiten

```
[Hauptfähigkeiten]
- Termin buchen, umbuchen, absagen
- Verfügbarkeit live prüfen (gegen Kalender)
- Preise, Öffnungszeiten, Adresse, Parken, WLAN, Barrierefreiheit auskunfterzeugen
- Stylisten-Empfehlungen basierend auf Historie
- Gift-Card-Verkauf per Telefon
- Offene Rechnung erinnern
- Warteliste einpflegen
- Notfall-Priorisierung (z. B. Braut, Kunde mit Termin in 2 h)
- Eskalation zu Mensch (telefonisch / Callback-Button)
```

### Technik

```
┌────────────────┐          ┌────────────────┐       ┌───────────────┐
│ Inbound Call   │  → STT → │ Agent-Planner  │ → API │ Salon-OS Core │
│ (Twilio Voice) │          │ (LLM: GPT-4o)  │       │ (booking etc.)│
└────────────────┘          │  + Memory      │       └───────────────┘
         ↑                  │  + Tool-Calls  │             │
         │         TTS      │  + Guardrails  │ ← result ←  ┘
         └──────────────────┤ (ElevenLabs)   │
                            └────────────────┘
```

### Prompt-Architektur
- **System-Prompt** je Tenant: Ton, Corporate Voice, Do/Don’t-Regeln, Policies
- **RAG-Kontext:** Service-Katalog, FAQs, Öffnungszeiten, Stylist-Bio, Promos (via pgvector)
- **Tools:** Kalender-API (read + book), Preislisten-API, CRM (read)
- **Guardrails:** Ausschluss von medizinischer Beratung, keine Preiszusagen außerhalb Prisliste, keine Personendatenweitergabe

### Eval & Safety
- Gold-Set: 200 typische Anruf-Transkripte + erwartete Aktionen
- Automatische Eval bei jedem Model-/Prompt-Deploy (LangSmith)
- Human-in-the-Loop-Sampling: 5 % der Calls gehen in Review-Queue
- Notfall-Fallback: alle Anrufe → Menschliches Callback bei Fehler (Sicherheitsnetz)

### Privatsphäre
- Call-Recording nur mit Consent („Dieses Gespräch wird aufgezeichnet …") — gesetzlich konform je Region
- PII-Redaction in Transcripts (Namen, Nummern — auto-pseudonymisiert in Logs)
- Aufbewahrung 30 Tage Standard, konfigurierbar

### Preismodell
- Inkludiert in Business-Plan aufwärts; Starter/Pro als Add-on für 49 €/Monat
- Pro gelungener Buchung → keine Zusatzkosten. Faire Policy gegenüber Zenoti/Agentz.

## 2. Precision Scheduling

### Funktion
Beim Buchen oder manuellen Eintragen schlägt die KI den **besten** Slot vor (nicht den ersten freien).

### Faktoren
- Service-Dauer inkl. Buffer
- Stylist-spezifische Geschwindigkeit (aus Historie)
- Reinigungszeit pro Service-Kombination
- Laufwege Stylist → Raum → Wartebereich
- Lücken-Minimierung (prüft: würde der Slot eine ungenutzte Lücke erzeugen?)
- Rebook-Wahrscheinlichkeit des Kunden (bevorzuge „treue Zeiten")
- Marketing-Priorität (z. B. bewusst kleine Lücken für Walk-ins)

### Algorithmus (Skizze)
Constraint-Satisfaction + Scoring:
1. Kandidaten generieren (alle freien Slots im Ziel-Zeitraum × gültige Stylists × Räume).
2. Jeden Kandidaten scoren (gewichtete Summe: Fit-Client × Fit-Stylist × Gap-Cost × Preference-Match).
3. Top 5 zurückgeben, UI zeigt „Empfohlen" bei Top 1.

Später: RL-Ansatz mit Trial-Optimierung pro Salon.

## 3. AI Analyst

### Funktion
Chat-Interface, das natürliche Fragen auf Reporting-Daten beantwortet.

### Beispiele
- „Wer waren meine Top-5-Kunden letzten Monat nach Umsatz?"
- „Welche Dienstleistung ist am Mittwoch nachmittags unterbucht?"
- „Vergleiche Umsatz Stylist Lena vs. Oktober 2025."
- „Welche Kunden haben zuletzt 3 Monate keinen Termin gehabt?"

### Technik
- Text-to-SQL (Postgres, read-only replica) mit Schema-Schema-Guard
- Guardrails: nur Read, Tenant-isoliert (RLS erzwungen), Timeout 5 s, Top-100-Zeilen max.
- LLM generiert SQL → Security-Filter prüft → Ausführen → LLM formatiert Antwort mit Chart-Empfehlung
- UI: Text + Chart (Recharts) + „SQL anzeigen"-Toggle
- Embedding-basierte Suche über vorgebaute Charts ("Falls deine Frage ähnlich ist zu…")

## 4. Dynamic Pricing

### Funktion
Vorschläge für Off-Peak-Discounts und Peak-Premiums.

### Beispiele
- Dienstag 10–14 Uhr → −15 % Rabatt auf Haarwäsche+Schnitt (füllt die ruhigste Zeit)
- Samstag 16–19 Uhr → +10 % Aufpreis auf alles (hochpreisige Nachfrage)

### Regeln
- **Opt-in pro Salon.** Default aus.
- Salon kann max./min. Preise, Dienstleistungen und Zeiten begrenzen.
- Transparenz: Kunde sieht immer den klaren Preis, keine Verschleierung.
- **Verbot in Medspa-Kontext** (medizinische Dienstleistungen mit festen Gebühren).

## 5. AR Try-On

### Funktion
- Vor der Buchung kann Kunde Haarfarbe/Makeup/Nail-Art virtuell über Selfie anwenden.
- Integration: **Perfect Corp YouCam** oder **ModiFace** (L’Oréal) SDK.
- Funktioniert in Branded App + Marktplatz.

### UX
- In der App oder im Web: „Probier diesen Look aus" → Kamera → overlay → Screenshot teilen.
- Speichert Look im Client-Profil → Stylist sieht Referenz im Termin.

## Orchestrierung & Observability

- Alle AI-Calls gehen über einen **`aiClient`**-Proxy mit:
  - Provider-Adapter (OpenAI, Anthropic, Fallback-Logik)
  - Caching (Deterministische Prompts, z. B. System-Prompt-Teile)
  - Kosten-Telemetrie pro Tenant + Budget-Limit
  - LangSmith-Traces
  - Redaction (PII → Placeholder bevor an externe LLM)
- Pro Tenant konfigurierbar: Kosten-Limit/Monat, Kanäle erlaubt, Sprache, Tonalität.

## Sicherheits- und Compliance-Kapitel

- **Prompt-Injection-Abwehr:** System-Prompt + Input-Separator + Signatur-Tokens.
- **DSGVO:** Verarbeitungsverzeichnis, AVV mit OpenAI/Anthropic (BAA wenn HIPAA-Tenant).
- **Transparency:** Der Agent sagt am Telefon „Ich bin ein KI-Assistent, soll ich Sie zu einem Menschen durchstellen?"
- **Fair-Use:** Nicht-Englisch-/DE-Sprachen eingeschaltet mit gutem Training (ElevenLabs Multilingual, OpenAI Multilingual).
- **Opt-out:** Kunde kann jederzeit „Nur menschlicher Kontakt" in seinen Profilpräferenzen wählen.
