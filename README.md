# SGD-GADPR-LM — Sistema de gestión documental (prototipo de tesis)

Aplicación web para gestión documental institucional digitalizada (caso de estudio GADPR-LM), con stack definido en `docs/02-stack-y-convenciones.md`.

## Estado del repositorio (desarrollo)

| Componente | Estado |
|------------|--------|
| Backend (`backend/`) | NestJS — prefijo global `api/v1`, CORS, `ValidationPipe`, health `GET /api/v1/health` |
| Frontend (`frontend/`) | Vite + React 18 + TypeScript + MUI + React Router + axios (shell base) |
| Prisma / MySQL | **Esquema y migración inicial en repo** — aplicar en tu MySQL (XAMPP) con los pasos de abajo |
| `storage/` | Carpeta reservada para archivos (ver `.gitignore`) |

Documentación viva: carpeta **`docs/`** (índice en `docs/README.md`). Comandos de ejecución local: **`docs/42-comandos-ejecucion-manual.md`**.

**UI (2026-05-27):** la interfaz muestra solo controles que el servidor aplica o puede medir; ver **`docs/45-principio-ui-controles-reales.md`** y el manual **`docs/27-manual-usuario-sgd-gadpr-lm.md`**.

## Requisitos

- Node.js LTS
- XAMPP con MySQL/MariaDB en marcha (cuando se active Prisma; puerto típico 3306)
- (Opcional) ngrok — ver `docs/23-entorno-local-xampp-ngrok.md`

## Puesta en marcha local

Guía detallada: **`docs/42-comandos-ejecucion-manual.md`**. Resumen Windows: `EJECUTAR.txt`.

**Windows (día a día):** doble clic en **`iniciar-desarrollo.cmd`** (Backend `:3000` + Frontend `:5173`). MySQL en XAMPP debe estar activo antes.

Desde la **raíz** (`Tesisproyec/`): `npm run start:dev` (API) · `npm run dev` (Vite) · `npm run dev:all` (ambos).

### Primera vez en otro PC (clon de GitHub)

GitHub trae **código, migraciones, seed y documentación**. No trae `.env`, datos reales de MySQL ni PDFs de `storage/` (secretos y evidencia; no versionar).

1. Instalar **Node.js LTS** y **XAMPP** (MySQL/MariaDB, puerto 3306).
2. Clonar el repo y, en la raíz: `npm run install:all`
3. Crear en phpMyAdmin la base vacía `gestion_documental_gadpr_lm` (cotejamiento **utf8mb4**).
4. `backend/`: copiar `.env.example` → `.env` y ajustar `DATABASE_URL` si tu MySQL tiene contraseña.
5. `frontend/`: copiar `.env.example` → `.env.local` (en local suele bastar el proxy Vite; no hace falta `VITE_API_URL`).
6. Desde `backend/`:
   ```bash
   npx prisma migrate deploy
   npx prisma generate
   npx prisma db seed
   ```
7. Arrancar (`iniciar-desarrollo.cmd` o `npm run dev:all`). Web: **http://localhost:5173** · API: **http://localhost:3000/api/v1/health**
8. Entrar con `admin@local.test`. Si no definiste `SEED_ADMIN_PASSWORD` en `.env`, el seed usa `Admin123!`.

SMTP, MFA y respaldos automáticos son **opcionales** (variables comentadas en `.env.example`). Sin SMTP el login, documentos y reportes funcionan; no se envían correos de recuperación/notificación.

Si `prisma generate` falla en Windows con **EPERM** en `query_engine-windows.dll`: cierra Nest/Prisma Studio, `npm run prisma:generate:clean` en `backend/`, y si hace falta cierra Cursor y procesos Node. Evita OneDrive/antivirus bloqueando `node_modules`.

**Versión Prisma:** **5.22.x**.

### Qué sí / no llega con el clon (todos los módulos)

| Apartado | En GitHub | En el otro PC hay que… |
|----------|-----------|-------------------------|
| Auth, JWT, MFA, recuperación | Código + plantilla `.env.example` | Copiar `.env`; secretos JWT propios; SMTP solo si quieres correos |
| Usuarios, roles, permisos | Código + seed RBAC | `npx prisma db seed` (admin, roles, matriz de permisos, catálogos de ejemplo) |
| Catálogos (dependencias, cargos, tipos, series, contrapartes, beneficiarios) | Código + seed de ejemplo | Seed; el resto se crea en la UI |
| Documentos, revisión, bandeja, clasificación | Código de API + pantallas | Vacío hasta crear expedientes (o importar un dump **fuera** de Git) |
| Archivos adjuntos | Código + `storage/.gitkeep` | Los PDF reales **no** van al repo; copiar `storage/` a mano si necesitas los mismos archivos |
| Auditoría y reportes | Código (incl. documentos por usuario) | Se alimentan de lo que exista en esa BD |
| Dashboard / Likert | Código | Cálculo sobre documentos de esa BD |
| Respaldos | Código + `backups/automated/` vacía | Volcados `.sql`/`.zip` no se versionan |
| Manual y docs | `docs/` y `docs/27-manual-usuario-sgd-gadpr-lm.md` | Listos al clonar |

Para **replicar datos de este PC** (documentos, usuarios reales, PDFs): mysqldump + copia de `storage/`, por canal privado, **nunca** en el repositorio.

### 1. Backend (API)

```bash
cd backend
copy .env.example .env
npm install
npm run start:dev
```

- URL base: **http://localhost:3000** · Salud: **GET** `http://localhost:3000/api/v1/health`

### 2. Frontend (SPA)

```bash
cd frontend
copy .env.example .env.local
npm install
npm run dev
```

- URL típica: **http://localhost:5173**

### Scripts útiles

**Backend** (`backend/`): `npm run build`, `npm run start:dev`, `npm run lint`, `npm run test`, `npm run test:e2e`, `npm run format`, `npm run prisma:generate`, `npm run prisma:generate:clean`, `npm run prisma:migrate`, `npm run prisma:studio`

**Frontend** (`frontend/`): `npm run dev`, `npm run build`, `npm run lint`

## Solución de problemas

### `EADDRINUSE: address already in use :::3000`

Otro proceso (casi siempre una **instancia anterior** del backend en Node) sigue usando el puerto **3000** — por ejemplo si dejaste otra terminal con `npm run start:dev` o el proceso no terminó bien.

**Opción rápida (recomendada):** desde la raíz del repo:

```bash
npm run free:3000
npm run start:dev
```

(`free:3000` usa `kill-port` vía `npx`; requiere red la primera vez. Equivale en `backend/`: `npm run free:3000`.)

**Opción manual (Windows):**

1. Localiza el PID:
   ```bash
   netstat -ano | findstr ":3000"
   ```
2. Comprueba con `tasklist /FI "PID eq <PID>"` que sea `node.exe` y termínalo: `taskkill /PID <PID> /F`
3. Vuelve a ejecutar `npm run start:dev`.

**Evitar duplicados:** no lances dos veces el backend en el mismo puerto; usa **Ctrl+C** en la terminal del servidor antes de iniciar otro. Si necesitas dos APIs, define `PORT=3001` en `backend/.env` y ajusta `VITE_API_URL` en el frontend.

### `EPERM` al ejecutar `npx prisma generate` (Windows)

Suele ser un **archivo bloqueado** (`query_engine-windows.dll.node`). Orden recomendado:

1. Detén el backend y cualquier `prisma studio` (**Ctrl+C** en cada terminal).
2. Si sigue fallando, en **PowerShell como administrador** (solo si sabes lo que haces): `taskkill /IM node.exe /F` — cierra **todos** los procesos Node (incluido otros proyectos).
3. `npm run prisma:generate:clean` desde `backend/` (o desde la raíz: `npm run prisma:generate:clean`).
4. Si aún no puedes borrar `node_modules\.prisma`, cierra **Cursor/VS Code**, vuelve al paso 2 y 3, o reinicia el equipo.
5. Revisa **antivirus** y carpetas **OneDrive** sincronizando `node_modules` (mejor excluir o no poner el repo bajo sincronización pesada).

## Documentación

- **ETAPA 0 cerrada (checklist/evidencias):** `docs/29-etapa-0-cierre-y-evidencias.md`
- **ETAPA 1 cerrada (base técnica):** `docs/30-etapa-1-cierre-y-evidencias.md`
- **ETAPA 2 cerrada (Prisma/XAMPP):** `docs/31-etapa-2-cierre-y-evidencias.md`
- **ETAPA 3 cerrada (auth / sesión):** `docs/32-etapa-3-cierre-y-evidencias.md`
- **ETAPA 4 cerrada (shell UI / navegación):** `docs/33-etapa-4-cierre-y-evidencias.md`
- **ETAPA 5 cerrada (catálogos):** `docs/34-etapa-5-cierre-y-evidencias.md`
- **ETAPA 6 cerrada (gestión documental):** `docs/35-etapa-6-cierre-y-evidencias.md`
- **ETAPA 7 cerrada (archivos adjuntos):** `docs/36-etapa-7-cierre-y-evidencias.md`
- **ETAPA 8 cerrada (búsqueda / listado):** `docs/37-etapa-8-cierre-y-evidencias.md`
- **ETAPA 9 cerrada (reportes Excel/PDF):** `docs/38-etapa-9-cierre-y-evidencias.md`
- **ETAPA 10 cerrada (hardening MVP / cierre roadmap 0–10):** `docs/39-etapa-10-cierre-y-evidencias.md`
- Roadmap: `docs/00-roadmap-general.md`
- Arquitectura: `docs/01-arquitectura-general.md`
- Problemas y riesgos: `docs/20-problemas-detectados.md`, `docs/21-riesgos-pendientes.md`
- Changelog técnico: `docs/22-changelog-tecnico.md`
- Guía de prueba por módulos (formato obligatorio de cierre): `docs/99-guia-de-prueba-por-modulos.md`

## Licencia

Privado / tesis — ver metadatos del proyecto.
