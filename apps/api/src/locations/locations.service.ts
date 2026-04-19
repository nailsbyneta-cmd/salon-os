import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { PrismaClient, Location } from '@salon-os/db';
import type { CreateLocationInput, UpdateLocationInput } from '@salon-os/types';
import { WITH_TENANT } from '../db/db.module.js';
import { requireTenantContext } from '../tenant/tenant.context.js';

type WithTenantFn = <T>(
  tenantId: string,
  userId: string | null,
  role: string | null,
  fn: (tx: PrismaClient) => Promise<T>,
) => Promise<T>;

@Injectable()
export class LocationsService {
  constructor(@Inject(WITH_TENANT) private readonly withTenant: WithTenantFn) {}

  async list(): Promise<Location[]> {
    const ctx = requireTenantContext();
    return this.withTenant(ctx.tenantId, ctx.userId, ctx.role, async (tx) => {
      return tx.location.findMany({
        where: { deletedAt: null },
        orderBy: { name: 'asc' },
      });
    });
  }

  async get(id: string): Promise<Location> {
    const ctx = requireTenantContext();
    return this.withTenant(ctx.tenantId, ctx.userId, ctx.role, async (tx) => {
      const loc = await tx.location.findFirst({ where: { id, deletedAt: null } });
      if (!loc) throw new NotFoundException(`Location ${id} not found`);
      return loc;
    });
  }

  async create(input: CreateLocationInput): Promise<Location> {
    const ctx = requireTenantContext();
    return this.withTenant(ctx.tenantId, ctx.userId, ctx.role, async (tx) => {
      return tx.location.create({
        data: {
          tenantId: ctx.tenantId,
          name: input.name,
          slug: input.slug,
          address1: input.address1 ?? null,
          address2: input.address2 ?? null,
          city: input.city ?? null,
          postalCode: input.postalCode ?? null,
          region: input.region ?? null,
          countryCode: input.countryCode,
          latitude: input.latitude ?? null,
          longitude: input.longitude ?? null,
          phone: input.phone ?? null,
          email: input.email ?? null,
          timezone: input.timezone,
          currency: input.currency,
          taxConfig: input.taxConfig,
          openingHours: input.openingHours,
          publicProfile: input.publicProfile,
          marketplaceListed: input.marketplaceListed,
        },
      });
    });
  }

  async update(id: string, input: UpdateLocationInput): Promise<Location> {
    const ctx = requireTenantContext();
    return this.withTenant(ctx.tenantId, ctx.userId, ctx.role, async (tx) => {
      const existing = await tx.location.findFirst({ where: { id, deletedAt: null } });
      if (!existing) throw new NotFoundException(`Location ${id} not found`);
      return tx.location.update({ where: { id }, data: { ...input } });
    });
  }

  async softDelete(id: string): Promise<void> {
    const ctx = requireTenantContext();
    await this.withTenant(ctx.tenantId, ctx.userId, ctx.role, async (tx) => {
      await tx.location.update({ where: { id }, data: { deletedAt: new Date() } });
    });
  }
}
