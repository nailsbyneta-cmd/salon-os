import { randomUUID } from 'node:crypto';

import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { setupTestDb, type TestDb } from './pg-test-db.js';

// ESM-Besonderheit: `@salon-os/db` muss ERST importiert werden, nachdem
// setupTestDb() DATABASE_URL gesetzt hat — sonst verbindet sich der
// Prisma-Singleton zur falschen DB. Deshalb dynamic import in beforeAll.
type DbModule = typeof import('@salon-os/db');

let db: TestDb;
let dbMod: DbModule;

beforeAll(async () => {
  db = await setupTestDb();
  dbMod = await import('@salon-os/db');
}, 120_000);

afterAll(async () => {
  await dbMod?.prisma.$disconnect();
  await db?.close();
});

beforeEach(async () => {
  await db.truncate();
});

async function seedTenant(slug: string): Promise<string> {
  const { prisma } = dbMod;
  const tenant = await prisma.tenant.create({
    data: {
      slug,
      name: `Tenant ${slug}`,
      countryCode: 'CH',
      currency: 'CHF',
      timezone: 'Europe/Zurich',
      locale: 'de-CH',
    },
  });
  return tenant.id;
}

async function seedClient(tenantId: string, firstName: string): Promise<void> {
  const { prisma } = dbMod;
  await prisma.client.create({
    data: {
      id: randomUUID(),
      tenantId,
      firstName,
      lastName: 'Muster',
    },
  });
}

describe('withTenant — Row-Level-Security', () => {
  it('isoliert Client-Rows strikt pro Tenant', async () => {
    const { withTenant } = dbMod;
    const tenantA = await seedTenant('a');
    const tenantB = await seedTenant('b');

    await seedClient(tenantA, 'Alice');
    await seedClient(tenantB, 'Bob');

    const seenByA = await withTenant(tenantA, null, null, (tx) =>
      tx.client.findMany({ orderBy: { firstName: 'asc' } }),
    );
    const seenByB = await withTenant(tenantB, null, null, (tx) =>
      tx.client.findMany({ orderBy: { firstName: 'asc' } }),
    );

    expect(seenByA.map((c) => c.firstName)).toEqual(['Alice']);
    expect(seenByB.map((c) => c.firstName)).toEqual(['Bob']);
  });

  it('lehnt Writes mit fremder tenantId im Payload ab', async () => {
    const { withTenant } = dbMod;
    const tenantA = await seedTenant('write-a');
    const tenantB = await seedTenant('write-b');

    const attempt = withTenant(tenantA, null, null, (tx) =>
      tx.client.create({
        data: { tenantId: tenantB, firstName: 'Mallory', lastName: 'X' },
      }),
    );

    await expect(attempt).rejects.toThrow();
  });

  it('weist ungültige UUIDs in withTenant() ab (SQL-Injection-Schutz)', async () => {
    const { withTenant } = dbMod;
    await expect(
      withTenant("' OR '1'='1", null, null, async () => null),
    ).rejects.toThrow(/tenantId is not a valid UUID/);
  });
});
