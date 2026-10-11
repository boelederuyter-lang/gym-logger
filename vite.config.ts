import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// On GitHub Pages the app lives under /<repo>/; locally it runs at the root.
const base = process.env.BASE_PATH ?? '/';

export default defineConfig({
  base,
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['apple-touch-icon.png', 'icon.svg'],
      // De trainingsschema-generator (public/schema/) is een losse app: niet naar index.html omleiden.
      workbox: { navigateFallbackDenylist: [/\/schema\//] },
      manifest: {
        name: 'Gym Logger',
        short_name: 'Gym',
        description: 'Simpel en snel je trainingen loggen',
        lang: 'nl',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#0f1115',
        theme_color: '#0f1115',
        start_url: base,
        scope: base,
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
});
