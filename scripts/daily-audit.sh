#!/usr/bin/env bash
# Salon-OS Daily Security/Code Audit
#
# Läuft täglich auf Mac mini (via launchd com.lorenc.salon-os.daily-audit).
# Spawnt `claude -p` mit security-review skill auf den Salon-OS Repo.
# Postet Findings auf Telegram.
#
# Strategie: rotating focus — jeden Tag anderen Aspekt
#   Mo: security-review (Auth, tenant-isolation, secrets-leakage)
#   Di: clean-code review (function complexity, naming, dead code)
#   Mi: api-surface review (uncovered endpoints, error handling)
#   Do: db-migration safety (forward-only, no breaking changes)
#   Fr: ui-review (UI-Spec compliance, a11y)
#   Sa: skip
#   So: full /gsd-audit-fix run (deeper, alle drei)
#
# Output: TG-Ping mit Top-3 Findings + Pfad zum Full-Report.

set -e

REPO="$HOME/salon-os"
TG="$HOME/.local/bin/tg"
REPORT_DIR="$REPO/.audits"
DATE=$(date +%Y-%m-%d)
DOW=$(date +%u)  # 1=Mo, 7=So

mkdir -p "$REPORT_DIR"

case "$DOW" in
  1) FOCUS="security-review"; PROMPT="Run /security-review on the salon-os repo. Report top 3 issues with severity and one-line fix suggestion." ;;
  2) FOCUS="clean-code";       PROMPT="Use the clean-code skill to review salon-os/apps/api for code quality. Report top 3 issues." ;;
  3) FOCUS="api-surface";       PROMPT="Audit salon-os/apps/api endpoints. List endpoints without auth checks, without input validation, or without rate-limiting. Top 5." ;;
  4) FOCUS="db-migrations";     PROMPT="Review last 5 migrations in salon-os. Any breaking-changes? Anything that could fail under concurrent writes? Top 3." ;;
  5) FOCUS="ui-review";         PROMPT="Use /gsd-ui-review on salon-os admin SPA. Report top 3 visual/usability issues." ;;
  6) echo "Saturday — skip"; exit 0 ;;
  7) FOCUS="full-audit";        PROMPT="Run /gsd-audit-fix dry-run on salon-os. Report total issue count by severity. DO NOT auto-fix — only report." ;;
esac

REPORT="$REPORT_DIR/$DATE-$FOCUS.md"

cd "$REPO"
echo "=== Daily Audit: $DATE — $FOCUS ===" > "$REPORT"

# Claude Code mit security-review/clean-code skill
# --dangerously-skip-permissions: nicht-interaktiv, alle tools ok
# Output kappen damit TG nicht bersten
TIMEOUT_SEC=900
RESULT=$(timeout $TIMEOUT_SEC claude --dangerously-skip-permissions -p "$PROMPT" 2>&1 | tail -100 || echo "Audit timed out nach ${TIMEOUT_SEC}s")
echo "$RESULT" >> "$REPORT"

# Top-3-Findings extrahieren (heuristisch — sucht nach Severity-Worten)
TOP=$(echo "$RESULT" | grep -iE "^(high|critical|medium|low|severity:|issue [0-9]|[0-9]\.)" | head -8 | head -c 1500)

if [ -x "$TG" ]; then
  if [ -n "$TOP" ]; then
    "$TG" "🔍 *Salon-OS Daily Audit ($FOCUS)*

$TOP

📄 Full report: \`~/salon-os/.audits/$DATE-$FOCUS.md\`"
  else
    "$TG" "✅ *Salon-OS Daily Audit ($FOCUS)*

Keine kritischen Findings.
📄 Report: \`~/salon-os/.audits/$DATE-$FOCUS.md\`"
  fi
fi
