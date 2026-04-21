import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: false,
    setupFiles: [],
    include: ['src/**/*.test.ts'],
    exclude: [
      'src/**/*.integration.test.ts',
      'src/**/*.provider.pact.test.ts',
      'node_modules',
      'dist',
    ],
  },
});
