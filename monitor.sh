#!/usr/bin/env bash

# Disabled by Cowork 2026-04-25 — too noisy iMessages.
# Restore: copy from .bak file
exit 0

# SALON OS — Local Monitor
# Läuft alle 30 Minuten (via LaunchAgent), prüft Projekt-Status und pingt Lorenc bei Bedarf.
#
# Was es prüft:
#  - BLOCKERS.md → rote Blocker > 2h alt → sofort Push
#  - QUESTIONS.md → offene Fragen ≥ 5 → Push
#  - Git-Aktivität → kein Commit seit 4 h → sanfter Push ("hängt Claude Code?")
#  - Build-/Test-Status → wenn CI rot → Push
#  - Morgens 09:00: Tages-Übersicht egal ob ruhig oder laut

set -euo pipefail

REPO="$HOME/salon-os"
STATE_DIR="$HOME/.salon-os-monitor"
LOG="$STATE_DIR/monitor.log"
LAST_DISPATCH_FILE="$STATE_DIR/last-dispatch"
DISPATCH="$REPO/dispatch.sh"

mkdir -p "$STATE_DIR"
touch "$LAST_DISPATCH_FILE"

log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" >> "$LOG"
}

notify() {
  # Args: title, message, priority, dedup-key
  local title="$1"
  local msg="$2"
  local pri="${3:-normal}"
  local key="${4:-}"

  # Dedup: denselben Alert nicht mehrfach/Stunde feuern
  if [[ -n "$key" ]]; then
    local last_time
    last_time=$(grep "^$key:" "$LAST_DISPATCH_FILE" 2>/dev/null | cut -d: -f2 || echo 0)
    local now
    now=$(date +%s)
    local diff=$((now - last_time))
    if [[ "$diff" -lt 3600 ]]; then
      log "Skip dedup key=$key (last ${diff}s ago)"
      return 0
    fi
    sed -i '' "/^$key:/d" "$LAST_DISPATCH_FILE" 2>/dev/null || true
    echo "$key:$now" >> "$LAST_DISPATCH_FILE"
  fi

  if [[ -x "$DISPATCH" ]]; then
    "$DISPATCH" "$title" "$msg" "$pri" || true
  else
    osascript -e "display notification \"$msg\" with title \"$title\""
  fi
  log "Dispatched: [$pri] $title — $msg"
}

# ————————————————————————————————————————————————
# 1. Repo existiert?
# ————————————————————————————————————————————————
if [[ ! -d "$REPO" ]]; then
  log "Repo $REPO fehlt — skipping"
  exit 0
fi

cd "$REPO"

# ————————————————————————————————————————————————
# 2. Kritische Blocker (🔴)
# ————————————————————————————————————————————————
if [[ -f "BLOCKERS.md" ]]; then
  CRIT_COUNT=$(grep -c "^### BLK-.*🔴" BLOCKERS.md 2>/dev/null || echo 0)
  CRIT_COUNT=$(echo "$CRIT_COUNT" | tr -d '[:space:]')

  if [[ "$CRIT_COUNT" -gt 0 ]]; then
    # Prüfe, ob Blocker > 2h alt ist (via "Blockiert seit")
    OLD_BLOCKER=$(awk '/🔴/,/---/' BLOCKERS.md | grep -A 2 "Blockiert seit" | head -1 || true)
    notify "SALON OS — 🔴 Blocker" \
      "$CRIT_COUNT kritische Blocker offen. Claude Code kann nicht weiter." \
      "urgent" \
      "critical-blocker"
  fi
fi

# ————————————————————————————————————————————————
# 3. Offene Fragen (≥ 3 triggern)
# ————————————————————————————————————————————————
if [[ -f "QUESTIONS.md" ]]; then
  OPEN_Q=$(grep -c "^## Q-" QUESTIONS.md 2>/dev/null || echo 0)
  ANSWERED_Q=$(grep -c "✅" QUESTIONS.md 2>/dev/null || echo 0)
  OPEN_Q=$(echo "$OPEN_Q" | tr -d '[:space:]')
  ANSWERED_Q=$(echo "$ANSWERED_Q" | tr -d '[:space:]')
  PENDING=$((OPEN_Q - ANSWERED_Q))

  if [[ "$PENDING" -ge 3 ]]; then
    notify "SALON OS — Fragen warten" \
      "$PENDING Fragen von Claude Code. Check QUESTIONS.md und antworte in ANSWERS.md." \
      "normal" \
      "pending-questions-$PENDING"
  fi
fi

# ————————————————————————————————————————————————
# 4. Git-Aktivität prüfen (hängt Claude Code?)
# ————————————————————————————————————————————————
if git rev-parse --git-dir > /dev/null 2>&1; then
  LAST_COMMIT_TIME=$(git log -1 --format=%ct 2>/dev/null || echo 0)
  NOW=$(date +%s)
  HOURS_SINCE=$(( (NOW - LAST_COMMIT_TIME) / 3600 ))

  # Nur während Arbeitszeiten warnen (8-22 Uhr)
  HOUR=$(date +%H)
  if [[ "$HOUR" -ge 8 && "$HOUR" -le 22 ]]; then
    if [[ "$HOURS_SINCE" -ge 6 ]]; then
      notify "SALON OS — Stillstand?" \
        "Letzter Commit vor ${HOURS_SINCE} h. Hängt Claude Code? Check STATUS.md." \
        "warning" \
        "stale-${HOURS_SINCE}h"
    fi
  fi
fi

# ————————————————————————————————————————————————
# 5. Build-/Test-Status (wenn CI-Status-File existiert)
# ————————————————————————————————————————————————
if [[ -f ".ci-status" ]]; then
  CI_STATUS=$(cat .ci-status)
  if [[ "$CI_STATUS" == "red" ]]; then
    notify "SALON OS — Build rot" \
      "CI ist rot. Details in STATUS.md." \
      "urgent" \
      "ci-red"
  fi
fi

# ————————————————————————————————————————————————
# 6. Morgens 09:00 — Tages-Übersicht (auch wenn ruhig)
# ————————————————————————————————————————————————
HOUR=$(date +%H)
MINUTE=$(date +%M)
TODAY=$(date +%Y-%m-%d)
MORNING_SENT_FILE="$STATE_DIR/morning-$TODAY"

if [[ "$HOUR" == "09" && "$MINUTE" -lt "30" && ! -f "$MORNING_SENT_FILE" ]]; then
  PHASE="unknown"
  if [[ -f "STATUS.md" ]]; then
    PHASE=$(grep "Aktuelle Phase" STATUS.md | head -1 | sed 's/.*: //' || echo "unknown")
  fi
  SUMMARY="Phase: $PHASE. Offen: $PENDING Fragen, $CRIT_COUNT Blocker."
  notify "SALON OS — Morning-Report" "$SUMMARY" "normal" "morning-$TODAY"
  touch "$MORNING_SENT_FILE"
fi

log "Monitor-Lauf fertig."
