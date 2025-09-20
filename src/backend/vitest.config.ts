import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  test: {
    environment: 'node',
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@/engine': path.resolve(__dirname, 'src/engine'),
      '@/ui': path.resolve(__dirname, '../frontend/src/ui'),
    },
  },
});
