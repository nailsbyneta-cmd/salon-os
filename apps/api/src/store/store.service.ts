import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { PrismaClient } from '@salon-os/db';
import { WITH_TENANT } from '../db/db.module.js';

type WithTenantFn = <T>(
  tenantId: string,
  userId: string | null,
  role: string | null,
  fn: (tx: PrismaClient) => Promise<T>,
) => Promise<T>;

export interface PublicProduct {
  id: string;
  name: string;
  sku: string | null;
  brand: string | null;
  description: string | null;
  retailCents: number;
  stockLevel: number;
  inStock: boolean;
}

@Injectable()
export class StoreService {
  constructor(
    @Inject('PRISMA_PUBLIC') private readonly prismaPublic: PrismaClient,
    @Inject(WITH_TENANT) private readonly withTenant: WithTenantFn,
  ) {}

  /** Resolves tenant by slug — same logic as public-bookings. */
  private async resolveTenant(slug: string): Promise<{ id: string }> {
    const tenant = await this.prismaPublic.tenant.findUnique({
      where: { slug },
      select: { id: true, status: true },
    });
    if (!tenant || tenant.status === 'SUSPENDED' || tenant.status === 'CANCELLED') {
      throw new NotFoundException(`Unknown or inactive tenant: ${slug}`);
    }
    return { id: tenant.id };
  }

  async listProducts(slug: string): Promise<PublicProduct[]> {
    const tenant = await this.resolveTenant(slug);
    return this.withTenant(tenant.id, null, null, async (tx) => {
      const rows = await tx.product.findMany({
        where: {
          deletedAt: null,
          active: true,
          type: 'RETAIL',
        },
        orderBy: [{ brand: 'asc' }, { name: 'asc' }],
        select: {
          id: true,
          name: true,
          sku: true,
          brand: true,
          retailCents: true,
          stockLevel: true,
        },
      });

      return rows.map((p) => ({
        id: p.id,
        name: p.name,
        sku: p.sku ?? null,
        brand: p.brand ?? null,
        description: null,
        retailCents: p.retailCents,
        stockLevel: p.stockLevel,
        inStock: p.stockLevel > 0,
      }));
    });
  }
}
