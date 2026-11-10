import { defineConfig } from 'vite';

// GitHub Pages serves the site from /<repo>/; CI passes that in as BASE_PATH.
export default defineConfig({
  base: process.env.BASE_PATH ?? '/',
  server: { port: 5180, strictPort: false },
  build: { target: 'es2022', chunkSizeWarningLimit: 900 },
});
