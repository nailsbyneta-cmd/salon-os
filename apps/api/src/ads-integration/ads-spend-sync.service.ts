import { Inject, Injectable, Logger } from '@nestjs/common';
import type { PrismaClient } from '@salon-os/db';
import { decryptSecret } from '@salon-os/utils/crypto';
import { PRISMA } from '../db/db.module.js';
import { runGaql } from './google-ads.client.js';

/**
 * Capability 3: Daily Spend-Sync.
 *
 * Pro Tenant mit aktiver google_ads-Integration:
 *   1. Hole Spend-Daten für den Vortag (UTC) via GAQL
 *   2. Upsert in tenant_ads_spend_daily (idempotent — re-run überschreibt)
 *   3. Update tenant_ads_integration.lastSyncAt
 *
 * Wird vom GitHub-Actions-Cron getriggert: täglich 04:00 UTC.
 */
@Injectable()
export class AdsSpendSyncService {
  private readonly logger = new Logger(AdsSpendSyncService.name);

  constructor(@Inject(PRISMA) private readonly prisma: PrismaClient) {}

  async syncAllTenants(targetDateIso?: string): Promise<{
    tenantsProcessed: number;
    tenantsFailed: number;
    rowsUpserted: number;
  }> {
    const integrations = await this.prisma.tenantAdsIntegration.findMany({
      where: { provider: 'google_ads', enabled: true },
    });

    const date = targetDateIso ?? this.yesterdayIso();
    let tenantsProcessed = 0;
    let tenantsFailed = 0;
    let rowsUpserted = 0;

    for (const integ of integrations) {
      try {
        const n = await this.syncOne(integ, date);
        rowsUpserted += n;
        tenantsProcessed += 1;
      } catch (e) {
        tenantsFailed += 1;
        this.logger.error(
          `ads-spend: tenant ${integ.tenantId} sync failed: ${e instanceof Error ? e.message : String(e)}`,
        );
        await this.prisma.tenantAdsIntegration.update({
          where: { id: integ.id },
          data: {
            lastSyncError: e instanceof Error ? e.message.slice(0, 500) : String(e).slice(0, 500),
          },
        });
      }
    }

    return { tenantsProcessed, tenantsFailed, rowsUpserted };
  }

  private yesterdayIso(): string {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() - 1);
    return d.toISOString().slice(0, 10);
  }

  private async syncOne(
    integ: {
      id: string;
      tenantId: string;
      customerId: string;
      loginCustomerId: string | null;
      refreshTokenEncrypted: string;
    },
    dateIso: string,
  ): Promise<number> {
    const clientId = process.env['GOOGLE_ADS_CLIENT_ID'] ?? '';
    const clientSecret = process.env['GOOGLE_ADS_CLIENT_SECRET'] ?? '';
    const developerToken = process.env['GOOGLE_ADS_DEVELOPER_TOKEN'] ?? '';
    if (!clientId || !clientSecret || !developerToken) {
      throw new Error('GOOGLE_ADS_* env-vars fehlen');
    }
    const refreshToken = decryptSecret(integ.refreshTokenEncrypted);

    const query = `
      SELECT
        campaign.id,
        campaign.name,
        segments.date,
        metrics.clicks,
        metrics.impressions,
        metrics.cost_micros,
        metrics.conversions,
        metrics.conversions_value
      FROM campaign
      WHERE segments.date = '${dateIso}'
        AND campaign.status != 'REMOVED'
    `;

    const rows = await runGaql(
      {
        tenantId: integ.tenantId,
        customerId: integ.customerId,
        loginCustomerId: integ.loginCustomerId,
        refreshToken,
        clientId,
        clientSecret,
        developerToken,
      },
      query,
    );

    let upserted = 0;
    for (const raw of rows) {
      const r = raw as {
        campaign?: { id?: string; name?: string };
        segments?: { date?: string };
        metrics?: {
          clicks?: string | number;
          impressions?: string | number;
          costMicros?: string | number;
          conversions?: number;
          conversionsValue?: number;
        };
      };
      const campaignId = r.campaign?.id ? String(r.campaign.id) : null;
      const campaignName = r.campaign?.name ?? null;
      const date = r.segments?.date ?? dateIso;
      const clicks = Number(r.metrics?.clicks ?? 0);
      const impressions = Number(r.metrics?.impressions ?? 0);
      const costChf = Number(r.metrics?.costMicros ?? 0) / 1_000_000;
      const conversions = Number(r.metrics?.conversions ?? 0);
      const conversionValueChf = Number(r.metrics?.conversionsValue ?? 0);

      // Idempotent upsert auf [tenantId, date, COALESCE(campaignId,'')]
      // — wir können nicht Prisma-upsert nutzen weil COALESCE ein
      // Custom-Index ist; dafür raw SQL.
      await this.prisma.$executeRawUnsafe(
        `INSERT INTO "tenant_ads_spend_daily"
           ("tenantId","date","campaignId","campaignName","clicks","impressions",
            "costChf","conversions","conversionValueChf","pulledAt")
         VALUES ($1::uuid, $2::date, $3, $4, $5, $6, $7, $8, $9, NOW())
         ON CONFLICT ("tenantId","date", COALESCE("campaignId",''))
         DO UPDATE SET
           "campaignName"        = EXCLUDED."campaignName",
           "clicks"              = EXCLUDED."clicks",
           "impressions"         = EXCLUDED."impressions",
           "costChf"             = EXCLUDED."costChf",
           "conversions"         = EXCLUDED."conversions",
           "conversionValueChf"  = EXCLUDED."conversionValueChf",
           "pulledAt"            = NOW()`,
        integ.tenantId,
        date,
        campaignId,
        campaignName,
        clicks,
        impressions,
        costChf,
        conversions,
        conversionValueChf,
      );
      upserted += 1;
    }

    await this.prisma.tenantAdsIntegration.update({
      where: { id: integ.id },
      data: { lastSyncAt: new Date(), lastSyncError: null },
    });

    return upserted;
  }
}
