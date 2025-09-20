import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: ['src/**/*.test.ts']
  },
  resolve: {
    alias: {
      '@backend': path.resolve(__dirname, 'src/backend'),
      '@frontend': path.resolve(__dirname, 'src/frontend'),
      '@shared': path.resolve(__dirname, 'src/shared')
    }
  }
});
