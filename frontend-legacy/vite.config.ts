import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

const DEFAULT_SOCKET_URL = 'http://localhost:7331/socket.io';

const getProxyTarget = (): string | undefined => {
  const rawValue = (process.env.VITE_SOCKET_URL ?? '').trim();
  const effectiveValue = rawValue.length ? rawValue : DEFAULT_SOCKET_URL;

  try {
    const parsed = new URL(effectiveValue, 'http://localhost');
    return parsed.origin;
  } catch {
    return undefined;
  }
};

const socketProxyTarget = getProxyTarget();

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@/ui': path.resolve(__dirname, 'src/ui'),
      '@/engine': path.resolve(__dirname, '../engine'),
    },
  },
  server: socketProxyTarget
    ? {
        proxy: {
          '/socket.io': {
            target: socketProxyTarget,
            changeOrigin: true,
            ws: true,
          },
        },
      }
    : undefined,
  test: {
    environment: 'jsdom',
  },
});
