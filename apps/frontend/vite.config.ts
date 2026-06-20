import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  plugins: [react()],
  define: {
    __API_URL__: JSON.stringify(process.env['VITE_API_URL'] ?? 'http://localhost:4000'),
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '@inventory/shared-types': fileURLToPath(new URL('../../packages/shared-types/src/index.ts', import.meta.url)),
    },
  },
  server: {
    port: 3000,
    proxy: {
      '/auth': 'http://localhost:4000',
      '/products': 'http://localhost:4000',
      '/inventory': 'http://localhost:4000',
      '/reports': 'http://localhost:4000',
      '/notifications': 'http://localhost:4000',
      '/audit': 'http://localhost:4000',
      '/events': 'http://localhost:4000',
    },
  },
})
