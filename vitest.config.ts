import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary', 'html'],
      include: ['lib/**/*.ts', 'hooks/**/*.ts', 'app/api/**/*.ts'],
      exclude: ['**/*.d.ts'],
      thresholds: {
        lines: 20,
        functions: 55,
        statements: 20,
        branches: 55,
      },
    },
  },
});
