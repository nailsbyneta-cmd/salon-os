import { execSync } from 'node:child_process';
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { PrismaClient, withTenant as defaultWithTenant } from '@salon-os/db';
import { runWithTenant } from '../src/tenant/tenant.context.js';

/**
 * Behavior-Test-Harness: spinnt eine kurze Postgres 16 hoch, fährt alle
 * Prisma-Migrationen rein, gibt einen scharfen Client + Tenant-aware
 * `withTenant`-Helper zurück. Per Test-File einmal in beforeAll().
 *
 * NICHT in CI ohne Docker. GitHub-Actions Ubuntu-Runner haben Docker.
 * Lokal: Docker Desktop muss laufen.
 */

export interface TestPostgresHandle {
  prisma: PrismaClient;
  withTenant: typeof defaultWithTenant;
  /** Wrappt einen Block in runWithTenant + withTenant — mimt Tenant-Middleware. */
  asTenant: <T>(
    tenantId: string,
    userId: string | null,
    role: string | null,
    fn: () => Promise<T>,
  ) => Promise<T>;
  /** Tenant + Default-Location-IDs aus Mini-Seed, für Service-Constructors. */
  seed: {
    tenantId: string;
    locationId: string;
    staffUserId: string;
    staffId: string;
    serviceCategoryId: string;
  };
  stop: () => Promise<void>;
  /** Direkter SQL-Helper für Cleanups zwischen Tests. */
  truncateAll: () => Promise<void>;
}

const SEED_TENANT_ID = '00000000-0000-0000-0000-000000000001';
const SEED_LOCATION_ID = '00000000-0000-0000-0000-0000000000a1';
const SEED_USER_ID = '00000000-0000-0000-0000-0000000000b1';
const SEED_STAFF_ID = '00000000-0000-0000-0000-0000000000c1';
const SEED_CATEGORY_ID = '00000000-0000-0000-0000-0000000000d1';

let activeContainer: StartedPostgreSqlContainer | null = null;
let activePrisma: PrismaClient | null = null;

export async function startTestPostgres(): Promise<TestPostgresHandle> {
  // Wenn TEST_DATABASE_URL gesetzt ist, gegen die existierende DB testen
  // (CI-Postgres-Service oder lokaler Test-DB-Setup). Sonst Testcontainer
  // pro Test-File hochfahren.
  const reuseUrl = process.env['TEST_DATABASE_URL'];
  let container: StartedPostgreSqlContainer | null = null;
  let url: string;
  if (reuseUrl) {
    url = reuseUrl;
  } else {
    container = await new PostgreSqlContainer('postgres:16-alpine')
      .withDatabase('salon_os_test')
      .withUsername('test')
      .withPassword('test')
      .start();
    activeContainer = container;
    url = container.getConnectionUri();
  }
  process.env['DATABASE_URL'] = url;

  // Run prisma migrate deploy against the fresh container.
  const migrationDir = new URL('../../../packages/db/prisma', import.meta.url).pathname;
  execSync('npx prisma migrate deploy', {
    cwd: migrationDir,
    env: { ...process.env, DATABASE_URL: url },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  const prisma = new PrismaClient({ datasources: { db: { url } } });
  activePrisma = prisma;
  await seedMinimal(prisma);

  return {
    prisma,
    withTenant: defaultWithTenant,
    asTenant: (tenantId, userId, role, fn) =>
      runWithTenant({ tenantId, userId, role }, () =>
        defaultWithTenant(tenantId, userId, role, async () => fn()),
      ),
    seed: {
      tenantId: SEED_TENANT_ID,
      locationId: SEED_LOCATION_ID,
      staffUserId: SEED_USER_ID,
      staffId: SEED_STAFF_ID,
      serviceCategoryId: SEED_CATEGORY_ID,
    },
    stop: async () => {
      await prisma.$disconnect();
      if (container) {
        await container.stop();
        if (activeContainer === container) activeContainer = null;
      }
      if (activePrisma === prisma) activePrisma = null;
    },
    truncateAll: () => truncateAll(prisma),
  };
}

async function seedMinimal(prisma: PrismaClient): Promise<void> {
  await prisma.tenant.upsert({
    where: { id: SEED_TENANT_ID },
    create: {
      id: SEED_TENANT_ID,
      name: 'Test Salon',
      slug: 'test-salon',
      countryCode: 'CH',
      currency: 'CHF',
      timezone: 'Europe/Zurich',
      locale: 'de-CH',
    },
    update: {},
  });
  await prisma.location.upsert({
    where: { id: SEED_LOCATION_ID },
    create: {
      id: SEED_LOCATION_ID,
      tenantId: SEED_TENANT_ID,
      name: 'Hauptsalon',
      slug: 'hauptsalon',
      countryCode: 'CH',
      timezone: 'Europe/Zurich',
      currency: 'CHF',
      taxConfig: { vatRate: 7.7 },
      openingHours: {
        mon: [{ open: '09:00', close: '18:00' }],
        tue: [{ open: '09:00', close: '18:00' }],
        wed: [{ open: '09:00', close: '18:00' }],
        thu: [{ open: '09:00', close: '18:00' }],
        fri: [{ open: '09:00', close: '18:00' }],
        sat: [],
        sun: [],
      },
      publicProfile: true,
      marketplaceListed: false,
    },
    update: {},
  });
  await prisma.user.upsert({
    where: { id: SEED_USER_ID },
    create: {
      id: SEED_USER_ID,
      email: 'owner@test-salon.ch',
      status: 'ACTIVE',
    },
    update: {},
  });
  await prisma.staff.upsert({
    where: { id: SEED_STAFF_ID },
    create: {
      id: SEED_STAFF_ID,
      tenantId: SEED_TENANT_ID,
      userId: SEED_USER_ID,
      firstName: 'Owner',
      lastName: 'Test',
      email: 'owner@test-salon.ch',
      role: 'OWNER',
      employmentType: 'OWNER',
      active: true,
    },
    update: {},
  });
  await prisma.serviceCategory.upsert({
    where: { id: SEED_CATEGORY_ID },
    create: {
      id: SEED_CATEGORY_ID,
      tenantId: SEED_TENANT_ID,
      name: 'Nails',
      slug: 'nails',
      order: 0,
    },
    update: {},
  });
  await prisma.tenantMembership.upsert({
    where: {
      tenantId_userId: { tenantId: SEED_TENANT_ID, userId: SEED_USER_ID },
    },
    create: {
      tenantId: SEED_TENANT_ID,
      userId: SEED_USER_ID,
      role: 'OWNER',
    },
    update: {},
  });
}

/**
 * TRUNCATE alle Daten-Tables (Seed bleibt bestehen, weil wir die Seed-Tables
 * sofort wieder neu seeden). Reihenfolge wegen FK-Constraints von hinten.
 */
async function truncateAll(prisma: PrismaClient): Promise<void> {
  const tables: string[] = [
    'outbox_event',
    'audit_log',
    'appointment_item',
    'appointment',
    'appointment_series',
    'waitlist_entry',
    'gift_card',
    'time_off',
    'shift',
    'staff_service',
    'staff_location',
    'service_addon',
    'service_option',
    'service_option_group',
    'service_variant',
    'service_bundle',
    'service',
    'service_category',
    'product',
    'staff',
    'client',
    'tenant_membership',
    '"user"',
    'salon_faq',
    'salon_review',
    'salon_gallery_image',
    'room',
    'location',
    'tenant',
  ];
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${tables.join(', ')} RESTART IDENTITY CASCADE`);
  await seedMinimal(prisma);
}

/** Vitest globalTeardown helper if needed. */
export async function stopAllTestPostgres(): Promise<void> {
  if (activePrisma) await activePrisma.$disconnect().catch(() => {});
  if (activeContainer) await activeContainer.stop().catch(() => {});
}
