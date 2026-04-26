import { Inject, Injectable, Logger } from '@nestjs/common';
import type { OutboxEvent, PrismaClient } from '@salon-os/db';
import { PRISMA } from '../db/db.module.js';
import { EmailService } from '../email/email.service.js';
import {
  cancelEmail,
  confirmationEmail,
  reminder24hEmail,
  type ApptForEmail,
  type ClientForEmail,
  type TenantForEmail,
} from './templates.js';

const MAX_ATTEMPTS = 5;
/** Reminder.24h darf erst kurz vor (startAt - leadTime) raus. */
const REMINDER_24H_LEAD_MS = 24 * 60 * 60 * 1000;

interface ProcessResult {
  picked: number;
  done: number;
  failed: number;
  skipped: number;
}

interface ReminderPayload {
  appointmentId?: string;
  tenantId: string;
  startAt?: string;
  leadTimeMs?: number;
  clientId?: string;
}

/**
 * Outbox-Consumer. Drain-Pattern: poll PENDING events, dispatch by type,
 * mark DONE/FAILED with attempts. Cross-Tenant via PRISMA (RLS-bypass)
 * weil cron-getrieben.
 *
 * Triggern via POST /v1/cron/outbox/process — Railway-Cron alle 1-2 Min.
 */
@Injectable()
export class OutboxWorkerService {
  private readonly logger = new Logger(OutboxWorkerService.name);

  constructor(
    @Inject(PRISMA) private readonly prisma: PrismaClient,
    private readonly email: EmailService,
  ) {}

  async processOnce(batchSize = 50): Promise<ProcessResult> {
    const result: ProcessResult = { picked: 0, done: 0, failed: 0, skipped: 0 };

    // Atomic claim: select + mark PROCESSING in one tx so parallel workers
    // don't double-process. Postgres FOR UPDATE SKIP LOCKED idiom.
    const claimed = await this.prisma.$transaction(async (tx) => {
      const rows = await tx.$queryRawUnsafe<OutboxEvent[]>(
        `SELECT * FROM outbox_event
         WHERE status = 'PENDING'
         ORDER BY "createdAt" ASC
         LIMIT ${Math.max(1, Math.min(batchSize, 200))}
         FOR UPDATE SKIP LOCKED`,
      );
      if (rows.length === 0) return [];
      const ids = rows.map((r) => r.id);
      await tx.outboxEvent.updateMany({
        where: { id: { in: ids } },
        data: { status: 'PROCESSING' },
      });
      return rows;
    });

    result.picked = claimed.length;
    if (claimed.length === 0) return result;

    for (const ev of claimed) {
      try {
        const action = await this.dispatch(ev);
        if (action === 'skip') {
          // re-queue: setze auf PENDING zurück, ohne attempts++
          await this.prisma.outboxEvent.update({
            where: { id: ev.id },
            data: { status: 'PENDING' },
          });
          result.skipped += 1;
        } else {
          await this.prisma.outboxEvent.update({
            where: { id: ev.id },
            data: {
              status: 'DONE',
              processedAt: new Date(),
              attempts: { increment: 1 },
              lastError: null,
            },
          });
          result.done += 1;
        }
      } catch (err) {
        const msg = (err as Error).message ?? String(err);
        const nextAttempts = ev.attempts + 1;
        const isFinal = nextAttempts >= MAX_ATTEMPTS;
        await this.prisma.outboxEvent.update({
          where: { id: ev.id },
          data: {
            status: isFinal ? 'FAILED' : 'PENDING',
            attempts: nextAttempts,
            lastError: msg.slice(0, 1000),
          },
        });
        if (isFinal) result.failed += 1;
        else result.skipped += 1;
        this.logger.error(`Event ${ev.id} (${ev.type}) failed attempt ${nextAttempts}: ${msg}`);
      }
    }
    return result;
  }

  /** Returns 'skip' if the event isn't due yet (re-queue). */
  private async dispatch(ev: OutboxEvent): Promise<'done' | 'skip'> {
    const payload = (ev.payload ?? {}) as unknown as ReminderPayload;
    switch (ev.type) {
      case 'reminder.confirmation':
        await this.handleReminder(ev, payload, 'confirmation');
        return 'done';
      case 'reminder.24h': {
        if (payload.startAt) {
          const lead = payload.leadTimeMs ?? REMINDER_24H_LEAD_MS;
          const sendAt = new Date(payload.startAt).getTime() - lead;
          if (Date.now() < sendAt) return 'skip';
        }
        await this.handleReminder(ev, payload, 'reminder24h');
        return 'done';
      }
      case 'reminder.cancel':
        await this.handleReminder(ev, payload, 'cancel');
        return 'done';
      case 'marketing.rebook':
      case 'marketing.winback':
      case 'marketing.birthday':
        // Marketing-Templates kommen separat — für jetzt: log + done damit Outbox sauber bleibt.
        this.logger.log(
          `marketing event ${ev.type} skipped (no template) appt=${payload.appointmentId}`,
        );
        return 'done';
      default:
        this.logger.warn(`unknown outbox event type: ${ev.type}`);
        return 'done';
    }
  }

  private async handleReminder(
    ev: OutboxEvent,
    payload: ReminderPayload,
    kind: 'confirmation' | 'reminder24h' | 'cancel',
  ): Promise<void> {
    if (!payload.appointmentId) {
      throw new Error('appointmentId missing in payload');
    }
    const data = await this.loadAppointmentData(payload.appointmentId);
    if (!data) {
      // Appointment gelöscht / Tenant gekippt — silent done, nicht endlos retry.
      this.logger.warn(`appt ${payload.appointmentId} not found — drop event`);
      return;
    }
    const { appt, client, tenant } = data;
    if (!client.email) {
      this.logger.warn(`appt ${payload.appointmentId} client has no email — drop`);
      return;
    }
    const tpl =
      kind === 'confirmation'
        ? confirmationEmail(appt, client, tenant)
        : kind === 'reminder24h'
          ? reminder24hEmail(appt, client, tenant)
          : cancelEmail(appt, client, tenant);
    const res = await this.email.send({
      to: client.email,
      subject: tpl.subject,
      html: tpl.html,
      text: tpl.text,
      tag: `${ev.type}|${ev.tenantId ?? 'unknown'}`,
    });
    if (!res.ok) {
      throw new Error(res.error ?? 'email_send_failed');
    }
  }

  private async loadAppointmentData(appointmentId: string): Promise<{
    appt: ApptForEmail;
    client: ClientForEmail;
    tenant: TenantForEmail;
  } | null> {
    const row = await this.prisma.appointment.findUnique({
      where: { id: appointmentId },
      select: {
        startAt: true,
        location: { select: { name: true } },
        staff: { select: { firstName: true } },
        items: { select: { service: { select: { name: true } } } },
        client: { select: { firstName: true, email: true } },
        tenant: { select: { name: true, slug: true } },
      },
    });
    if (!row || !row.client || !row.location || !row.staff || !row.tenant) return null;
    return {
      appt: {
        startAt: row.startAt,
        location: row.location,
        staff: row.staff,
        items: row.items,
      },
      client: row.client,
      tenant: row.tenant,
    };
  }
}
