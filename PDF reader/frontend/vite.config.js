import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5174,
    strictPort: true,
    proxy: {
      '/upload': 'http://127.0.0.1:6000',
      '/health': 'http://127.0.0.1:6000',
    },
  },
  preview: {
    host: '0.0.0.0',
    port: 5174,
    strictPort: true,
  },
  build: {
    // Avoid noisy Tailwind v4 at-rule warnings from LightningCSS.
    cssMinify: 'esbuild',
  },
})
