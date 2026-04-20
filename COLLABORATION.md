# Collaboration Protocol — Lorenc × Cowork-Claude × Claude Code

> Wie Cowork-Claude (ich), Claude Code (in deinem Terminal) und Lorenc (du) zusammen bauen, ohne dass wir uns gegenseitig blockieren.

## Die drei Rollen

| Rolle              | Wo läuft es           | Verantwortung                                                        |
| ------------------ | --------------------- | -------------------------------------------------------------------- |
| **Lorenc**         | Desktop + iPhone      | Business-Entscheidungen, Design-Freigaben, Finale Checks             |
| **Claude Code**    | Terminal (`~/salon-os`) | Code schreiben, Tests laufen lassen, Git-Commits                     |
| **Cowork-Claude** | Cowork (geplante Aufgabe)      | Audit, Fortschritts-Report, Fragen bündeln, Dispatch an Lorenc       |

Wir kommunizieren über **Dateien** im Projekt — keine Race-Conditions, nachvollziehbar, auditierbar.

## Die 6 Collaboration-Dateien

Alle liegen im Repo-Root `~/salon-os/`. Claude Code muss sie aktiv pflegen.

### 1. `STATUS.md` — Fortschritt (Claude Code schreibt)

Wird **nach jedem Arbeits-Block** aktualisiert. Format:

```markdown
# Status — SALON OS

**Letzte Aktualisierung:** 2026-04-19 14:30
**Aktuelle Phase:** Phase 0 (Foundation)
**Fortschritt Phase:** 60 %

## In Arbeit
- [ ] WorkOS Auth-Integration (Web + Mobile)

## Fertig heute
- ✅ Monorepo-Setup (Turborepo + pnpm)
- ✅ Prisma-Schema erste Version
- ✅ CI/CD-Pipeline auf GitHub Actions

## Nächste Schritte
- Multi-Tenant-RLS-Policies
- Seed-Daten für Demo-Tenant
- Storybook für Design-System

## Metriken
- Tests: 42 passing / 0 failing
- Lighthouse Web: 98
- Bundle-Size Web: 142 KB (Budget: 200 KB)
- TypeScript-Errors: 0
- ESLint-Warnings: 3
```

### 2. `BLOCKERS.md` — Was hält mich auf (Claude Code schreibt)

```markdown
# Blockers

## 🔴 Kritisch (stoppen Fortschritt)

### BLK-001: WorkOS-API-Key fehlt
Brauche `WORKOS_API_KEY` + `WORKOS_CLIENT_ID` in `.env`.
→ Lorenc: Account auf workos.com erstellen, Keys in Doppler eintragen
**Blockiert seit:** 2026-04-19 11:20

## 🟡 Wichtig (verzögern)

### BLK-002: Stripe-Konto für Testing
Stripe-Test-Mode reicht vorerst, aber für Terminal-Tests brauche ich später Live-Account.
→ Lorenc: kann später, nicht dringend.

## 🟢 Gelöst
- ~~BLK-000: Git-Remote fehlte~~ (gelöst 14:22)
```

### 3. `QUESTIONS.md` — Business-Entscheidungen (Claude Code schreibt)

Nur Fragen, die **Lorenc entscheiden muss**. Keine Tech-Fragen (die entscheidet Claude Code selbst).

```markdown
# Open Questions

## Q-001: Währungsformat DE vs. international?
Ich baue gerade die Preis-Anzeige. Soll in DE "9,99 €" oder "€ 9,99" stehen?
→ Default: "9,99 €" (DE-Standard)
**Offen seit:** 2026-04-19
**Blockiert:** nein (Default verwendet, anpassbar)

## Q-002: Loyalty-Punkte 1€ = 10 Pkt oder 1€ = 1 Pkt?
Default bei Mangomint: 1€ = 10 Pkt. Bei Fresha: 1€ = 1 Pkt.
→ Vorschlag: 1€ = 10 Pkt (fühlt sich großzügiger an)
**Offen seit:** 2026-04-19

## ✅ Beantwortet
- ~~Q-000: Name der App — "SALON OS"~~ (bestätigt 2026-04-18)
```

### 4. `ANSWERS.md` — Lorencs Antworten (du schreibst)

Du antwortest hier. Claude Code liest es beim nächsten Start.

```markdown
# Answers from Lorenc

## Q-001: Währungsformat
Deutsche Locale, also "9,99 €". Für englisch "€9.99".

## Q-002: Loyalty
1€ = 10 Pkt, aber zeig den Wert in €: "100 Pkt = 10 €".
```

Wenn beantwortet, kommentiert Claude Code im `QUESTIONS.md` das Q als ✅.

### 5. `IDEAS.md` — Spontan-Ideen (alle schreiben)

Wenn Claude Code eine gute Idee hat, die nicht in den Specs steht → hier rein, **nicht einfach bauen**. Wenn Lorenc eine Idee hat → hier rein. Wenn Cowork-Claude bei der Recherche was findet → hier rein.

```markdown
# Ideas Backlog

## 💡 Smart-Mirror-In-Booking-Flow
Wenn Kunde gerade beim AR Try-On ist, sollte der Salon sehen können, was der Kunde sich anschaut → Stylist ist vorbereitet. (Claude Code, 2026-04-19)

## 💡 Voice-Booking per Siri-Shortcut
"Hey Siri, buche mir einen Haarschnitt bei Lisa nächste Woche" → via URL-Scheme. (Lorenc, 2026-04-18)

## 💡 Friseur-TikTok-Trend-Feed
Live-Feed von viralen Frisuren, die Kunden zeigen könnten → vereinfacht Service-Beratung. (Cowork, 2026-04-19)
```

Regelmäßig durchgehen, Ideen entweder priorisieren oder streichen.

### 6. `DISPATCH.md` — Was Cowork-Claude an Lorenc gemeldet hat (ich schreibe)

```markdown
# Dispatch Log

## 2026-04-19 09:00
**Status:** 🟢 Alles gut
- Phase 0 zu 60 % fertig
- Keine kritischen Blocker
- 2 neue Fragen in QUESTIONS.md (Q-001, Q-002)
- Nächster Check: morgen 9 Uhr

## 2026-04-18 18:30
**Status:** 🔴 Blocker
- BLK-001: WorkOS-API-Key fehlt seit 4 Stunden
- Push an Lorenc geschickt

## 2026-04-18 09:00
**Status:** 🟡 Warnung
- Claude Code hat 3 Features aus `differentiation.md` nicht umgesetzt wie spezifiziert
- Details siehe Audit-Bericht unten
...
```

## Der Tages-Zyklus

```
┌─────────────────────────────────────────────────────────┐
│ 09:00  Cowork-Claude (geplante Aufgabe) läuft           │
│         → Liest STATUS, BLOCKERS, QUESTIONS             │
│         → Prüft Git-Log, Tests, Build, Specs-Einhaltung │
│         → Schreibt Dispatch-Eintrag                     │
│         → Sendet Push: "Tages-Report + X Fragen"        │
├─────────────────────────────────────────────────────────┤
│ 09:05  Lorenc liest Push, öffnet Cowork                 │
│         → Sieht Report, beantwortet Fragen in ANSWERS   │
├─────────────────────────────────────────────────────────┤
│ Tag   Claude Code arbeitet, committet regelmäßig        │
│        → Aktualisiert STATUS.md alle 1-2 h              │
│        → Ergänzt BLOCKERS/QUESTIONS wenn nötig          │
│        → Bei kritischem Blocker: ruft Cowork-Claude     │
│          via File-Watch-Signal (BLOCKERS.md + 🔴)       │
├─────────────────────────────────────────────────────────┤
│ 18:00  Zweiter Check (optional, pro Lorencs Wunsch)     │
│         → Tages-Audit: Code-Diff-Review gegen Specs     │
│         → Push falls Qualitäts-Filter rot               │
└─────────────────────────────────────────────────────────┘
```

## Eskalations-Regeln (wann ich Lorenc sofort push-e, nicht erst morgens)

- 🔴 **Blocker > 2 Stunden ungelöst** → Push "Claude Code hängt seit 2 h"
- 🔴 **Tests seit 4 h rot** → Push "Build kaputt, bitte prüfen"
- 🔴 **Build-Fail in main** → Push "Main ist rot"
- 🔴 **Claude Code hat Spec-Verletzung begangen** (z. B. eigenes Payment-Modul gebaut) → Push "Spec-Verletzung gefunden"
- 🟡 **5+ ungelöste Questions** → Push "Claude Code wartet auf 5 Antworten"

## Regeln für Claude Code

1. **Nach JEDEM signifikanten Schritt:** `STATUS.md` aktualisieren.
2. **Wenn ich irgendwo warte:** SOFORT `BLOCKERS.md` schreiben, mit 🔴/🟡/🟢 und konkretem Request.
3. **Bei Business-Unsicherheit:** `QUESTIONS.md`, Default-Vorschlag dazu, notfalls Default verwenden, aber als "provisorisch" markieren.
4. **Neue Ideen:** `IDEAS.md`, nicht einfach bauen.
5. **Git:** Jeden Commit mit conventional format (`feat:`, `fix:`, etc.).
6. **`ANSWERS.md` prüfen:** jeden Session-Start. Beantwortete Qs in `QUESTIONS.md` markieren.

## Regeln für Cowork-Claude (ich)

1. **Jeden Tag 09:00 (und optional 18:00):** scheduled Check.
2. **Audit-Tiefe:** STATUS, BLOCKERS, QUESTIONS, Git-Log, Test-Status, Spec-Einhaltung, Design-Polish-Stichprobe.
3. **Dispatch:** macOS-Notification via `osascript` → spiegelt auf iPhone via iCloud.
4. **Wenn Lorenc in ANSWERS geantwortet hat:** bei nächstem Check Claude Code signalisieren.
5. **Proaktiv:** wenn ich beim Audit was Merkwürdiges finde (Spec-Verletzung, schlechter Code), sofort flaggen.

## Regeln für Lorenc (du)

1. **Morgens Push lesen** (< 2 Min Zeit): Status + offene Qs.
2. **`ANSWERS.md` pflegen:** Fragen beantworten, sobald du kannst.
3. **Bei Push "kritisch":** checken, entscheiden, oder Claude Code neu starten.
4. **Ideen immer in `IDEAS.md`** statt mündlich — so verlieren wir nichts.
5. **Wöchentlich** (z. B. sonntags): 10 Min Review über alles, was passiert ist. Ich schicke dir dafür einen Wochenreport.
