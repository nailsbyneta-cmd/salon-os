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

  @Get('services/:serviceId/slots')
  async availability(
    @Param('tenantSlug', new ZodValidationPipe(slugParamSchema)) slug: string,
    @Param('serviceId', new ZodValidationPipe(uuidSchema)) serviceId: string,
    @Query('date') date: string,
    @Query('locationId', new ZodValidationPipe(uuidSchema)) locationId: string,
  ): Promise<{ slots: AvailabilitySlot[] }> {
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      throw new BadRequestException('date (YYYY-MM-DD) is required');
    }
    return { slots: await this.svc.availability(slug, serviceId, { date, locationId }) };
  }

  @Post('bookings')
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Param('tenantSlug', new ZodValidationPipe(slugParamSchema)) slug: string,
    @Body(new ZodValidationPipe(publicBookingSchema)) input: PublicBookingInput,
  ): Promise<Appointment> {
    return this.svc.createBooking(slug, input);
  }
}
