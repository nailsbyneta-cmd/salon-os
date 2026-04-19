import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { PrismaClient, Room } from '@salon-os/db';
import type { CreateRoomInput, UpdateRoomInput } from '@salon-os/types';
import { WITH_TENANT } from '../db/db.module.js';
import { requireTenantContext } from '../tenant/tenant.context.js';

type WithTenantFn = <T>(
  tenantId: string,
  userId: string | null,
  role: string | null,
  fn: (tx: PrismaClient) => Promise<T>,
) => Promise<T>;

@Injectable()
export class RoomsService {
  constructor(@Inject(WITH_TENANT) private readonly withTenant: WithTenantFn) {}

  async list(locationId?: string): Promise<Room[]> {
    const ctx = requireTenantContext();
    return this.withTenant(ctx.tenantId, ctx.userId, ctx.role, async (tx) => {
      return tx.room.findMany({
        where: { active: true, ...(locationId ? { locationId } : {}) },
        orderBy: { name: 'asc' },
      });
    });
  }

  async get(id: string): Promise<Room> {
    const ctx = requireTenantContext();
    return this.withTenant(ctx.tenantId, ctx.userId, ctx.role, async (tx) => {
      const room = await tx.room.findFirst({ where: { id } });
      if (!room) throw new NotFoundException(`Room ${id} not found`);
      return room;
    });
  }

  async create(input: CreateRoomInput): Promise<Room> {
    const ctx = requireTenantContext();
    return this.withTenant(ctx.tenantId, ctx.userId, ctx.role, async (tx) => {
      return tx.room.create({
        data: {
          tenantId: ctx.tenantId,
          locationId: input.locationId,
          name: input.name,
          capacity: input.capacity,
          features: input.features,
          active: input.active,
        },
      });
    });
  }

  async update(id: string, input: UpdateRoomInput): Promise<Room> {
    const ctx = requireTenantContext();
    return this.withTenant(ctx.tenantId, ctx.userId, ctx.role, async (tx) => {
      const existing = await tx.room.findFirst({ where: { id } });
      if (!existing) throw new NotFoundException(`Room ${id} not found`);
      return tx.room.update({ where: { id }, data: { ...input } });
    });
  }

  async deactivate(id: string): Promise<void> {
    const ctx = requireTenantContext();
    await this.withTenant(ctx.tenantId, ctx.userId, ctx.role, async (tx) => {
      await tx.room.update({ where: { id }, data: { active: false } });
    });
  }
}
