import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { PrismaClient, Staff } from '@salon-os/db';
import { Prisma } from '@salon-os/db';
import type { CreateStaffInput, UpdateStaffInput } from '@salon-os/types';
import { WITH_TENANT } from '../db/db.module.js';
import { requireTenantContext } from '../tenant/tenant.context.js';

export type WeeklySchedule = Record<
  'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun',
  Array<{ open: string; close: string }>
>;

type WithTenantFn = <T>(
  tenantId: string,
  userId: string | null,
  role: string | null,
  fn: (tx: PrismaClient) => Promise<T>,
) => Promise<T>;

@Injectable()
export class StaffService {
  constructor(@Inject(WITH_TENANT) private readonly withTenant: WithTenantFn) {}

  async list(opts: { locationId?: string; active?: boolean } = {}): Promise<Staff[]> {
    const ctx = requireTenantContext();
    return this.withTenant(ctx.tenantId, ctx.userId, ctx.role, async (tx) => {
      return tx.staff.findMany({
        where: {
          deletedAt: null,
          ...(opts.active !== undefined ? { active: opts.active } : { active: true }),
          ...(opts.locationId
            ? { locationAssignments: { some: { locationId: opts.locationId } } }
            : {}),
        },
        orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
      });
    });
  }

  async get(id: string): Promise<Staff & { serviceIds: string[] }> {
    const ctx = requireTenantContext();
    return this.withTenant(ctx.tenantId, ctx.userId, ctx.role, async (tx) => {
      const staff = await tx.staff.findFirst({
        where: { id, deletedAt: null },
        include: { services: { select: { serviceId: true } } },
      });
      if (!staff) throw new NotFoundException(`Staff ${id} not found`);
      const { services, ...rest } = staff;
      return {
        ...rest,
        serviceIds: services.map((s) => s.serviceId),
      };
    });
  }

  async create(input: CreateStaffInput): Promise<Staff> {
    const ctx = requireTenantContext();
    return this.withTenant(ctx.tenantId, ctx.userId, ctx.role, async (tx) => {
      // User inline upserten, wenn keine userId übergeben wurde.
      const userId =
        input.userId ??
        (
          await tx.user.upsert({
            where: { email: input.email },
            update: {},
            create: {
              email: input.email,
              firstName: input.firstName,
              lastName: input.lastName,
              status: 'ACTIVE',
            },
          })
        ).id;

      return tx.staff.create({
        data: {
          tenantId: ctx.tenantId,
          userId,
          firstName: input.firstName,
          lastName: input.lastName,
          displayName: input.displayName ?? null,
          email: input.email,
          phone: input.phone ?? null,
          role: input.role,
          employmentType: input.employmentType,
          commissionRate: input.commissionRate ?? null,
          boothRent: input.boothRent ?? null,
          hourlyRate: input.hourlyRate ?? null,
          color: input.color ?? null,
          photoUrl: input.photoUrl ?? null,
          bio: input.bio ?? null,
          startsAt: input.startsAt ? new Date(input.startsAt) : null,
          locationAssignments: {
            create: input.locationIds.map((locationId, i) => ({
              locationId,
              isPrimary: i === 0,
            })),
          },
          services: {
            create: input.serviceIds.map((serviceId) => ({ serviceId })),
          },
        },
      });
    });
  }

  async update(id: string, input: UpdateStaffInput): Promise<Staff> {
    const ctx = requireTenantContext();
    return this.withTenant(ctx.tenantId, ctx.userId, ctx.role, async (tx) => {
      const existing = await tx.staff.findFirst({ where: { id, deletedAt: null } });
      if (!existing) throw new NotFoundException(`Staff ${id} not found`);

      // Location-Zuordnungen: wenn im Input, ersetzen wir sie komplett.
      if (input.locationIds) {
        await tx.staffLocation.deleteMany({ where: { staffId: id } });
        await tx.staffLocation.createMany({
          data: input.locationIds.map((locationId, i) => ({
            staffId: id,
            locationId,
            isPrimary: i === 0,
          })),
        });
      }
      // Service-Zuordnungen analog.
      if (input.serviceIds) {
        await tx.staffService.deleteMany({ where: { staffId: id } });
        await tx.staffService.createMany({
          data: input.serviceIds.map((serviceId) => ({ staffId: id, serviceId })),
        });
      }

      const { locationIds: _l, serviceIds: _s, ...rest } = input;
      return tx.staff.update({
        where: { id },
        data: {
          ...(rest.firstName !== undefined ? { firstName: rest.firstName } : {}),
          ...(rest.lastName !== undefined ? { lastName: rest.lastName } : {}),
          ...(rest.displayName !== undefined ? { displayName: rest.displayName ?? null } : {}),
          ...(rest.email !== undefined ? { email: rest.email } : {}),
          ...(rest.phone !== undefined ? { phone: rest.phone ?? null } : {}),
          ...(rest.role !== undefined ? { role: rest.role } : {}),
          ...(rest.employmentType !== undefined
            ? { employmentType: rest.employmentType }
            : {}),
          ...(rest.commissionRate !== undefined
            ? { commissionRate: rest.commissionRate ?? null }
            : {}),
          ...(rest.boothRent !== undefined ? { boothRent: rest.boothRent ?? null } : {}),
          ...(rest.hourlyRate !== undefined ? { hourlyRate: rest.hourlyRate ?? null } : {}),
          ...(rest.color !== undefined ? { color: rest.color ?? null } : {}),
          ...(rest.photoUrl !== undefined ? { photoUrl: rest.photoUrl ?? null } : {}),
          ...(rest.bio !== undefined ? { bio: rest.bio ?? null } : {}),
          ...(rest.startsAt !== undefined
            ? { startsAt: rest.startsAt ? new Date(rest.startsAt) : null }
            : {}),
          ...((rest as { active?: boolean }).active !== undefined
            ? { active: (rest as { active?: boolean }).active! }
            : {}),
        },
      });
    });
  }

  async softDelete(id: string): Promise<void> {
    const ctx = requireTenantContext();
    await this.withTenant(ctx.tenantId, ctx.userId, ctx.role, async (tx) => {
      await tx.staff.update({
        where: { id },
        data: { deletedAt: new Date(), active: false },
      });
    });
  }

  async setWeeklySchedule(
    id: string,
    schedule: WeeklySchedule,
  ): Promise<Staff> {
    const ctx = requireTenantContext();
    return this.withTenant(ctx.tenantId, ctx.userId, ctx.role, async (tx) => {
      const existing = await tx.staff.findFirst({
        where: { id, deletedAt: null },
      });
      if (!existing) throw new NotFoundException(`Staff ${id} not found`);
      return tx.staff.update({
        where: { id },
        data: { weeklySchedule: schedule as Prisma.InputJsonValue },
      });
    });
  }
}
