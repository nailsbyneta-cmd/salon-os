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
} from '@nestjs/common';
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

  @Get('services/:serviceId')
  async getServiceDetail(
    @Param('tenantSlug', new ZodValidationPipe(slugParamSchema)) slug: string,
    @Param('serviceId', new ZodValidationPipe(uuidSchema)) serviceId: string,
  ): Promise<Awaited<ReturnType<PublicBookingsService['getServiceDetail']>>> {
    return this.svc.getServiceDetail(slug, serviceId);
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
