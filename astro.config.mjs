import { defineConfig } from 'astro/config';
import vue from '@astrojs/vue';
import node from '@astrojs/node';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  output: 'hybrid',
  adapter: node({
    mode: 'standalone',
  }),
  integrations: [
    vue(),
  ],
  vite: {
    plugins: [tailwindcss()],
  },
  server: {
    port: 4321,
  },
});
