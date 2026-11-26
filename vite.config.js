import { defineConfig } from 'vite';

// Relative base so the build works on GitHub Pages (/Tea-Majesty-3D/) and any static host.
export default defineConfig({
  base: './',
  build: {
    target: 'es2020',
    chunkSizeWarningLimit: 900,
  },
});
