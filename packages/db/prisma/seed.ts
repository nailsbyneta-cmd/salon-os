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

  const location = await prisma.location.findFirstOrThrow({
    where: { tenantId: tenant.id, slug: 'st-gallen-winkeln' },
  });

  // ─── Service-Kategorien ───────────────────────────────────────
  const categories = [
    { slug: 'naegel', name: 'Nägel', order: 1 },
    { slug: 'wimpern', name: 'Wimpern', order: 2 },
    { slug: 'brauen', name: 'Brauen', order: 3 },
    { slug: 'kosmetik', name: 'Gesichtsbehandlungen', order: 4 },
  ] as const;

  const categoryMap = new Map<string, { id: string }>();
  for (const c of categories) {
    const existing = await prisma.serviceCategory.findFirst({
      where: { tenantId: tenant.id, name: c.name },
    });
    const cat = existing
      ? existing
      : await prisma.serviceCategory.create({
          data: { tenantId: tenant.id, name: c.name, order: c.order },
        });
    categoryMap.set(c.slug, { id: cat.id });
  }

  // ─── Services ─────────────────────────────────────────────────
  const services = [
    {
      category: 'naegel',
      slug: 'naegel-modellage-gel',
      name: 'Nagel-Modellage Gel',
      duration: 90,
      price: '95.00',
      description: 'Neumodellage mit Gel-Aufbau',
    },
    {
      category: 'naegel',
      slug: 'naegel-refill',
      name: 'Nagel-Refill',
      duration: 60,
      price: '65.00',
      description: 'Auffüllen einer bestehenden Modellage',
    },
    {
      category: 'naegel',
      slug: 'manikuere',
      name: 'Maniküre klassisch',
      duration: 45,
      price: '45.00',
      description: 'Nagelpflege + Lack',
    },
    {
      category: 'naegel',
      slug: 'pedikuere',
      name: 'Pediküre',
      duration: 60,
      price: '70.00',
      description: 'Medizinische Fusspflege + Lack',
    },
    {
      category: 'wimpern',
      slug: 'wimpernverlaengerung-classic',
      name: 'Wimpern Classic',
      duration: 90,
      price: '130.00',
      description: 'Einzelwimpern-Verlängerung',
    },
    {
      category: 'wimpern',
      slug: 'wimpernverlaengerung-volume',
      name: 'Wimpern Volume',
      duration: 120,
      price: '180.00',
      description: '3D-Volumen-Wimpern',
    },
    {
      category: 'wimpern',
      slug: 'wimpern-refill',
      name: 'Wimpern-Refill',
      duration: 60,
      price: '75.00',
      description: 'Auffüllen bestehender Verlängerung',
    },
    {
      category: 'brauen',
      slug: 'brauen-zupfen',
      name: 'Brauen zupfen + formen',
      duration: 30,
      price: '35.00',
      description: 'Formkorrektur mit Pinzette',
    },
    {
      category: 'brauen',
      slug: 'brauen-laminierung',
      name: 'Brauen-Laminierung',
      duration: 60,
      price: '85.00',
      description: 'Aufrichten + Fixieren',
    },
    {
      category: 'kosmetik',
      slug: 'gesichtsbehandlung-classic',
      name: 'Gesichtsbehandlung Classic',
      duration: 60,
      price: '95.00',
      description: 'Reinigung + Peeling + Maske',
    },
    {
      category: 'kosmetik',
      slug: 'hydrafacial',
      name: 'HydraFacial',
      duration: 60,
      price: '180.00',
      description: 'Tiefenreinigung + Hydration',
    },
  ] as const;

  for (const s of services) {
    const cat = categoryMap.get(s.category);
    if (!cat) continue;
    await prisma.service.upsert({
      where: { tenantId_slug: { tenantId: tenant.id, slug: s.slug } },
      update: {},
      create: {
        tenantId: tenant.id,
        categoryId: cat.id,
        name: s.name,
        slug: s.slug,
        description: s.description,
        durationMinutes: s.duration,
        basePrice: s.price,
        bookable: true,
      },
    });
  }

  // ─── Staff ────────────────────────────────────────────────────
  const staffUser = await prisma.user.upsert({
    where: { email: 'neta@beautyneta.ch' },
    update: {},
    create: {
      email: 'neta@beautyneta.ch',
      firstName: 'Neta',
      lastName: 'Ukgjini',
      locale: 'de-CH',
      status: 'ACTIVE',
    },
  });

  const existingStaff = await prisma.staff.findFirst({
    where: { tenantId: tenant.id, email: 'neta@beautyneta.ch' },
  });
  const staffNeta = existingStaff
    ? existingStaff
    : await prisma.staff.create({
        data: {
          tenantId: tenant.id,
          userId: staffUser.id,
          firstName: 'Neta',
          lastName: 'Ukgjini',
          email: 'neta@beautyneta.ch',
          role: 'OWNER',
          employmentType: 'OWNER',
          color: '#E91E63',
          active: true,
          locationAssignments: {
            create: [{ locationId: location.id, isPrimary: true }],
          },
        },
      });

  // Staff darf alle Services buchen
  const allServices = await prisma.service.findMany({
    where: { tenantId: tenant.id },
  });
  for (const svc of allServices) {
    await prisma.staffService.upsert({
      where: { staffId_serviceId: { staffId: staffNeta.id, serviceId: svc.id } },
      update: {},
      create: { staffId: staffNeta.id, serviceId: svc.id },
    });
  }

  // ─── Ein Raum (für Kalender-View) ─────────────────────────────
  const existingRoom = await prisma.room.findFirst({
    where: { tenantId: tenant.id, locationId: location.id, name: 'Studio 1' },
  });
  if (!existingRoom) {
    await prisma.room.create({
      data: {
        tenantId: tenant.id,
        locationId: location.id,
        name: 'Studio 1',
      },
    });
  }

  console.log(`[seed] tenant=${tenant.slug} owner=${owner.email} — ready`);
  console.log(`[seed] DEMO_TENANT_ID=${tenant.id}`);
  console.log(`[seed] DEMO_USER_ID=${owner.id}`);
  console.log(`[seed] ${services.length} Services + 1 Staff + 1 Room seeded`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
