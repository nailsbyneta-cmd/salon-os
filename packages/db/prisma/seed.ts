/* eslint-disable no-console */
/**
 * SALON OS — Seed-Script.
 * Legt einen Demo-Tenant an (Beautycenter by Neta), eine Demo-Location,
 * einen Owner-User und eine Membership.
 *
 * Ausführung:
 *   pnpm --filter @salon-os/db db:seed
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  const tenant = await prisma.tenant.upsert({
    where: { slug: 'beautycenter-by-neta' },
    update: {},
    create: {
      slug: 'beautycenter-by-neta',
      name: 'Beautycenter by Neta',
      countryCode: 'CH',
      currency: 'CHF',
      timezone: 'Europe/Zurich',
      locale: 'de-CH',
      plan: 'BUSINESS',
      status: 'ACTIVE',
      billingEmail: 'lorenc@beautyneta.ch',
    },
  });

  await prisma.location.upsert({
    where: { tenantId_slug: { tenantId: tenant.id, slug: 'st-gallen-winkeln' } },
    update: {},
    create: {
      tenantId: tenant.id,
      name: 'Beautycenter by Neta — St. Gallen Winkeln',
      slug: 'st-gallen-winkeln',
      address1: 'Kräzernstrasse 79',
      city: 'St. Gallen Winkeln',
      postalCode: '9015',
      countryCode: 'CH',
      timezone: 'Europe/Zurich',
      currency: 'CHF',
      taxConfig: { vatRate: 8.1, vatId: null },
      openingHours: {
        mon: [{ open: '09:00', close: '19:00' }],
        tue: [{ open: '09:00', close: '19:00' }],
        wed: [{ open: '09:00', close: '19:00' }],
        thu: [{ open: '09:00', close: '19:00' }],
        fri: [{ open: '09:00', close: '19:00' }],
        sat: [{ open: '09:00', close: '17:00' }],
        sun: [],
      },
      publicProfile: true,
    },
  });

  const owner = await prisma.user.upsert({
    where: { email: 'lorenc@beautyneta.ch' },
    update: {},
    create: {
      email: 'lorenc@beautyneta.ch',
      firstName: 'Lorenc',
      lastName: 'Ukgjini',
      locale: 'de-CH',
      status: 'ACTIVE',
    },
  });

  await prisma.tenantMembership.upsert({
    where: { tenantId_userId: { tenantId: tenant.id, userId: owner.id } },
    update: { role: 'OWNER', isPrimary: true },
    create: {
      tenantId: tenant.id,
      userId: owner.id,
      role: 'OWNER',
      isPrimary: true,
    },
  });

  console.log(`[seed] tenant=${tenant.slug} owner=${owner.email} — ready`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
