import { Injectable, Logger, type OnModuleDestroy } from '@nestjs/common';
import { Queue } from 'bullmq';
import type { PrismaClient } from '@salon-os/db';
import { QUEUE_REMINDERS, type ReminderJob } from '@salon-os/utils';
import { OutboxService } from '../common/outbox.service.js';

/**
 * Producer-Seite. Zwei Modi:
 * - Outbox (bevorzugt): enqueueXxxViaOutbox() schreibt atomisch in DB-TX.
 * - Legacy direct: sendConfirmationNow() / scheduleEmailReminder() als Fallback.
 */
@Injectable()
export class RemindersService implements OnModuleDestroy {
  private readonly logger = new Logger(RemindersService.name);
  private readonly queue: Queue<ReminderJob> | null;

  constructor(private readonly outbox: OutboxService) {
    const redisUrl = process.env['REDIS_URL'];
    if (!redisUrl) {
      this.logger.warn('REDIS_URL nicht gesetzt — Reminders werden nicht enqueued.');
      this.queue = null;
      return;
    }
    this.queue = new Queue<ReminderJob>(QUEUE_REMINDERS, {
      connection: parseRedisUrl(redisUrl),
    });
  }

  // ─── Outbox-based (preferred, atomic with DB transaction) ────────────────

  async enqueueConfirmationViaOutbox(
    tx: PrismaClient,
    args: { appointmentId: string; tenantId: string },
  ): Promise<void> {
    await this.outbox.writeWithinTx(tx, 'reminder.confirmation', args);
  }

  async enqueueReminderViaOutbox(
    tx: PrismaClient,
    args: { appointmentId: string; tenantId: string; startAt: Date; leadTimeMs?: number },
  ): Promise<void> {
    await this.outbox.writeWithinTx(tx, 'reminder.24h', {
      ...args,
      startAt: args.startAt.toISOString(),
    });
  }

  async enqueueCancelViaOutbox(
    tx: PrismaClient,
    args: { appointmentId: string; tenantId: string },
  ): Promise<void> {
    await this.outbox.writeWithinTx(tx, 'reminder.cancel', args);
  }

  // ─── Legacy direct-enqueue (fire-and-forget fallback) ────────────────────

  async sendConfirmationNow(args: { appointmentId: string; tenantId: string }): Promise<void> {
    if (!this.queue) {
      this.logger.warn(`sendConfirmationNow: queue null → skip appt=${args.appointmentId}`);
      return;
    }
    try {
      this.logger.log(`sendConfirmationNow: enqueue appt=${args.appointmentId}`);
      await this.queue.add(
        `confirmation-${args.appointmentId}`,
        {
          appointmentId: args.appointmentId,
          tenantId: args.tenantId,
          channel: 'email',
          kind: 'confirmation',
        },
        {
          jobId: `confirmation-${args.appointmentId}`,
          removeOnComplete: true,
          removeOnFail: false,
          attempts: 5,
          backoff: { type: 'exponential', delay: 30_000 },
        },
      );
      this.logger.log(`Confirmation enqueued: appt=${args.appointmentId}`);
    } catch (err) {
      this.logger.error(`Confirmation enqueue FAILED: ${(err as Error).message}`);
      throw err;
    }
  }

  async scheduleEmailReminder(args: {
    appointmentId: string;
    tenantId: string;
    startAt: Date;
    leadTimeMs?: number;
  }): Promise<void> {
    if (!this.queue) return;
    const leadTimeMs = args.leadTimeMs ?? 24 * 60 * 60 * 1000;
    const delay = args.startAt.getTime() - Date.now() - leadTimeMs;
    if (delay <= 0) return;
    await this.queue.add(
      `reminder-${args.appointmentId}`,
      {
        appointmentId: args.appointmentId,
        tenantId: args.tenantId,
        channel: 'email',
        kind: 'reminder-24h',
      },
      {
        delay,
        jobId: `reminder-email-${args.appointmentId}`,
        removeOnComplete: true,
        removeOnFail: false,
        attempts: 3,
        backoff: { type: 'exponential', delay: 60_000 },
      },
    );
    this.logger.log(
      `Reminder enqueued: appt=${args.appointmentId} in ${Math.round(delay / 60000)} Min`,
    );
  }

  async cancelReminder(appointmentId: string): Promise<void> {
    if (!this.queue) return;
    for (const id of [`reminder-email-${appointmentId}`, `confirmation-${appointmentId}`]) {
      const job = await this.queue.getJob(id);
      if (job) await job.remove();
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.queue?.close();
  }
}

function parseRedisUrl(url: string): {
  host: string;
  port: number;
  password?: string;
  username?: string;
} {
  const u = new URL(url);
  return {
    host: u.hostname,
    port: Number(u.port || 6379),
    username: u.username || undefined,
    password: u.password || undefined,
  };
}
