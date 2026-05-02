import {
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Post,
  UnauthorizedException,
} from '@nestjs/common';
import { requireTenantContext } from '../tenant/tenant.context.js';
import { MarketingService } from './marketing.service.js';

/**
 * Cron + Read-only Endpoints.
 * - GET /v1/public/cron/marketing/reactivation/preview → wieviele eligible
 * - POST /v1/public/cron/marketing/reactivation → enqueue events
 * Beide x-cron-secret guarded. Public-Pfad damit TenantMiddleware nicht greift.
 */
@Controller('v1/public/cron/marketing')
export class MarketingController {
  constructor(private readonly svc: MarketingService) {}

  @Get('reactivation/preview')
  async preview(
    @Headers('x-cron-secret') secret?: string,
  ): Promise<Awaited<ReturnType<MarketingService['previewReactivation']>>> {
    this.assertSecret(secret);
    return this.svc.previewReactivation();
  }

  @Post('reactivation')
  @HttpCode(HttpStatus.OK)
  async run(
    @Headers('x-cron-secret') secret?: string,
  ): Promise<Awaited<ReturnType<MarketingService['runReactivation']>>> {
    this.assertSecret(secret);
    return this.svc.runReactivation();
  }

  @Post('birthday')
  @HttpCode(HttpStatus.OK)
  async birthdaySweep(
    @Headers('x-cron-secret') secret?: string,
  ): Promise<Awaited<ReturnType<MarketingService['runBirthdaySweep']>>> {
    this.assertSecret(secret);
    return this.svc.runBirthdaySweep();
  }

  @Post('rebook')
  @HttpCode(HttpStatus.OK)
  async rebookSweep(
    @Headers('x-cron-secret') secret?: string,
  ): Promise<Awaited<ReturnType<MarketingService['runRebookSweep']>>> {
    this.assertSecret(secret);
    return this.svc.runRebookSweep();
  }

  private assertSecret(secret?: string): void {
    const expected = process.env['CRON_SECRET'];
    if (!expected || !secret || secret !== expected) {
      throw new UnauthorizedException('Invalid cron secret');
    }
  }
}

/**
 * Admin-Endpoints für Marketing — tenant-scoped via TenantMiddleware.
 * Owner/Manager kann manuell Reactivation triggern oder Status ansehen.
 */
@Controller('v1/marketing')
export class MarketingAdminController {
  constructor(private readonly svc: MarketingService) {}

  @Get('reactivation')
  async preview(): Promise<Awaited<ReturnType<MarketingService['previewReactivationForTenant']>>> {
    const ctx = requireTenantContext();
    return this.svc.previewReactivationForTenant(ctx.tenantId);
  }

  @Post('reactivation/run')
  @HttpCode(HttpStatus.OK)
  async run(): Promise<Awaited<ReturnType<MarketingService['runReactivationForTenant']>>> {
    const ctx = requireTenantContext();
    return this.svc.runReactivationForTenant(ctx.tenantId);
  }

  @Get('birthday')
  async birthdayPreview() {
    const ctx = requireTenantContext();
    return this.svc.previewBirthdayForTenant(ctx.tenantId);
  }

  @Post('birthday/run')
  @HttpCode(HttpStatus.OK)
  async birthdayRun() {
    const ctx = requireTenantContext();
    return this.svc.runBirthdayForTenant(ctx.tenantId);
  }

  @Get('rebook')
  async rebookPreview() {
    const ctx = requireTenantContext();
    return this.svc.previewRebookForTenant(ctx.tenantId);
  }

  @Post('rebook/run')
  @HttpCode(HttpStatus.OK)
  async rebookRun() {
    const ctx = requireTenantContext();
    return this.svc.runRebookForTenant(ctx.tenantId);
  }
}
