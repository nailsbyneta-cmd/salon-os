import {
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Post,
  UnauthorizedException,
} from '@nestjs/common';
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

  private assertSecret(secret?: string): void {
    const expected = process.env['CRON_SECRET'];
    if (!expected || !secret || secret !== expected) {
      throw new UnauthorizedException('Invalid cron secret');
    }
  }
}
