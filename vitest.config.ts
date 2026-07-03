import path from 'node:path';
import { defineConfig } from 'vitest/config';

// Configuración de pruebas independiente del build (sin el plugin PWA).
export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    environment: 'node',
    globals: true,
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
  },
});
