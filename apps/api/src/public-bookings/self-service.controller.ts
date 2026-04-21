import {
  BadRequestException,
  Body,
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
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe.js';
import { RemindersService } from '../reminders/reminders.service.js';

const rescheduleSchema = z.object({
  startAt: z.string().datetime({ offset: true }),
});

/**
 * Self-Service-Endpunkte für E-Mail-Links.
 * Token = HMAC-signiert mit Action + Appointment-ID + Expiry.
 * Öffentlich (kein Tenant-Header), aber Token ersetzt die Auth.
 */
@Controller('v1/public/appointments')
export class SelfServiceController {
  constructor(
    @Inject('PRISMA_PUBLIC') private readonly prisma: PrismaClient,
    private readonly reminders: RemindersService,
  ) {}

  private resolveToken(
    token: string,
    expectedAction: 'cancel' | 'reschedule',
    appointmentId: string,
  ): { tenantId: string } {
    const payload = verifySelfServiceToken(token);
    if (!payload) throw new BadRequestException('Token ungültig oder abgelaufen.');
    if (payload.action !== expectedAction) {
      throw new BadRequestException('Token-Action passt nicht.');
    }
    if (payload.appointmentId !== appointmentId) {
      throw new BadRequestException('Token-Appointment passt nicht.');
    }
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
    const existing = await this.prisma.appointment.findFirst({
      where: { id, tenantId },
    });
    if (!existing) throw new NotFoundException('Termin nicht gefunden.');
    if (existing.status === 'CANCELLED') return { ok: true };
    await this.prisma.appointment.update({
      where: { id },
      data: {
        status: 'CANCELLED',
        cancelledAt: new Date(),
        cancelReason: 'Auf Kundenwunsch (Self-Service)',
      },
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
    const existing = await this.prisma.appointment.findFirst({
      where: { id, tenantId },
    });
    if (!existing) throw new NotFoundException('Termin nicht gefunden.');
    const newStart = new Date(body.startAt);
    const durationMs = existing.endAt.getTime() - existing.startAt.getTime();
    const newEnd = new Date(newStart.getTime() + durationMs);
    await this.prisma.appointment.update({
      where: { id },
      data: {
        startAt: newStart,
        endAt: newEnd,
        rescheduledFromId: existing.id,
      },
    });
    return { ok: true, startAt: newStart.toISOString(), endAt: newEnd.toISOString() };
  }
}
