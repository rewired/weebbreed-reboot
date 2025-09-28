import path from 'node:path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const backendTarget = env.VITE_BACKEND_HTTP_URL?.trim() || 'http://localhost:7331';

  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src'),
        clsx: path.resolve(__dirname, 'src/utils/clsx.ts'),
      },
    },
    test: {
      environment: 'jsdom',
      clearMocks: true,
      restoreMocks: true,
      testTimeout: 15000,
    },
    server: {
      port: 5173,
      strictPort: true,
      proxy: {
        '/socket.io': {
          target: backendTarget,
          changeOrigin: true,
          ws: true,
        },
        '/api': {
          target: backendTarget,
          changeOrigin: true,
        },
      },
    },
  };
});
