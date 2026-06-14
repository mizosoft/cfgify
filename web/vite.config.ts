import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// During development, Vite serves the SPA on :5173 and proxies /api to the
// Go backend on :8080. In production, the Go binary serves the built assets
// from web/dist via go:embed and handles /api itself.
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': 'http://127.0.0.1:8080',
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
});