import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { PrismaClient, Appointment } from '@salon-os/db';
import type {
  CreateAppointmentInput,
  RescheduleAppointmentInput,
  CancelAppointmentInput,
} from '@salon-os/types';
import { PRISMA, WITH_TENANT } from '../db/db.module.js';
import { requireTenantContext } from '../tenant/tenant.context.js';

type WithTenantFn = <T>(
  tenantId: string,
  userId: string | null,
  role: string | null,
  fn: (tx: PrismaClient) => Promise<T>,
) => Promise<T>;

// Postgres-Exclusion-Constraint-Verletzung
// (siehe migration 0002_phase1_module1 → appointment_no_overlap_per_staff)
const PG_EXCLUSION_VIOLATION = 'P2002'; // Prisma-Wrap für 23P01 (exclusion_violation)
const PG_RAW_EXCLUSION = '23P01';

function isConflictError(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  const message = err.message;
  const code = (err as { code?: string }).code;
  return (
    code === PG_EXCLUSION_VIOLATION ||
    code === PG_RAW_EXCLUSION ||
    message.includes('appointment_no_overlap_per_staff') ||
    message.includes('exclusion_violation')
  );
}

@Injectable()
export class AppointmentsService {
  constructor(
    @Inject(PRISMA) private readonly _prisma: PrismaClient,
    @Inject(WITH_TENANT) private readonly withTenant: WithTenantFn,
  ) {}

  /**
   * Kalender-Feed. Range-Query über `startAt`, optional nach Staff/Location.
   */
  async list(opts: {
    from: Date;
    to: Date;
    locationId?: string;
    staffId?: string;
  }): Promise<Appointment[]> {
    const ctx = requireTenantContext();
    return this.withTenant(ctx.tenantId, ctx.userId, ctx.role, async (tx) => {
      return tx.appointment.findMany({
        where: {
          startAt: { gte: opts.from, lte: opts.to },
          ...(opts.locationId ? { locationId: opts.locationId } : {}),
          ...(opts.staffId ? { staffId: opts.staffId } : {}),
        },
        include: { items: true },
        orderBy: { startAt: 'asc' },
      });
    });
  }

  async get(id: string): Promise<Appointment> {
    const ctx = requireTenantContext();
    return this.withTenant(ctx.tenantId, ctx.userId, ctx.role, async (tx) => {
      const appt = await tx.appointment.findFirst({
        where: { id },
        include: { items: true },
      });
      if (!appt) throw new NotFoundException(`Appointment ${id} not found`);
      return appt;
    });
  }

  async create(input: CreateAppointmentInput): Promise<Appointment> {
    const ctx = requireTenantContext();
    try {
      return await this.withTenant(ctx.tenantId, ctx.userId, ctx.role, async (tx) => {
        return tx.appointment.create({
          data: {
            tenantId: ctx.tenantId,
            locationId: input.locationId,
            clientId: input.clientId ?? null,
            staffId: input.staffId,
            roomId: input.roomId ?? null,
            startAt: new Date(input.startAt),
            endAt: new Date(input.endAt),
            bookedVia: input.bookedVia,
            notes: input.notes ?? null,
            internalNotes: input.internalNotes ?? null,
            items: {
              create: input.items.map((it) => ({
                serviceId: it.serviceId,
                staffId: it.staffId,
                price: it.price,
                duration: it.duration,
                taxClass: it.taxClass ?? null,
                notes: it.notes ?? null,
              })),
            },
          },
          include: { items: true },
        });
      });
    } catch (err) {
      if (isConflictError(err)) {
        throw new ConflictException({
          type: 'https://salon-os.com/errors/appointment/conflict',
          title: 'Appointment time conflict',
          detail: 'Staff is unavailable at the requested time.',
          errors: [{ path: 'startAt', code: 'staff_unavailable' }],
        });
      }
      throw err;
    }
  }

  async reschedule(id: string, input: RescheduleAppointmentInput): Promise<Appointment> {
    const ctx = requireTenantContext();
    try {
      return await this.withTenant(ctx.tenantId, ctx.userId, ctx.role, async (tx) => {
        const existing = await tx.appointment.findFirst({ where: { id } });
        if (!existing) throw new NotFoundException(`Appointment ${id} not found`);
        return tx.appointment.update({
          where: { id },
          data: {
            startAt: new Date(input.startAt),
            endAt: new Date(input.endAt),
            ...(input.staffId ? { staffId: input.staffId } : {}),
            ...(input.roomId !== undefined ? { roomId: input.roomId ?? null } : {}),
            rescheduledFromId: existing.id,
          },
          include: { items: true },
        });
      });
    } catch (err) {
      if (isConflictError(err)) {
        throw new ConflictException({
          type: 'https://salon-os.com/errors/appointment/conflict',
          title: 'Reschedule time conflict',
          detail: 'Staff is unavailable at the new time.',
          errors: [{ path: 'startAt', code: 'staff_unavailable' }],
        });
      }
      throw err;
    }
  }

  async cancel(id: string, input: CancelAppointmentInput): Promise<Appointment> {
    const ctx = requireTenantContext();
    return this.withTenant(ctx.tenantId, ctx.userId, ctx.role, async (tx) => {
      const existing = await tx.appointment.findFirst({ where: { id } });
      if (!existing) throw new NotFoundException(`Appointment ${id} not found`);
      return tx.appointment.update({
        where: { id },
        data: {
          status: input.noShow ? 'NO_SHOW' : 'CANCELLED',
          cancelledAt: new Date(),
          cancelReason: input.reason ?? null,
          noShow: input.noShow,
        },
        include: { items: true },
      });
    });
  }

  async transition(
    id: string,
    to: 'CONFIRMED' | 'CHECKED_IN' | 'IN_SERVICE' | 'COMPLETED',
  ): Promise<Appointment> {
    const ctx = requireTenantContext();
    return this.withTenant(ctx.tenantId, ctx.userId, ctx.role, async (tx) => {
      const existing = await tx.appointment.findFirst({ where: { id } });
      if (!existing) throw new NotFoundException(`Appointment ${id} not found`);
      const now = new Date();
      return tx.appointment.update({
        where: { id },
        data: {
          status: to,
          ...(to === 'CHECKED_IN' ? { checkedInAt: now } : {}),
          ...(to === 'COMPLETED' ? { completedAt: now } : {}),
        },
        include: { items: true },
      });
    });
  }
}
