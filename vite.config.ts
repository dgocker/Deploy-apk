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
  build: {
    rollupOptions: {
      external: [
        'firebase/app',
        'firebase/auth',
      ],
    },
  },
  optimizeDeps: {
    exclude: ['firebase/app', 'firebase/auth'],
  },
});
