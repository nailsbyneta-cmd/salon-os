import { defineConfig } from 'vitest/config';

/**
 * Separate Vitest-Config für die schweren Behavior-Tests.
 * Die fahren je File einen Postgres-Container hoch (~20-40s) und
 * sind zu teuer für jeden `pnpm test`-Run.
 *
 * Aufrufen via: `pnpm test:behavior`
 * CI-Job: nur auf Ubuntu-Runner mit Docker installiert.
 */
export default defineConfig({
  test: {
    environment: 'node',
    globals: false,
    include: ['test/**/*.behavior.spec.ts'],
    testTimeout: 60_000,
    hookTimeout: 180_000,
    fileParallelism: false,
  },
});
