import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { LocationsService } from './locations.service.js';

vi.mock('../tenant/tenant.context.js', () => ({
  requireTenantContext: () => ({ tenantId: 'tenant1', userId: 'user1', role: 'ADMIN' }),
}));

function makePrisma() {
  return {
    location: {
      findMany: vi.fn().mockResolvedValue([]),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn().mockResolvedValue({}),
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

const BASE_LOCATION = {
  id: 'loc1',
  name: 'Hauptsalon',
  slug: 'hauptsalon',
  countryCode: 'CH',
  timezone: 'Europe/Zurich',
  currency: 'CHF',
  taxConfig: { vatRate: 7.7 },
  openingHours: {
    mon: [{ open: '09:00', close: '18:00' }],
    tue: [{ open: '09:00', close: '18:00' }],
    wed: [{ open: '09:00', close: '18:00' }],
    thu: [{ open: '09:00', close: '18:00' }],
    fri: [{ open: '09:00', close: '18:00' }],
    sat: [],
    sun: [],
  },
  publicProfile: true,
  marketplaceListed: false,
  tenantId: 'tenant1',
  deletedAt: null,
};

describe('LocationsService', () => {
  let service: LocationsService;
  let prisma: ReturnType<typeof makePrisma>;

  beforeEach(() => {
    prisma = makePrisma();
    service = new LocationsService(makeWithTenant(prisma) as never);
  });

  // ── list() ───────────────────────────────────────────────────────────────

  describe('list()', () => {
    it('queries only non-deleted locations ordered by name', async () => {
      await service.list();
      expect(prisma.location.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { deletedAt: null }, orderBy: { name: 'asc' } }),
      );
    });

    it('returns locations array', async () => {
      prisma.location.findMany.mockResolvedValue([BASE_LOCATION]);
      const result = await service.list();
      expect(result).toEqual([BASE_LOCATION]);
    });
  });

  // ── get() ────────────────────────────────────────────────────────────────

  describe('get()', () => {
    it('throws NotFoundException when location not found', async () => {
      prisma.location.findFirst.mockResolvedValue(null);
      await expect(service.get('loc1')).rejects.toThrow(NotFoundException);
    });

    it('returns location when found', async () => {
      prisma.location.findFirst.mockResolvedValue(BASE_LOCATION);
      const result = await service.get('loc1');
      expect(result).toEqual(BASE_LOCATION);
    });

    it('only fetches non-deleted locations', async () => {
      prisma.location.findFirst.mockResolvedValue(BASE_LOCATION);
      await service.get('loc1');
      expect(prisma.location.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'loc1', deletedAt: null } }),
      );
    });
  });

  // ── create() ─────────────────────────────────────────────────────────────

  describe('create()', () => {
    it('creates location with tenantId', async () => {
      prisma.location.create.mockResolvedValue(BASE_LOCATION);
      await service.create(BASE_LOCATION);
      const call = prisma.location.create.mock.calls[0]![0] as { data: { tenantId: string } };
      expect(call.data.tenantId).toBe('tenant1');
    });

    it('sets optional fields to null when not provided', async () => {
      prisma.location.create.mockResolvedValue(BASE_LOCATION);
      await service.create({ ...BASE_LOCATION });
      const call = prisma.location.create.mock.calls[0]![0] as {
        data: { address1: null; city: null; phone: null };
      };
      expect(call.data.address1).toBeNull();
      expect(call.data.city).toBeNull();
      expect(call.data.phone).toBeNull();
    });
  });

  // ── update() ─────────────────────────────────────────────────────────────

  describe('update()', () => {
    it('throws NotFoundException when location not found', async () => {
      prisma.location.findFirst.mockResolvedValue(null);
      await expect(service.update('loc1', { name: 'New Name' })).rejects.toThrow(NotFoundException);
    });

    it('updates location when found', async () => {
      prisma.location.findFirst.mockResolvedValue(BASE_LOCATION);
      prisma.location.update.mockResolvedValue({ ...BASE_LOCATION, name: 'New Name' });
      await service.update('loc1', { name: 'New Name' });
      expect(prisma.location.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'loc1' } }),
      );
    });
  });

  // ── softDelete() ──────────────────────────────────────────────────────────

  describe('softDelete()', () => {
    it('sets deletedAt on the location', async () => {
      await service.softDelete('loc1');
      expect(prisma.location.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'loc1' },
          data: expect.objectContaining({ deletedAt: expect.any(Date) }),
        }),
      );
    });
  });
});
