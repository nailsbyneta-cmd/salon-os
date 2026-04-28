import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  Res,
} from '@nestjs/common';
import type { FastifyReply } from 'fastify';
import { z } from 'zod';
import type { Appointment, Location, Service } from '@salon-os/db';
import { uuidSchema } from '@salon-os/types';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe.js';
import {
  type AvailabilitySlot,
  type PublicBookingInput,
  PublicBookingsService,
} from './public-bookings.service.js';

const slugParamSchema = z
  .string()
  .min(1)
  .max(120)
  .regex(/^[a-z0-9-]+$/);

const publicBookingSchema = z.object({
  serviceId: uuidSchema,
  staffId: uuidSchema.optional(),
  locationId: uuidSchema,
  startAt: z.string().datetime({ offset: true }),
  client: z.object({
    firstName: z.string().min(1).max(100),
    lastName: z.string().min(1).max(100),
    email: z.string().email(),
    phone: z.string().max(30).optional(),
  }),
  notes: z.string().max(2000).optional(),
  language: z.string().max(10).optional(),
  /** Wizard-Optionen (Variant-IDs). Backend resolves die Labels und
   * persistiert sie auf appointmentItem.optionLabels. */
  optionIds: z.array(uuidSchema).optional(),
  /** Google-Ads Click-ID — vom Frontend aus localStorage gelesen.
   *  Format: typischerweise "Cj0KCQiA..." (variabel, max. 200 char). */
  gclid: z.string().min(1).max(200).optional(),
  acquisitionSource: z
    .enum(['google_ads', 'gbp', 'organic', 'direct', 'instagram', 'referral', 'unknown'])
    .optional(),
});

@Controller('v1/public/:tenantSlug')
export class PublicBookingsController {
  constructor(private readonly svc: PublicBookingsService) {}

  @Get('locations')
  async listLocations(
    @Param('tenantSlug', new ZodValidationPipe(slugParamSchema)) slug: string,
  ): Promise<{ locations: Location[] }> {
    return { locations: await this.svc.listLocations(slug) };
  }

  @Get('info')
  async publicInfo(
    @Param('tenantSlug', new ZodValidationPipe(slugParamSchema)) slug: string,
  ): Promise<Awaited<ReturnType<PublicBookingsService['getPublicProfile']>>> {
    return this.svc.getPublicProfile(slug);
  }

  @Get('services')
  async listServices(
    @Param('tenantSlug', new ZodValidationPipe(slugParamSchema)) slug: string,
  ): Promise<{ services: Service[] }> {
    return { services: await this.svc.listServices(slug) };
  }

  @Get('service-categories')
  async listServiceCategories(
    @Param('tenantSlug', new ZodValidationPipe(slugParamSchema)) slug: string,
  ): Promise<{ categories: Array<{ id: string; name: string; order: number }> }> {
    return { categories: await this.svc.listServiceCategories(slug) };
  }

  /**
   * Minimal-Summary für /success-Page Conversion-Fire. Nur Wert+Currency,
   * keine PII (kein Name/Service/Datum). Wird vom ConversionFire-Component
   * gelesen um den Brutto-Wert ans Conversion-Event zu hängen.
   */
  @Get('appointments/:appointmentId/summary')
  async appointmentSummary(
    @Param('tenantSlug', new ZodValidationPipe(slugParamSchema)) slug: string,
    @Param('appointmentId', new ZodValidationPipe(uuidSchema)) appointmentId: string,
  ): Promise<{
    summary: { valueChf: number; currency: string; status: string } | null;
  }> {
    return { summary: await this.svc.getAppointmentSummary(slug, appointmentId) };
  }

  /**
   * ICS-Download für 'Zum Kalender hinzufügen'-Button auf der /success-Page.
   * Returnt direkt den ICS-Body als text/calendar — Browser triggert
   * Calendar-App automatisch.
   */
  @Get('appointments/:appointmentId/ics')
  async appointmentIcs(
    @Param('tenantSlug', new ZodValidationPipe(slugParamSchema)) slug: string,
    @Param('appointmentId', new ZodValidationPipe(uuidSchema)) appointmentId: string,
    @Res() res: FastifyReply,
  ): Promise<void> {
    const ics = await this.svc.getAppointmentIcs(slug, appointmentId);
    if (!ics) {
      void res.status(404).send({ error: 'Appointment not found' });
      return;
    }
    void res
      .header('content-type', 'text/calendar; charset=utf-8')
      .header(
        'content-disposition',
        `attachment; filename="termin-${appointmentId.slice(0, 8)}.ics"`,
      )
      .send(ics);
  }

  @Get('services/:serviceId/staff')
  async listEligibleStaff(
    @Param('tenantSlug', new ZodValidationPipe(slugParamSchema)) slug: string,
    @Param('serviceId', new ZodValidationPipe(uuidSchema)) serviceId: string,
    @Query('locationId', new ZodValidationPipe(uuidSchema)) locationId: string,
  ): Promise<{ staff: Awaited<ReturnType<PublicBookingsService['listEligibleStaff']>> }> {
    return { staff: await this.svc.listEligibleStaff(slug, serviceId, locationId) };
  }

  @Get('services/:serviceId')
  async getServiceDetail(
    @Param('tenantSlug', new ZodValidationPipe(slugParamSchema)) slug: string,
    @Param('serviceId', new ZodValidationPipe(uuidSchema)) serviceId: string,
  ): Promise<Awaited<ReturnType<PublicBookingsService['getServiceDetail']>>> {
    return this.svc.getServiceDetail(slug, serviceId);
  }

  @Get('services/:serviceId/next-slot')
  async nextSlot(
    @Param('tenantSlug', new ZodValidationPipe(slugParamSchema)) slug: string,
    @Param('serviceId', new ZodValidationPipe(uuidSchema)) serviceId: string,
    @Query('locationId', new ZodValidationPipe(uuidSchema)) locationId: string,
    @Query('fromDate') fromDate?: string,
    @Query('durationMinutes') durationMinutes?: string,
  ): Promise<{ slot: AvailabilitySlot | null }> {
    const today = new Date().toISOString().slice(0, 10);
    const start = fromDate && /^\d{4}-\d{2}-\d{2}$/.test(fromDate) ? fromDate : today;
    const dur = durationMinutes ? Number(durationMinutes) : undefined;
    const slot = await this.svc.findNextSlot(slug, serviceId, locationId, start, dur);
    return { slot };
  }

  @Get('services/:serviceId/slots')
  async availability(
    @Param('tenantSlug', new ZodValidationPipe(slugParamSchema)) slug: string,
    @Param('serviceId', new ZodValidationPipe(uuidSchema)) serviceId: string,
    @Query('date') date: string,
    @Query('locationId', new ZodValidationPipe(uuidSchema)) locationId: string,
    @Query('durationMinutes') durationMinutes?: string,
  ): Promise<{ slots: AvailabilitySlot[] }> {
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      throw new BadRequestException('date (YYYY-MM-DD) is required');
    }
    const durationOverrideMin = durationMinutes ? Number(durationMinutes) : undefined;
    if (
      durationOverrideMin !== undefined &&
      (!Number.isFinite(durationOverrideMin) ||
        durationOverrideMin < 5 ||
        durationOverrideMin > 600)
    ) {
      throw new BadRequestException('durationMinutes must be between 5 and 600');
    }
    return {
      slots: await this.svc.availability(slug, serviceId, {
        date,
        locationId,
        durationOverrideMin,
      }),
    };
  }

  @Post('multi-slots')
  async multiSlots(
    @Param('tenantSlug', new ZodValidationPipe(slugParamSchema)) slug: string,
    @Body(
      new ZodValidationPipe(
        z.object({
          date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
          locationId: uuidSchema,
          items: z
            .array(
              z.object({
                serviceId: uuidSchema,
                durationMinutes: z.number().int().min(5).max(600).optional(),
              }),
            )
            .min(2)
            .max(5),
        }),
      ),
    )
    body: {
      date: string;
      locationId: string;
      items: Array<{ serviceId: string; durationMinutes?: number }>;
    },
  ): Promise<Awaited<ReturnType<PublicBookingsService['multiSlots']>>> {
    return this.svc.multiSlots(slug, body.items, { date: body.date, locationId: body.locationId });
  }

  @Post('bookings')
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Param('tenantSlug', new ZodValidationPipe(slugParamSchema)) slug: string,
    @Body(new ZodValidationPipe(publicBookingSchema)) input: PublicBookingInput,
  ): Promise<Appointment> {
    return this.svc.createBooking(slug, input);
  }

  @Post('bookings/bulk')
  @HttpCode(HttpStatus.CREATED)
  async createBulk(
    @Param('tenantSlug', new ZodValidationPipe(slugParamSchema)) slug: string,
    @Body(
      new ZodValidationPipe(
        z.object({
          locationId: uuidSchema,
          stops: z
            .array(
              z.object({
                serviceId: uuidSchema,
                staffId: uuidSchema,
                startAt: z.string().datetime({ offset: true }),
              }),
            )
            .min(2)
            .max(5),
          client: z.object({
            firstName: z.string().min(1).max(100),
            lastName: z.string().min(1).max(100),
            email: z.string().email(),
            phone: z.string().max(30).optional(),
          }),
          notes: z.string().max(2000).optional(),
        }),
      ),
    )
    body: {
      locationId: string;
      stops: Array<{ serviceId: string; staffId: string; startAt: string }>;
      client: { firstName: string; lastName: string; email: string; phone?: string };
      notes?: string;
    },
  ): Promise<{ appointments: Appointment[] }> {
    return { appointments: await this.svc.createBookingBulk(slug, body) };
  }
}
