import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Res,
} from '@nestjs/common';
import type { FastifyReply } from 'fastify';
import { z } from 'zod';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe.js';
import { requireTenantContext } from '../tenant/tenant.context.js';
import {
  PayrollService,
  type GenerateResult,
  type PayrollPeriodDetail,
  type PayrollPeriodRow,
} from './payroll.service.js';

// ─── Schemas ──────────────────────────────────────────────────────────────────

const generateSchema = z
  .object({
    fromDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'fromDate muss YYYY-MM-DD sein'),
    toDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'toDate muss YYYY-MM-DD sein'),
    staffId: z.string().uuid().optional().nullable(),
  })
  .refine((v) => v.fromDate <= v.toDate, {
    message: 'fromDate muss vor oder gleich toDate liegen',
    path: ['fromDate'],
  });

type GenerateInput = z.infer<typeof generateSchema>;

// ─── Guard ────────────────────────────────────────────────────────────────────

function requireOwnerOrManager(role: string | null | undefined): void {
  if (role !== 'OWNER' && role !== 'MANAGER') {
    throw new ForbiddenException('Nur OWNER oder MANAGER dürfen Lohnabrechnungen verwalten.');
  }
}

// ─── Controller ───────────────────────────────────────────────────────────────

@Controller('v1/payroll')
export class PayrollController {
  constructor(private readonly svc: PayrollService) {}

  @Post('generate')
  @HttpCode(HttpStatus.CREATED)
  async generate(
    @Body(new ZodValidationPipe(generateSchema)) input: GenerateInput,
  ): Promise<GenerateResult> {
    const ctx = requireTenantContext();
    requireOwnerOrManager(ctx.role);
    return this.svc.generate({
      fromDate: input.fromDate,
      toDate: input.toDate,
      staffId: input.staffId,
    });
  }

  @Get()
  async list(): Promise<{ periods: PayrollPeriodRow[] }> {
    const ctx = requireTenantContext();
    requireOwnerOrManager(ctx.role);
    const periods = await this.svc.list();
    return { periods };
  }

  @Get(':id')
  async detail(@Param('id', ParseUUIDPipe) id: string): Promise<PayrollPeriodDetail> {
    const ctx = requireTenantContext();
    requireOwnerOrManager(ctx.role);
    return this.svc.detail(id);
  }

  @Post(':id/close')
  @HttpCode(HttpStatus.OK)
  async close(@Param('id', ParseUUIDPipe) id: string): Promise<PayrollPeriodRow> {
    const ctx = requireTenantContext();
    requireOwnerOrManager(ctx.role);
    return this.svc.close(id);
  }

  @Get(':id/export')
  async export(@Param('id', ParseUUIDPipe) id: string, @Res() res: FastifyReply): Promise<void> {
    const ctx = requireTenantContext();
    requireOwnerOrManager(ctx.role);
    const { csv, filename } = await this.svc.exportCsv(id);
    res.header('Content-Type', 'text/csv; charset=utf-8');
    res.header('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csv);
  }
}
