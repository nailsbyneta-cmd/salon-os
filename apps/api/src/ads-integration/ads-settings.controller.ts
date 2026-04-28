import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
  Put,
} from '@nestjs/common';
import { z } from 'zod';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe.js';
import { requireTenantContext } from '../tenant/tenant.context.js';
import { AdsSettingsService, type AdsIntegrationInput } from './ads-settings.service.js';

const adsSettingsSchema = z.object({
  customerId: z
    .string()
    .min(5)
    .max(20)
    .regex(/^\d+$/, 'Customer-ID muss numerisch sein'),
  loginCustomerId: z
    .string()
    .max(20)
    .regex(/^\d*$/, 'Login-Customer-ID muss numerisch sein')
    .optional()
    .nullable()
    .transform((v) => (v && v.length > 0 ? v : null)),
  refreshToken: z.string().min(10).max(500).optional(),
  enabled: z.boolean().optional(),
  conversionActions: z.record(z.unknown()).optional(),
});

function requireAdmin(role: string | null | undefined): void {
  if (role !== 'OWNER' && role !== 'MANAGER') {
    throw new ForbiddenException('Nur OWNER oder MANAGER dürfen Ads-Settings ändern.');
  }
}

@Controller('v1/ads/settings')
export class AdsSettingsController {
  constructor(private readonly svc: AdsSettingsService) {}

  @Get()
  async status(): Promise<Awaited<ReturnType<AdsSettingsService['getStatus']>>> {
    const ctx = requireTenantContext();
    return this.svc.getStatus(ctx.tenantId);
  }

  @Put()
  @HttpCode(HttpStatus.OK)
  async upsert(
    @Body(new ZodValidationPipe(adsSettingsSchema)) body: AdsIntegrationInput,
  ): Promise<Awaited<ReturnType<AdsSettingsService['upsert']>>> {
    const ctx = requireTenantContext();
    requireAdmin(ctx.role);
    if (!process.env['APP_ENCRYPTION_KEY']) {
      throw new BadRequestException(
        'APP_ENCRYPTION_KEY env-var nicht gesetzt — Refresh-Token kann nicht verschlüsselt werden.',
      );
    }
    return this.svc.upsert(ctx.tenantId, body);
  }

  @Delete()
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(): Promise<void> {
    const ctx = requireTenantContext();
    requireAdmin(ctx.role);
    await this.svc.remove(ctx.tenantId);
  }
}
