#!/usr/bin/env bash
# Dispatch-Script für SALON OS
# Sendet:
#   1. macOS-Notification (auf dem Mac sichtbar)
#   2. iMessage an sich selbst (wird automatisch auf iPhone + Mac angezeigt)
#
# Setup: iMessage-Adresse in ~/.salon-os-monitor/config eintragen:
#   echo 'IMESSAGE_TO="+41791234567"' > ~/.salon-os-monitor/config
#   oder mit E-Mail: echo 'IMESSAGE_TO="du@icloud.com"' > ~/.salon-os-monitor/config
#
# Usage:
#   ./dispatch.sh "Titel" "Nachricht"
#   ./dispatch.sh "Titel" "Nachricht" "urgent"     # mit Sound
#   ./dispatch.sh "Titel" "Nachricht" "urgent" "https://link"  # mit Link

set -euo pipefail

TITLE="${1:-SALON OS}"
MESSAGE="${2:-(keine Nachricht)}"
PRIORITY="${3:-normal}"
LINK="${4:-}"

# Config laden (falls vorhanden)
CONFIG_FILE="$HOME/.salon-os-monitor/config"
IMESSAGE_TO=""
if [[ -f "$CONFIG_FILE" ]]; then
  # shellcheck disable=SC1090
  source "$CONFIG_FILE"
fi

# Sound je nach Priorität
if [[ "$PRIORITY" == "urgent" ]]; then
  SOUND="Sosumi"
elif [[ "$PRIORITY" == "warning" ]]; then
  SOUND="Ping"
else
  SOUND="Glass"
fi

# terminal-notifier bevorzugen (schöner, klickbar), sonst osascript
if command -v terminal-notifier &>/dev/null; then
  if [[ -n "$LINK" ]]; then
    terminal-notifier -title "$TITLE" -message "$MESSAGE" -sound "$SOUND" -open "$LINK" -group "salon-os"
  else
    terminal-notifier -title "$TITLE" -message "$MESSAGE" -sound "$SOUND" -group "salon-os"
  fi
else
  # Fallback: native osascript
  osascript -e "display notification \"$MESSAGE\" with title \"$TITLE\" sound name \"$SOUND\""
fi

# iMessage an sich selbst senden (landet automatisch auf iPhone + Mac)
if [[ -n "$IMESSAGE_TO" ]]; then
  # Priority-Emoji vorn
  case "$PRIORITY" in
    urgent)  EMOJI="🔴" ;;
    warning) EMOJI="🟡" ;;
    *)       EMOJI="🟢" ;;
  esac

  IMSG_BODY="$EMOJI $TITLE
$MESSAGE"
  if [[ -n "$LINK" ]]; then
    IMSG_BODY="$IMSG_BODY

$LINK"
  fi

  # AppleScript muss escaped werden (Anführungszeichen + Zeilenumbrüche)
  ESCAPED_BODY=$(printf '%s' "$IMSG_BODY" | sed 's/"/\\"/g' | awk '{printf "%s\\n", $0}' | sed 's/\\n$//')

  osascript <<EOF 2>/dev/null || echo "⚠️  iMessage-Send fehlgeschlagen (Automation-Permission? Siehe Systemeinst. → Datenschutz → Automation)" >&2
tell application "Messages"
  set targetService to 1st service whose service type = iMessage
  set targetBuddy to buddy "$IMESSAGE_TO" of targetService
  send "$ESCAPED_BODY" to targetBuddy
end tell
EOF
fi

# Log-Eintrag
LOG_FILE="$HOME/salon-os/DISPATCH.md"
if [[ -f "$LOG_FILE" ]]; then
  echo "" >> "$LOG_FILE"
  echo "## $(date '+%Y-%m-%d %H:%M') — $TITLE" >> "$LOG_FILE"
  echo "$MESSAGE" >> "$LOG_FILE"
  if [[ -n "$LINK" ]]; then
    echo "Link: $LINK" >> "$LOG_FILE"
  fi
fi
