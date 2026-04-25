import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import type { Appointment, AppointmentSeries, PrismaClient } from '@salon-os/db';
import { WITH_TENANT } from '../db/db.module.js';
import { requireTenantContext } from '../tenant/tenant.context.js';
import { detectPattern, type DetectedPattern } from './pattern-detection.js';

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
  private readonly logger = new Logger(AppointmentSeriesService.name);

  constructor(@Inject(WITH_TENANT) private readonly withTenant: WithTenantFn) {}

  /**
   * Cron-Rollover: findet alle aktiven Serien wo generatedUntil < (jetzt + 8 Wochen)
   * und generiert die nächsten 3 Termine. Idempotent — Konflikt-Check pro Occurrence
   * skippt bereits existierende Slots.
   *
   * Cross-Tenant: nutzt direkten PrismaClient ohne RLS-Wrapper. Caller MUSS
   * sicherstellen dass nur System-Cron diesen Endpoint trifft.
   */
  async rolloverAllActiveSeries(prisma: PrismaClient): Promise<{
    seriesProcessed: number;
    occurrencesCreated: number;
  }> {
    const eightWeeksFromNow = new Date(Date.now() + 8 * 7 * 24 * 60 * 60 * 1000);

    const candidates = await prisma.appointmentSeries.findMany({
      where: {
        active: true,
        OR: [{ generatedUntil: null }, { generatedUntil: { lt: eightWeeksFromNow } }],
      },
      take: 500, // Safety-cap pro Run
    });

    let occurrencesCreated = 0;
    for (const series of candidates) {
      try {
        // Höchster Occurrence-Index der bereits existiert für diese Serie
        const maxOcc = await prisma.appointment.aggregate({
          where: { seriesId: series.id },
          _max: { occurrenceIndex: true },
        });
        const nextIndex = (maxOcc._max.occurrenceIndex ?? 0) + 1;

        // Endkriterien
        if (series.occurrences && nextIndex > series.occurrences) {
          await prisma.appointmentSeries.update({
            where: { id: series.id },
            data: { active: false },
          });
          continue;
        }

        const created = await this.generateOccurrences(prisma, series, {
          upToCount: 3,
          startFromIndex: nextIndex,
        });
        occurrencesCreated += created.length;

        if (created.length > 0) {
          const lastEnd = created[created.length - 1]!.endAt;
          await prisma.appointmentSeries.update({
            where: { id: series.id },
            data: {
              lastGeneratedAt: new Date(),
              generatedUntil: lastEnd,
            },
          });
        }
      } catch (err) {
        this.logger.error(
          `rollover failed for series ${series.id}: ${err instanceof Error ? err.message : String(err)}`,
        );
        // Single-series failure soll nicht den ganzen Run abbrechen
      }
    }

    return {
      seriesProcessed: candidates.length,
      occurrencesCreated,
    };
  }

  /**
   * AI-Pattern-Detection: scant die letzten 12 Monate Termine einer Kundin
   * und erkennt ob ein wiederkehrendes Muster existiert. Skip wenn:
   * - bereits eine aktive Serie für diese Kombi existiert
   * - Pattern matched die existierende Serie (kein neuer Vorschlag)
   *
   * Surface-Pattern für UI: client-detail zeigt "💡 Serie vorschlagen"
   * Card mit 1-Click-Create.
   */
  async suggestPatternForClient(clientId: string): Promise<{
    pattern:
      | (DetectedPattern & {
          service: { name: string };
          staff: { firstName: string; lastName: string };
        })
      | null;
  }> {
    const ctx = requireTenantContext();
    return this.withTenant(ctx.tenantId, ctx.userId, ctx.role, async (tx) => {
      const yearAgo = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
      const past = await tx.appointment.findMany({
        where: {
          clientId,
          status: { in: ['COMPLETED', 'CHECKED_IN', 'IN_SERVICE'] },
          startAt: { gte: yearAgo },
        },
        orderBy: { startAt: 'asc' },
        include: { items: { take: 1 } },
        take: 100,
      });
      if (past.length < 3) return { pattern: null };

      const inputs = past
        .filter((a) => a.items.length > 0)
        .map((a) => ({
          startAt: a.startAt,
          durationMinutes: a.items[0]!.duration,
          staffId: a.staffId,
          serviceId: a.items[0]!.serviceId,
        }));

      const detected = detectPattern(inputs);
      if (!detected || !detected.recent) return { pattern: null };

      // Skip wenn bereits aktive Serie für (client, service, staff) existiert
      const existing = await tx.appointmentSeries.findFirst({
        where: {
          clientId,
          serviceId: detected.serviceId,
          staffId: detected.staffId,
          active: true,
        },
      });
      if (existing) return { pattern: null };

      // Service + Staff Daten laden für UI
      const [service, staff] = await Promise.all([
        tx.service.findFirst({
          where: { id: detected.serviceId },
          select: { name: true },
        }),
        tx.staff.findFirst({
          where: { id: detected.staffId },
          select: { firstName: true, lastName: true },
        }),
      ]);
      if (!service || !staff) return { pattern: null };

      return { pattern: { ...detected, service, staff } };
    });
  }

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
