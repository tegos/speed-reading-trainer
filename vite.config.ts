import { defineConfig } from 'vite';

export default defineConfig({
  base: '/speed-reading-trainer/',
  test: {
    environment: 'jsdom',
  },
} as never);
