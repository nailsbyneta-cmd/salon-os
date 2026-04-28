import {
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  UnauthorizedException,
} from '@nestjs/common';
import { AdsSpendSyncService } from './ads-spend-sync.service.js';

/**
 * Cron-Endpoint für Capability 3 (Daily Spend-Sync).
 * Trigger via GitHub Actions täglich 04:00 UTC mit x-cron-secret.
 *
 * Optional ?date=YYYY-MM-DD für Backfill (manuell triggerbar).
 */
@Controller('v1/public/cron/ads-spend')
export class AdsIntegrationCronController {
  constructor(private readonly sync: AdsSpendSyncService) {}

  @Post('sync')
  @HttpCode(HttpStatus.OK)
  async syncNow(
    @Headers('x-cron-secret') secret?: string,
    @Query('date') date?: string,
  ): Promise<{
    tenantsProcessed: number;
    tenantsFailed: number;
    rowsUpserted: number;
  }> {
    const expected = process.env['CRON_SECRET'];
    if (!expected || !secret || secret !== expected) {
      throw new UnauthorizedException('Invalid cron secret');
    }
    const targetDate = date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : undefined;
    return this.sync.syncAllTenants(targetDate);
  }
}
