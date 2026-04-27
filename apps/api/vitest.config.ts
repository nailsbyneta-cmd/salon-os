import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: false,
    setupFiles: [],
    /**
     * Behavior-Tests fahren einen echten Postgres-Container per Testcontainers
     * hoch — Container-Pull + Schema-Migration brauchen einmalig ~30s. Pro
     * File: ein Container, geteilt über alle Tests im File via beforeAll.
     */
    testTimeout: 30_000,
    hookTimeout: 120_000,
    /**
     * Default `vitest run` skipt Behavior-Tests — die brauchen Docker und
     * ~30s Container-Pull. CI ruft sie über `test:behavior` separat.
     */
    exclude: ['**/node_modules/**', '**/dist/**', '**/*.behavior.spec.ts', 'test/**'],
  },
});
