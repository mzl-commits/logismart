import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const buildVersion = '20260703-ui10'; // Incrementar para invalidar cache

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    {
      name: 'logismart-cache-version',
      transformIndexHtml(html) {
        return html.replace(/(\/static\/frontend\/assets\/app\.(?:css|js))/g, `$1?v=${buildVersion}`)
      },
    },
  ],
  base: '/static/frontend/',
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
