import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { PrismaClient, Appointment } from '@salon-os/db';
import type {
  CreateAppointmentInput,
  RescheduleAppointmentInput,
  CancelAppointmentInput,
} from '@salon-os/types';
import { AuditService } from '../audit/audit.service.js';
import { WITH_TENANT } from '../db/db.module.js';
import { LoyaltyService } from '../loyalty/loyalty.service.js';
import { RemindersService } from '../reminders/reminders.service.js';
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
    @Inject(WITH_TENANT) private readonly withTenant: WithTenantFn,
    private readonly reminders: RemindersService,
    private readonly audit: AuditService,
    private readonly loyalty: LoyaltyService,
  ) {}

  /**
   * Kalender-Feed. Range-Query über `startAt`, optional nach Staff/Location.
   */
  async list(opts: {
    from: Date;
    to: Date;
    locationId?: string;
    staffId?: string;
    clientId?: string;
    q?: string;
    limit?: number;
  }): Promise<Appointment[]> {
    const ctx = requireTenantContext();
    return this.withTenant(ctx.tenantId, ctx.userId, ctx.role, async (tx) => {
      return tx.appointment.findMany({
        where: {
          startAt: { gte: opts.from, lte: opts.to },
          ...(opts.locationId ? { locationId: opts.locationId } : {}),
          ...(opts.staffId ? { staffId: opts.staffId } : {}),
          ...(opts.clientId ? { clientId: opts.clientId } : {}),
          ...(opts.q
            ? {
                client: {
                  is: {
                    OR: [
                      {
                        firstName: {
                          contains: opts.q,
                          mode: 'insensitive' as const,
                        },
                      },
                      {
                        lastName: {
                          contains: opts.q,
                          mode: 'insensitive' as const,
                        },
                      },
                    ],
                  },
                },
              }
            : {}),
        },
        ...(opts.limit ? { take: opts.limit } : {}),
        include: {
          items: { include: { service: { select: { name: true } } } },
          client: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              phone: true,
              phoneE164: true,
              noShowRisk: true,
              lifetimeValue: true,
            },
          },
          staff: { select: { firstName: true, lastName: true, color: true } },
        },
        orderBy: { startAt: 'asc' },
      });
    });
  }

  async get(id: string): Promise<Appointment> {
    const ctx = requireTenantContext();
    return this.withTenant(ctx.tenantId, ctx.userId, ctx.role, async (tx) => {
      const appt = await tx.appointment.findFirst({
        where: { id },
        include: {
          items: { include: { service: { select: { name: true } } } },
          client: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              phone: true,
              phoneE164: true,
            },
          },
          staff: { select: { firstName: true, lastName: true, color: true } },
          location: { select: { name: true } },
        },
      });
      if (!appt) throw new NotFoundException(`Appointment ${id} not found`);
      return appt;
    });
  }

  async create(input: CreateAppointmentInput): Promise<Appointment> {
    const ctx = requireTenantContext();
    try {
      const created = await this.withTenant(ctx.tenantId, ctx.userId, ctx.role, async (tx) => {
        const appt = await tx.appointment.create({
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
        await this.audit.withinTx(tx, ctx.tenantId, ctx.userId, {
          entity: 'Appointment',
          entityId: appt.id,
          action: 'create',
          diff: {
            startAt: appt.startAt.toISOString(),
            staffId: appt.staffId,
            clientId: appt.clientId,
            bookedVia: appt.bookedVia,
          },
        });
        // Schreibe Reminders atomisch in die Outbox — werden vom Worker gepolltt.
        await this.reminders.enqueueConfirmationViaOutbox(tx, {
          appointmentId: appt.id,
          tenantId: ctx.tenantId,
        });
        await this.reminders.enqueueReminderViaOutbox(tx, {
          appointmentId: appt.id,
          tenantId: ctx.tenantId,
          startAt: appt.startAt,
        });
        return appt;
      });

      return created;
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

  async checkout(
    id: string,
    body: {
      tipAmount: number;
      paymentMethod: 'CASH' | 'CARD' | 'TWINT' | 'STRIPE_CHECKOUT';
      completeAppointment: boolean;
    },
  ): Promise<Appointment> {
    const ctx = requireTenantContext();
    return this.withTenant(ctx.tenantId, ctx.userId, ctx.role, async (tx) => {
      const existing = await tx.appointment.findFirst({ where: { id } });
      if (!existing) throw new NotFoundException(`Appointment ${id} not found`);
      return tx.appointment.update({
        where: { id },
        data: {
          tipAmount: body.tipAmount,
          paymentMethod: body.paymentMethod,
          paidAt: new Date(),
          ...(body.completeAppointment ? { status: 'COMPLETED', completedAt: new Date() } : {}),
        },
        include: {
          items: { include: { service: { select: { name: true } } } },
        },
      });
    });
  }

  async updateNotes(
    id: string,
    patch: { notes?: string | null; internalNotes?: string | null },
  ): Promise<Appointment> {
    const ctx = requireTenantContext();
    return this.withTenant(ctx.tenantId, ctx.userId, ctx.role, async (tx) => {
      const existing = await tx.appointment.findFirst({ where: { id } });
      if (!existing) throw new NotFoundException(`Appointment ${id} not found`);
      return tx.appointment.update({
        where: { id },
        data: {
          ...(patch.notes !== undefined ? { notes: patch.notes || null } : {}),
          ...(patch.internalNotes !== undefined
            ? { internalNotes: patch.internalNotes || null }
            : {}),
        },
      });
    });
  }

  async reschedule(id: string, input: RescheduleAppointmentInput): Promise<Appointment> {
    const ctx = requireTenantContext();
    try {
      return await this.withTenant(ctx.tenantId, ctx.userId, ctx.role, async (tx) => {
        const existing = await tx.appointment.findFirst({ where: { id } });
        if (!existing) throw new NotFoundException(`Appointment ${id} not found`);
        const updated = await tx.appointment.update({
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
        await this.audit.withinTx(tx, ctx.tenantId, ctx.userId, {
          entity: 'Appointment',
          entityId: id,
          action: 'reschedule',
          diff: {
            from: { startAt: existing.startAt.toISOString(), staffId: existing.staffId },
            to: { startAt: updated.startAt.toISOString(), staffId: updated.staffId },
          },
        });
        return updated;
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
    const cancelled = await this.withTenant(ctx.tenantId, ctx.userId, ctx.role, async (tx) => {
      const existing = await tx.appointment.findFirst({ where: { id } });
      if (!existing) throw new NotFoundException(`Appointment ${id} not found`);

      const targetStatus = input.noShow ? 'NO_SHOW' : 'CANCELLED';
      // Idempotenz: gleicher Zielstatus → unveränderte Zeile zurückgeben.
      if (existing.status === targetStatus) {
        return tx.appointment.findFirstOrThrow({
          where: { id },
          include: { items: true },
        });
      }
      // Keine Rückwärts-Transitions aus Endstatus.
      if (
        existing.status === 'COMPLETED' ||
        (existing.status === 'CANCELLED' && input.noShow) ||
        (existing.status === 'NO_SHOW' && !input.noShow)
      ) {
        throw new ConflictException(
          `Terminstatus ${existing.status} kann nicht zu ${targetStatus} geändert werden.`,
        );
      }

      const updated = await tx.appointment.update({
        where: { id },
        data: {
          status: targetStatus,
          cancelledAt: new Date(),
          cancelReason: input.reason ?? null,
          noShow: input.noShow,
        },
        include: { items: true },
      });
      if (existing.clientId) {
        await this.recomputeNoShowRisk(tx, existing.clientId);
      }
      await this.audit.withinTx(tx, ctx.tenantId, ctx.userId, {
        entity: 'Appointment',
        entityId: id,
        action: input.noShow ? 'no-show' : 'cancel',
        diff: { reason: input.reason ?? null },
      });
      return updated;
    });

    this.reminders.cancelReminder(id).catch(() => {
      /* logged in RemindersService */
    });

    return cancelled;
  }

  /**
   * Predictive No-Show Scoring (Diff #1 — MVP-Heuristik).
   *
   * Score = max(
   *   base:     no-show-ratio aus letzten 20 completed/no-show-Terminen,
   *   recency:  +20 Punkte pro no-show in den letzten 90 Tagen, gecappt,
   *   fresh:    0 wenn Kundin noch keine 3 Termine hatte — zu wenig Daten,
   * )
   *
   * Gespeichert auf Client.noShowRisk (0-100). Wird nach jedem Cancel/
   * Complete/NoShow aus der Transaktion heraus aktualisiert.
   */
  private async recomputeNoShowRisk(tx: PrismaClient, clientId: string): Promise<void> {
    const recent = await tx.appointment.findMany({
      where: {
        clientId,
        status: { in: ['COMPLETED', 'NO_SHOW', 'CANCELLED'] },
      },
      orderBy: { startAt: 'desc' },
      take: 20,
      select: { status: true, startAt: true },
    });
    if (recent.length < 3) {
      await tx.client.update({ where: { id: clientId }, data: { noShowRisk: null } });
      return;
    }
    const noShowCount = recent.filter((a) => a.status === 'NO_SHOW').length;
    const cancelCount = recent.filter((a) => a.status === 'CANCELLED').length;
    const baseRatio = (noShowCount + cancelCount * 0.3) / recent.length;
    const cutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    const recentNoShows = recent.filter(
      (a) => a.status === 'NO_SHOW' && a.startAt >= cutoff,
    ).length;
    const recencyBonus = Math.min(recentNoShows * 20, 40);
    const score = Math.min(100, Math.round(baseRatio * 100 + recencyBonus));
    await tx.client.update({
      where: { id: clientId },
      data: { noShowRisk: score },
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
      const updated = await tx.appointment.update({
        where: { id },
        data: {
          status: to,
          ...(to === 'CHECKED_IN' ? { checkedInAt: now } : {}),
          ...(to === 'COMPLETED' ? { completedAt: now } : {}),
        },
        include: { items: true },
      });
      if (to === 'COMPLETED' && existing.clientId) {
        await tx.client.update({
          where: { id: existing.clientId },
          data: {
            totalVisits: { increment: 1 },
            lastVisitAt: now,
          },
        });
        await this.recomputeNoShowRisk(tx, existing.clientId);
      }
      return updated;
    }).then(async (appt) => {
      // Loyalty-Award nach erfolgreichem Tx-Commit. Idempotent (UNIQUE-Index).
      // Bewusst AUSSERHALB des withTenant-Tx — der Loyalty-Service hat sein
      // eigenes withTenant + braucht das Programm cross-tenant lesbar.
      if (to === 'COMPLETED' && appt.clientId) {
        const revenue = appt.items.reduce((s, i) => s + Number(i.price), 0);
        try {
          await this.loyalty.autoAwardForCompletedAppointment({
            appointmentId: appt.id,
            tenantId: appt.tenantId,
            clientId: appt.clientId,
            revenueChf: revenue,
          });
        } catch {
          // Loyalty-Failure darf den State-Transition nicht killen — log+swallow
        }
      }
      return appt;
    });
  }
}
