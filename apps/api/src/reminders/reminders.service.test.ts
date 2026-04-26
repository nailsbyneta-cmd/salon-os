import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { OutboxService } from '../common/outbox.service.js';

const mockOutbox = {
  writeWithinTx: vi.fn().mockResolvedValue(undefined),
} as unknown as OutboxService;

describe('RemindersService — no Redis (null queue)', () => {
  let RemindersService: typeof import('./reminders.service.js').RemindersService;

  beforeEach(async () => {
    delete process.env['REDIS_URL'];
    vi.resetModules();
    ({ RemindersService } = await import('./reminders.service.js'));
  });

  afterEach(() => {
    delete process.env['REDIS_URL'];
  });

  it('constructs without throwing when REDIS_URL is missing', () => {
    expect(() => new RemindersService(mockOutbox)).not.toThrow();
  });

  it('sendConfirmationNow resolves without throwing when queue is null', async () => {
    const svc = new RemindersService(mockOutbox);
    await expect(
      svc.sendConfirmationNow({ appointmentId: 'appt1', tenantId: 'tenant1' }),
    ).resolves.not.toThrow();
  });

  it('scheduleEmailReminder resolves without throwing when queue is null', async () => {
    const svc = new RemindersService(mockOutbox);
    await expect(
      svc.scheduleEmailReminder({
        appointmentId: 'appt1',
        tenantId: 'tenant1',
        startAt: new Date(Date.now() + 86400_000 * 2),
      }),
    ).resolves.not.toThrow();
  });

  it('cancelReminder resolves without throwing when queue is null', async () => {
    const svc = new RemindersService(mockOutbox);
    await expect(svc.cancelReminder('appt1')).resolves.not.toThrow();
  });

  it('scheduleEmailReminder silently skips when startAt is in the past', async () => {
    const svc = new RemindersService(mockOutbox);
    await expect(
      svc.scheduleEmailReminder({
        appointmentId: 'appt1',
        tenantId: 'tenant1',
        startAt: new Date(Date.now() - 86400_000),
      }),
    ).resolves.not.toThrow();
  });

  it('onModuleDestroy resolves without throwing when queue is null', async () => {
    const svc = new RemindersService(mockOutbox);
    await expect(svc.onModuleDestroy()).resolves.not.toThrow();
  });
});
