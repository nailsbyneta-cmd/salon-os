import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { ProductsService } from './products.service.js';

vi.mock('../tenant/tenant.context.js', () => ({
  requireTenantContext: () => ({ tenantId: 'tenant1', userId: 'user1', role: 'ADMIN' }),
}));

function makePrisma() {
  return {
    product: {
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

const BASE_PRODUCT = {
  id: 'prod1',
  name: 'Shellac Base Coat',
  sku: 'SKU-001',
  stockLevel: 10,
  reorderAt: 3,
  reorderQty: 5,
  tenantId: 'tenant1',
  active: true,
  deletedAt: null,
  costCents: 500,
  retailCents: 1500,
  type: 'RETAIL' as const,
};

describe('ProductsService', () => {
  let service: ProductsService;
  let prisma: ReturnType<typeof makePrisma>;

  beforeEach(() => {
    prisma = makePrisma();
    service = new ProductsService(makeWithTenant(prisma) as never);
  });

  // ── list() ───────────────────────────────────────────────────────────────

  describe('list()', () => {
    it('queries only active non-deleted products', async () => {
      await service.list();
      expect(prisma.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { deletedAt: null, active: true } }),
      );
    });

    it('returns all products when lowStockOnly is false', async () => {
      const products = [
        { ...BASE_PRODUCT, stockLevel: 10, reorderAt: 3 },
        { ...BASE_PRODUCT, id: 'prod2', stockLevel: 1, reorderAt: 3 },
      ];
      prisma.product.findMany.mockResolvedValue(products);
      const result = await service.list({ lowStockOnly: false });
      expect(result).toHaveLength(2);
    });

    it('filters low-stock products when lowStockOnly is true', async () => {
      const products = [
        { ...BASE_PRODUCT, stockLevel: 10, reorderAt: 3 }, // ok
        { ...BASE_PRODUCT, id: 'prod2', stockLevel: 2, reorderAt: 3 }, // low
        { ...BASE_PRODUCT, id: 'prod3', stockLevel: 3, reorderAt: 3 }, // exactly at threshold → low
      ];
      prisma.product.findMany.mockResolvedValue(products);
      const result = await service.list({ lowStockOnly: true });
      expect(result).toHaveLength(2);
      expect(result.map((p) => p.id)).toEqual(['prod2', 'prod3']);
    });
  });

  // ── create() ─────────────────────────────────────────────────────────────

  describe('create()', () => {
    it('creates product with tenantId', async () => {
      prisma.product.create.mockResolvedValue(BASE_PRODUCT);
      await service.create({ name: 'Shellac Base Coat' });
      const call = prisma.product.create.mock.calls[0]![0] as { data: { tenantId: string } };
      expect(call.data.tenantId).toBe('tenant1');
    });

    it('defaults type to RETAIL', async () => {
      prisma.product.create.mockResolvedValue(BASE_PRODUCT);
      await service.create({ name: 'Test' });
      const call = prisma.product.create.mock.calls[0]![0] as { data: { type: string } };
      expect(call.data.type).toBe('RETAIL');
    });

    it('defaults numeric fields to 0', async () => {
      prisma.product.create.mockResolvedValue(BASE_PRODUCT);
      await service.create({ name: 'Test' });
      const call = prisma.product.create.mock.calls[0]![0] as {
        data: {
          costCents: number;
          retailCents: number;
          stockLevel: number;
          reorderAt: number;
          reorderQty: number;
        };
      };
      expect(call.data.costCents).toBe(0);
      expect(call.data.retailCents).toBe(0);
      expect(call.data.stockLevel).toBe(0);
      expect(call.data.reorderAt).toBe(0);
      expect(call.data.reorderQty).toBe(0);
    });

    it('uses provided sku and brand', async () => {
      prisma.product.create.mockResolvedValue(BASE_PRODUCT);
      await service.create({ name: 'Test', sku: 'SKU-999', brand: 'CND' });
      const call = prisma.product.create.mock.calls[0]![0] as {
        data: { sku: string; brand: string };
      };
      expect(call.data.sku).toBe('SKU-999');
      expect(call.data.brand).toBe('CND');
    });
  });

  // ── adjustStock() ─────────────────────────────────────────────────────────

  describe('adjustStock()', () => {
    it('throws NotFoundException when product not found', async () => {
      prisma.product.findFirst.mockResolvedValue(null);
      await expect(
        service.adjustStock('prod1', { delta: 5, reason: 'ADJUSTMENT' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('adds positive delta to stockLevel', async () => {
      prisma.product.findFirst.mockResolvedValue({ ...BASE_PRODUCT, stockLevel: 10 });
      await service.adjustStock('prod1', { delta: 5, reason: 'ADJUSTMENT' });
      expect(prisma.product.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { stockLevel: 15 } }),
      );
    });

    it('subtracts negative delta from stockLevel', async () => {
      prisma.product.findFirst.mockResolvedValue({ ...BASE_PRODUCT, stockLevel: 10 });
      await service.adjustStock('prod1', { delta: -3, reason: 'ADJUSTMENT' });
      expect(prisma.product.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { stockLevel: 7 } }),
      );
    });

    it('clamps stockLevel to minimum 0 (no negative stock)', async () => {
      prisma.product.findFirst.mockResolvedValue({ ...BASE_PRODUCT, stockLevel: 2 });
      await service.adjustStock('prod1', { delta: -10, reason: 'ADJUSTMENT' });
      expect(prisma.product.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { stockLevel: 0 } }),
      );
    });
  });

  // ── softDelete() ──────────────────────────────────────────────────────────

  describe('softDelete()', () => {
    it('sets deletedAt and active=false', async () => {
      await service.softDelete('prod1');
      expect(prisma.product.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'prod1' },
          data: expect.objectContaining({ deletedAt: expect.any(Date), active: false }),
        }),
      );
    });
  });
});
