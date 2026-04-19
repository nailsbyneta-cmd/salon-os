import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { PrismaClient, Service, ServiceCategory } from '@salon-os/db';
import type { CreateServiceInput, UpdateServiceInput } from '@salon-os/types';
import { PRISMA, WITH_TENANT } from '../db/db.module.js';
import { requireTenantContext } from '../tenant/tenant.context.js';

type WithTenantFn = <T>(
  tenantId: string,
  userId: string | null,
  role: string | null,
  fn: (tx: PrismaClient) => Promise<T>,
) => Promise<T>;

@Injectable()
export class ServicesService {
  constructor(
    @Inject(PRISMA) private readonly _prisma: PrismaClient,
    @Inject(WITH_TENANT) private readonly withTenant: WithTenantFn,
  ) {}

  async listCategories(): Promise<ServiceCategory[]> {
    const ctx = requireTenantContext();
    return this.withTenant(ctx.tenantId, ctx.userId, ctx.role, async (tx) => {
      return tx.serviceCategory.findMany({
        orderBy: [{ order: 'asc' }, { name: 'asc' }],
      });
    });
  }

  async createCategory(name: string, order = 0): Promise<ServiceCategory> {
    const ctx = requireTenantContext();
    return this.withTenant(ctx.tenantId, ctx.userId, ctx.role, async (tx) => {
      return tx.serviceCategory.create({
        data: { tenantId: ctx.tenantId, name, order },
      });
    });
  }

  async list(opts: { bookable?: boolean; categoryId?: string } = {}): Promise<Service[]> {
    const ctx = requireTenantContext();
    return this.withTenant(ctx.tenantId, ctx.userId, ctx.role, async (tx) => {
      return tx.service.findMany({
        where: {
          deletedAt: null,
          ...(opts.bookable !== undefined ? { bookable: opts.bookable } : {}),
          ...(opts.categoryId ? { categoryId: opts.categoryId } : {}),
        },
        orderBy: [{ order: 'asc' }, { name: 'asc' }],
      });
    });
  }

  async get(id: string): Promise<Service> {
    const ctx = requireTenantContext();
    return this.withTenant(ctx.tenantId, ctx.userId, ctx.role, async (tx) => {
      const svc = await tx.service.findFirst({ where: { id, deletedAt: null } });
      if (!svc) throw new NotFoundException(`Service ${id} not found`);
      return svc;
    });
  }

  async create(input: CreateServiceInput): Promise<Service> {
    const ctx = requireTenantContext();
    return this.withTenant(ctx.tenantId, ctx.userId, ctx.role, async (tx) => {
      return tx.service.create({
        data: {
          tenantId: ctx.tenantId,
          categoryId: input.categoryId,
          name: input.name,
          slug: input.slug,
          description: input.description ?? null,
          durationMinutes: input.durationMinutes,
          bufferBeforeMin: input.bufferBeforeMin,
          bufferAfterMin: input.bufferAfterMin,
          basePrice: input.basePrice,
          taxClass: input.taxClass ?? null,
          bookable: input.bookable,
          requiresConsult: input.requiresConsult,
          requiresPatchTest: input.requiresPatchTest,
          gender: input.gender ?? null,
          color: input.color ?? null,
          order: input.order,
          minDepositAmount: input.minDepositAmount ?? null,
          minDepositPct: input.minDepositPct ?? null,
        },
      });
    });
  }

  async update(id: string, input: UpdateServiceInput): Promise<Service> {
    const ctx = requireTenantContext();
    return this.withTenant(ctx.tenantId, ctx.userId, ctx.role, async (tx) => {
      const existing = await tx.service.findFirst({ where: { id, deletedAt: null } });
      if (!existing) throw new NotFoundException(`Service ${id} not found`);
      return tx.service.update({
        where: { id },
        data: { ...input },
      });
    });
  }

  async softDelete(id: string): Promise<void> {
    const ctx = requireTenantContext();
    await this.withTenant(ctx.tenantId, ctx.userId, ctx.role, async (tx) => {
      await tx.service.update({ where: { id }, data: { deletedAt: new Date() } });
    });
  }
}
