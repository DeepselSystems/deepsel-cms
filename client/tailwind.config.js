import { fileURLToPath } from 'node:url';
import path from 'node:path';
// TAILWIND_IMPORTS_START (auto-managed)
import reactPreset from '../themes/starter_react/tailwind.config.js';
// TAILWIND_IMPORTS_END

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('tailwindcss').Config} */
export default {
  // TAILWIND_PRESETS_START (auto-managed)
  presets: [reactPreset],
  // TAILWIND_PRESETS_END
  content: [
    path.join(__dirname, 'src/**/*.{astro,html,js,jsx,ts,tsx}'),
    path.join(__dirname, '../themes/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'),
    `!${path.join(__dirname, '../themes/**/node_modules/**')}`,
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};
