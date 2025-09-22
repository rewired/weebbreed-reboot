import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  test: {
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary', 'lcov'],
      reportsDirectory: './coverage',
      include: ['src/**/*.ts'],
      exclude: ['**/*.test.ts', '**/testing/**'],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@runtime': path.resolve(__dirname, '../runtime'),
      rxjs: path.resolve(__dirname, 'node_modules/rxjs'),
      pino: path.resolve(__dirname, 'src/testing/pinoStub.ts'),
    },
  },
});
