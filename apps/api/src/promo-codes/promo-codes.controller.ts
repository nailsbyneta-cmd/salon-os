import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { z } from 'zod';
import type { PromoCode } from '@salon-os/db';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe.js';
import { PromoCodesService, type ValidateResult } from './promo-codes.service.js';

const createSchema = z.object({
  code: z
    .string()
    .min(1)
    .max(20)
    .regex(/^[A-Z0-9_-]+$/i, 'Nur Buchstaben, Ziffern, - und _ erlaubt.'),
  type: z.enum(['PERCENT', 'FIXED']),
  value: z.number().positive(),
  currency: z.string().length(3).optional(),
  minOrderChf: z.number().min(0).optional(),
  maxUsages: z.number().int().positive().optional(),
  expiresAt: z.string().datetime().optional(),
  note: z.string().max(500).optional(),
});

const updateSchema = z.object({
  active: z.boolean().optional(),
  expiresAt: z.string().datetime().nullable().optional(),
  note: z.string().max(500).nullable().optional(),
});

const validateSchema = z.object({
  code: z.string().min(1).max(20),
  orderAmountChf: z.number().min(0),
});

@Controller('v1/promo-codes')
export class PromoCodesController {
  constructor(private readonly svc: PromoCodesService) {}

  @Get()
  async list(): Promise<{ promoCodes: PromoCode[] }> {
    return { promoCodes: await this.svc.list() };
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body(new ZodValidationPipe(createSchema)) input: z.infer<typeof createSchema>,
  ): Promise<PromoCode> {
    return this.svc.create(input);
  }

  @Patch(':id')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(updateSchema)) patch: z.infer<typeof updateSchema>,
  ): Promise<PromoCode> {
    return this.svc.update(id, patch);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async deactivate(@Param('id', ParseUUIDPipe) id: string): Promise<PromoCode> {
    return this.svc.deactivate(id);
  }

  @Post('validate')
  @HttpCode(HttpStatus.OK)
  async validate(
    @Body(new ZodValidationPipe(validateSchema)) input: z.infer<typeof validateSchema>,
  ): Promise<ValidateResult> {
    return this.svc.validate(input);
  }
}
