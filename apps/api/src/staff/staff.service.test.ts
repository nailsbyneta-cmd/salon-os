import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { StaffService } from './staff.service.js';

vi.mock('../tenant/tenant.context.js', () => ({
  requireTenantContext: () => ({ tenantId: 'tenant1', userId: 'user1', role: 'ADMIN' }),
}));

function makePrisma() {
  return {
    staff: {
      findMany: vi.fn().mockResolvedValue([]),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn().mockResolvedValue({}),
    },
    user: {
      upsert: vi.fn().mockResolvedValue({ id: 'user1' }),
    },
    staffLocation: {
      deleteMany: vi.fn().mockResolvedValue({}),
      createMany: vi.fn().mockResolvedValue({}),
    },
    staffService: {
      deleteMany: vi.fn().mockResolvedValue({}),
      createMany: vi.fn().mockResolvedValue({}),
    },
  };
}

function makeWithTenant(prisma: ReturnType<typeof makePrisma>) {
  return vi.fn(
    (
      _tid: string,
      _uid: string | null,
      _role: string | null,
      fn: (tx: unknown) => Promise<unknown>,
    ) => fn(prisma),
  );
}

function makeAudit() {
  return { withinTx: vi.fn().mockResolvedValue(undefined) };
}

const BASE_STAFF = {
  id: 'staff1',
  firstName: 'Neta',
  lastName: 'Muster',
  email: 'neta@salon.ch',
  role: 'STYLIST' as const,
  employmentType: 'EMPLOYEE' as const,
  active: true,
  tenantId: 'tenant1',
  userId: 'user1',
  locationIds: ['loc1'],
  serviceIds: ['svc1'],
};

describe('StaffService', () => {
  let service: StaffService;
  let prisma: ReturnType<typeof makePrisma>;
  let audit: ReturnType<typeof makeAudit>;

  beforeEach(() => {
    prisma = makePrisma();
    const withTenant = makeWithTenant(prisma);
    audit = makeAudit();
    service = new StaffService(withTenant as never, audit as never);
  });

  // ── list() ───────────────────────────────────────────────────────────────

  describe('list()', () => {
    it('filters only active staff by default', async () => {
      await service.list();
      const where = (prisma.staff.findMany.mock.calls[0]![0] as { where: Record<string, unknown> })
        .where;
      expect(where).toMatchObject({ active: true, deletedAt: null });
    });

    it('filters by active=false when specified', async () => {
      await service.list({ active: false });
      const where = (prisma.staff.findMany.mock.calls[0]![0] as { where: Record<string, unknown> })
        .where;
      expect(where).toMatchObject({ active: false });
    });

    it('adds locationAssignments filter when locationId given', async () => {
      await service.list({ locationId: 'loc1' });
      const where = (prisma.staff.findMany.mock.calls[0]![0] as { where: Record<string, unknown> })
        .where;
      expect(where).toMatchObject({ locationAssignments: { some: { locationId: 'loc1' } } });
    });

    it('does not add locationAssignments filter when no locationId', async () => {
      await service.list();
      const where = (prisma.staff.findMany.mock.calls[0]![0] as { where: Record<string, unknown> })
        .where;
      expect(where).not.toHaveProperty('locationAssignments');
    });
  });

  // ── get() ────────────────────────────────────────────────────────────────

  describe('get()', () => {
    it('throws NotFoundException when staff not found', async () => {
      prisma.staff.findFirst.mockResolvedValue(null);
      await expect(service.get('staff1')).rejects.toThrow(NotFoundException);
    });

    it('returns staff with serviceIds extracted', async () => {
      prisma.staff.findFirst.mockResolvedValue({
        ...BASE_STAFF,
        services: [{ serviceId: 'svc1' }, { serviceId: 'svc2' }],
      });
      const result = await service.get('staff1');
      expect(result.serviceIds).toEqual(['svc1', 'svc2']);
      expect(result).not.toHaveProperty('services');
    });

    it('returns empty serviceIds when no services assigned', async () => {
      prisma.staff.findFirst.mockResolvedValue({ ...BASE_STAFF, services: [] });
      const result = await service.get('staff1');
      expect(result.serviceIds).toEqual([]);
    });
  });

  // ── create() ─────────────────────────────────────────────────────────────

  describe('create()', () => {
    it('upserts user when no userId provided', async () => {
      const { userId: _u, ...inputWithoutUserId } = BASE_STAFF;
      prisma.staff.create.mockResolvedValue(BASE_STAFF);
      await service.create(inputWithoutUserId as never);
      expect(prisma.user.upsert).toHaveBeenCalledWith(
        expect.objectContaining({ where: { email: BASE_STAFF.email } }),
      );
    });

    it('skips user upsert when userId already provided', async () => {
      prisma.staff.create.mockResolvedValue(BASE_STAFF);
      await service.create({ ...BASE_STAFF, userId: 'existing-user' });
      expect(prisma.user.upsert).not.toHaveBeenCalled();
    });

    it('sets first location as isPrimary', async () => {
      prisma.staff.create.mockResolvedValue(BASE_STAFF);
      await service.create({ ...BASE_STAFF, locationIds: ['loc1', 'loc2'] });
      const createCall = prisma.staff.create.mock.calls[0]![0] as {
        data: {
          locationAssignments: { create: Array<{ locationId: string; isPrimary: boolean }> };
        };
      };
      expect(createCall.data.locationAssignments.create[0]!.isPrimary).toBe(true);
      expect(createCall.data.locationAssignments.create[1]!.isPrimary).toBe(false);
    });

    it('writes audit log on create', async () => {
      prisma.staff.create.mockResolvedValue(BASE_STAFF);
      await service.create(BASE_STAFF);
      expect(audit.withinTx).toHaveBeenCalledWith(
        expect.anything(),
        'tenant1',
        'user1',
        expect.objectContaining({ action: 'create', entity: 'Staff' }),
      );
    });
  });

  // ── update() ─────────────────────────────────────────────────────────────

  describe('update()', () => {
    it('throws NotFoundException when staff not found', async () => {
      prisma.staff.findFirst.mockResolvedValue(null);
      await expect(service.update('staff1', { firstName: 'New' })).rejects.toThrow(
        NotFoundException,
      );
    });

    it('replaces location assignments when locationIds provided', async () => {
      prisma.staff.findFirst.mockResolvedValue(BASE_STAFF);
      prisma.staff.update.mockResolvedValue({ ...BASE_STAFF, firstName: 'New' });
      await service.update('staff1', { locationIds: ['loc2'] });
      expect(prisma.staffLocation.deleteMany).toHaveBeenCalledWith({
        where: { staffId: 'staff1' },
      });
      expect(prisma.staffLocation.createMany).toHaveBeenCalled();
    });

    it('replaces service assignments when serviceIds provided', async () => {
      prisma.staff.findFirst.mockResolvedValue(BASE_STAFF);
      prisma.staff.update.mockResolvedValue(BASE_STAFF);
      await service.update('staff1', { serviceIds: ['svc2'] });
      expect(prisma.staffService.deleteMany).toHaveBeenCalledWith({ where: { staffId: 'staff1' } });
      expect(prisma.staffService.createMany).toHaveBeenCalled();
    });

    it('does not touch locations when locationIds not in input', async () => {
      prisma.staff.findFirst.mockResolvedValue(BASE_STAFF);
      prisma.staff.update.mockResolvedValue({ ...BASE_STAFF, active: false });
      await service.update('staff1', { active: false });
      expect(prisma.staffLocation.deleteMany).not.toHaveBeenCalled();
    });

    it('writes audit log only when something changed', async () => {
      const staff = { ...BASE_STAFF, firstName: 'Old' };
      prisma.staff.findFirst.mockResolvedValue(staff);
      prisma.staff.update.mockResolvedValue({ ...staff, firstName: 'New' });
      await service.update('staff1', { firstName: 'New' });
      expect(audit.withinTx).toHaveBeenCalledWith(
        expect.anything(),
        'tenant1',
        'user1',
        expect.objectContaining({ action: 'update' }),
      );
    });
  });

  // ── softDelete() ──────────────────────────────────────────────────────────

  describe('softDelete()', () => {
    it('sets deletedAt and active=false', async () => {
      await service.softDelete('staff1');
      expect(prisma.staff.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'staff1' },
          data: expect.objectContaining({ deletedAt: expect.any(Date), active: false }),
        }),
      );
    });

    it('writes audit log on soft-delete', async () => {
      await service.softDelete('staff1');
      expect(audit.withinTx).toHaveBeenCalledWith(
        expect.anything(),
        'tenant1',
        'user1',
        expect.objectContaining({ action: 'soft-delete', entityId: 'staff1' }),
      );
    });
  });

  // ── setWeeklySchedule() ───────────────────────────────────────────────────

  describe('setWeeklySchedule()', () => {
    it('throws NotFoundException when staff not found', async () => {
      prisma.staff.findFirst.mockResolvedValue(null);
      await expect(service.setWeeklySchedule('staff1', {} as never)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('saves schedule to weeklySchedule field', async () => {
      prisma.staff.findFirst.mockResolvedValue(BASE_STAFF);
      const schedule = { mon: [{ open: '09:00', close: '18:00' }] } as never;
      prisma.staff.update.mockResolvedValue({ ...BASE_STAFF, weeklySchedule: schedule });
      await service.setWeeklySchedule('staff1', schedule);
      expect(prisma.staff.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ weeklySchedule: schedule }) }),
      );
    });
  });
});
