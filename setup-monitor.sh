#!/usr/bin/env bash
# SALON OS — One-Shot-Monitor-Installer
# Führt aus: chmod +x, terminal-notifier Check, LaunchAgent installieren, Test-Notification
#
# Usage:
#   bash setup-monitor.sh

set -euo pipefail

REPO="$HOME/salon-os"
PLIST_SRC="$REPO/com.lorenc.salon-os.monitor.plist"
PLIST_DST="$HOME/Library/LaunchAgents/com.lorenc.salon-os.monitor.plist"

echo "🛠  SALON OS Monitor-Setup"
echo ""

# ————————————————————————————————————————————————
# 1. Repo prüfen
# ————————————————————————————————————————————————
if [[ ! -d "$REPO" ]]; then
  echo "❌ $REPO nicht gefunden. Hast du die Dateien dorthin kopiert?"
  exit 1
fi

if [[ ! -f "$REPO/monitor.sh" || ! -f "$REPO/dispatch.sh" || ! -f "$PLIST_SRC" ]]; then
  echo "❌ monitor.sh, dispatch.sh oder plist fehlt in $REPO"
  exit 1
fi

echo "✅ Repo-Dateien vorhanden"

# ————————————————————————————————————————————————
# 2. Ausführbar machen
# ————————————————————————————————————————————————
chmod +x "$REPO/monitor.sh" "$REPO/dispatch.sh"
echo "✅ Scripts ausführbar"

# ————————————————————————————————————————————————
# 3. terminal-notifier installieren (schöner als osascript)
# ————————————————————————————————————————————————
if ! command -v terminal-notifier &>/dev/null; then
  if command -v brew &>/dev/null; then
    echo "📦 Installiere terminal-notifier via Homebrew..."
    brew install terminal-notifier
    echo "✅ terminal-notifier installiert"
  else
    echo "⚠️  Homebrew nicht gefunden — fallback auf osascript (funktioniert, aber Notifications sind weniger hübsch)"
  fi
else
  echo "✅ terminal-notifier bereits da"
fi

# ————————————————————————————————————————————————
# 4. LaunchAgent installieren
# ————————————————————————————————————————————————
mkdir -p "$HOME/Library/LaunchAgents"

# Alten Agent stoppen falls da
if launchctl list | grep -q "com.lorenc.salon-os.monitor"; then
  launchctl unload "$PLIST_DST" 2>/dev/null || true
fi

cp "$PLIST_SRC" "$PLIST_DST"
launchctl load "$PLIST_DST"

echo "✅ LaunchAgent installiert + gestartet (läuft alle 30 min)"

# ————————————————————————————————————————————————
# 5. Erste Test-Notification
# ————————————————————————————————————————————————
echo ""
echo "🔔 Teste Notification..."
"$REPO/dispatch.sh" "SALON OS ready" "Monitor läuft. Du bekommst Pushes bei Blocker, Fragen oder Stillstand. Check dein iPhone — sollte auch da ankommen, wenn iCloud-Notification-Sync aktiv ist." "normal"

echo ""
echo "📱 iPhone-Sync prüfen:"
echo "   macOS: Einstellungen → Benachrichtigungen → Scroll runter → "
echo "          'Auf iPhone von macOS zeigen' aktivieren"
echo "   iPhone: Einstellungen → Mitteilungen → Auf Mac-Mitteilungen vom iPhone überprüfen"
echo ""
echo "🎯 Manueller Test: bash $REPO/monitor.sh"
echo "🛑 Monitor stoppen: launchctl unload $PLIST_DST"
echo "▶️  Monitor starten: launchctl load $PLIST_DST"
echo "📄 Logs: tail -f $HOME/.salon-os-monitor/monitor.log"
echo ""
echo "✅ Setup fertig."
