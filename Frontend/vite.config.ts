import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon-16x16.png', 'favicon-32x32.png', 'apple-touch-icon.png'],
      // Solo se precachea el "app shell" (JS/CSS/HTML del build). Las llamadas
      // a la API financiera NUNCA se cachean (network-only, comportamiento por
      // defecto de Workbox al no declarar runtimeCaching): los datos siempre
      // deben venir frescos del backend, nunca de una copia local obsoleta.
      manifest: {
        name: 'JEAF — Panel Administrativo',
        short_name: 'JEAF',
        description: 'Gestión financiera para la iglesia',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        background_color: '#f7f9fb',
        theme_color: '#000000',
        lang: 'es',
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'pwa-maskable-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
  server: {
    port: 5173,
  },
});
