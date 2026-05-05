import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Proxy del API en dev: misma origen que el Vite (útil con ngrok HTTPS → evita mixed content con http://localhost)
const apiProxy = {
  '/api': {
    target: 'http://127.0.0.1:3000',
    changeOrigin: true,
  },
} as const

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Dev: acceso por túnel (Host ≠ localhost). Lista explícita ante fallos con `true` (Vite 6–8).
    // `.ngrok-free.app` permite cualquier subdominio (ej. xxx.ngrok-free.app).
    host: true,
    // `.trycloudflare.com` permite subdominios temporales de Cloudflare (ej. *.trycloudflare.com)
    allowedHosts: [
      '.ngrok-free.app',
      '.ngrok.io',
      '.ngrok.app',
      '.trycloudflare.com',
      'localhost',
      '127.0.0.1',
    ],
    proxy: { ...apiProxy },
  },
  preview: {
    host: true,
    allowedHosts: [
      '.ngrok-free.app',
      '.ngrok.io',
      '.ngrok.app',
      '.trycloudflare.com',
      'localhost',
      '127.0.0.1',
    ],
    proxy: { ...apiProxy },
  },
})
