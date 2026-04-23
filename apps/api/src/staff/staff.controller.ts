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
import { z } from 'zod';
import type { CreateStaffInput, UpdateStaffInput } from '@salon-os/types';
import { createStaffSchema, updateStaffSchema, uuidSchema } from '@salon-os/types';
import type { Staff } from '@salon-os/db';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe.js';
import { StaffService, type WeeklySchedule } from './staff.service.js';

const intervalSchema = z.object({
  open: z.string().regex(/^\d{2}:\d{2}$/),
  close: z.string().regex(/^\d{2}:\d{2}$/),
});
const weeklyScheduleSchema = z.object({
  mon: z.array(intervalSchema).default([]),
  tue: z.array(intervalSchema).default([]),
  wed: z.array(intervalSchema).default([]),
  thu: z.array(intervalSchema).default([]),
  fri: z.array(intervalSchema).default([]),
  sat: z.array(intervalSchema).default([]),
  sun: z.array(intervalSchema).default([]),
});

@Controller('v1/staff')
export class StaffController {
  constructor(private readonly svc: StaffService) {}

  @Get()
  async list(
    @Query('locationId') locationId?: string,
    @Query('active') active?: string,
  ): Promise<{ staff: Staff[] }> {
    return {
      staff: await this.svc.list({
        locationId,
        active: active === undefined ? undefined : active === 'true',
      }),
    };
  }

  @Get(':id')
  async get(@Param('id', new ZodValidationPipe(uuidSchema)) id: string): Promise<Staff> {
    return this.svc.get(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body(new ZodValidationPipe(createStaffSchema)) input: CreateStaffInput,
  ): Promise<Staff> {
    return this.svc.create(input);
  }

  @Patch(':id')
  async update(
    @Param('id', new ZodValidationPipe(uuidSchema)) id: string,
    @Body(new ZodValidationPipe(updateStaffSchema)) input: UpdateStaffInput,
  ): Promise<Staff> {
    return this.svc.update(id, input);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id', new ZodValidationPipe(uuidSchema)) id: string): Promise<void> {
    await this.svc.softDelete(id);
  }

  @Patch(':id/weekly-schedule')
  async setWeeklySchedule(
    @Param('id', new ZodValidationPipe(uuidSchema)) id: string,
    @Body(new ZodValidationPipe(weeklyScheduleSchema))
    body: WeeklySchedule,
  ): Promise<Staff> {
    return this.svc.setWeeklySchedule(id, body);
  }

  /** Ausnahme-Tage (ein spezifisches Datum abweichend vom Weekly-Schedule). */
  @Patch(':id/schedule-exceptions')
  async setScheduleExceptions(
    @Param('id', new ZodValidationPipe(uuidSchema)) id: string,
    @Body(
      new ZodValidationPipe(
        z.record(
          z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
          z.union([
            z.object({ closed: z.literal(true) }),
            z.object({ intervals: z.array(intervalSchema).min(1) }),
          ]),
        ),
      ),
    )
    body: Record<string, { closed: true } | { intervals: Array<{ open: string; close: string }> }>,
  ): Promise<Staff> {
    return this.svc.setScheduleExceptions(id, body);
  }

  /** Ferien/Abwesenheiten für eine Stylistin. */
  @Get(':id/time-off')
  async listTimeOff(
    @Param('id', new ZodValidationPipe(uuidSchema)) staffId: string,
  ): Promise<{ entries: unknown[] }> {
    const entries = await this.svc.listTimeOff(staffId);
    return { entries };
  }

  @Post(':id/time-off')
  @HttpCode(HttpStatus.CREATED)
  async createTimeOff(
    @Param('id', new ZodValidationPipe(uuidSchema)) staffId: string,
    @Body(
      new ZodValidationPipe(
        z.object({
          startAt: z.string().datetime({ offset: true }),
          endAt: z.string().datetime({ offset: true }),
          reason: z.string().max(500).optional(),
        }),
      ),
    )
    body: { startAt: string; endAt: string; reason?: string },
  ): Promise<unknown> {
    return this.svc.createTimeOff(staffId, body);
  }

  @Delete(':staffId/time-off/:timeOffId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteTimeOff(
    @Param('staffId', new ZodValidationPipe(uuidSchema)) staffId: string,
    @Param('timeOffId', new ZodValidationPipe(uuidSchema)) timeOffId: string,
  ): Promise<void> {
    await this.svc.deleteTimeOff(staffId, timeOffId);
  }
}
