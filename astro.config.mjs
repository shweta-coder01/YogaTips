// @ts-check
import { defineConfig } from 'astro/config';

import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
  site: 'https://shweta-coder01.github.io',
  base: '/YogaTips',
  vite: {
    plugins: [tailwindcss()]
  }
});