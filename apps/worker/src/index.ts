/* eslint-disable no-console */
/**
 * BullMQ worker bootstrap.
 * Startet alle registrierten Queues.
 */
import { Worker, type Job } from 'bullmq';
import { prisma } from '@salon-os/db';
import { QUEUE_REMINDERS, type ReminderJob } from '@salon-os/utils';

const redisUrl = process.env['REDIS_URL'] ?? 'redis://localhost:6379';
const postmarkToken = process.env['POSTMARK_SERVER_TOKEN'];
const fromEmail = process.env['REMINDER_FROM_EMAIL'] ?? 'noreply@salon-os.com';

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
  const { appointmentId, tenantId, channel } = job.data;
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
    console.log(`[worker][reminder] appt=${appointmentId} missing — skip`);
    return;
  }
  if (appt.status === 'CANCELLED' || appt.status === 'NO_SHOW') {
    console.log(
      `[worker][reminder] appt=${appointmentId} status=${appt.status} — skip`,
    );
    return;
  }

  if (channel !== 'email') {
    console.log(`[worker][reminder] channel=${channel} nicht implementiert — skip`);
    return;
  }

  const email = appt.client?.email;
  if (!email) {
    console.log(`[worker][reminder] appt=${appointmentId} ohne E-Mail — skip`);
    return;
  }

  const when = appt.startAt.toLocaleString('de-CH', {
    dateStyle: 'full',
    timeStyle: 'short',
    timeZone: 'Europe/Zurich',
  });
  const services = appt.items.map((i) => i.service.name).join(', ');
  const staffName = `${appt.staff.firstName} ${appt.staff.lastName}`;
  const body = `Hallo ${appt.client?.firstName ?? ''},

kleine Erinnerung: morgen um ${appt.startAt.toLocaleTimeString('de-CH', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/Zurich',
  })} haben wir deinen Termin im ${appt.tenant.name}.

Leistung: ${services}
Bei: ${staffName}
Wann: ${when}

Bis morgen!
${appt.tenant.name}`;

  await sendEmail({
    to: email,
    subject: `Erinnerung: dein Termin morgen im ${appt.tenant.name}`,
    body,
  });

  console.log(`[worker][reminder] sent email for appt=${appointmentId} → ${email}`);
}

console.log(`[worker] ready, Redis = ${redisUrl}`);
console.log(
  `[worker] postmark ${postmarkToken ? 'configured' : 'NOT set — dry-run mode'}`,
);

const worker = new Worker<ReminderJob>(QUEUE_REMINDERS, processReminder, {
  connection: parseRedisUrl(redisUrl),
  concurrency: 4,
});

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
  await worker.close();
  await prisma.$disconnect();
  process.exit(0);
}
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
