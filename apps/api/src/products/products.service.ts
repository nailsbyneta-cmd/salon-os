import {
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { PrismaClient, Product } from '@salon-os/db';
import { WITH_TENANT } from '../db/db.module.js';
import { requireTenantContext } from '../tenant/tenant.context.js';

type WithTenantFn = <T>(
  tenantId: string,
  userId: string | null,
  role: string | null,
  fn: (tx: PrismaClient) => Promise<T>,
) => Promise<T>;

export interface CreateProductInput {
  name: string;
  sku?: string;
  brand?: string;
  category?: string;
  barcode?: string;
  type?: 'RETAIL' | 'BACKBAR' | 'BOTH';
  unit?: string;
  costCents?: number;
  retailCents?: number;
  stockLevel?: number;
  reorderAt?: number;
  reorderQty?: number;
  supplier?: string;
}

@Injectable()
export class ProductsService {
  constructor(@Inject(WITH_TENANT) private readonly withTenant: WithTenantFn) {}

  async list(opts: { lowStockOnly?: boolean } = {}): Promise<Product[]> {
    const ctx = requireTenantContext();
    return this.withTenant(ctx.tenantId, ctx.userId, ctx.role, async (tx) => {
      const all = await tx.product.findMany({
        where: { deletedAt: null, active: true },
        orderBy: [{ stockLevel: 'asc' }, { name: 'asc' }],
      });
      if (opts.lowStockOnly) {
        return all.filter((p) => p.stockLevel <= p.reorderAt);
      }
      return all;
    });
  }

  async create(input: CreateProductInput): Promise<Product> {
    const ctx = requireTenantContext();
    return this.withTenant(ctx.tenantId, ctx.userId, ctx.role, async (tx) => {
      return tx.product.create({
        data: {
          tenantId: ctx.tenantId,
          name: input.name,
          sku: input.sku ?? null,
          brand: input.brand ?? null,
          category: input.category ?? null,
          barcode: input.barcode ?? null,
          type: input.type ?? 'RETAIL',
          unit: input.unit ?? null,
          costCents: input.costCents ?? 0,
          retailCents: input.retailCents ?? 0,
          stockLevel: input.stockLevel ?? 0,
          reorderAt: input.reorderAt ?? 0,
          reorderQty: input.reorderQty ?? 0,
          supplier: input.supplier ?? null,
        },
      });
    });
  }

  async adjustStock(id: string, delta: number): Promise<Product> {
    const ctx = requireTenantContext();
    return this.withTenant(ctx.tenantId, ctx.userId, ctx.role, async (tx) => {
      const existing = await tx.product.findFirst({ where: { id } });
      if (!existing) throw new NotFoundException('Produkt nicht gefunden.');
      return tx.product.update({
        where: { id },
        data: { stockLevel: Math.max(0, existing.stockLevel + delta) },
      });
    });
  }

  async softDelete(id: string): Promise<void> {
    const ctx = requireTenantContext();
    await this.withTenant(ctx.tenantId, ctx.userId, ctx.role, async (tx) => {
      await tx.product.update({ where: { id }, data: { deletedAt: new Date(), active: false } });
    });
  }
}
