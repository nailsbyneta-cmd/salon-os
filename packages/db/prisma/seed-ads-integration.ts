/* eslint-disable no-console */
/**
 * One-shot Seeder für tenant_ads_integration. Verbindet einen Tenant mit
 * Google Ads (Customer-ID + Refresh-Token + Conversion-Mapping).
 *
 * Ausführung:
 *
 *   APP_ENCRYPTION_KEY="$(node -e \"console.log(require('crypto').randomBytes(32).toString('base64'))\")" \
 *   TENANT_SLUG=beautycenter-by-neta \
 *   GOOGLE_ADS_CUSTOMER_ID=1090554000 \
 *   GOOGLE_ADS_LOGIN_CUSTOMER_ID=4716972121 \
 *   GOOGLE_ADS_REFRESH_TOKEN="<copy-from-1password>" \
 *   GOOGLE_ADS_GTAG_ID=AW-18005447088 \
 *   GA4_MEASUREMENT_ID=G-HTR7SG4GGL \
 *   BOOKING_COMPLETED_LABEL="AW-18005447088/_M6bCOCAgYkcELCj1YlD" \
 *   pnpm --filter @salon-os/db setup:ads
 *
 * Idempotent — Re-Run überschreibt vorhandenen Eintrag.
 *
 * Wichtig: APP_ENCRYPTION_KEY ist DERSELBE Wert wie auf Railway. Wenn er
 * sich ändert, kann der Worker den Refresh-Token nicht mehr entschlüsseln.
 */
import { PrismaClient } from '@prisma/client';
import { encryptSecret } from '@salon-os/utils/crypto';

const prisma = new PrismaClient();

function reqEnv(key: string): string {
  const v = process.env[key];
  if (!v || v.trim() === '') {
    console.error(`✖ env ${key} fehlt`);
    process.exit(1);
  }
  return v;
}

function optEnv(key: string): string | null {
  const v = process.env[key];
  return v && v.trim() !== '' ? v : null;
}

async function main(): Promise<void> {
  if (!process.env['APP_ENCRYPTION_KEY']) {
    console.error('✖ APP_ENCRYPTION_KEY fehlt. Generiere mit:');
    console.error(
      '    APP_ENCRYPTION_KEY=$(node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'base64\'))")',
    );
    console.error('  Danach denselben Wert auch in Railway-env setzen.');
    process.exit(1);
  }

  const tenantSlug = reqEnv('TENANT_SLUG');
  const customerId = reqEnv('GOOGLE_ADS_CUSTOMER_ID');
  const loginCustomerId = optEnv('GOOGLE_ADS_LOGIN_CUSTOMER_ID');
  const refreshToken = reqEnv('GOOGLE_ADS_REFRESH_TOKEN');
  const gtagId = optEnv('GOOGLE_ADS_GTAG_ID');
  const ga4Id = optEnv('GA4_MEASUREMENT_ID');
  const bookingLabel = optEnv('BOOKING_COMPLETED_LABEL');

  const tenant = await prisma.tenant.findUnique({
    where: { slug: tenantSlug },
    select: { id: true, name: true },
  });
  if (!tenant) {
    console.error(`✖ Tenant mit slug=${tenantSlug} nicht gefunden`);
    process.exit(1);
  }

  const refreshTokenEncrypted = encryptSecret(refreshToken);

  const conversionActions: Record<string, unknown> = {
    _meta: {
      googleAdsId: gtagId,
      ga4MeasurementId: ga4Id,
    },
  };
  if (bookingLabel) conversionActions['booking_completed'] = bookingLabel;

  const result = await prisma.tenantAdsIntegration.upsert({
    where: { tenantId_provider: { tenantId: tenant.id, provider: 'google_ads' } },
    update: {
      customerId,
      loginCustomerId,
      refreshTokenEncrypted,
      conversionActions,
      enabled: true,
      lastSyncError: null,
    },
    create: {
      tenantId: tenant.id,
      provider: 'google_ads',
      customerId,
      loginCustomerId,
      refreshTokenEncrypted,
      conversionActions,
      enabled: true,
    },
  });

  console.log('✔ tenant_ads_integration upserted');
  console.log(`  tenant: ${tenant.name} (${tenant.id})`);
  console.log(`  customerId: ${customerId}`);
  console.log(`  loginCustomerId: ${loginCustomerId ?? '(none)'}`);
  console.log(`  conversion-actions: ${Object.keys(conversionActions).filter((k) => k !== '_meta').join(', ') || '(none)'}`);
  console.log(`  gtag: ads=${gtagId ?? '-'} ga4=${ga4Id ?? '-'}`);
  console.log(`  id: ${result.id}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => {
    void prisma.$disconnect();
  });
