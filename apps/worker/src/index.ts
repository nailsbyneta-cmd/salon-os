/* eslint-disable no-console */
/**
 * BullMQ worker bootstrap.
 * Startet alle registrierten Queues.
 */
import { Queue, Worker, type Job } from 'bullmq';
import { prisma } from '@salon-os/db';
import {
  QUEUE_MARKETING,
  QUEUE_REMINDERS,
  signSelfServiceToken,
  type MarketingScanJob,
  type ReminderJob,
} from '@salon-os/utils';

const redisUrl = process.env['REDIS_URL'] ?? 'redis://localhost:6379';
const postmarkToken = process.env['POSTMARK_SERVER_TOKEN'];
const fromEmail = process.env['REMINDER_FROM_EMAIL'] ?? 'noreply@salon-os.com';
const webBaseUrl =
  process.env['WEB_PUBLIC_URL'] ?? 'https://web-production-e5e8d.up.railway.app';

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

async function sendEmail(opts: {
  to: string;
  subject: string;
  body: string;
}): Promise<void> {
  if (!postmarkToken) {
    console.log(
      `[worker][email] (dry-run, no POSTMARK_SERVER_TOKEN) to=${opts.to} subject="${opts.subject}"`,
    );
    return;
  }
  const res = await fetch('https://api.postmarkapp.com/email', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'X-Postmark-Server-Token': postmarkToken,
    },
    body: JSON.stringify({
      From: fromEmail,
      To: opts.to,
      Subject: opts.subject,
      TextBody: opts.body,
      MessageStream: 'outbound',
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Postmark ${res.status}: ${text.slice(0, 200)}`);
  }
}

async function processReminder(job: Job<ReminderJob>): Promise<void> {
  const { appointmentId, tenantId, channel, kind = 'reminder-24h' } = job.data;
  const appt = await prisma.appointment.findFirst({
    where: { id: appointmentId, tenantId },
    include: {
      client: { select: { firstName: true, lastName: true, email: true } },
      items: { include: { service: { select: { name: true } } } },
      staff: { select: { firstName: true, lastName: true } },
      tenant: { select: { name: true, slug: true } },
    },
  });
  if (!appt) {
    console.log(`[worker][${kind}] appt=${appointmentId} missing — skip`);
    return;
  }
  if (appt.status === 'CANCELLED' || appt.status === 'NO_SHOW') {
    console.log(`[worker][${kind}] appt=${appointmentId} status=${appt.status} — skip`);
    return;
  }

  if (channel !== 'email') {
    console.log(`[worker][${kind}] channel=${channel} nicht implementiert — skip`);
    return;
  }

  const email = appt.client?.email;
  if (!email) {
    console.log(`[worker][${kind}] appt=${appointmentId} ohne E-Mail — skip`);
    return;
  }

  // Self-Service-Link gültig bis Termin + 1 Tag.
  const expiresAt = new Date(appt.startAt.getTime() + 24 * 60 * 60 * 1000);
  const cancelToken = signSelfServiceToken({
    action: 'cancel',
    appointmentId: appt.id,
    tenantId: appt.tenantId,
    expiresAt,
  });
  const rescheduleToken = signSelfServiceToken({
    action: 'reschedule',
    appointmentId: appt.id,
    tenantId: appt.tenantId,
    expiresAt,
  });
  const cancelUrl = `${webBaseUrl}/appointment/${appt.id}?t=${cancelToken}`;
  const rescheduleUrl = `${webBaseUrl}/appointment/${appt.id}?t=${rescheduleToken}`;
  const apiBase =
    process.env['API_PUBLIC_URL'] ??
    'https://salon-os-production-2346.up.railway.app';
  const icalUrl = `${apiBase}/v1/public/appointments/${appt.id}.ics?t=${cancelToken}`;

  const when = appt.startAt.toLocaleString('de-CH', {
    dateStyle: 'full',
    timeStyle: 'short',
    timeZone: 'Europe/Zurich',
  });
  const timeShort = appt.startAt.toLocaleTimeString('de-CH', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/Zurich',
  });
  const services = appt.items.map((i) => i.service.name).join(', ');
  const staffName = `${appt.staff.firstName} ${appt.staff.lastName}`;
  const firstName = appt.client?.firstName ?? '';

  let subject: string;
  let lead: string;
  switch (kind) {
    case 'confirmation':
      subject = `Bestätigung: dein Termin im ${appt.tenant.name}`;
      lead = `dein Termin ist gebucht. Hier alle Details:`;
      break;
    case 'marketing-rebook':
      subject = `Zeit für den nächsten Termin im ${appt.tenant.name}?`;
      lead = `wir freuen uns, wenn du bald wieder bei uns bist. Dein letzter Besuch war eine Weile her — wähle hier deinen nächsten Termin.`;
      break;
    case 'marketing-winback':
      subject = `Wir vermissen dich im ${appt.tenant.name}`;
      lead = `wir haben uns eine Weile nicht gesehen. Komm wieder — für dich gibt's 10 % auf den nächsten Termin.`;
      break;
    default:
      subject = `Erinnerung: dein Termin morgen im ${appt.tenant.name}`;
      lead = `kleine Erinnerung: morgen um ${timeShort} haben wir deinen Termin im ${appt.tenant.name}.`;
  }

  const body = `Hallo ${firstName},

${lead}

Leistung: ${services}
Bei: ${staffName}
Wann: ${when}

In Kalender speichern: ${icalUrl}
Termin stornieren: ${cancelUrl}
Termin umbuchen: ${rescheduleUrl}

${appt.tenant.name}`;

  await sendEmail({ to: email, subject, body });

  console.log(`[worker][${kind}] sent email for appt=${appointmentId} → ${email}`);
}

async function sendBirthdayEmail(clientId: string, tenantId: string): Promise<void> {
  const client = await prisma.client.findFirst({
    where: { id: clientId, tenantId },
    include: { tenant: { select: { name: true } } },
  });
  if (!client || !client.email) return;
  const salon = client.tenant.name;
  await sendEmail({
    to: client.email,
    subject: `Alles Gute zum Geburtstag, ${client.firstName}! 🎉`,
    body: `Hallo ${client.firstName},

herzlichen Glückwunsch von uns im ${salon}! Zur Feier schenken wir
dir einen kleinen Gutschein über 20 CHF für deinen nächsten Termin.

Wir freuen uns auf dich.
${salon}`,
  });
  console.log(`[worker][birthday] sent to client=${clientId}`);
}

async function enqueueReminder(
  queue: Queue<ReminderJob>,
  args: {
    appointmentId: string;
    tenantId: string;
    kind: 'marketing-rebook' | 'marketing-winback';
  },
): Promise<void> {
  await queue.add(
    `mk-${args.kind}-${args.appointmentId}`,
    {
      appointmentId: args.appointmentId,
      tenantId: args.tenantId,
      channel: 'email',
      kind: args.kind,
    },
    {
      jobId: `mk-${args.kind}-${args.appointmentId}`,
      removeOnComplete: true,
      removeOnFail: false,
      attempts: 3,
      backoff: { type: 'exponential', delay: 60_000 },
    },
  );
}

async function runMarketingScan(
  remindersQueue: Queue<ReminderJob>,
): Promise<void> {
  const now = new Date();
  const mm = String(now.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(now.getUTCDate()).padStart(2, '0');

  // 1) Birthdays — clients whose birthday matches today's month-day.
  //    Prisma's Date-Filter ist kein SQL-extract(), also machen wir's
  //    als Raw-Query (tenant-agnostisch, da RLS greift nur in Transaktionen).
  const birthdayClients = await prisma.$queryRawUnsafe<
    Array<{ id: string; tenantId: string }>
  >(
    `SELECT id, "tenantId" FROM "client"
     WHERE "birthday" IS NOT NULL
       AND "deletedAt" IS NULL
       AND "emailOptIn" = true
       AND TO_CHAR("birthday", 'MM-DD') = $1
     LIMIT 500`,
    `${mm}-${dd}`,
  );
  for (const c of birthdayClients) {
    await sendBirthdayEmail(c.id, c.tenantId).catch((err) =>
      console.error(`[worker][birthday] failed: ${(err as Error).message}`),
    );
  }
  console.log(`[worker][scan] birthdays: ${birthdayClients.length}`);

  // 2) Rebook — completed appointments 28–35 Tage her, ohne Folge-Termin.
  const rebookCutoffLow = new Date(now.getTime() - 35 * 24 * 60 * 60 * 1000);
  const rebookCutoffHigh = new Date(now.getTime() - 28 * 24 * 60 * 60 * 1000);
  const rebookCandidates = await prisma.appointment.findMany({
    where: {
      status: 'COMPLETED',
      completedAt: { gte: rebookCutoffLow, lte: rebookCutoffHigh },
      client: { emailOptIn: true, deletedAt: null },
    },
    include: { client: { select: { id: true, tenantId: true } } },
    take: 500,
  });
  let rebookSent = 0;
  for (const appt of rebookCandidates) {
    if (!appt.clientId) continue;
    // Hat der Kunde schon einen Folge-Termin nach completedAt?
    const next = await prisma.appointment.findFirst({
      where: {
        clientId: appt.clientId,
        startAt: { gt: appt.completedAt ?? appt.endAt },
        status: { notIn: ['CANCELLED', 'NO_SHOW'] },
      },
      select: { id: true },
    });
    if (next) continue;
    await enqueueReminder(remindersQueue, {
      appointmentId: appt.id,
      tenantId: appt.tenantId,
      kind: 'marketing-rebook',
    });
    rebookSent += 1;
  }
  console.log(`[worker][scan] rebook candidates: ${rebookSent}`);

  // 3) Win-Back — last visit > 90 Tage, kein zukünftiger Termin.
  const winbackCutoff = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
  const winbackClients = await prisma.client.findMany({
    where: {
      lastVisitAt: { lt: winbackCutoff },
      deletedAt: null,
      emailOptIn: true,
      appointments: {
        none: {
          startAt: { gt: now },
          status: { notIn: ['CANCELLED', 'NO_SHOW'] },
        },
      },
    },
    include: {
      appointments: {
        where: { status: 'COMPLETED' },
        orderBy: { completedAt: 'desc' },
        take: 1,
      },
    },
    take: 500,
  });
  let winbackSent = 0;
  for (const c of winbackClients) {
    const lastAppt = c.appointments[0];
    if (!lastAppt) continue;
    await enqueueReminder(remindersQueue, {
      appointmentId: lastAppt.id,
      tenantId: c.tenantId,
      kind: 'marketing-winback',
    });
    winbackSent += 1;
  }
  console.log(`[worker][scan] winback candidates: ${winbackSent}`);
}

console.log(`[worker] ready, Redis = ${redisUrl}`);
console.log(
  `[worker] postmark ${postmarkToken ? 'configured' : 'NOT set — dry-run mode'}`,
);

const remindersQueueProducer = new Queue<ReminderJob>(QUEUE_REMINDERS, {
  connection: parseRedisUrl(redisUrl),
});

const worker = new Worker<ReminderJob>(QUEUE_REMINDERS, processReminder, {
  connection: parseRedisUrl(redisUrl),
  concurrency: 4,
});

// Marketing-Queue mit repeatable Daily-Scan (09:00 Europe/Zurich = 07:00 UTC).
const marketingQueue = new Queue<MarketingScanJob>(QUEUE_MARKETING, {
  connection: parseRedisUrl(redisUrl),
});

const marketingWorker = new Worker<MarketingScanJob>(
  QUEUE_MARKETING,
  async () => {
    try {
      await runMarketingScan(remindersQueueProducer);
    } catch (err) {
      console.error(`[worker][marketing] scan failed: ${(err as Error).message}`);
      throw err;
    }
  },
  { connection: parseRedisUrl(redisUrl), concurrency: 1 },
);

marketingWorker.on('completed', () => console.log('[worker][marketing] scan done'));
marketingWorker.on('failed', (_, err) =>
  console.error(`[worker][marketing] scan failed: ${err.message}`),
);

void marketingQueue.upsertJobScheduler(
  'daily-marketing-scan',
  { pattern: '0 7 * * *' }, // Cron: jeden Tag 07:00 UTC
  {
    name: 'marketing-daily',
    data: { type: 'scan' },
    opts: {
      removeOnComplete: true,
      removeOnFail: false,
    },
  },
);


worker.on('completed', (job) => {
  console.log(`[worker][${QUEUE_REMINDERS}] completed ${job.id}`);
});
worker.on('failed', (job, err) => {
  console.error(
    `[worker][${QUEUE_REMINDERS}] failed ${job?.id ?? '?'}: ${err.message}`,
  );
});

setInterval(() => {
  console.log(`[worker] heartbeat ${new Date().toISOString()}`);
}, 60_000);

async function shutdown(): Promise<void> {
  console.log('[worker] shutting down…');
  await Promise.all([
    worker.close(),
    marketingWorker.close(),
    marketingQueue.close(),
    remindersQueueProducer.close(),
  ]);
  await prisma.$disconnect();
  process.exit(0);
}
// void-wrap: process.on erwartet sync-Handler, shutdown ist async —
// no-misused-promises triggert sonst.
process.on('SIGTERM', () => {
  void shutdown();
});
process.on('SIGINT', () => {
  void shutdown();
});

// ─── Outbox Poller ───────────────────────────────────────────────────────

async function pollOutbox(): Promise<void> {
  const BATCH = 50;
  const MAX_ATTEMPTS = 5;

  const events = await prisma.outboxEvent.findMany({
    where: { status: 'PENDING', attempts: { lt: MAX_ATTEMPTS } },
    orderBy: { createdAt: 'asc' },
    take: BATCH,
  });

  for (const event of events) {
    await prisma.outboxEvent.update({
      where: { id: event.id },
      data: { status: 'PROCESSING', attempts: { increment: 1 } },
    });

    try {
      const payload = event.payload as Record<string, unknown>;

      if (event.type === 'reminder.confirmation' || event.type === 'reminder.24h') {
        const appointmentId = payload['appointmentId'] as string;
        const tenantId = payload['tenantId'] as string;

        if (event.type === 'reminder.24h') {
          const startAt = new Date(payload['startAt'] as string);
          const leadTimeMs = (payload['leadTimeMs'] as number | undefined) ?? 24 * 60 * 60 * 1000;
          const delay = startAt.getTime() - Date.now() - leadTimeMs;
          if (delay > 0) {
            await remindersQueueProducer.add(
              `reminder-${appointmentId}`,
              { appointmentId, tenantId, channel: 'email', kind: 'reminder-24h' },
              { delay, jobId: `reminder-email-${appointmentId}`, removeOnComplete: true, attempts: 3 },
            );
          }
        } else {
          await remindersQueueProducer.add(
            `confirmation-${appointmentId}`,
            { appointmentId, tenantId, channel: 'email', kind: 'confirmation' },
            { jobId: `confirmation-${appointmentId}`, removeOnComplete: true, attempts: 5 },
          );
        }
      } else if (event.type === 'reminder.cancel') {
        const appointmentId = payload['appointmentId'] as string;
        for (const jobId of [`reminder-email-${appointmentId}`, `confirmation-${appointmentId}`]) {
          const job = await remindersQueueProducer.getJob(jobId);
          if (job) await job.remove();
        }
      }

      await prisma.outboxEvent.update({
        where: { id: event.id },
        data: { status: 'DONE', processedAt: new Date() },
      });
    } catch (err) {
      const msg = (err as Error).message;
      console.error(`[outbox] failed event=${event.id} type=${event.type}: ${msg}`);
      await prisma.outboxEvent.update({
        where: { id: event.id },
        data: {
          status: event.attempts + 1 >= MAX_ATTEMPTS ? 'FAILED' : 'PENDING',
          lastError: msg.slice(0, 500),
        },
      });
    }
  }
}

setInterval(() => {
  pollOutbox().catch((err) => console.error('[outbox] poll error:', err));
}, 5_000);

console.log('[outbox] poller started — polling every 5s');
