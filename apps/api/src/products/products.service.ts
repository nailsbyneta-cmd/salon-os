import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { PrismaClient, Product, StockMutation, StockMutationReason } from '@salon-os/db';
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

export interface AdjustStockInput {
  delta: number;
  reason: StockMutationReason;
  notes?: string;
  appointmentId?: string;
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
      const product = await tx.product.create({
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
      // Initial-Mutation falls Anfangs-Bestand > 0 — fürs Audit-Trail
      if ((input.stockLevel ?? 0) > 0) {
        await tx.stockMutation.create({
          data: {
            tenantId: ctx.tenantId,
            productId: product.id,
            delta: input.stockLevel ?? 0,
            stockAfter: input.stockLevel ?? 0,
            reason: 'INITIAL',
            notes: 'Initial-Bestand bei Anlage',
            performedBy: ctx.userId,
          },
        });
      }
      return product;
    });
  }

  /**
   * Atomic stock-mutation: berechnet neuen Wert, schreibt Mutation +
   * updated Product im selben Tx. Negative Mutation darf nicht unter 0
   * fallen (clamping bei delta zu negativ → 0).
   */
  async adjustStock(id: string, input: AdjustStockInput): Promise<Product> {
    const ctx = requireTenantContext();
    return this.withTenant(ctx.tenantId, ctx.userId, ctx.role, async (tx) => {
      const existing = await tx.product.findFirst({ where: { id } });
      if (!existing) throw new NotFoundException('Produkt nicht gefunden.');
      const newStock = Math.max(0, existing.stockLevel + input.delta);
      const realDelta = newStock - existing.stockLevel;
      const updated = await tx.product.update({
        where: { id },
        data: { stockLevel: newStock },
      });
      await tx.stockMutation.create({
        data: {
          tenantId: ctx.tenantId,
          productId: id,
          delta: realDelta,
          stockAfter: newStock,
          reason: input.reason,
          notes: input.notes ?? null,
          performedBy: ctx.userId,
          appointmentId: input.appointmentId ?? null,
        },
      });
      return updated;
    });
  }

  async listMutations(productId: string, limit = 50): Promise<StockMutation[]> {
    const ctx = requireTenantContext();
    return this.withTenant(ctx.tenantId, ctx.userId, ctx.role, async (tx) => {
      return tx.stockMutation.findMany({
        where: { productId },
        orderBy: { createdAt: 'desc' },
        take: Math.min(Math.max(1, limit), 200),
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
