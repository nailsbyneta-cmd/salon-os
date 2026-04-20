/**
 * Shared queue-namen. Beide Seiten (Producer = API, Consumer = Worker)
 * importieren von hier, damit Tippfehler nicht möglich sind.
 */
export const QUEUE_REMINDERS = 'reminders';

export type ReminderKind =
  | 'confirmation' // direkt nach Buchung
  | 'reminder-24h' // 24 h vorher
  | 'reminder-2h' // 2 h vorher (Phase 2: SMS)
  | 'marketing-birthday'
  | 'marketing-winback'
  | 'marketing-rebook';

export const QUEUE_MARKETING = 'marketing';

export interface MarketingScanJob {
  /** Job-Typ; bei 'scan' geht die tägliche Analyse los. */
  type: 'scan';
}

export interface ReminderJob {
  appointmentId: string;
  tenantId: string;
  channel: 'email' | 'sms';
  kind?: ReminderKind;
}
