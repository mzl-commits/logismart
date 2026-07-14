import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const buildVersion = '20260714-ui11'; // Incrementar para invalidar cache

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    {
      name: 'logismart-cache-version',
      transformIndexHtml(html) {
        return html.replace(/(\/static\/frontend\/assets\/app\.(?:js|css))/g, `$1?v=${buildVersion}`)
      },
    },
  ],
  base: process.env.NODE_ENV === 'production' ? '/static/frontend/' : '/',
  server: {
    host: '127.0.0.1',
    proxy: {
      '/api': 'http://127.0.0.1:8000',
      '/login': 'http://127.0.0.1:8000',
      '/logout': 'http://127.0.0.1:8000',
      '/suscripcion': 'http://127.0.0.1:8000',
      '/static': 'http://127.0.0.1:8000',
    },
  },
  build: {
    outDir: '../clasificacion/static/frontend',
    emptyOutDir: true,
    rollupOptions: {
      output: {
        entryFileNames: 'assets/app.js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: (assetInfo) => assetInfo.name?.endsWith('.css')
          ? 'assets/app.css'
          : 'assets/[name]-[hash][extname]',
      },
    },
  },
})
