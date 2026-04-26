import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import type { PrismaClient } from '@salon-os/db';
import { createServiceSchema, updateServiceSchema } from '@salon-os/types';
import { ServicesService } from '../../src/services/services.service.js';
import { startTestPostgres, type TestPostgresHandle } from '../test-postgres.js';

describe('ServicesService (behavior)', () => {
  let h: TestPostgresHandle;
  let service: ServicesService;
  let prisma: PrismaClient;

  beforeAll(async () => {
    h = await startTestPostgres();
    prisma = h.prisma;
    service = new ServicesService(h.withTenant);
  });

  afterAll(async () => {
    if (h) await h.stop();
  });

  beforeEach(async () => {
    await h.truncateAll();
  });

  function baseInput(
    overrides: Record<string, unknown> = {},
  ): Parameters<ServicesService['create']>[0] {
    return createServiceSchema.parse({
      categoryId: h.seed.serviceCategoryId,
      name: 'Shellac',
      slug: 'shellac',
      durationMinutes: 60,
      basePrice: 80,
      ...overrides,
    });
  }

  describe('create()', () => {
    it('persists service with tenant_id from context', async () => {
      const created = await h.asTenant(h.seed.tenantId, h.seed.staffUserId, 'OWNER', () =>
        service.create(baseInput()),
      );
      expect(created.id).toBeDefined();
      expect(created.tenantId).toBe(h.seed.tenantId);

      const dbRow = await prisma.service.findUnique({ where: { id: created.id } });
      expect(dbRow!.basePrice.toString()).toBe('80');
      expect(dbRow!.durationMinutes).toBe(60);
    });

    it('rejects duplicate slug per tenant', async () => {
      await h.asTenant(h.seed.tenantId, h.seed.staffUserId, 'OWNER', () =>
        service.create(baseInput()),
      );
      await expect(
        h.asTenant(h.seed.tenantId, h.seed.staffUserId, 'OWNER', () =>
          service.create(baseInput({ name: 'Shellac 2' })),
        ),
      ).rejects.toThrow();
    });
  });

  describe('list()', () => {
    it('returns only own-tenant services (RLS isolation)', async () => {
      await h.asTenant(h.seed.tenantId, h.seed.staffUserId, 'OWNER', () =>
        service.create(baseInput({ name: 'In', slug: 'in-tenant' })),
      );

      // Sekundärer Tenant + Service direkt via Prisma
      const otherTenantId = '00000000-0000-0000-0000-0000000000ff';
      await prisma.tenant.create({
        data: {
          id: otherTenantId,
          name: 'Other',
          slug: 'other',
          countryCode: 'CH',
          currency: 'CHF',
          timezone: 'Europe/Zurich',
          locale: 'de-CH',
        },
      });
      const otherCategoryId = '00000000-0000-0000-0000-0000000000fe';
      await prisma.serviceCategory.create({
        data: { id: otherCategoryId, tenantId: otherTenantId, name: 'Other-Cat' },
      });
      await prisma.service.create({
        data: {
          tenantId: otherTenantId,
          categoryId: otherCategoryId,
          name: 'Out',
          slug: 'out',
          durationMinutes: 30,
          basePrice: 10,
        },
      });

      const list = await h.asTenant(h.seed.tenantId, h.seed.staffUserId, 'OWNER', () =>
        service.list(),
      );
      const slugs = list.map((s) => s.slug);
      expect(slugs).toContain('in-tenant');
      expect(slugs).not.toContain('out');
    });

    it('filters by bookable=true', async () => {
      await h.asTenant(h.seed.tenantId, h.seed.staffUserId, 'OWNER', async () => {
        await service.create(baseInput({ name: 'Bookable', slug: 'bookable', bookable: true }));
        await service.create(
          baseInput({ name: 'NotBookable', slug: 'not-bookable', bookable: false }),
        );
      });

      const result = await h.asTenant(h.seed.tenantId, h.seed.staffUserId, 'OWNER', () =>
        service.list({ bookable: true }),
      );
      expect(result.length).toBe(1);
      expect(result[0]!.slug).toBe('bookable');
    });

    it('filters by categoryId', async () => {
      // Erstelle 2. Kategorie
      const otherCat = await h.asTenant(h.seed.tenantId, h.seed.staffUserId, 'OWNER', () =>
        service.createCategory('OtherCat'),
      );
      await h.asTenant(h.seed.tenantId, h.seed.staffUserId, 'OWNER', async () => {
        await service.create(baseInput({ slug: 'cat-a' }));
        await service.create(baseInput({ slug: 'cat-b', categoryId: otherCat.id }));
      });

      const result = await h.asTenant(h.seed.tenantId, h.seed.staffUserId, 'OWNER', () =>
        service.list({ categoryId: otherCat.id }),
      );
      expect(result.length).toBe(1);
      expect(result[0]!.slug).toBe('cat-b');
    });
  });

  describe('update()', () => {
    it('throws NotFoundException for unknown id', async () => {
      await expect(
        h.asTenant(h.seed.tenantId, h.seed.staffUserId, 'OWNER', () =>
          service.update(
            '00000000-0000-0000-0000-0000000000ee',
            updateServiceSchema.parse({ name: 'X' }),
          ),
        ),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('updates basePrice and persists', async () => {
      const created = await h.asTenant(h.seed.tenantId, h.seed.staffUserId, 'OWNER', () =>
        service.create(baseInput()),
      );
      const updated = await h.asTenant(h.seed.tenantId, h.seed.staffUserId, 'OWNER', () =>
        service.update(created.id, updateServiceSchema.parse({ basePrice: 99 })),
      );
      expect(updated.basePrice.toString()).toBe('99');
      const dbRow = await prisma.service.findUnique({ where: { id: created.id } });
      expect(dbRow!.basePrice.toString()).toBe('99');
    });
  });

  describe('softDelete()', () => {
    it('sets deletedAt and excludes from list', async () => {
      const created = await h.asTenant(h.seed.tenantId, h.seed.staffUserId, 'OWNER', () =>
        service.create(baseInput()),
      );
      await h.asTenant(h.seed.tenantId, h.seed.staffUserId, 'OWNER', () =>
        service.softDelete(created.id),
      );
      const list = await h.asTenant(h.seed.tenantId, h.seed.staffUserId, 'OWNER', () =>
        service.list(),
      );
      expect(list.find((s) => s.id === created.id)).toBeUndefined();
      const raw = await prisma.service.findUnique({ where: { id: created.id } });
      expect(raw!.deletedAt).not.toBeNull();
    });
  });

  describe('createCategory()', () => {
    it('persists category with tenant_id', async () => {
      const cat = await h.asTenant(h.seed.tenantId, h.seed.staffUserId, 'OWNER', () =>
        service.createCategory('NewCat', 5),
      );
      expect(cat.tenantId).toBe(h.seed.tenantId);
      expect(cat.order).toBe(5);
    });
  });
});
