import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: '0.0.0.0',
    port: 3000,
  },
  resolve: {
    alias: {
      'node:fs': false,
      'node:path': false,
      'fs': false,
      'path': false,
    }
  },
  build: {
    target: 'esnext',
    rollupOptions: {
      external: ['node:fs', 'node:path', 'fs', 'path']
    }
  }
});
