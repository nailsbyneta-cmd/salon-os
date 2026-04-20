import { Injectable, Logger, type OnModuleDestroy } from '@nestjs/common';
import { Queue } from 'bullmq';
import { QUEUE_REMINDERS, type ReminderJob } from '@salon-os/utils';

/**
 * Producer-Seite. Legt Erinnerungs-Jobs mit `delay` in die Queue.
 * Redis-URL kommt aus REDIS_URL. Ohne Redis im Env bleibt die Queue
 * unverbunden und enqueue() wird zum No-Op — gut für lokale Tests
 * und als Safety-Net gegen Ausfälle.
 */
@Injectable()
export class RemindersService implements OnModuleDestroy {
  private readonly logger = new Logger(RemindersService.name);
  private readonly queue: Queue<ReminderJob> | null;

  constructor() {
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

  async sendConfirmationNow(args: {
    appointmentId: string;
    tenantId: string;
  }): Promise<void> {
    if (!this.queue) return;
    await this.queue.add(
      `confirmation:${args.appointmentId}`,
      {
        appointmentId: args.appointmentId,
        tenantId: args.tenantId,
        channel: 'email',
        kind: 'confirmation',
      },
      {
        jobId: `confirmation:${args.appointmentId}`,
        removeOnComplete: true,
        removeOnFail: false,
        attempts: 5,
        backoff: { type: 'exponential', delay: 30_000 },
      },
    );
    this.logger.log(`Confirmation enqueued: appt=${args.appointmentId}`);
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
      `reminder:${args.appointmentId}`,
      {
        appointmentId: args.appointmentId,
        tenantId: args.tenantId,
        channel: 'email',
        kind: 'reminder-24h',
      },
      {
        delay,
        jobId: `reminder:${args.appointmentId}:email`,
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
    const job = await this.queue.getJob(`reminder:${appointmentId}:email`);
    if (job) await job.remove();
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
