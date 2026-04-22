# Monitoring & Dispatch Setup

So richtest du die **automatische Überwachung** ein. Nach dem Setup läuft alle 30 min ein lokaler Monitor, der dich bei Blockern, offenen Fragen, Stillstand oder Spec-Verletzungen auf Mac + iPhone pingt.

## Architektur

```
┌────────────────────────────────┐
│  Claude Code (Terminal)        │  schreibt in:
│  in ~/salon-os/                │  → STATUS.md, BLOCKERS.md, QUESTIONS.md
└────────────────┬───────────────┘
                 │
                 ▼
┌────────────────────────────────┐
│  monitor.sh (alle 30 min       │  liest die Files, prüft:
│  via launchd LaunchAgent)      │  → kritische Blocker > 2h
│                                │  → offene Fragen ≥ 3
└────────────────┬───────────────┘  → Commits-Frequenz
                 │                   → morgens 09:00 Tages-Report
                 ▼
┌────────────────────────────────┐
│  dispatch.sh                   │
│  → macOS-Notification          │
│  → landet auf iPhone via       │  Apple-ID-Notification-Sync
│    Continuity                  │
└────────────────────────────────┘

┌────────────────────────────────┐
│  Cowork-Claude (ich)           │  On-Demand: Deep-Audit
│                                │  → Specs-Einhaltung
│                                │  → Design-Polish-Stichprobe
│                                │  → Code-Qualitäts-Review
└────────────────────────────────┘
```

## Was lokal installiert wird

| Datei                                                      | Zweck                                   |
| ---------------------------------------------------------- | --------------------------------------- |
| `~/salon-os/monitor.sh`                                    | Prüft Projekt-Status, triggert Dispatch |
| `~/salon-os/dispatch.sh`                                   | Sendet macOS-Notification               |
| `~/Library/LaunchAgents/com.lorenc.salon-os.monitor.plist` | Startet monitor.sh alle 30 min          |
| `~/.salon-os-monitor/` (auto-created)                      | Logs + Dedup-State                      |

## Setup in 3 Schritten

### 1. Alle neuen Dateien nach `~/salon-os/` kopieren

```bash
cp "/Users/lorencukgjini/Library/Application Support/Claude/local-agent-mode-sessions/ba2dfc7f-287e-4bbb-85bf-68137a2f452a/93ee7166-ec83-4e58-865e-7677734978c3/local_d3fe608b-b5e7-47a2-ac9a-5aa8455142e4/outputs/dispatch.sh" \
   "/Users/lorencukgjini/Library/Application Support/Claude/local-agent-mode-sessions/ba2dfc7f-287e-4bbb-85bf-68137a2f452a/93ee7166-ec83-4e58-865e-7677734978c3/local_d3fe608b-b5e7-47a2-ac9a-5aa8455142e4/outputs/monitor.sh" \
   "/Users/lorencukgjini/Library/Application Support/Claude/local-agent-mode-sessions/ba2dfc7f-287e-4bbb-85bf-68137a2f452a/93ee7166-ec83-4e58-865e-7677734978c3/local_d3fe608b-b5e7-47a2-ac9a-5aa8455142e4/outputs/com.lorenc.salon-os.monitor.plist" \
   "/Users/lorencukgjini/Library/Application Support/Claude/local-agent-mode-sessions/ba2dfc7f-287e-4bbb-85bf-68137a2f452a/93ee7166-ec83-4e58-865e-7677734978c3/local_d3fe608b-b5e7-47a2-ac9a-5aa8455142e4/outputs/setup-monitor.sh" \
   "/Users/lorencukgjini/Library/Application Support/Claude/local-agent-mode-sessions/ba2dfc7f-287e-4bbb-85bf-68137a2f452a/93ee7166-ec83-4e58-865e-7677734978c3/local_d3fe608b-b5e7-47a2-ac9a-5aa8455142e4/outputs/COLLABORATION.md" \
   ~/salon-os/
```

### 2. Installer ausführen

```bash
cd ~/salon-os && bash setup-monitor.sh
```

Du solltest bekommen:

- Eine Test-Notification "SALON OS ready" auf deinem Mac (und iPhone, wenn iCloud-Sync an)
- `✅ Setup fertig.` am Ende

### 3. iPhone-Push aktivieren (einmalig)

**Auf dem Mac:**

- Systemeinstellungen → Benachrichtigungen → ganz nach unten scrollen
- "Benachrichtigungen auf iPhone von Mac erlauben" → **AN**

**Auf dem iPhone:**

- Einstellungen → Allgemein → AirPlay & Handoff → "Continuity-Benachrichtigungen" → **AN**
- Einstellungen → Mitteilungen → Skripteditor (osascript-Quelle) + Terminal-Notifier → alle Mitteilungsoptionen AN

Teste jetzt manuell:

```bash
bash ~/salon-os/dispatch.sh "Test" "Sollte auf Mac + iPhone ankommen" "normal"
```

## Was Claude Code tun muss (neue Regeln)

Ich baue das in den erweiterten Prompt ein — aber hier die Kurzfassung.

Claude Code MUSS nach jedem Arbeits-Block:

```bash
# Am Anfang jeder Session
cat ANSWERS.md  # neue Antworten von Lorenc einarbeiten

# Während der Arbeit — nach jedem Feature/Modul
vim STATUS.md   # fortlaufend aktualisieren

# Bei Hindernis
vim BLOCKERS.md  # mit 🔴/🟡, konkreter Request

# Bei Business-Frage
vim QUESTIONS.md  # mit Default-Vorschlag
```

Der Monitor liest diese Files automatisch.

## Alerts, die du bekommst

| Trigger                                   | Notification                                   | Priorität |
| ----------------------------------------- | ---------------------------------------------- | --------- |
| 🔴 Blocker > 2 h offen                    | "Claude Code hängt — kritischer Blocker"       | URGENT    |
| ≥ 3 offene Fragen                         | "Claude Code wartet auf X Antworten"           | Normal    |
| Kein Commit seit 6 h (während Bürozeiten) | "Stillstand — hängt Claude Code?"              | Warning   |
| CI-Status rot                             | "Build kaputt"                                 | URGENT    |
| Morgens 09:00 täglich                     | "Morning-Report: Phase X, Y Fragen, Z Blocker" | Normal    |

## Manuelle Befehle

```bash
# Monitor jetzt laufen lassen
bash ~/salon-os/monitor.sh

# Test-Dispatch
~/salon-os/dispatch.sh "Test" "Hallo Welt" "normal"

# Monitor-Log live
tail -f ~/.salon-os-monitor/monitor.log

# Monitor stoppen
launchctl unload ~/Library/LaunchAgents/com.lorenc.salon-os.monitor.plist

# Monitor starten
launchctl load ~/Library/LaunchAgents/com.lorenc.salon-os.monitor.plist

# Status des Monitors prüfen
launchctl list | grep salon-os
```

## Tiefen-Audit via Cowork (mich)

Der lokale Monitor prüft nur **State-Files**. Für **Deep-Audits** (Spec-Einhaltung, Design-Polish, Code-Qualität) sag mir in Cowork:

> Mach einen Deep-Audit von `~/salon-os`. Vergleiche den Code gegen `specs/design-system.md`, `specs/differentiation.md` und `specs/feature-completeness.md`. Liefere ehrlichen Bericht.

Ich prüfe dann stichprobenartig deinen Code und sag dir, ob Claude Code wirklich den Specs folgt oder nur 0815 baut.

## Troubleshooting

**Ich bekomme keine Notifications:**

- Mac: Einstellungen → Benachrichtigungen → Skripteditor + terminal-notifier → alle an
- Teste: `osascript -e 'display notification "test"'`
- Wenn das klappt, aber vom Monitor nichts kommt: Log prüfen `cat /tmp/salon-os-monitor.err`

**iPhone kriegt nichts trotz Continuity:**

- iPhone + Mac gleichgesetzt? → `System Settings → Apple ID → alle Geräte derselben ID`
- iCloud-Schlüsselbund aktiviert auf beiden?
- Bluetooth + WLAN an auf beiden Geräten?

**Monitor läuft nicht:**

- `launchctl list | grep salon-os` — wenn kein Output: `launchctl load ~/Library/LaunchAgents/com.lorenc.salon-os.monitor.plist`
- Logs: `cat /tmp/salon-os-monitor.log /tmp/salon-os-monitor.err`

## Warum lokal, nicht via Cowork?

Der Monitor muss zuverlässig laufen, auch wenn du Cowork geschlossen hast. Lokaler LaunchAgent = keine Cloud-Abhängigkeit, keine Latenz, einfache Installation. Mein Cowork-Check nutze ich für tiefere Audits, die mehr Intelligenz brauchen — nicht für simples File-Polling.
