/**
 * Salon-OS — Tenant Provisioning Script
 *
 * Usage:
 *   npx tsx scripts/provision-tenant.ts \
 *     --slug "musterhof" \
 *     --name "Musterhof Salon GmbH" \
 *     --country CH \
 *     --currency CHF \
 *     --timezone "Europe/Zurich" \
 *     --locale de-CH \
 *     --billing-email "billing@musterhof.ch" \
 *     --owner-email "vorname.nachname@musterhof.ch" \
 *     --owner-name "Vorname Nachname" \
 *     [--plan STARTER|PROFESSIONAL|ENTERPRISE] \
 *     [--with-defaults] \
 *     [--dry-run]
 *
 * Was es macht:
 *   1. Validiert dass slug nicht existiert
 *   2. Erstellt Tenant-Row (status=TRIAL)
 *   3. Erstellt User-Row (Email als Identity, falls nicht existiert)
 *   4. Erstellt tenant_membership mit Role=OWNER + isPrimary=true
 *   5. Optional --with-defaults: Seed Default-Services, Default-Location, Default-Templates
 *   6. Gibt Tenant-ID + Login-URL aus
 *
 * Was es NICHT macht (manuell danach):
 *   - WorkOS-Org anlegen (UI: dashboard.workos.com)
 *   - WorkOS Magic-Link an Owner senden (Owner muss sich einloggen)
 *   - DNS-Subdomain (musterhof.salon-os.app) ins Cloudflare DNS
 *   - Stripe-Customer + Subscription (sobald billing aktiv)
 *
 * Sicher: --dry-run zeigt was passieren würde, schreibt nichts.
 */

import { PrismaClient, Plan, TenantStatus, StaffRole } from '@prisma/client';
import { parseArgs } from 'node:util';

interface ProvisionArgs {
  slug: string;
  name: string;
  country: string;
  currency: string;
  timezone: string;
  locale: string;
  billingEmail: string;
  ownerEmail: string;
  ownerName: string;
  plan: string;
  withDefaults: boolean;
  dryRun: boolean;
}

function parse(): ProvisionArgs {
  const { values } = parseArgs({
    options: {
      slug: { type: 'string' },
      name: { type: 'string' },
      country: { type: 'string', default: 'CH' },
      currency: { type: 'string', default: 'CHF' },
      timezone: { type: 'string', default: 'Europe/Zurich' },
      locale: { type: 'string', default: 'de-CH' },
      'billing-email': { type: 'string' },
      'owner-email': { type: 'string' },
      'owner-name': { type: 'string' },
      plan: { type: 'string', default: 'STARTER' },
      'with-defaults': { type: 'boolean', default: false },
      'dry-run': { type: 'boolean', default: false },
    },
    allowPositionals: false,
  });

  const required = ['slug', 'name', 'billing-email', 'owner-email', 'owner-name'];
  for (const r of required) {
    if (!values[r as keyof typeof values]) {
      throw new Error(`Missing --${r}`);
    }
  }

  return {
    slug: values.slug as string,
    name: values.name as string,
    country: values.country as string,
    currency: values.currency as string,
    timezone: values.timezone as string,
    locale: values.locale as string,
    billingEmail: values['billing-email'] as string,
    ownerEmail: values['owner-email'] as string,
    ownerName: values['owner-name'] as string,
    plan: values.plan as string,
    withDefaults: values['with-defaults'] as boolean,
    dryRun: values['dry-run'] as boolean,
  };
}

async function main() {
  const args = parse();
  const prisma = new PrismaClient();

  console.log('═══════════════════════════════════════════════');
  console.log('  Salon-OS Tenant Provisioning');
  console.log('═══════════════════════════════════════════════');
  console.log(`Slug:           ${args.slug}`);
  console.log(`Name:           ${args.name}`);
  console.log(`Country/Curr:   ${args.country} / ${args.currency}`);
  console.log(`Timezone:       ${args.timezone}`);
  console.log(`Locale:         ${args.locale}`);
  console.log(`Plan:           ${args.plan}`);
  console.log(`Owner:          ${args.ownerName} <${args.ownerEmail}>`);
  console.log(`Billing-Email:  ${args.billingEmail}`);
  console.log(`Defaults seed:  ${args.withDefaults ? 'YES' : 'NO'}`);
  console.log(`DRY-RUN:        ${args.dryRun ? 'YES' : 'NO'}`);
  console.log('═══════════════════════════════════════════════\n');

  // 1. Slug-Eindeutigkeit
  const existingTenant = await prisma.tenant.findUnique({ where: { slug: args.slug } });
  if (existingTenant) {
    throw new Error(`Tenant slug "${args.slug}" already exists (id=${existingTenant.id})`);
  }

  if (args.dryRun) {
    console.log('[DRY-RUN] Würde Tenant + User + Membership erstellen.');
    if (args.withDefaults) {
      console.log(
        '[DRY-RUN] Würde Default-Location + 5 Default-Services + Default-Templates seeden.',
      );
    }
    console.log('\n→ ohne --dry-run nochmal laufen lassen.');
    await prisma.$disconnect();
    return;
  }

  // 2. Tenant
  const tenant = await prisma.tenant.create({
    data: {
      slug: args.slug,
      name: args.name,
      countryCode: args.country.toUpperCase(),
      currency: args.currency.toUpperCase(),
      timezone: args.timezone,
      locale: args.locale,
      billingEmail: args.billingEmail,
      plan: args.plan as Plan,
      status: TenantStatus.TRIAL,
    },
  });
  console.log(`✅ Tenant erstellt: ${tenant.id}`);

  // 3. User (find-or-create)
  let user = await prisma.user.findUnique({ where: { email: args.ownerEmail } });
  if (!user) {
    user = await prisma.user.create({
      data: {
        email: args.ownerEmail,
        displayName: args.ownerName,
      },
    });
    console.log(`✅ User erstellt: ${user.id}`);
  } else {
    console.log(`✅ User existiert bereits: ${user.id}`);
  }

  // 4. Membership
  const membership = await prisma.tenantMembership.create({
    data: {
      tenantId: tenant.id,
      userId: user.id,
      role: StaffRole.OWNER,
      isPrimary: true,
    },
  });
  console.log(`✅ Membership erstellt: ${membership.id} (OWNER)`);

  // 5. Defaults seeden
  if (args.withDefaults) {
    console.log('\n--with-defaults: TODO — siehe README für Liste der Default-Entities');
    // TODO: location, services, shift-templates, message-templates, ...
  }

  console.log('\n═══════════════════════════════════════════════');
  console.log(`  Tenant ID: ${tenant.id}`);
  console.log(`  Login-URL: https://${args.slug}.salon-os.app/login`);
  console.log('═══════════════════════════════════════════════\n');

  console.log('Nächste Schritte (manuell):');
  console.log('  1. WorkOS-Org anlegen unter dashboard.workos.com');
  console.log('  2. WorkOS-Org-ID in tenant.workosOrgId eintragen (TODO: column)');
  console.log(`  3. DNS: ${args.slug}.salon-os.app → Cloudflare → Workers-Route`);
  console.log(`  4. Magic-Link an ${args.ownerEmail} senden`);
  console.log('  5. Stripe-Customer anlegen (wenn Billing aktiv)');

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error('\n🚨 FEHLER:', e.message);
  process.exit(1);
});
