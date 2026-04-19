/**
 * Shared queue-namen. Beide Seiten (Producer = API, Consumer = Worker)
 * importieren von hier, damit Tippfehler nicht möglich sind.
 */
export const QUEUE_REMINDERS = 'reminders';

export interface ReminderJob {
  appointmentId: string;
  tenantId: string;
  /** 24h before startAt → email only. Später: +2h → SMS. */
  channel: 'email' | 'sms';
}
