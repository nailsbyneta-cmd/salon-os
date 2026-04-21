/* eslint-disable no-console */
import { Queue } from 'bullmq';
import { prisma } from '@salon-os/db';
import type { MarketingScanJob, ReminderJob } from '@salon-os/utils';
import {
  QUEUE_MARKETING,
  QUEUE_REMINDERS,
} from '@salon-os/utils';

// ─── Outbox-Poller ────────────────────────────────────────────
//
// Sekündlich (konfigurierbar) werden bis zu BATCH_SIZE unpublished
// outbox_events gezogen, an die passende BullMQ-Queue gereicht und danach
// als `publishedAt` markiert. `FOR UPDATE SKIP LOCKED` erlaubt mehrere
// Poller-Instanzen ohne Doppel-Publish.
//
// Fehler bleiben bewusst lokal: ein fehlgeschlagenes Event wird mit
// `attempts+=1`, `lastError` und `availableAt+=backoff` zurückgeschrieben,
// andere Events im Batch werden davon nicht aufgehalten.

const POLL_INTERVAL_MS = Number(process.env['OUTBOX_POLL_INTERVAL_MS'] ?? 1000);
const BATCH_SIZE = Number(process.env['OUTBOX_BATCH_SIZE'] ?? 50);
const MAX_ATTEMPTS = Number(process.env['OUTBOX_MAX_ATTEMPTS'] ?? 10);
const BASE_BACKOFF_MS = Number(process.env['OUTBOX_BASE_BACKOFF_MS'] ?? 30_000);

type PendingRow = {
  id: string;
  tenantId: string | null;
  eventType: string;
  payload: Record<string, unknown>;
  attempts: number;
};

interface QueueBundle {
  reminders: Queue<ReminderJob>;
  marketing: Queue<MarketingScanJob>;
}

export function startOutboxPoller(queues: QueueBundle): () => Promise<void> {
  let stopped = false;
  let handle: NodeJS.Timeout | null = null;
  let inFlight: Promise<void> = Promise.resolve();

  const tick = async (): Promise<void> => {
    if (stopped) return;
    try {
      await drainBatch(queues);
    } catch (err) {
      console.error(`[outbox-poller] tick failed: ${(err as Error).message}`);
    } finally {
      if (!stopped) {
        handle = setTimeout(() => {
          inFlight = tick();
        }, POLL_INTERVAL_MS);
      }
    }
  };

  inFlight = tick();

  return async () => {
    stopped = true;
    if (handle) clearTimeout(handle);
    await inFlight;
  };
}

async function drainBatch(queues: QueueBundle): Promise<void> {
  // `FOR UPDATE SKIP LOCKED` erlaubt mehrere Worker — jeder zieht nur Rows,
  // die niemand sonst gelockt hat.
  const rows = await prisma.$queryRawUnsafe<PendingRow[]>(
    `SELECT id, "tenantId", "eventType", payload, attempts
     FROM outbox_event
     WHERE "publishedAt" IS NULL
       AND "cancelledAt" IS NULL
       AND "availableAt" <= now()
       AND attempts < $1
     ORDER BY "availableAt" ASC
     LIMIT $2
     FOR UPDATE SKIP LOCKED`,
    MAX_ATTEMPTS,
    BATCH_SIZE,
  );

  if (rows.length === 0) return;

  for (const row of rows) {
    try {
      await dispatch(row, queues);
      await prisma.$executeRawUnsafe(
        `UPDATE outbox_event
         SET "publishedAt" = now(), "lastError" = NULL
         WHERE id = $1`,
        row.id,
      );
    } catch (err) {
      const attempts = row.attempts + 1;
      const backoffMs = BASE_BACKOFF_MS * 2 ** Math.min(row.attempts, 8);
      const nextAvailable = new Date(Date.now() + backoffMs);
      await prisma
        .$executeRawUnsafe(
          `UPDATE outbox_event
           SET attempts = $1,
               "lastError" = $2,
               "failedAt" = now(),
               "availableAt" = $3
           WHERE id = $4`,
          attempts,
          String(err).slice(0, 2000),
          nextAvailable,
          row.id,
        )
        .catch((bookkeepingErr) =>
          console.error(
            `[outbox-poller] bookkeeping-update failed: ${(bookkeepingErr as Error).message}`,
          ),
        );
      console.error(
        `[outbox-poller] dispatch failed id=${row.id} type=${row.eventType} attempt=${attempts}: ${(err as Error).message}`,
      );
    }
  }
}

async function dispatch(row: PendingRow, queues: QueueBundle): Promise<void> {
  // Namens-Konvention: `<domain>.<name>` → z.B. `reminder.confirmation`,
  // `reminder.reminder-24h`, `marketing.scan`. Unbekannte Typen werfen,
  // damit der Row im Backoff-Retry hängt statt silent zu verschwinden.
  const [domain] = row.eventType.split('.');

  switch (domain) {
    case 'reminder': {
      const payload = row.payload as unknown as ReminderJob;
      await queues.reminders.add(`outbox-${row.id}`, payload, {
        jobId: `outbox-${row.id}`,
        removeOnComplete: true,
        removeOnFail: false,
        attempts: 3,
        backoff: { type: 'exponential', delay: 60_000 },
      });
      return;
    }
    case 'marketing': {
      const payload = row.payload as unknown as MarketingScanJob;
      await queues.marketing.add(`outbox-${row.id}`, payload, {
        jobId: `outbox-${row.id}`,
        removeOnComplete: true,
        removeOnFail: false,
      });
      return;
    }
    default:
      throw new Error(`Unknown outbox eventType domain: ${domain}`);
  }
}

// Exported für Unit-Tests
export const __internals = {
  drainBatch,
  dispatch,
  MAX_ATTEMPTS,
  QUEUE_REMINDERS,
  QUEUE_MARKETING,
};
