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
import {
  cancelAppointmentSchema,
  createAppointmentSchema,
  rescheduleAppointmentSchema,
  uuidSchema,
} from '@salon-os/types';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe.js';
import { AppointmentsService } from './appointments.service.js';
import type { Appointment } from '@salon-os/db';

@Controller('v1/appointments')
export class AppointmentsController {
  constructor(private readonly svc: AppointmentsService) {}

  @Get()
  async list(
    @Query('from') from: string,
    @Query('to') to: string,
    @Query('locationId') locationId?: string,
    @Query('staffId') staffId?: string,
  ): Promise<{ appointments: Appointment[] }> {
    if (!from || !to) {
      throw new BadRequestException('from + to query params are required (ISO 8601)');
    }
    const fromDate = new Date(from);
    const toDate = new Date(to);
    if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime())) {
      throw new BadRequestException('from / to must be valid ISO datetimes');
    }
    const appointments = await this.svc.list({
      from: fromDate,
      to: toDate,
      locationId,
      staffId,
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
}
