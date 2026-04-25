#!/usr/bin/env bash
# SALON OS — iMessage Listener
# Liest eingehende iMessages von Lorenc (IMESSAGE_TO) und schreibt sie in ANSWERS.md.
# Wird via LaunchAgent alle 60 s ausgeführt.
#
# Anforderung: Full-Disk-Access für /bin/bash oder das Terminal, das diesen Script startet.
#   System-Einst. → Datenschutz & Sicherheit → Festplattenvollzugriff → Terminal (+ bash falls einzeln)

set -euo pipefail

CONFIG="$HOME/.salon-os-monitor/config"
STATE_DIR="$HOME/.salon-os-monitor"
ROWID_FILE="$STATE_DIR/last-message-rowid"
DB="$HOME/Library/Messages/chat.db"
ANSWERS="$HOME/salon-os/ANSWERS.md"
DISPATCH="$HOME/salon-os/dispatch.sh"
LOG="$STATE_DIR/imessage-listener.log"

mkdir -p "$STATE_DIR"

log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" >> "$LOG"
}

# Config laden
if [[ ! -f "$CONFIG" ]]; then
  log "Config fehlt: $CONFIG"
  exit 0
fi

# shellcheck disable=SC1090
source "$CONFIG"

if [[ -z "${IMESSAGE_TO:-}" ]]; then
  log "IMESSAGE_TO nicht gesetzt"
  exit 0
fi

# Messages-DB prüfen
if [[ ! -r "$DB" ]]; then
  log "DB $DB nicht lesbar — Full Disk Access fehlt?"
  exit 0
fi

# Letzte verarbeitete ROWID laden
LAST_ROWID=$(cat "$ROWID_FILE" 2>/dev/null || echo 0)

# Beim ersten Lauf: setze auf aktuelle ROWID (keine Altlast-Nachrichten einspielen)
if [[ "$LAST_ROWID" == "0" ]]; then
  CURRENT_MAX=$(sqlite3 "$DB" "SELECT COALESCE(MAX(ROWID), 0) FROM message;" 2>/dev/null || echo 0)
  echo "$CURRENT_MAX" > "$ROWID_FILE"
  log "Ersteinrichtung: starte ab ROWID $CURRENT_MAX"
  exit 0
fi

# Neue Nachrichten abfragen: von IMESSAGE_TO (gesendet von eigener Apple-ID → is_from_me=1), nach LAST_ROWID
TMP=$(mktemp)
trap "rm -f $TMP" EXIT

# ASCII Unit-Separator (0x1F) als Feld-Trenner — kommt in Text nicht vor
SEP=$(printf '\x1f')

# WICHTIG: message.text ist auf modernem macOS/iOS oft NULL — der Body steckt in
# message.attributedBody als binäres NSAttributedString-typedstream-Blob. Ein
# naives COALESCE(text, attributedBody) liefert die Binärdaten roh als „Text"
# zurück und produziert das `streamtyped...NSAttributedString`-Müll-Echo.
# Lösung: Wenn text NULL ist, hex-encoden und in der Loop via Python-Helper
# decode-attributed-body.py extrahieren.
DECODER="$(dirname "$0")/decode-attributed-body.py"

if ! sqlite3 -separator "$SEP" "$DB" > "$TMP" 2>/dev/null <<EOF
SELECT message.ROWID,
       CASE
         WHEN message.text IS NOT NULL AND length(message.text) > 0
           THEN replace(message.text, X'0A', ' ')
         ELSE 'BLOB:' || hex(message.attributedBody)
       END
FROM message
JOIN handle ON message.handle_id = handle.ROWID
WHERE handle.id = '$IMESSAGE_TO'
  AND message.is_from_me = 1
  AND (message.text IS NOT NULL OR message.attributedBody IS NOT NULL)
  AND message.ROWID > $LAST_ROWID
ORDER BY message.ROWID;
EOF
then
  log "sqlite3 query failed"
  exit 0
fi

COUNT=0
HIGHEST="$LAST_ROWID"
COMBINED=""

while IFS="$SEP" read -r rowid text; do
  if [[ -z "$rowid" ]]; then continue; fi
  if [[ ! "$rowid" =~ ^[0-9]+$ ]]; then continue; fi
  if [[ -z "$text" ]]; then continue; fi

  # attributedBody-Blob via Python-Helper decoden
  if [[ "$text" == BLOB:* ]]; then
    HEX="${text#BLOB:}"
    if [[ -x "$DECODER" ]] || [[ -r "$DECODER" ]]; then
      decoded=$(python3 "$DECODER" "$HEX" 2>/dev/null || true)
    else
      decoded=""
      log "Decoder fehlt: $DECODER"
    fi
    if [[ -z "$decoded" ]]; then
      log "Konnte attributedBody (ROWID=$rowid) nicht decodieren — überspringe"
      HIGHEST="$rowid"  # trotzdem ROWID hochzählen, sonst Endlos-Schleife
      continue
    fi
    text="$decoded"
  fi

  # An ANSWERS.md anhängen
  {
    echo ""
    echo "## $(date '+%Y-%m-%d %H:%M') — via iMessage"
    echo "$text"
  } >> "$ANSWERS"

  COMBINED="$COMBINED
• $text"
  HIGHEST="$rowid"
  COUNT=$((COUNT + 1))
  log "Neue Antwort (ROWID=$rowid): $text"
done < "$TMP"

if [[ "$HIGHEST" -gt "$LAST_ROWID" ]]; then
  echo "$HIGHEST" > "$ROWID_FILE"

  if [[ "$COUNT" -gt 0 ]]; then
    # Dedup-key damit Bestätigungs-Push nicht wiederholt feuert
    ACK_TITLE="✅ Antwort erfasst"
    ACK_MSG="$COUNT Nachricht(en) an Claude Code weitergeleitet:$COMBINED"
    # Local notification ohne iMessage-Echo (würde sonst Schleife geben)
    osascript -e "display notification \"$ACK_MSG\" with title \"$ACK_TITLE\" sound name \"Glass\"" 2>/dev/null || true

    # Schreib zusätzlich einen Eintrag ins Dispatch-Log
    echo "" >> "$HOME/salon-os/DISPATCH.md" 2>/dev/null || true
    echo "## $(date '+%Y-%m-%d %H:%M') — ⬅️ Antwort von Lorenc erhalten" >> "$HOME/salon-os/DISPATCH.md" 2>/dev/null || true
    echo "$COMBINED" >> "$HOME/salon-os/DISPATCH.md" 2>/dev/null || true
  fi
fi
