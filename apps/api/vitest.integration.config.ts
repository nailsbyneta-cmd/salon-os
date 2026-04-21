import { defineConfig } from 'vitest/config';

// Integration-Tests laufen gegen echtes Postgres (Testcontainers oder
// CI-Service via TEST_DATABASE_URL). Migrations werden vor der Suite einmal
// appliziert, zwischen Tests per TRUNCATE zurückgesetzt.
export default defineConfig({
  test: {
    environment: 'node',
    globals: false,
    include: ['src/**/*.integration.test.ts'],
    testTimeout: 60_000,
    hookTimeout: 120_000,
    pool: 'forks',
    poolOptions: {
      forks: { singleFork: true },
    },
  },
});
