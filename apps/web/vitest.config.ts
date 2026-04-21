import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: false,
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    exclude: [
      'src/**/*.contract.test.ts',
      'src/**/*.contract.test.tsx',
      'node_modules',
      '.next',
      'dist',
    ],
  },
});
