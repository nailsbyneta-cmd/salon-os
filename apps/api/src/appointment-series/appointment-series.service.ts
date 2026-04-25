import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { Appointment, AppointmentSeries, PrismaClient } from '@salon-os/db';
import { WITH_TENANT } from '../db/db.module.js';
import { requireTenantContext } from '../tenant/tenant.context.js';

type WithTenantFn = <T>(
  tenantId: string,
  userId: string | null,
  role: string | null,
  fn: (tx: PrismaClient) => Promise<T>,
) => Promise<T>;

export interface CreateSeriesInput {
  clientId: string;
  staffId: string;
  serviceId: string;
  locationId: string;
  intervalWeeks: number;
  firstStartAt: string; // ISO
  durationMinutes: number;
  endsAt?: string | null;
  occurrences?: number | null;
  notes?: string;
  /** Wie viele zukünftige Termine SOFORT anlegen (Default 3). Cron rollt nach. */
  initialOccurrences?: number;
}

export interface UpdateSeriesInput {
  intervalWeeks?: number;
  endsAt?: string | null;
  occurrences?: number | null;
  active?: boolean;
  notes?: string | null;
}

/**
 * Recurring-Appointments-Service.
 * Pattern: Series ist die Quelle der Wahrheit für Frequenz/Staff/Service.
 * Konkrete Appointment-Records werden N im Voraus generiert (Default 3).
 * Daily-Cron sorgt dafür dass immer mindestens 8 Wochen vorgebucht sind.
 */
@Injectable()
export class AppointmentSeriesService {
  constructor(@Inject(WITH_TENANT) private readonly withTenant: WithTenantFn) {}

  async listForClient(clientId: string): Promise<
    Array<
      AppointmentSeries & {
        service: { name: string };
        staff: { firstName: string; lastName: string };
      }
    >
  > {
    const ctx = requireTenantContext();
    return this.withTenant(ctx.tenantId, ctx.userId, ctx.role, async (tx) => {
      return tx.appointmentSeries.findMany({
        where: { clientId, active: true },
        orderBy: { firstStartAt: 'asc' },
        include: {
          service: { select: { name: true } },
          staff: { select: { firstName: true, lastName: true } },
        },
      });
    });
  }

  async get(id: string): Promise<AppointmentSeries> {
    const ctx = requireTenantContext();
    return this.withTenant(ctx.tenantId, ctx.userId, ctx.role, async (tx) => {
      const s = await tx.appointmentSeries.findFirst({ where: { id } });
      if (!s) throw new NotFoundException(`Series ${id} not found`);
      return s;
    });
  }

  async create(input: CreateSeriesInput): Promise<{
    series: AppointmentSeries;
    appointments: Appointment[];
  }> {
    const ctx = requireTenantContext();
    return this.withTenant(ctx.tenantId, ctx.userId, ctx.role, async (tx) => {
      const initial = input.initialOccurrences ?? 3;
      const firstStart = new Date(input.firstStartAt);

      const series = await tx.appointmentSeries.create({
        data: {
          tenantId: ctx.tenantId,
          clientId: input.clientId,
          staffId: input.staffId,
          serviceId: input.serviceId,
          locationId: input.locationId,
          intervalWeeks: input.intervalWeeks,
          firstStartAt: firstStart,
          durationMinutes: input.durationMinutes,
          endsAt: input.endsAt ? new Date(input.endsAt) : null,
          occurrences: input.occurrences ?? null,
          notes: input.notes ?? null,
          active: true,
        },
      });

      const appointments = await this.generateOccurrences(tx, series, {
        upToCount: initial,
        startFromIndex: 1,
      });

      // Track wie weit generiert wurde
      const lastEnd = appointments[appointments.length - 1]?.endAt ?? firstStart;
      await tx.appointmentSeries.update({
        where: { id: series.id },
        data: {
          lastGeneratedAt: new Date(),
          generatedUntil: lastEnd,
        },
      });

      return { series, appointments };
    });
  }

  async update(id: string, input: UpdateSeriesInput): Promise<AppointmentSeries> {
    const ctx = requireTenantContext();
    return this.withTenant(ctx.tenantId, ctx.userId, ctx.role, async (tx) => {
      const existing = await tx.appointmentSeries.findFirst({ where: { id } });
      if (!existing) throw new NotFoundException(`Series ${id} not found`);
      return tx.appointmentSeries.update({
        where: { id },
        data: {
          ...(input.intervalWeeks !== undefined ? { intervalWeeks: input.intervalWeeks } : {}),
          ...(input.endsAt !== undefined
            ? { endsAt: input.endsAt ? new Date(input.endsAt) : null }
            : {}),
          ...(input.occurrences !== undefined ? { occurrences: input.occurrences } : {}),
          ...(input.active !== undefined ? { active: input.active } : {}),
          ...(input.notes !== undefined ? { notes: input.notes } : {}),
        },
      });
    });
  }

  /**
   * Edit-Mode "this-and-following": cancelt alle zukünftigen Occurrences
   * der Serie und stoppt die Serie. Aktueller + vergangene Termine bleiben.
   */
  async stopAfter(seriesId: string, fromDate: Date): Promise<{ cancelled: number }> {
    const ctx = requireTenantContext();
    return this.withTenant(ctx.tenantId, ctx.userId, ctx.role, async (tx) => {
      const series = await tx.appointmentSeries.findFirst({ where: { id: seriesId } });
      if (!series) throw new NotFoundException(`Series ${seriesId} not found`);

      const result = await tx.appointment.updateMany({
        where: {
          seriesId,
          startAt: { gte: fromDate },
          status: { notIn: ['CANCELLED', 'NO_SHOW', 'COMPLETED'] },
        },
        data: {
          status: 'CANCELLED',
          cancelledAt: new Date(),
          cancelReason: 'Recurring-Serie gestoppt',
        },
      });

      await tx.appointmentSeries.update({
        where: { id: seriesId },
        data: { active: false, endsAt: fromDate },
      });

      return { cancelled: result.count };
    });
  }

  /**
   * Generiert N Occurrences ab einem Index. Eingebettet in Transaction
   * vom Caller. Setzt Series.lastGeneratedAt + generatedUntil NICHT —
   * macht der Caller.
   */
  private async generateOccurrences(
    tx: PrismaClient,
    series: AppointmentSeries,
    opts: { upToCount: number; startFromIndex: number },
  ): Promise<Appointment[]> {
    const created: Appointment[] = [];
    const intervalMs = series.intervalWeeks * 7 * 24 * 60 * 60 * 1000;
    const durationMs = series.durationMinutes * 60 * 1000;
    const firstStart = new Date(series.firstStartAt);

    for (let i = 0; i < opts.upToCount; i++) {
      const occurrenceIndex = opts.startFromIndex + i;
      // 0-based offset von firstStartAt
      const offsetMs = (occurrenceIndex - 1) * intervalMs;
      const startAt = new Date(firstStart.getTime() + offsetMs);
      const endAt = new Date(startAt.getTime() + durationMs);

      // Stop wenn endsAt überschritten
      if (series.endsAt && startAt > series.endsAt) break;
      // Stop wenn occurrence-Cap erreicht
      if (series.occurrences && occurrenceIndex > series.occurrences) break;

      // Konflikt-Check: existiert schon ein Termin in diesem Slot bei diesem Staff?
      const conflict = await tx.appointment.findFirst({
        where: {
          staffId: series.staffId,
          status: { notIn: ['CANCELLED', 'NO_SHOW', 'WAITLIST'] },
          OR: [
            { startAt: { gte: startAt, lt: endAt } },
            { endAt: { gt: startAt, lte: endAt } },
            { startAt: { lte: startAt }, endAt: { gte: endAt } },
          ],
        },
      });
      if (conflict) {
        // Skip diese Occurrence — manueller Handling-Flag wäre besser,
        // MVP: einfach lassen, Cron versucht's später nochmal
        continue;
      }

      const service = await tx.service.findUnique({ where: { id: series.serviceId } });
      if (!service) continue;

      const appt = await tx.appointment.create({
        data: {
          tenantId: series.tenantId,
          locationId: series.locationId,
          clientId: series.clientId,
          staffId: series.staffId,
          status: 'BOOKED',
          startAt,
          endAt,
          bookedVia: 'STAFF_INTERNAL',
          notes: series.notes,
          seriesId: series.id,
          occurrenceIndex,
          items: {
            create: [
              {
                serviceId: series.serviceId,
                staffId: series.staffId,
                price: service.basePrice,
                duration: service.durationMinutes,
                taxClass: service.taxClass,
              },
            ],
          },
        },
      });
      created.push(appt);
    }
    return created;
  }
}
