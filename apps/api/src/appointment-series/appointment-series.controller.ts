import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import type { Appointment, AppointmentSeries } from '@salon-os/db';
import { uuidSchema } from '@salon-os/types';
import { z } from 'zod';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe.js';
import {
  AppointmentSeriesService,
  type CreateSeriesInput,
  type UpdateSeriesInput,
} from './appointment-series.service.js';

const createSchema = z.object({
  clientId: uuidSchema,
  staffId: uuidSchema,
  serviceId: uuidSchema,
  locationId: uuidSchema,
  intervalWeeks: z.number().int().min(1).max(52),
  firstStartAt: z.string().datetime({ offset: true }),
  durationMinutes: z.number().int().min(5).max(600),
  endsAt: z.string().datetime({ offset: true }).nullable().optional(),
  occurrences: z.number().int().min(1).max(104).nullable().optional(),
  notes: z.string().max(500).optional(),
  initialOccurrences: z.number().int().min(1).max(12).optional(),
});

const updateSchema = z.object({
  intervalWeeks: z.number().int().min(1).max(52).optional(),
  endsAt: z.string().datetime({ offset: true }).nullable().optional(),
  occurrences: z.number().int().min(1).max(104).nullable().optional(),
  active: z.boolean().optional(),
  notes: z.string().max(500).nullable().optional(),
});

@Controller('v1/appointment-series')
export class AppointmentSeriesController {
  constructor(private readonly svc: AppointmentSeriesService) {}

  @Get()
  async list(@Query('clientId', new ZodValidationPipe(uuidSchema)) clientId: string): Promise<{
    series: Awaited<ReturnType<AppointmentSeriesService['listForClient']>>;
  }> {
    return { series: await this.svc.listForClient(clientId) };
  }

  @Get(':id')
  async get(
    @Param('id', new ZodValidationPipe(uuidSchema)) id: string,
  ): Promise<AppointmentSeries> {
    return this.svc.get(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body(new ZodValidationPipe(createSchema)) input: CreateSeriesInput,
  ): Promise<{ series: AppointmentSeries; appointments: Appointment[] }> {
    return this.svc.create(input);
  }

  @Patch(':id')
  async update(
    @Param('id', new ZodValidationPipe(uuidSchema)) id: string,
    @Body(new ZodValidationPipe(updateSchema)) input: UpdateSeriesInput,
  ): Promise<AppointmentSeries> {
    return this.svc.update(id, input);
  }

  /**
   * Stop-After-Endpoint — cancelt zukünftige Termine ab Datum + setzt
   * Serie inaktiv. Vergangene Termine bleiben.
   */
  @Post(':id/stop-after')
  async stopAfter(
    @Param('id', new ZodValidationPipe(uuidSchema)) id: string,
    @Body(
      new ZodValidationPipe(
        z.object({ fromDate: z.string().datetime({ offset: true }).optional() }),
      ),
    )
    body: { fromDate?: string },
  ): Promise<{ cancelled: number }> {
    const date = body.fromDate ? new Date(body.fromDate) : new Date();
    return this.svc.stopAfter(id, date);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async stop(@Param('id', new ZodValidationPipe(uuidSchema)) id: string): Promise<void> {
    await this.svc.stopAfter(id, new Date());
  }
}
