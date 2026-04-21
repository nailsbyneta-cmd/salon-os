import { describe, expect, it, vi } from 'vitest';

import { __internals } from './outbox-poller.js';

const { dispatch } = __internals;

interface FakeQueue {
  add: ReturnType<typeof vi.fn>;
}

function makeQueues(): { reminders: FakeQueue; marketing: FakeQueue } {
  return {
    reminders: { add: vi.fn(async () => undefined) },
    marketing: { add: vi.fn(async () => undefined) },
  };
}

describe('outbox-poller dispatch', () => {
  it('routet reminder.* auf die Reminders-Queue', async () => {
    const queues = makeQueues();
    await dispatch(
      {
        id: '11111111-1111-4111-8111-000000000001',
        tenantId: 't1',
        eventType: 'reminder.confirmation',
        payload: {
          appointmentId: 'a1',
          tenantId: 't1',
          channel: 'email',
          kind: 'confirmation',
        },
        attempts: 0,
      },
      // Type-cast: echte BullMQ-Queue-Shape braucht mehr, aber dispatch
      // ruft nur `.add()` — interface-contract reicht.
      queues as unknown as Parameters<typeof dispatch>[1],
    );

    expect(queues.reminders.add).toHaveBeenCalledTimes(1);
    expect(queues.marketing.add).not.toHaveBeenCalled();
    const [jobName, payload, opts] = queues.reminders.add.mock.calls[0] as [
      string,
      Record<string, unknown>,
      Record<string, unknown>,
    ];
    expect(jobName).toBe('outbox-11111111-1111-4111-8111-000000000001');
    expect(payload).toMatchObject({ appointmentId: 'a1', kind: 'confirmation' });
    expect(opts.jobId).toBe('outbox-11111111-1111-4111-8111-000000000001');
  });

  it('routet marketing.* auf die Marketing-Queue', async () => {
    const queues = makeQueues();
    await dispatch(
      {
        id: 'b2',
        tenantId: null,
        eventType: 'marketing.scan',
        payload: { type: 'scan' },
        attempts: 0,
      },
      queues as unknown as Parameters<typeof dispatch>[1],
    );
    expect(queues.marketing.add).toHaveBeenCalledTimes(1);
    expect(queues.reminders.add).not.toHaveBeenCalled();
  });

  it('wirft für unbekannte Domain-Prefixe (Event bleibt im Retry-Backoff)', async () => {
    const queues = makeQueues();
    await expect(
      dispatch(
        {
          id: 'c3',
          tenantId: null,
          eventType: 'payments.refund',
          payload: {},
          attempts: 0,
        },
        queues as unknown as Parameters<typeof dispatch>[1],
      ),
    ).rejects.toThrow(/Unknown outbox eventType domain/);
  });
});
