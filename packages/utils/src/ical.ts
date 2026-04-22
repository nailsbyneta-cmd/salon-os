/**
 * Minimaler iCal-Generator (RFC 5545). Für Salon-Zwecke reicht das:
 *   - einzelne Termine (Add-to-Calendar per Mail / Success-Page)
 *   - ganze Kalender-Feeds (Tenant-Admin abonniert → iCloud / Google
 *     zieht periodisch via URL)
 *
 * Keine Zeitzone-Komponenten — wir schreiben alles in UTC (DTSTART:
 * YYYYMMDDTHHMMSSZ), was jeder Kalender-Client korrekt lokalisiert.
 */

function fmtUtc(d: Date): string {
  return d
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}/, '');
}

function escape(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/\n/g, '\\n')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;');
}

function fold(line: string): string {
  // RFC 5545 §3.1 — Linien > 75 Zeichen müssen gefaltet werden
  if (line.length <= 75) return line;
  const parts: string[] = [];
  let remaining = line;
  parts.push(remaining.slice(0, 75));
  remaining = remaining.slice(75);
  while (remaining.length > 0) {
    parts.push(' ' + remaining.slice(0, 74));
    remaining = remaining.slice(74);
  }
  return parts.join('\r\n');
}

export interface IcalEvent {
  uid: string;
  start: Date;
  end: Date;
  summary: string;
  description?: string;
  location?: string;
  url?: string;
  status?: 'CONFIRMED' | 'TENTATIVE' | 'CANCELLED';
}

function vEvent(ev: IcalEvent): string {
  const lines = [
    'BEGIN:VEVENT',
    `UID:${ev.uid}`,
    `DTSTAMP:${fmtUtc(new Date())}`,
    `DTSTART:${fmtUtc(ev.start)}`,
    `DTEND:${fmtUtc(ev.end)}`,
    `SUMMARY:${escape(ev.summary)}`,
    ev.description ? `DESCRIPTION:${escape(ev.description)}` : null,
    ev.location ? `LOCATION:${escape(ev.location)}` : null,
    ev.url ? `URL:${ev.url}` : null,
    `STATUS:${ev.status ?? 'CONFIRMED'}`,
    'END:VEVENT',
  ].filter((x): x is string => x !== null);
  return lines.map(fold).join('\r\n');
}

export function buildIcal(calendarName: string, events: IcalEvent[]): string {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//SALON OS//DE',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${escape(calendarName)}`,
    ...events.map(vEvent),
    'END:VCALENDAR',
  ];
  return lines.join('\r\n') + '\r\n';
}
