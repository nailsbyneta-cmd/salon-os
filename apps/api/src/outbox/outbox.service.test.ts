import { describe, expect, it, vi } from 'vitest';

import { OutboxService, type OutboxTransactionClient } from './outbox.service.js';

function makeTx(): OutboxTransactionClient & { create: ReturnType<typeof vi.fn> } {
  const create = vi.fn(async () => ({}));
  return {
    outboxEvent: { create },
    create,
  } as OutboxTransactionClient & { create: ReturnType<typeof vi.fn> };
}

describe('OutboxService.emit', () => {
  it('schreibt Event mit defaulted availableAt = now()', async () => {
    const tx = makeTx();
    const svc = new OutboxService();
    const before = Date.now();

    await svc.emit(tx, {
      eventType: 'reminder.confirmation',
      tenantId: '11111111-1111-4111-8111-111111111111',
      payload: { appointmentId: 'appt-1' },
    });

    expect(tx.create).toHaveBeenCalledTimes(1);
    const [{ data }] = tx.create.mock.calls[0] as [
      { data: { eventType: string; availableAt: Date; tenantId: string | null } },
    ];
    expect(data.eventType).toBe('reminder.confirmation');
    expect(data.tenantId).toBe('11111111-1111-4111-8111-111111111111');
    expect(data.availableAt.getTime()).toBeGreaterThanOrEqual(before);
    expect(data.availableAt.getTime()).toBeLessThanOrEqual(Date.now() + 5);
  });

  it('erlaubt tenantId=null für System-Events', async () => {
    const tx = makeTx();
    const svc = new OutboxService();

    await svc.emit(tx, { eventType: 'marketing.scan', payload: { type: 'scan' } });

    const [{ data }] = tx.create.mock.calls[0] as [{ data: { tenantId: string | null } }];
    expect(data.tenantId).toBeNull();
  });

  it('respektiert custom availableAt für delayed events', async () => {
    const tx = makeTx();
    const svc = new OutboxService();
    const future = new Date(Date.now() + 60 * 60 * 1000);

    await svc.emit(tx, {
      eventType: 'reminder.reminder-24h',
      payload: { appointmentId: 'a1' },
      availableAt: future,
    });

    const [{ data }] = tx.create.mock.calls[0] as [{ data: { availableAt: Date } }];
    expect(data.availableAt).toEqual(future);
  });
});
