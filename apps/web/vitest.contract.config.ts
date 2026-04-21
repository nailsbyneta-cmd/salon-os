import { defineConfig } from 'vitest/config';

// Consumer-Driven-Contract-Tests (Pact).
// Generiert Pact-JSON unter `<repo>/pacts/`. Die generierten Dateien werden
// anschließend vom Provider (`apps/api`) via Pact-Verifier geprüft.
export default defineConfig({
  test: {
    environment: 'node',
    globals: false,
    include: ['src/**/*.contract.test.ts', 'src/**/*.contract.test.tsx'],
    testTimeout: 30_000,
    pool: 'forks',
    poolOptions: {
      forks: { singleFork: true },
    },
  },
});
