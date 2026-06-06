import { defineConfig } from 'vite';

export default defineConfig({
  test: {
    environment: 'jsdom',
  },
} as never);
