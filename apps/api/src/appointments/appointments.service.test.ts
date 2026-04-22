import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { AppointmentsService } from './appointments.service.js';

vi.mock('../tenant/tenant.context.js', () => ({
  requireTenantContext: () => ({ tenantId: 'tenant1', userId: 'user1', role: 'ADMIN' }),
}));

function makePrisma() {
  return {
    appointment: {
      findMany: vi.fn().mockResolvedValue([]),
      findFirst: vi.fn(),
      findFirstOrThrow: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    client: {
      findMany: vi.fn().mockResolvedValue([]),
      update: vi.fn().mockResolvedValue({}),
    },
  };
}

function makeWithTenant(prisma: ReturnType<typeof makePrisma>) {
  return vi.fn((_tid: string, _uid: string | null, _role: string | null, fn: (tx: unknown) => Promise<unknown>) =>
    fn(prisma),
  );
}

function makeAudit() {
  return { withinTx: vi.fn().mockResolvedValue(undefined) };
}

function makeReminders() {
  return {
    sendConfirmationNow: vi.fn().mockResolvedValue(undefined),
    scheduleEmailReminder: vi.fn().mockResolvedValue(undefined),
    cancelReminder: vi.fn().mockResolvedValue(undefined),
  };
}

describe('AppointmentsService', () => {
  let service: AppointmentsService;
  let prisma: ReturnType<typeof makePrisma>;
  let withTenant: ReturnType<typeof makeWithTenant>;
  let audit: ReturnType<typeof makeAudit>;
  let reminders: ReturnType<typeof makeReminders>;

  beforeEach(() => {
    prisma = makePrisma();
    withTenant = makeWithTenant(prisma);
    audit = makeAudit();
    reminders = makeReminders();
    service = new AppointmentsService(withTenant as never, reminders as never, audit as never);
  });

  // ── cancel() ──────────────────────────────────────────────────────────────

  describe('cancel()', () => {
    it('throws NotFoundException when appointment not found', async () => {
      prisma.appointment.findFirst.mockResolvedValue(null);
      await expect(service.cancel('appt1', { noShow: false })).rejects.toThrow(NotFoundException);
    });

    it('is idempotent: CANCELLED → CANCELLED skips update', async () => {
      const appt = { id: 'appt1', status: 'CANCELLED', clientId: null };
      prisma.appointment.findFirst.mockResolvedValue(appt);
      prisma.appointment.findFirstOrThrow.mockResolvedValue(appt);
      const result = await service.cancel('appt1', { noShow: false });
      expect(result).toEqual(appt);
      expect(prisma.appointment.update).not.toHaveBeenCalled();
    });

    it('is idempotent: NO_SHOW → NO_SHOW skips update', async () => {
      const appt = { id: 'appt1', status: 'NO_SHOW', clientId: null };
      prisma.appointment.findFirst.mockResolvedValue(appt);
      prisma.appointment.findFirstOrThrow.mockResolvedValue(appt);
      await service.cancel('appt1', { noShow: true });
      expect(prisma.appointment.update).not.toHaveBeenCalled();
    });

    it('blocks backward transition from COMPLETED to CANCELLED', async () => {
      prisma.appointment.findFirst.mockResolvedValue({ id: 'appt1', status: 'COMPLETED', clientId: null });
      await expect(service.cancel('appt1', { noShow: false })).rejects.toThrow(ConflictException);
    });

    it('blocks backward transition from CANCELLED to NO_SHOW', async () => {
      prisma.appointment.findFirst.mockResolvedValue({ id: 'appt1', status: 'CANCELLED', clientId: null });
      await expect(service.cancel('appt1', { noShow: true })).rejects.toThrow(ConflictException);
    });

    it('sets status to NO_SHOW when noShow=true', async () => {
      const existing = { id: 'appt1', status: 'CONFIRMED', clientId: 'c1' };
      prisma.appointment.findFirst.mockResolvedValue(existing);
      prisma.appointment.update.mockResolvedValue({ ...existing, status: 'NO_SHOW', items: [] });
      prisma.appointment.findMany.mockResolvedValue([
        { status: 'NO_SHOW', startAt: new Date() },
        { status: 'NO_SHOW', startAt: new Date() },
        { status: 'NO_SHOW', startAt: new Date() },
      ]);
      await service.cancel('appt1', { noShow: true });
      expect(prisma.appointment.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ status: 'NO_SHOW', noShow: true }) }),
      );
    });

    it('cancels reminder after successful cancel', async () => {
      prisma.appointment.findFirst.mockResolvedValue({ id: 'appt1', status: 'CONFIRMED', clientId: null });
      prisma.appointment.update.mockResolvedValue({ id: 'appt1', status: 'CANCELLED', items: [] });
      await service.cancel('appt1', { noShow: false });
      expect(reminders.cancelReminder).toHaveBeenCalledWith('appt1');
    });

    it('recomputes noShowRisk for client after no-show', async () => {
      const existing = { id: 'appt1', status: 'CONFIRMED', clientId: 'c1' };
      prisma.appointment.findFirst.mockResolvedValue(existing);
      prisma.appointment.update.mockResolvedValue({ ...existing, status: 'NO_SHOW', items: [] });
      prisma.appointment.findMany.mockResolvedValue([
        { status: 'NO_SHOW', startAt: new Date() },
        { status: 'NO_SHOW', startAt: new Date() },
        { status: 'COMPLETED', startAt: new Date() },
      ]);
      await service.cancel('appt1', { noShow: true });
      expect(prisma.client.update).toHaveBeenCalled();
    });
  });

  // ── transition() ──────────────────────────────────────────────────────────

  describe('transition()', () => {
    it('throws NotFoundException when appointment not found', async () => {
      prisma.appointment.findFirst.mockResolvedValue(null);
      await expect(service.transition('appt1', 'CONFIRMED')).rejects.toThrow(NotFoundException);
    });

    it('increments client totalVisits on COMPLETED', async () => {
      const existing = { id: 'appt1', status: 'IN_SERVICE', clientId: 'c1' };
      prisma.appointment.findFirst.mockResolvedValue(existing);
      prisma.appointment.update.mockResolvedValue({ ...existing, status: 'COMPLETED', items: [] });
      prisma.appointment.findMany.mockResolvedValue([
        { status: 'COMPLETED', startAt: new Date() },
        { status: 'COMPLETED', startAt: new Date() },
        { status: 'COMPLETED', startAt: new Date() },
      ]);
      await service.transition('appt1', 'COMPLETED');
      expect(prisma.client.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ totalVisits: { increment: 1 } }),
        }),
      );
    });

    it('sets checkedInAt when transitioning to CHECKED_IN', async () => {
      const existing = { id: 'appt1', status: 'CONFIRMED', clientId: null };
      prisma.appointment.findFirst.mockResolvedValue(existing);
      prisma.appointment.update.mockResolvedValue({ ...existing, status: 'CHECKED_IN', items: [] });
      await service.transition('appt1', 'CHECKED_IN');
      expect(prisma.appointment.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ checkedInAt: expect.any(Date) }) }),
      );
    });

    it('does not update client for non-COMPLETED transitions', async () => {
      const existing = { id: 'appt1', status: 'CONFIRMED', clientId: 'c1' };
      prisma.appointment.findFirst.mockResolvedValue(existing);
      prisma.appointment.update.mockResolvedValue({ ...existing, status: 'CHECKED_IN', items: [] });
      await service.transition('appt1', 'CHECKED_IN');
      expect(prisma.client.update).not.toHaveBeenCalled();
    });
  });

  // ── conflict error handling ────────────────────────────────────────────────

  describe('conflict error wrapping', () => {
    it('wraps raw PG exclusion_violation (23P01) in ConflictException on create', async () => {
      const err = Object.assign(new Error('exclusion_violation'), { code: '23P01' });
      withTenant.mockRejectedValueOnce(err);
      await expect(
        service.create({
          locationId: 'loc1',
          staffId: 'staff1',
          startAt: new Date().toISOString(),
          endAt: new Date().toISOString(),
          bookedVia: 'admin',
          items: [],
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('wraps appointment_no_overlap_per_staff message in ConflictException on reschedule', async () => {
      const err = Object.assign(new Error('appointment_no_overlap_per_staff constraint'), { code: 'P2002' });
      withTenant.mockRejectedValueOnce(err);
      await expect(
        service.reschedule('appt1', {
          startAt: new Date().toISOString(),
          endAt: new Date().toISOString(),
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('does not suppress unrelated DB errors', async () => {
      const err = new Error('connection refused');
      withTenant.mockRejectedValueOnce(err);
      await expect(
        service.create({
          locationId: 'loc1',
          staffId: 'staff1',
          startAt: new Date().toISOString(),
          endAt: new Date().toISOString(),
          bookedVia: 'admin',
          items: [],
        }),
      ).rejects.toThrow('connection refused');
    });
  });

  // ── noShowRisk scoring ────────────────────────────────────────────────────

  describe('noShowRisk scoring (via cancel)', () => {
    async function cancelAndCaptureRiskUpdate(recentAppointments: { status: string; startAt: Date }[]) {
      const existing = { id: 'appt1', status: 'CONFIRMED', clientId: 'c1' };
      prisma.appointment.findFirst.mockResolvedValue(existing);
      prisma.appointment.update.mockResolvedValue({ ...existing, status: 'NO_SHOW', items: [] });
      prisma.appointment.findMany.mockResolvedValue(recentAppointments);
      await service.cancel('appt1', { noShow: true });
      const updateCall = prisma.client.update.mock.calls.find(
        (c) => c[0]?.where?.id === 'c1' && c[0]?.data?.noShowRisk !== undefined,
      );
      return updateCall ? (updateCall[0] as { data: { noShowRisk: number | null } }).data.noShowRisk : undefined;
    }

    it('sets noShowRisk to null when fewer than 3 appointments', async () => {
      const risk = await cancelAndCaptureRiskUpdate([
        { status: 'NO_SHOW', startAt: new Date() },
        { status: 'COMPLETED', startAt: new Date() },
      ]);
      expect(risk).toBeNull();
    });

    it('computes a score > 0 for all no-shows', async () => {
      const recent = Array.from({ length: 5 }, () => ({ status: 'NO_SHOW', startAt: new Date() }));
      const risk = await cancelAndCaptureRiskUpdate(recent);
      expect(risk).toBeGreaterThan(0);
    });

    it('computes score = 0 for all completed', async () => {
      const recent = Array.from({ length: 5 }, () => ({ status: 'COMPLETED', startAt: new Date() }));
      const risk = await cancelAndCaptureRiskUpdate(recent);
      expect(risk).toBe(0);
    });

    it('caps score at 100', async () => {
      const recent = Array.from({ length: 20 }, () => ({ status: 'NO_SHOW', startAt: new Date() }));
      const risk = await cancelAndCaptureRiskUpdate(recent);
      expect(risk).toBeLessThanOrEqual(100);
    });
  });
});
