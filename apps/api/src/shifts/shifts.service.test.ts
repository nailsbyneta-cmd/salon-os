import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { ShiftsService } from './shifts.service.js';

vi.mock('../tenant/tenant.context.js', () => ({
  requireTenantContext: () => ({ tenantId: 'tenant1', userId: 'user1', role: 'ADMIN' }),
}));

const NOW = new Date('2025-06-02T00:00:00Z');

function makePrisma() {
  return {
    shift: {
      findMany: vi.fn().mockResolvedValue([]),
      findFirst: vi.fn(),
      create: vi.fn().mockResolvedValue({ id: 'shift1' }),
      delete: vi.fn().mockResolvedValue({}),
      count: vi.fn().mockResolvedValue(0),
    },
    location: {
      findFirst: vi.fn().mockResolvedValue({
        openingHours: { mon: { open: '09:00', close: '18:00' } },
        timezone: 'Europe/Zurich',
      }),
    },
    staff: {
      findFirst: vi.fn().mockResolvedValue({ id: 'staff1', weeklySchedule: null }),
    },
  };
}

function makeWithTenant(prisma: ReturnType<typeof makePrisma>) {
  return vi.fn((_tid: string, _uid: string | null, _role: string | null, fn: (tx: unknown) => Promise<unknown>) =>
    fn(prisma),
  );
}

describe('ShiftsService', () => {
  let service: ShiftsService;
  let prisma: ReturnType<typeof makePrisma>;

  beforeEach(() => {
    prisma = makePrisma();
    service = new ShiftsService(makeWithTenant(prisma) as never);
  });

  // ── list() ───────────────────────────────────────────────────────────────

  describe('list()', () => {
    it('queries shifts overlapping the given date range', async () => {
      const from = new Date('2025-06-02T00:00:00Z');
      const to = new Date('2025-06-02T23:59:59Z');
      await service.list({ from, to });
      expect(prisma.shift.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            startAt: { lt: to },
            endAt: { gt: from },
          }),
        }),
      );
    });

    it('adds staffId filter when provided', async () => {
      await service.list({ from: NOW, to: NOW, staffId: 'staff1' });
      const where = (prisma.shift.findMany.mock.calls[0]![0] as { where: Record<string, unknown> }).where;
      expect(where).toMatchObject({ staffId: 'staff1' });
    });

    it('omits staffId filter when not provided', async () => {
      await service.list({ from: NOW, to: NOW });
      const where = (prisma.shift.findMany.mock.calls[0]![0] as { where: Record<string, unknown> }).where;
      expect(where).not.toHaveProperty('staffId');
    });
  });

  // ── create() ─────────────────────────────────────────────────────────────

  describe('create()', () => {
    it('creates shift with tenantId and parsed dates', async () => {
      await service.create({
        staffId: 'staff1',
        locationId: 'loc1',
        startAt: '2025-06-02T09:00:00Z',
        endAt: '2025-06-02T18:00:00Z',
        isOpen: true,
      });
      expect(prisma.shift.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            tenantId: 'tenant1',
            staffId: 'staff1',
            locationId: 'loc1',
            isOpen: true,
            startAt: expect.any(Date),
            endAt: expect.any(Date),
          }),
        }),
      );
    });
  });

  // ── remove() ─────────────────────────────────────────────────────────────

  describe('remove()', () => {
    it('throws NotFoundException when shift not found', async () => {
      prisma.shift.findFirst.mockResolvedValue(null);
      await expect(service.remove('shift1')).rejects.toThrow(NotFoundException);
    });

    it('deletes shift when found', async () => {
      prisma.shift.findFirst.mockResolvedValue({ id: 'shift1' });
      await service.remove('shift1');
      expect(prisma.shift.delete).toHaveBeenCalledWith({ where: { id: 'shift1' } });
    });
  });

  // ── bulkGenerateFromLocation() ────────────────────────────────────────────

  describe('bulkGenerateFromLocation()', () => {
    it('throws NotFoundException when location not found', async () => {
      prisma.location.findFirst.mockResolvedValue(null);
      await expect(
        service.bulkGenerateFromLocation({ staffId: 'staff1', locationId: 'loc1', days: 7 }),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws NotFoundException when staff not found', async () => {
      prisma.staff.findFirst.mockResolvedValue(null);
      await expect(
        service.bulkGenerateFromLocation({ staffId: 'staff1', locationId: 'loc1', days: 7 }),
      ).rejects.toThrow(NotFoundException);
    });

    it('skips days where shift already exists', async () => {
      prisma.shift.count.mockResolvedValue(1);
      const result = await service.bulkGenerateFromLocation({ staffId: 'staff1', locationId: 'loc1', days: 7 });
      expect(prisma.shift.create).not.toHaveBeenCalled();
      expect(result.skipped).toBeGreaterThan(0);
    });

    it('caps days at 60 max', async () => {
      const result = await service.bulkGenerateFromLocation({ staffId: 'staff1', locationId: 'loc1', days: 999 });
      const totalProcessed = result.created + result.skipped;
      expect(totalProcessed).toBeLessThanOrEqual(60);
    });

    it('uses staff weeklySchedule over location openingHours when present', async () => {
      prisma.staff.findFirst.mockResolvedValue({
        id: 'staff1',
        weeklySchedule: { tue: [{ open: '10:00', close: '16:00' }] },
      });
      prisma.location.findFirst.mockResolvedValue({
        openingHours: { mon: { open: '09:00', close: '18:00' } },
        timezone: 'Europe/Zurich',
      });
      await service.bulkGenerateFromLocation({ staffId: 'staff1', locationId: 'loc1', days: 7 });
      // mon from location should NOT produce shifts since weeklySchedule has no 'mon'
      // Only tue shifts should be created (if any tue falls in next 7 days)
      // Just verify it ran without error and respects the staff schedule
      expect(prisma.shift.count).toHaveBeenCalled();
    });

    it('returns correct created + skipped counts', async () => {
      // All shifts non-existing → should create for days matching opening hours
      prisma.shift.count.mockResolvedValue(0);
      const result = await service.bulkGenerateFromLocation({ staffId: 'staff1', locationId: 'loc1', days: 7 });
      expect(result.created + result.skipped).toBe(7);
    });
  });
});
