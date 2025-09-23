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
    alias: [
      {
        find: '@',
        replacement: path.resolve(__dirname, 'src'),
      },
      {
        find: '@runtime',
        replacement: path.resolve(__dirname, '../runtime'),
      },
      {
        find: 'rxjs',
        replacement: path.resolve(__dirname, 'node_modules/rxjs'),
      },
      {
        find: 'pino',
        replacement: path.resolve(__dirname, 'src/testing/pinoStub.ts'),
      },
    ],
  },
});
