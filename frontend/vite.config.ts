import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Proxy del API en dev: misma origen que el Vite (útil con ngrok HTTPS → evita mixed content con http://localhost)
/** mysqldump + ZIP pueden tardar minutos; evitar cierre prematuro del proxy en dev/LAN */
const BACKUP_PROXY_TIMEOUT_MS = 15 * 60 * 1000

const apiProxy = {
  '/api': {
    target: 'http://127.0.0.1:3000',
    changeOrigin: true,
    timeout: BACKUP_PROXY_TIMEOUT_MS,
    proxyTimeout: BACKUP_PROXY_TIMEOUT_MS,
  },
} as const

/**
 * política repo (seguridad operativa LAN / ISO 27001 en dev):
 * - NO definir `server.allowedHosts` como lista fija solo ngrok/localhost: en Vite eso suele sobreescribir
 *   el comportamiento por defecto y bloquear `Host` con IPs privadas (`http://192.168.*.*:5173`),
 *   provocando fallos de proxy y avisos “sin conexión” en cliente.
 * - Túneles (ngrok, cloudflared, etc.): variable oficial que Vite **fusiona** con lo permitido por defecto:
 *   https://vite.dev/config/server-options.html#server-allowedhosts
 *   __VITE_ADDITIONAL_SERVER_ALLOWED_HOSTS=subdominio.ngrok-free.app
 */

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    /**
     * Necesario para acceder por túneles públicos (ngrok) sin permitir "all".
     * Mantiene el riesgo acotado a subdominios de ngrok free.
     */
    allowedHosts: ['.ngrok-free.app'],
    proxy: { ...apiProxy },
  },
  preview: {
    host: true,
    allowedHosts: ['.ngrok-free.app'],
    proxy: { ...apiProxy },
  },
  build: {
    rollupOptions: {
      output: {
        /** Orden relevante: `react-router-dom` contiene el substring `react-dom`. */
        manualChunks(id: string) {
          if (!id.includes('node_modules')) {
            return
          }
          if (id.includes('@mui/icons-material')) {
            return 'vendor-mui-icons'
          }
          if (id.includes('@mui') || id.includes('@emotion')) {
            return 'vendor-mui'
          }
          if (id.includes('node_modules/react-router')) {
            return 'vendor-react-router'
          }
          if (id.includes('node_modules/react-dom')) {
            return 'vendor-react-dom'
          }
          if (id.includes('node_modules/react/')) {
            return 'vendor-react'
          }
        },
      },
    },
  },
})
