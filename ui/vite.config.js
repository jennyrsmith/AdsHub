import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': 'http://localhost:3000',
      '/healthz': 'http://localhost:3000',
      '/readyz': 'http://localhost:3000'
    }
  }
});
