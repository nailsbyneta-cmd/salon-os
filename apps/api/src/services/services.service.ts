import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import type {
  PrismaClient,
  Service,
  ServiceAddOn,
  ServiceCategory,
  ServiceOption,
  ServiceOptionGroup,
} from '@salon-os/db';
import type {
  CreateServiceAddOnInput,
  CreateServiceInput,
  CreateServiceOptionGroupInput,
  CreateServiceOptionInput,
  UpdateServiceAddOnInput,
  UpdateServiceInput,
  UpdateServiceOptionGroupInput,
  UpdateServiceOptionInput,
} from '@salon-os/types';
import { WITH_TENANT } from '../db/db.module.js';
import { requireTenantContext } from '../tenant/tenant.context.js';

type WithTenantFn = <T>(
  tenantId: string,
  userId: string | null,
  role: string | null,
  fn: (tx: PrismaClient) => Promise<T>,
) => Promise<T>;

@Injectable()
export class ServicesService {
  constructor(@Inject(WITH_TENANT) private readonly withTenant: WithTenantFn) {}

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

  // ─── Option-Groups + Options ──────────────────────────────────

  async listOptionGroups(
    serviceId: string,
  ): Promise<Array<ServiceOptionGroup & { options: ServiceOption[] }>> {
    const ctx = requireTenantContext();
    return this.withTenant(ctx.tenantId, ctx.userId, ctx.role, async (tx) => {
      return tx.serviceOptionGroup.findMany({
        where: { serviceId },
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
        include: { options: { orderBy: [{ sortOrder: 'asc' }, { label: 'asc' }] } },
      });
    });
  }

  async createOptionGroup(
    serviceId: string,
    input: CreateServiceOptionGroupInput,
  ): Promise<ServiceOptionGroup> {
    const ctx = requireTenantContext();
    return this.withTenant(ctx.tenantId, ctx.userId, ctx.role, async (tx) => {
      const svc = await tx.service.findFirst({ where: { id: serviceId, deletedAt: null } });
      if (!svc) throw new NotFoundException(`Service ${serviceId} not found`);
      return tx.serviceOptionGroup.create({
        data: {
          tenantId: ctx.tenantId,
          serviceId,
          name: input.name,
          required: input.required,
          multi: input.multi,
          sortOrder: input.sortOrder,
        },
      });
    });
  }

  async updateOptionGroup(
    groupId: string,
    input: UpdateServiceOptionGroupInput,
  ): Promise<ServiceOptionGroup> {
    const ctx = requireTenantContext();
    return this.withTenant(ctx.tenantId, ctx.userId, ctx.role, async (tx) => {
      const existing = await tx.serviceOptionGroup.findFirst({ where: { id: groupId } });
      if (!existing) throw new NotFoundException(`Option-Group ${groupId} not found`);
      return tx.serviceOptionGroup.update({ where: { id: groupId }, data: { ...input } });
    });
  }

  async deleteOptionGroup(groupId: string): Promise<void> {
    const ctx = requireTenantContext();
    await this.withTenant(ctx.tenantId, ctx.userId, ctx.role, async (tx) => {
      await tx.serviceOptionGroup.delete({ where: { id: groupId } });
    });
  }

  async createOption(input: CreateServiceOptionInput): Promise<ServiceOption> {
    const ctx = requireTenantContext();
    return this.withTenant(ctx.tenantId, ctx.userId, ctx.role, async (tx) => {
      const group = await tx.serviceOptionGroup.findFirst({ where: { id: input.groupId } });
      if (!group) throw new NotFoundException(`Option-Group ${input.groupId} not found`);
      return tx.serviceOption.create({
        data: {
          tenantId: ctx.tenantId,
          groupId: input.groupId,
          label: input.label,
          priceDelta: input.priceDelta,
          durationDeltaMin: input.durationDeltaMin,
          processingDeltaMin: input.processingDeltaMin,
          isDefault: input.isDefault,
          sortOrder: input.sortOrder,
        },
      });
    });
  }

  async updateOption(optionId: string, input: UpdateServiceOptionInput): Promise<ServiceOption> {
    const ctx = requireTenantContext();
    return this.withTenant(ctx.tenantId, ctx.userId, ctx.role, async (tx) => {
      const existing = await tx.serviceOption.findFirst({ where: { id: optionId } });
      if (!existing) throw new NotFoundException(`Option ${optionId} not found`);
      return tx.serviceOption.update({ where: { id: optionId }, data: { ...input } });
    });
  }

  async deleteOption(optionId: string): Promise<void> {
    const ctx = requireTenantContext();
    await this.withTenant(ctx.tenantId, ctx.userId, ctx.role, async (tx) => {
      await tx.serviceOption.delete({ where: { id: optionId } });
    });
  }

  // ─── Add-Ons ──────────────────────────────────────────────────

  async listAddOns(serviceId: string): Promise<ServiceAddOn[]> {
    const ctx = requireTenantContext();
    return this.withTenant(ctx.tenantId, ctx.userId, ctx.role, async (tx) => {
      return tx.serviceAddOn.findMany({
        where: { serviceId },
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      });
    });
  }

  async createAddOn(serviceId: string, input: CreateServiceAddOnInput): Promise<ServiceAddOn> {
    const ctx = requireTenantContext();
    return this.withTenant(ctx.tenantId, ctx.userId, ctx.role, async (tx) => {
      const svc = await tx.service.findFirst({ where: { id: serviceId, deletedAt: null } });
      if (!svc) throw new NotFoundException(`Service ${serviceId} not found`);
      return tx.serviceAddOn.create({
        data: {
          tenantId: ctx.tenantId,
          serviceId,
          name: input.name,
          priceDelta: input.priceDelta,
          durationDeltaMin: input.durationDeltaMin,
          sortOrder: input.sortOrder,
        },
      });
    });
  }

  async updateAddOn(addOnId: string, input: UpdateServiceAddOnInput): Promise<ServiceAddOn> {
    const ctx = requireTenantContext();
    return this.withTenant(ctx.tenantId, ctx.userId, ctx.role, async (tx) => {
      const existing = await tx.serviceAddOn.findFirst({ where: { id: addOnId } });
      if (!existing) throw new NotFoundException(`Add-On ${addOnId} not found`);
      return tx.serviceAddOn.update({ where: { id: addOnId }, data: { ...input } });
    });
  }

  async deleteAddOn(addOnId: string): Promise<void> {
    const ctx = requireTenantContext();
    await this.withTenant(ctx.tenantId, ctx.userId, ctx.role, async (tx) => {
      await tx.serviceAddOn.delete({ where: { id: addOnId } });
    });
  }
}
