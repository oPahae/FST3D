import { defineConfig } from 'vite';

// Layout JSON lives in /public/data so it is served as-is (never bundled).
export default defineConfig({
  server: { open: true },
  build: { chunkSizeWarningLimit: 1200 },
});
