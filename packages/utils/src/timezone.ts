/**
 * Zeitzone-Helper. MVP-Scope: Europe/Zurich + andere IANA-Zonen ohne
 * extra Lib. Wir bauen ISO-Strings mit korrektem DST-Offset für Salon-
 * Zeiten (`YYYY-MM-DDTHH:mm:ss+OFFSET`), damit die API den gleichen
 * Zeitpunkt interpretiert wie die Kundin gemeint hat.
 */

/**
 * Liefert den UTC-Offset einer IANA-Zone zum gegebenen Zeitpunkt im
 * Format `+HH:MM` / `-HH:MM`. Nutzt `Intl.DateTimeFormat` mit
 * `timeZoneName: 'longOffset'`, damit DST automatisch berücksichtigt
 * wird.
 */
export function zoneOffsetAt(date: Date, timeZone = 'Europe/Zurich'): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    timeZoneName: 'longOffset',
  }).formatToParts(date);
  const tzName = parts.find((p) => p.type === 'timeZoneName')?.value ?? 'GMT+00:00';
  // tzName: "GMT", "GMT+02:00", "GMT-05:30"
  const match = tzName.match(/GMT([+-]\d{2}:\d{2})?/);
  return match?.[1] ?? '+00:00';
}

/**
 * Kombiniert lokales Datum + Zeit (`YYYY-MM-DD`, `HH:mm`) zu einem
 * ISO-String mit dem Offset der angegebenen Zone.
 * Beispiel: `toLocalIso('2026-04-20', '10:00', 'Europe/Zurich')` →
 * `'2026-04-20T10:00:00+02:00'` im Sommer, `'+01:00'` im Winter.
 */
export function toLocalIso(date: string, time: string, timeZone = 'Europe/Zurich'): string {
  // Pivot-Datum bauen, um den Offset für diesen Tag zu kennen.
  // Der Offset kann exakt am DST-Tag wechseln, aber für Salon-Öffnungszeiten
  // (tagsüber) ist das Datum selbst zuverlässig.
  const pivot = new Date(`${date}T12:00:00Z`);
  const offset = zoneOffsetAt(pivot, timeZone);
  return `${date}T${time}:00${offset}`;
}

/**
 * Liefert das heutige Datum in der angegebenen Zone als `YYYY-MM-DD`.
 * Ersetzt das fragile `new Date().toISOString().slice(0,10)`-Muster,
 * das nach ~22 Uhr CH den UTC-Folgetag zurückgibt.
 */
export function todayInZone(timeZone = 'Europe/Zurich'): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}
