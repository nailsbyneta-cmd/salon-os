import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { NestFactory } from '@nestjs/core';
import {
  FastifyAdapter,
  type NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { Verifier } from '@pact-foundation/pact';
import { afterAll, beforeAll, describe, it } from 'vitest';

import { setupTestDb, type TestDb } from './pg-test-db.js';

// ─── Provider-Verify: salon-os-api erfüllt Consumer-Contracts ────
//
// Lädt das Pact-JSON aus `<repo>/pacts/` (lokal vom Consumer-Run oder
// in CI aus dem Artifact), bootet die NestJS-App gegen eine isolierte
// Test-DB und lässt den Pact-Verifier jede Interaktion replayen.
// Provider-States werden in `stateHandlers` mit echten DB-Rows bedient.

const HERE = dirname(fileURLToPath(import.meta.url));
const PACT_FILE = resolve(HERE, '../../../../pacts/salon-os-web-salon-os-api.json');

// Muss exakt mit der UUID im Consumer-Contract übereinstimmen, damit die
// TenantMiddleware nach UUID-Whitelist durchlässt und withTenant() die
// geseedeten Rows findet.
const TENANT_ID = '11111111-1111-4111-8111-111111111111';

describe('Pact Provider-Verify — salon-os-api', () => {
  let db: TestDb;
  let app: NestFastifyApplication;
  let providerUrl: string;
  let dbMod: typeof import('@salon-os/db');

  beforeAll(async () => {
    if (!existsSync(PACT_FILE)) {
      throw new Error(
        `Pact-File fehlt unter ${PACT_FILE}. ` +
          `Führe zuerst \`pnpm --filter @salon-os/web test:contract\` aus ` +
          `oder lade das \`pacts\`-Artifact aus dem vorherigen CI-Job.`,
      );
    }

    db = await setupTestDb();
    dbMod = await import('@salon-os/db');

    const { AppModule } = await import('../app.module.js');
    app = await NestFactory.create<NestFastifyApplication>(
      AppModule,
      new FastifyAdapter({ logger: false }),
      { logger: false },
    );
    await app.listen({ port: 0, host: '127.0.0.1' });
    providerUrl = await app.getUrl();
  }, 180_000);

  afterAll(async () => {
    await app?.close();
    await dbMod?.prisma.$disconnect();
    await db?.close();
  });

  it('verifiziert alle Interaktionen aus salon-os-web-salon-os-api.json', async () => {
    const verifier = new Verifier({
      provider: 'salon-os-api',
      providerBaseUrl: providerUrl,
      pactUrls: [PACT_FILE],
      logLevel: 'warn',
      stateHandlers: {
        'tenant has clients': async () => {
          await db.truncate();
          const { prisma } = dbMod;
          await prisma.tenant.create({
            data: {
              id: TENANT_ID,
              slug: 'pact-tenant',
              name: 'Pact Tenant',
              countryCode: 'CH',
              currency: 'CHF',
              timezone: 'Europe/Zurich',
              locale: 'de-CH',
            },
          });
          await prisma.client.create({
            data: {
              tenantId: TENANT_ID,
              firstName: 'Alice',
              lastName: 'Muster',
            },
          });
        },
      },
    });

    await verifier.verifyProvider();
  }, 180_000);
});
