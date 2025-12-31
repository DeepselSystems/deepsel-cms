// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import node from '@astrojs/node';

// https://astro.build/config
export default defineConfig({
  output: 'server',
  adapter: node({
    mode: 'standalone',
  }),
  integrations: [react()],
  vite: {
    server: {
      fs: {
        // Allow serving files from the admin directory
        allow: ['..'],
      },
      proxy: {
        '/api/v1': {
          target: 'http://localhost:8000',
          changeOrigin: true,
        },
      },
    },
  },
});
