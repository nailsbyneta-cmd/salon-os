import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { PrismaClient, Shift } from '@salon-os/db';
import type { CreateShiftInput } from '@salon-os/types';
import { WITH_TENANT } from '../db/db.module.js';
import { requireTenantContext } from '../tenant/tenant.context.js';

type WithTenantFn = <T>(
  tenantId: string,
  userId: string | null,
  role: string | null,
  fn: (tx: PrismaClient) => Promise<T>,
) => Promise<T>;

@Injectable()
export class ShiftsService {
  constructor(@Inject(WITH_TENANT) private readonly withTenant: WithTenantFn) {}

  async list(opts: {
    staffId?: string;
    from: Date;
    to: Date;
  }): Promise<Shift[]> {
    const ctx = requireTenantContext();
    return this.withTenant(ctx.tenantId, ctx.userId, ctx.role, async (tx) => {
      return tx.shift.findMany({
        where: {
          startAt: { lt: opts.to },
          endAt: { gt: opts.from },
          ...(opts.staffId ? { staffId: opts.staffId } : {}),
        },
        orderBy: { startAt: 'asc' },
      });
    });
  }

  async create(input: CreateShiftInput): Promise<Shift> {
    const ctx = requireTenantContext();
    return this.withTenant(ctx.tenantId, ctx.userId, ctx.role, async (tx) => {
      return tx.shift.create({
        data: {
          tenantId: ctx.tenantId,
          staffId: input.staffId,
          locationId: input.locationId,
          startAt: new Date(input.startAt),
          endAt: new Date(input.endAt),
          isOpen: input.isOpen,
        },
      });
    });
  }

  async remove(id: string): Promise<void> {
    const ctx = requireTenantContext();
    await this.withTenant(ctx.tenantId, ctx.userId, ctx.role, async (tx) => {
      const existing = await tx.shift.findFirst({ where: { id } });
      if (!existing) throw new NotFoundException(`Shift ${id} not found`);
      await tx.shift.delete({ where: { id } });
    });
  }
}
