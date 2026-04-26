import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { ServicesService } from './services.service.js';

vi.mock('../tenant/tenant.context.js', () => ({
  requireTenantContext: () => ({ tenantId: 'tenant1', userId: 'user1', role: 'ADMIN' }),
}));

function makePrisma() {
  return {
    service: {
      findMany: vi.fn().mockResolvedValue([]),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn().mockResolvedValue({}),
    },
    serviceCategory: {
      findMany: vi.fn().mockResolvedValue([]),
      create: vi.fn(),
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

const BASE_SERVICE = {
  id: 'svc1',
  categoryId: '00000000-0000-0000-0000-000000000001',
  name: 'Shellac',
  slug: 'shellac',
  durationMinutes: 60,
  bufferBeforeMin: 0,
  bufferAfterMin: 10,
  basePrice: 80,
  bookable: true,
  requiresConsult: false,
  requiresPatchTest: false,
  order: 0,
  processingTimeMin: 0,
  activeTimeBefore: 0,
  activeTimeAfter: 0,
};

describe('ServicesService', () => {
  let service: ServicesService;
  let prisma: ReturnType<typeof makePrisma>;

  beforeEach(() => {
    prisma = makePrisma();
    const withTenant = makeWithTenant(prisma);
    service = new ServicesService(withTenant as never);
  });

  // ── list() ───────────────────────────────────────────────────────────────

  describe('list()', () => {
    it('returns all non-deleted services', async () => {
      prisma.service.findMany.mockResolvedValue([BASE_SERVICE]);
      const result = await service.list();
      expect(result).toEqual([BASE_SERVICE]);
      expect(prisma.service.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ deletedAt: null }) }),
      );
    });

    it('filters by bookable when provided', async () => {
      prisma.service.findMany.mockResolvedValue([]);
      await service.list({ bookable: true });
      expect(prisma.service.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ bookable: true }) }),
      );
    });

    it('filters by categoryId when provided', async () => {
      prisma.service.findMany.mockResolvedValue([]);
      await service.list({ categoryId: 'cat1' });
      expect(prisma.service.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ categoryId: 'cat1' }) }),
      );
    });

    it('does not add bookable filter when not provided', async () => {
      await service.list({});
      const where = (
        prisma.service.findMany.mock.calls[0]![0] as { where: Record<string, unknown> }
      ).where;
      expect(where).not.toHaveProperty('bookable');
    });
  });

  // ── get() ────────────────────────────────────────────────────────────────

  describe('get()', () => {
    it('throws NotFoundException when service not found', async () => {
      prisma.service.findFirst.mockResolvedValue(null);
      await expect(service.get('svc1')).rejects.toThrow(NotFoundException);
    });

    it('returns service when found', async () => {
      prisma.service.findFirst.mockResolvedValue(BASE_SERVICE);
      const result = await service.get('svc1');
      expect(result).toEqual(BASE_SERVICE);
    });
  });

  // ── create() ─────────────────────────────────────────────────────────────

  describe('create()', () => {
    it('creates service with tenantId', async () => {
      prisma.service.create.mockResolvedValue({ ...BASE_SERVICE, tenantId: 'tenant1' });
      await service.create({ ...BASE_SERVICE, taxClass: undefined, gender: undefined, color: undefined });
      const call = prisma.service.create.mock.calls[0]![0] as { data: { tenantId: string } };
      expect(call.data.tenantId).toBe('tenant1');
    });

    it('sets description to null when not provided', async () => {
      prisma.service.create.mockResolvedValue(BASE_SERVICE);
      await service.create({ ...BASE_SERVICE });
      const call = prisma.service.create.mock.calls[0]![0] as { data: { description: null } };
      expect(call.data.description).toBeNull();
    });
  });

  // ── update() ─────────────────────────────────────────────────────────────

  describe('update()', () => {
    it('throws NotFoundException when service not found', async () => {
      prisma.service.findFirst.mockResolvedValue(null);
      await expect(service.update('svc1', { name: 'New Name' })).rejects.toThrow(NotFoundException);
    });

    it('updates service when found', async () => {
      prisma.service.findFirst.mockResolvedValue(BASE_SERVICE);
      prisma.service.update.mockResolvedValue({ ...BASE_SERVICE, name: 'New Name' });
      const result = await service.update('svc1', { name: 'New Name' });
      expect(result.name).toBe('New Name');
    });
  });

  // ── softDelete() ──────────────────────────────────────────────────────────

  describe('softDelete()', () => {
    it('sets deletedAt on the service', async () => {
      await service.softDelete('svc1');
      expect(prisma.service.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ deletedAt: expect.any(Date) }) }),
      );
    });

    it('targets the correct service id', async () => {
      await service.softDelete('svc1');
      expect(prisma.service.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'svc1' } }),
      );
    });
  });

  // ── listCategories() / createCategory() ──────────────────────────────────

  describe('listCategories()', () => {
    it('returns categories ordered by order then name', async () => {
      const cats = [{ id: 'cat1', name: 'Nails', order: 0 }];
      prisma.serviceCategory.findMany.mockResolvedValue(cats);
      const result = await service.listCategories();
      expect(result).toEqual(cats);
    });
  });

  describe('createCategory()', () => {
    it('creates category with tenantId and default order 0', async () => {
      const cat = { id: 'cat1', name: 'Nails', order: 0, tenantId: 'tenant1' };
      prisma.serviceCategory.create.mockResolvedValue(cat);
      await service.createCategory('Nails');
      const call = prisma.serviceCategory.create.mock.calls[0]![0] as {
        data: { tenantId: string; name: string; order: number };
      };
      expect(call.data.tenantId).toBe('tenant1');
      expect(call.data.name).toBe('Nails');
      expect(call.data.order).toBe(0);
    });
  });
});
