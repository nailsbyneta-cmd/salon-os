import { defineConfig } from 'vitest/config';

// Provider-Verify (Pact). Bootet die NestJS-App auf zufälligem Port
// gegen eine Testcontainer-/CI-DB und lässt den Pact-Verifier die
// vom Consumer erzeugten Contracts replayen.
export default defineConfig({
  test: {
    environment: 'node',
    globals: false,
    include: ['src/**/*.provider.pact.test.ts'],
    testTimeout: 180_000,
    hookTimeout: 180_000,
    pool: 'forks',
    poolOptions: {
      forks: { singleFork: true },
    },
  },
});
