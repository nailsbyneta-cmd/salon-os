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

  /**
   * Generiert Schichten für die nächsten `days` Tage basierend auf den
   * Öffnungszeiten der Location. Überspringt Tage an denen schon
   * mindestens eine Schicht existiert (kein Doppel).
   */
  async bulkGenerateFromLocation(input: {
    staffId: string;
    locationId: string;
    days: number;
  }): Promise<{ created: number; skipped: number }> {
    const ctx = requireTenantContext();
    return this.withTenant(ctx.tenantId, ctx.userId, ctx.role, async (tx) => {
      const location = await tx.location.findFirst({
        where: { id: input.locationId },
        select: { openingHours: true, timezone: true },
      });
      if (!location) throw new NotFoundException('Location not found');

      const staff = await tx.staff.findFirst({
        where: { id: input.staffId, deletedAt: null },
        select: { id: true, weeklySchedule: true },
      });
      if (!staff) throw new NotFoundException('Staff not found');

      // Priorität: Staff-Vorlage → Location-Öffnungszeiten
      const scheduleSource = staff.weeklySchedule ?? location.openingHours;
      const hours = (scheduleSource ?? {}) as Record<
        string,
        | Array<{ open: string; close: string }>
        | { open?: string; close?: string; closed?: boolean }
      >;
      const WEEKDAY = [
        'sun',
        'mon',
        'tue',
        'wed',
        'thu',
        'fri',
        'sat',
      ] as const;

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      let created = 0;
      let skipped = 0;

      for (let i = 0; i < Math.min(Math.max(input.days, 1), 60); i++) {
        const day = new Date(today);
        day.setDate(today.getDate() + i);
        const key = WEEKDAY[day.getDay() % 7]!;
        const entry = hours[key];
        const intervals: Array<{ open: string; close: string }> = Array.isArray(
          entry,
        )
          ? entry.filter((iv) => iv.open && iv.close)
          : entry && !entry.closed && entry.open && entry.close
            ? [{ open: entry.open, close: entry.close }]
            : [];
        if (intervals.length === 0) {
          skipped++;
          continue;
        }

        const dayStart = new Date(day);
        const dayEnd = new Date(day);
        dayEnd.setHours(23, 59, 59, 999);
        const existing = await tx.shift.count({
          where: {
            staffId: input.staffId,
            startAt: { gte: dayStart, lte: dayEnd },
          },
        });
        if (existing > 0) {
          skipped++;
          continue;
        }

        for (const iv of intervals) {
          const [sh, sm] = iv.open.split(':').map(Number);
          const [eh, em] = iv.close.split(':').map(Number);
          const start = new Date(day);
          start.setHours(sh!, sm!, 0, 0);
          const end = new Date(day);
          end.setHours(eh!, em!, 0, 0);
          await tx.shift.create({
            data: {
              tenantId: ctx.tenantId,
              staffId: input.staffId,
              locationId: input.locationId,
              startAt: start,
              endAt: end,
              isOpen: true,
            },
          });
          created++;
        }
      }

      return { created, skipped };
    });
  }
}
