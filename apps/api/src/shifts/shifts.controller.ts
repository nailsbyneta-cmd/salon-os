import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { z } from 'zod';
import { createShiftSchema, uuidSchema } from '@salon-os/types';
import type { Shift } from '@salon-os/db';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe.js';
import { ShiftsService } from './shifts.service.js';

@Controller('v1/shifts')
export class ShiftsController {
  constructor(private readonly svc: ShiftsService) {}

  @Get()
  async list(
    @Query('from') from: string,
    @Query('to') to: string,
    @Query('staffId') staffId?: string,
  ): Promise<{ shifts: Shift[] }> {
    if (!from || !to) {
      throw new BadRequestException('from + to query params are required (ISO 8601)');
    }
    const fromDate = new Date(from);
    const toDate = new Date(to);
    if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime())) {
      throw new BadRequestException('from / to must be valid ISO datetimes');
    }
    return { shifts: await this.svc.list({ from: fromDate, to: toDate, staffId }) };
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body(new ZodValidationPipe(createShiftSchema))
    input: import('@salon-os/types').CreateShiftInput,
  ): Promise<Shift> {
    return this.svc.create(input);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Param('id', new ZodValidationPipe(uuidSchema)) id: string,
  ): Promise<void> {
    await this.svc.remove(id);
  }

  /**
   * Generiert Schichten für die nächsten `days` Tage basierend auf den
   * Öffnungszeiten der Location. Body: { staffId, locationId, days }.
   */
  @Post('generate-from-location')
  @HttpCode(HttpStatus.OK)
  async generateFromLocation(
    @Body(
      new ZodValidationPipe(
        z.object({
          staffId: uuidSchema,
          locationId: uuidSchema,
          days: z.number().int().min(1).max(60).default(28),
        }),
      ),
    )
    input: { staffId: string; locationId: string; days: number },
  ): Promise<{ created: number; skipped: number }> {
    return this.svc.bulkGenerateFromLocation(input);
  }
}
