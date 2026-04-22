import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Get,
  Header,
  HttpCode,
  HttpStatus,
  Inject,
  NotFoundException,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { z } from 'zod';
import type { PrismaClient } from '@salon-os/db';
import { buildIcal, verifySelfServiceToken } from '@salon-os/utils';
import { AuditService } from '../audit/audit.service.js';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe.js';
import { WITH_TENANT } from '../db/db.module.js';
import { RemindersService } from '../reminders/reminders.service.js';

const rescheduleSchema = z.object({
  startAt: z.string().datetime({ offset: true }),
});

type WithTenantFn = <T>(
  tenantId: string,
  userId: string | null,
  role: string | null,
  fn: (tx: PrismaClient) => Promise<T>,
) => Promise<T>;

const PG_EXCLUSION_VIOLATION = 'P2002';
const PG_RAW_EXCLUSION = '23P01';

function isConflictError(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  const code = (err as { code?: string }).code;
  return (
    code === PG_EXCLUSION_VIOLATION ||
    code === PG_RAW_EXCLUSION ||
    err.message.includes('appointment_no_overlap_per_staff') ||
    err.message.includes('exclusion_violation')
  );
}

/**
 * Self-Service-Endpunkte für E-Mail-Links.
 * Token = HMAC-signiert mit Action + Appointment-ID + Tenant-ID + Expiry.
 * Öffentlich (kein Tenant-Header), aber Token ersetzt die Auth.
 * Schreibpfade laufen durch withTenant(tenantId) — RLS + Audit-Log gewahrt.
 */
@Controller('v1/public/appointments')
export class SelfServiceController {
  constructor(
    @Inject('PRISMA_PUBLIC') private readonly prisma: PrismaClient,
    @Inject(WITH_TENANT) private readonly withTenant: WithTenantFn,
    private readonly reminders: RemindersService,
    private readonly audit: AuditService,
  ) {}

  private resolveToken(
    token: string,
    expectedAction: 'cancel' | 'reschedule',
    appointmentId: string,
  ): { tenantId: string } {
    // Einheitliche Fehlermeldung für alle Mismatches — verhindert
    // Field-Flip-Probing. Detaillierter Log nur serverseitig.
    const FAIL = 'Token ungültig oder abgelaufen.';
    const payload = verifySelfServiceToken(token);
    if (!payload) throw new BadRequestException(FAIL);
    if (payload.action !== expectedAction) throw new BadRequestException(FAIL);
    if (payload.appointmentId !== appointmentId) throw new BadRequestException(FAIL);
    return { tenantId: payload.tenantId };
  }

  /** Kunde lädt ihre Termin-Daten (lesbar mit Token). */
  @Get(':id')
  async get(
    @Param('id') id: string,
    @Query('t') token: string,
  ): Promise<unknown> {
    if (!token) throw new BadRequestException('Token fehlt.');
    const payload = verifySelfServiceToken(token);
    if (!payload || payload.appointmentId !== id) {
      throw new BadRequestException('Token ungültig oder abgelaufen.');
    }
    const appt = await this.prisma.appointment.findFirst({
      where: { id, tenantId: payload.tenantId },
      include: {
        client: { select: { firstName: true, lastName: true } },
        staff: { select: { firstName: true, lastName: true } },
        items: { include: { service: { select: { name: true } } } },
        tenant: { select: { name: true, slug: true, timezone: true } },
        location: { select: { name: true } },
      },
    });
    if (!appt) throw new NotFoundException('Termin nicht gefunden.');
    return {
      id: appt.id,
      startAt: appt.startAt,
      endAt: appt.endAt,
      status: appt.status,
      client: appt.client,
      staff: appt.staff,
      items: appt.items,
      tenant: appt.tenant,
      location: appt.location,
      action: payload.action,
    };
  }

  /** iCal-Datei für „zum Kalender hinzufügen"-Links. */
  @Get(':id.ics')
  @Header('Content-Type', 'text/calendar; charset=utf-8')
  @Header('Content-Disposition', 'attachment; filename="termin.ics"')
  async ics(
    @Param('id') rawId: string,
    @Query('t') token: string,
  ): Promise<string> {
    const id = rawId.endsWith('.ics') ? rawId.slice(0, -4) : rawId;
    if (!token) throw new BadRequestException('Token fehlt.');
    const payload = verifySelfServiceToken(token);
    if (!payload || payload.appointmentId !== id) {
      throw new BadRequestException('Token ungültig oder abgelaufen.');
    }
    const appt = await this.prisma.appointment.findFirst({
      where: { id, tenantId: payload.tenantId },
      include: {
        items: { include: { service: { select: { name: true } } } },
        staff: { select: { firstName: true, lastName: true } },
        tenant: { select: { name: true } },
        location: { select: { name: true, address1: true, city: true } },
      },
    });
    if (!appt) throw new NotFoundException('Termin nicht gefunden.');
    const services = appt.items.map((i) => i.service.name).join(', ');
    const summary = `${appt.tenant.name}: ${services}`;
    const location = [
      appt.location.name,
      appt.location.address1,
      appt.location.city,
    ]
      .filter(Boolean)
      .join(', ');
    return buildIcal(appt.tenant.name, [
      {
        uid: `${appt.id}@salon-os`,
        start: appt.startAt,
        end: appt.endAt,
        summary,
        description: `Bei ${appt.staff.firstName} ${appt.staff.lastName}`,
        location,
        status: appt.status === 'CANCELLED' ? 'CANCELLED' : 'CONFIRMED',
      },
    ]);
  }

  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  async cancel(
    @Param('id') id: string,
    @Query('t') token: string,
  ): Promise<{ ok: true }> {
    if (!token) throw new BadRequestException('Token fehlt.');
    const { tenantId } = this.resolveToken(token, 'cancel', id);

    await this.withTenant(tenantId, null, null, async (tx) => {
      const existing = await tx.appointment.findFirst({ where: { id } });
      if (!existing) throw new NotFoundException('Termin nicht gefunden.');
      if (existing.status === 'CANCELLED') return;
      if (existing.status === 'COMPLETED' || existing.status === 'NO_SHOW') {
        throw new ConflictException(
          'Termin ist bereits abgeschlossen und kann nicht storniert werden.',
        );
      }
      await tx.appointment.update({
        where: { id },
        data: {
          status: 'CANCELLED',
          cancelledAt: new Date(),
          cancelReason: 'Auf Kundenwunsch (Self-Service)',
        },
      });
      await this.audit.withinTx(tx, tenantId, null, {
        entity: 'Appointment',
        entityId: id,
        action: 'cancel-self-service',
        diff: { from: existing.status, to: 'CANCELLED' },
      });
    });

    await this.reminders.cancelReminder(id).catch(() => undefined);
    return { ok: true };
  }

  @Post(':id/reschedule')
  @HttpCode(HttpStatus.OK)
  async reschedule(
    @Param('id') id: string,
    @Query('t') token: string,
    @Body(new ZodValidationPipe(rescheduleSchema)) body: z.infer<typeof rescheduleSchema>,
  ): Promise<{ ok: true; startAt: string; endAt: string }> {
    if (!token) throw new BadRequestException('Token fehlt.');
    const { tenantId } = this.resolveToken(token, 'reschedule', id);

    const result = await this.withTenant(tenantId, null, null, async (tx) => {
      const existing = await tx.appointment.findFirst({ where: { id } });
      if (!existing) throw new NotFoundException('Termin nicht gefunden.');
      if (
        existing.status === 'CANCELLED' ||
        existing.status === 'NO_SHOW' ||
        existing.status === 'COMPLETED'
      ) {
        throw new ConflictException(
          'Termin kann in diesem Status nicht umgebucht werden.',
        );
      }

      const newStart = new Date(body.startAt);
      if (newStart.getTime() <= Date.now()) {
        throw new BadRequestException('Neuer Termin muss in der Zukunft liegen.');
      }
      const durationMs = existing.endAt.getTime() - existing.startAt.getTime();
      const newEnd = new Date(newStart.getTime() + durationMs);

      try {
        await tx.appointment.update({
          where: { id },
          data: {
            startAt: newStart,
            endAt: newEnd,
            rescheduledFromId: existing.id,
          },
        });
      } catch (err) {
        if (isConflictError(err)) {
          throw new ConflictException({
            title: 'Zeitslot bereits belegt.',
            detail:
              'Bitte wähle einen anderen Zeitpunkt — der gewünschte Slot ist nicht mehr frei.',
          });
        }
        throw err;
      }

      await this.audit.withinTx(tx, tenantId, null, {
        entity: 'Appointment',
        entityId: id,
        action: 'reschedule-self-service',
        diff: {
          from: { startAt: existing.startAt, endAt: existing.endAt },
          to: { startAt: newStart, endAt: newEnd },
        },
      });

      return { startAt: newStart, endAt: newEnd };
    });

    return {
      ok: true,
      startAt: result.startAt.toISOString(),
      endAt: result.endAt.toISOString(),
    };
  }
}
