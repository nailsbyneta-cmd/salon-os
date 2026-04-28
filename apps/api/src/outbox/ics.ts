/**
 * iCalendar (.ics) Generator für Buchungs-Bestätigungs-Mails.
 * Apple Mail / Google Calendar / Outlook erkennen Attachments mit
 * Content-Type text/calendar und bieten "Zum Kalender hinzufügen" an.
 */

interface IcsInput {
  uid: string;
  summary: string;
  description?: string;
  location: string;
  startUtc: Date;
  endUtc: Date;
  organizerEmail?: string;
  organizerName?: string;
}

function pad(n: number): string {
  return n.toString().padStart(2, '0');
}

function fmtUtc(d: Date): string {
  return (
    d.getUTCFullYear().toString() +
    pad(d.getUTCMonth() + 1) +
    pad(d.getUTCDate()) +
    'T' +
    pad(d.getUTCHours()) +
    pad(d.getUTCMinutes()) +
    pad(d.getUTCSeconds()) +
    'Z'
  );
}

function escapeIcs(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
}

export function generateIcs(input: IcsInput): string {
  const now = fmtUtc(new Date());
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//SALON OS//Booking//DE',
    'CALSCALE:GREGORIAN',
    'METHOD:REQUEST',
    'BEGIN:VEVENT',
    `UID:${input.uid}@salon-os.app`,
    `DTSTAMP:${now}`,
    `DTSTART:${fmtUtc(input.startUtc)}`,
    `DTEND:${fmtUtc(input.endUtc)}`,
    `SUMMARY:${escapeIcs(input.summary)}`,
    `LOCATION:${escapeIcs(input.location)}`,
  ];
  if (input.description) {
    lines.push(`DESCRIPTION:${escapeIcs(input.description)}`);
  }
  if (input.organizerEmail) {
    lines.push(
      `ORGANIZER;CN=${escapeIcs(input.organizerName ?? 'Salon')}:mailto:${input.organizerEmail}`,
    );
  }
  lines.push('STATUS:CONFIRMED');
  lines.push('TRANSP:OPAQUE');
  lines.push('END:VEVENT');
  lines.push('END:VCALENDAR');
  // Cordova-Standard fordert CRLF zwischen Zeilen.
  return lines.join('\r\n');
}

/** Base64-encoded für Postmark-Attachment-API. */
export function generateIcsBase64(input: IcsInput): string {
  const ics = generateIcs(input);
  return Buffer.from(ics, 'utf-8').toString('base64');
}
