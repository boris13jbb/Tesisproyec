# Cloudflared Tunnel (Quick Tunnel) — Frontend Vite (5173)

## Objetivo

Dejar un **manual operativo** para exponer de forma **temporal** el frontend local (Vite, `http://localhost:5173`) usando Cloudflare Tunnel vía `cloudflared`, incluyendo:

- instalación en Windows,
- ejecución del túnel,
- verificación y troubleshooting,
- **registro de sesión** (trazabilidad) y riesgos.

> Este uso es **solo para demo / pruebas**. No se considera despliegue ni entorno de producción.

## Alcance

- Windows 10/11 (PowerShell).
- Frontend Vite en puerto `5173`.
- Comando principal: `cloudflared tunnel --url http://localhost:5173`.

## Requisitos previos

1. El frontend debe estar levantado y accesible localmente:

```bash
http://localhost:5173
```

2. Tener permisos para instalar software en el equipo (o usar método portable).

## Instalación de `cloudflared` (Windows)

### Opción A — `winget` (recomendada)

En PowerShell:

```powershell
winget install --id Cloudflare.cloudflared -e
```

Cerrar y reabrir la terminal. Validar:

```powershell
cloudflared --version
```

### Opción B — Chocolatey

```powershell
choco install cloudflared -y
cloudflared --version
```

### Opción C — Scoop

```powershell
scoop install cloudflared
cloudflared --version
```

### Opción D — Manual (portable)

1. Descargar el binario de Windows (`cloudflared-windows-amd64.exe`) desde releases oficiales de Cloudflare.
2. Renombrar a `cloudflared.exe`.
3. Mover a una ruta estable, por ejemplo: `C:\Tools\cloudflared\cloudflared.exe`.
4. Agregar `C:\Tools\cloudflared\` al **PATH** del sistema/usuario.
5. Cerrar y reabrir PowerShell y validar con:

```powershell
cloudflared --version
```

## Uso: levantar túnel hacia Vite (5173)

Con Vite ejecutándose en local:

```powershell
cloudflared tunnel --url http://localhost:5173
```

### Resultado esperado

- La consola mostrará una **URL pública HTTPS** generada por Cloudflare.
- Esa URL debe abrir el frontend desde otro dispositivo/red (mientras el túnel esté activo).

## Verificación rápida

1. En la máquina local, abrir `http://localhost:5173` y confirmar que carga.
2. Ejecutar el túnel y copiar la URL pública.
3. Abrir la URL pública en:
   - un navegador en modo incógnito, o
   - un teléfono (en otra red si aplica).

## Troubleshooting (errores comunes)

### `cloudflared: The term 'cloudflared' is not recognized...`

**Causa probable**

- `cloudflared` no está instalado o no está en el `PATH`.

**Acciones**

- Instalar con `winget/choco/scoop`, cerrar y reabrir la terminal.
- Validar con `cloudflared --version`.
- Si es instalación manual, confirmar que el PATH contiene la carpeta del `.exe`.

### La URL pública abre, pero no carga recursos / pantalla en blanco

**Causas probables**

- Vite no está levantado o está en otro puerto.
- La app requiere variables (`VITE_*`) no configuradas en el entorno.

**Acciones**

- Confirmar `http://localhost:5173` en local.
- Revisar consola del navegador (Network/Console) para errores de runtime.

### Problemas de autenticación (cookies/JWT) al usar dominio público

**Causas probables**

- Cookies con `SameSite`/`Secure` incompatibles con el escenario.
- CORS / configuración de API no permite el origen del túnel.

**Acciones**

- Revisar configuración del backend: CORS con el origen exacto de la URL pública.
- Revisar flags de cookies (`HttpOnly`, `SameSite`, `Secure`) y escenarios cross-site.
- Si se usa refresh en cookie, verificar que el flujo sigue funcionando bajo HTTPS público.

## Seguridad y riesgos (resumen)

- **Exposición pública**: cualquier persona con la URL podría intentar acceder. Minimizar tiempo activo.
- **Datos**: usar datos de prueba; evitar exponer PII o información real.
- **Auth**: revisar CORS/cookies; evitar tokens en URLs y evitar logging con secretos.
- **Cierre**: detener el comando al terminar y registrar el cierre.

## Registro obligatorio (para trazabilidad)

Cada vez que se use un túnel, registrar una entrada en `docs/22-changelog-tecnico.md` y, si afecta seguridad/cookies/CORS, referenciar `docs/18-seguridad-y-hardening.md`.

### Plantilla — Sesión `cloudflared` (copiar y rellenar)

```
### YYYY-MM-DD — cloudflared — Frontend (5173)
- Comando: `cloudflared tunnel --url http://localhost:5173`
- URL pública: https://...
- Propósito: (demo, prueba móvil, revisión externa, etc.)
- Duración: (inicio–fin)
- Alcance: (solo frontend / rutas específicas)
- Notas seguridad: (CORS, cookies, datos de prueba, etc.)
- Cierre: túnel detenido (sí/no)
```

## Referencias internas

- `18-seguridad-y-hardening.md`
- `22-changelog-tecnico.md`
- `23-entorno-local-xampp-ngrok.md` (entorno local y exposición temporal)

