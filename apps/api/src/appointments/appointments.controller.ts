import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { z } from 'zod';
import {
  cancelAppointmentSchema,
  createAppointmentSchema,
  rescheduleAppointmentSchema,
  uuidSchema,
} from '@salon-os/types';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe.js';
import { AppointmentsService } from './appointments.service.js';
import type { Appointment, PosRefund } from '@salon-os/db';

@Controller('v1/appointments')
export class AppointmentsController {
  constructor(private readonly svc: AppointmentsService) {}

  @Get()
  async list(
    @Query('from') from: string,
    @Query('to') to: string,
    @Query('locationId') locationId?: string,
    @Query('staffId') staffId?: string,
    @Query('clientId') clientId?: string,
    @Query('q') q?: string,
    @Query('limit') limit?: string,
  ): Promise<{ appointments: Appointment[] }> {
    if (!from || !to) {
      throw new BadRequestException('from + to query params are required (ISO 8601)');
    }
    const fromDate = new Date(from);
    const toDate = new Date(to);
    if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime())) {
      throw new BadRequestException('from / to must be valid ISO datetimes');
    }
    const parsedLimit = limit ? Number(limit) : undefined;
    const appointments = await this.svc.list({
      from: fromDate,
      to: toDate,
      locationId,
      staffId,
      clientId,
      q: q?.trim() || undefined,
      limit:
        parsedLimit && Number.isFinite(parsedLimit) && parsedLimit > 0
          ? Math.min(parsedLimit, 500)
          : undefined,
    });
    return { appointments };
  }

  @Get(':id')
  async get(@Param('id', new ZodValidationPipe(uuidSchema)) id: string): Promise<Appointment> {
    return this.svc.get(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body(new ZodValidationPipe(createAppointmentSchema))
    input: import('@salon-os/types').CreateAppointmentInput,
  ): Promise<Appointment> {
    return this.svc.create(input);
  }

  @Post(':id/reschedule')
  async reschedule(
    @Param('id', new ZodValidationPipe(uuidSchema)) id: string,
    @Body(new ZodValidationPipe(rescheduleAppointmentSchema))
    input: import('@salon-os/types').RescheduleAppointmentInput,
  ): Promise<Appointment> {
    return this.svc.reschedule(id, input);
  }

  @Post(':id/cancel')
  async cancel(
    @Param('id', new ZodValidationPipe(uuidSchema)) id: string,
    @Body(new ZodValidationPipe(cancelAppointmentSchema))
    input: import('@salon-os/types').CancelAppointmentInput,
  ): Promise<Appointment> {
    return this.svc.cancel(id, input);
  }

  @Post(':id/confirm')
  async confirm(@Param('id', new ZodValidationPipe(uuidSchema)) id: string): Promise<Appointment> {
    return this.svc.transition(id, 'CONFIRMED');
  }

  @Post(':id/check-in')
  async checkIn(@Param('id', new ZodValidationPipe(uuidSchema)) id: string): Promise<Appointment> {
    return this.svc.transition(id, 'CHECKED_IN');
  }

  @Post(':id/start')
  async start(@Param('id', new ZodValidationPipe(uuidSchema)) id: string): Promise<Appointment> {
    return this.svc.transition(id, 'IN_SERVICE');
  }

  @Post(':id/complete')
  async complete(@Param('id', new ZodValidationPipe(uuidSchema)) id: string): Promise<Appointment> {
    return this.svc.transition(id, 'COMPLETED');
  }

  @Patch(':id/notes')
  async updateNotes(
    @Param('id', new ZodValidationPipe(uuidSchema)) id: string,
    @Body(
      new ZodValidationPipe(
        z.object({
          notes: z.string().max(2000).nullable().optional(),
          internalNotes: z.string().max(2000).nullable().optional(),
        }),
      ),
    )
    patch: { notes?: string | null; internalNotes?: string | null },
  ): Promise<Appointment> {
    return this.svc.updateNotes(id, patch);
  }

  @Post(':id/refund')
  @HttpCode(HttpStatus.CREATED)
  async issueRefund(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body(
      new ZodValidationPipe(
        z.object({
          amount: z.number().positive(),
          paymentMethod: z.enum(['CASH', 'CARD', 'TWINT']),
          reason: z
            .enum(['DUPLICATE', 'CUSTOMER_DISSATISFIED', 'SERVICE_NOT_DELIVERED', 'OTHER'])
            .optional(),
          notes: z.string().max(500).optional(),
        }),
      ),
    )
    body: {
      amount: number;
      paymentMethod: 'CASH' | 'CARD' | 'TWINT';
      reason?: 'DUPLICATE' | 'CUSTOMER_DISSATISFIED' | 'SERVICE_NOT_DELIVERED' | 'OTHER';
      notes?: string;
    },
  ): Promise<PosRefund> {
    return this.svc.issueRefund(id, body);
  }

  @Get(':id/refunds')
  async getRefunds(
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<{ refunds: PosRefund[] }> {
    const refunds = await this.svc.getRefunds(id);
    return { refunds };
  }

  @Post(':id/checkout')
  @HttpCode(HttpStatus.OK)
  async checkout(
    @Param('id', new ZodValidationPipe(uuidSchema)) id: string,
    @Body(
      new ZodValidationPipe(
        z.object({
          tipAmount: z.number().min(0).max(10_000).default(0),
          paymentMethod: z.enum(['CASH', 'CARD', 'TWINT', 'STRIPE_CHECKOUT']),
          completeAppointment: z.boolean().default(true),
          discountCode: z.string().max(20).optional(),
          discountChf: z.number().min(0).max(100_000).optional(),
        }),
      ),
    )
    body: {
      tipAmount: number;
      paymentMethod: 'CASH' | 'CARD' | 'TWINT' | 'STRIPE_CHECKOUT';
      completeAppointment: boolean;
      discountCode?: string;
      discountChf?: number;
    },
  ): Promise<Appointment> {
    return this.svc.checkout(id, body);
  }
}
