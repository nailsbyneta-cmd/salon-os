import { execFileSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  PostgreSqlContainer,
  type StartedPostgreSqlContainer,
} from '@testcontainers/postgresql';

// ─── Testcontainers-Bootstrap für Integration-Tests ───────────
//
// Verwendung:
//   const db = await setupTestDb();          // vor allen Tests
//   // … prisma nutzt process.env.DATABASE_URL …
//   await db.truncate();                     // zwischen Tests
//   await db.close();                        // nach allen Tests
//
// Zwei Modi:
//   1. TEST_DATABASE_URL gesetzt → wird direkt verwendet (CI, shared DB).
//      Der Aufrufer ist dafür verantwortlich, dass Migrations applied sind.
//   2. Sonst → Testcontainers spinnt pgvector/pg16 auf, migrations werden
//      einmal applied. Lokale Dev-Experience: kein Docker-Compose nötig.

const MIGRATIONS_DIR = (() => {
  const here = dirname(fileURLToPath(import.meta.url));
  return resolve(here, '../../../../packages/db/prisma');
})();

export interface TestDb {
  url: string;
  truncate: () => Promise<void>;
  close: () => Promise<void>;
}

let container: StartedPostgreSqlContainer | null = null;

export async function setupTestDb(): Promise<TestDb> {
  const fromEnv = process.env['TEST_DATABASE_URL'];

  const url = fromEnv ?? (await startContainer());

  process.env['DATABASE_URL'] = url;
  process.env['DIRECT_URL'] = url;

  if (!fromEnv) {
    applyMigrations(url);
  }

  return {
    url,
    truncate: async () => truncateAll(url),
    close: async () => {
      if (container) {
        await container.stop();
        container = null;
      }
    },
  };
}

async function startContainer(): Promise<string> {
  container = await new PostgreSqlContainer('pgvector/pgvector:pg16')
    .withDatabase('salon_os_test')
    .withUsername('salon')
    .withPassword('salon')
    .start();

  return container.getConnectionUri();
}

function applyMigrations(url: string): void {
  execFileSync(
    'pnpm',
    ['--filter', '@salon-os/db', 'exec', 'prisma', 'migrate', 'deploy'],
    {
      cwd: resolve(MIGRATIONS_DIR, '..'),
      env: { ...process.env, DATABASE_URL: url, DIRECT_URL: url },
      stdio: 'inherit',
    },
  );
}

// TRUNCATE reicht für schnelle Resets zwischen Tests; respektiert FKs via
// CASCADE. Enums/Sequences bleiben, Extensions bleiben.
async function truncateAll(url: string): Promise<void> {
  const { PrismaClient } = await import('@salon-os/db');
  const prisma = new PrismaClient({ datasources: { db: { url } } });
  try {
    const rows = await prisma.$queryRaw<Array<{ tablename: string }>>`
      SELECT tablename FROM pg_tables
      WHERE schemaname = 'public'
        AND tablename NOT LIKE '_prisma_%'
    `;
    if (rows.length === 0) return;
    const tables = rows.map((r) => `"${r.tablename}"`).join(', ');
    await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${tables} RESTART IDENTITY CASCADE`);
  } finally {
    await prisma.$disconnect();
  }
}
