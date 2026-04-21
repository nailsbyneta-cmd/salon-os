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
}
