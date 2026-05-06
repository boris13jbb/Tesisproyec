# SGD-GADPR-LM — Sistema de gestión documental (prototipo de tesis)

Aplicación web para gestión documental institucional digitalizada (caso de estudio GADPR-LM), con stack definido en `docs/02-stack-y-convenciones.md`.

## Estado del repositorio (desarrollo)

| Componente | Estado |
|------------|--------|
| Backend (`backend/`) | NestJS — prefijo global `api/v1`, CORS, `ValidationPipe`, health `GET /api/v1/health` |
| Frontend (`frontend/`) | Vite + React 18 + TypeScript + MUI + React Router + axios (shell base) |
| Prisma / MySQL | **Esquema y migración inicial en repo** — aplicar en tu MySQL (XAMPP) con los pasos de abajo |
| `storage/` | Carpeta reservada para archivos (ver `.gitignore`) |

Documentación viva: carpeta **`docs/`** (índice en `docs/README.md`).

## Requisitos

- Node.js LTS
- XAMPP con MySQL/MariaDB en marcha (cuando se active Prisma; puerto típico 3306)
- (Opcional) ngrok — ver `docs/23-entorno-local-xampp-ngrok.md`

## Puesta en marcha local

**Windows:** en la raíz del repo puede usar **`iniciar-desarrollo.cmd`** (doble clic o desde `cmd`) para abrir **Backend** (`:3000`) y **Frontend** (`:5173`) en ventanas separadas. MySQL en XAMPP debe estar activo antes. Detalle adicional: `EJECUTAR.txt`.

Desde la **raíz** del repositorio (`Tesisproyec/`) puedes usar también:

- `npm run start:dev` — mismo efecto que `npm run start:dev` dentro de `backend/`
- `npm run dev` — arranca Vite en `frontend/`

La primera vez (o tras clonar), desde la raíz:

```bash
npm run install:all
```

Equivale a `npm install` en `backend/` y en `frontend/`.

### 1. Backend (API)

```bash
cd backend
copy .env.example .env
npm install
npm run start:dev
```

Equivalente desde la raíz (tras `npm install` en `backend/`):

```bash
npm run start:dev
```

- URL base del API: **http://localhost:3000**
- Salud: **GET** `http://localhost:3000/api/v1/health`

### 2. Frontend (SPA)

```bash
cd frontend
copy .env.example .env.local
npm install
npm run dev
```

- URL típica: **http://localhost:5173**
- `VITE_API_URL` debe apuntar a `http://localhost:3000/api/v1` (por defecto en `.env.example`).

Con el backend en marcha, la página de inicio comprueba la conexión y muestra un mensaje de éxito o advertencia.

### Base de datos (Prisma + XAMPP)

1. Inicia **MySQL** en XAMPP y crea la base vacía (p. ej. `gestion_documental_gadpr_lm`), cotejamiento **utf8mb4**.
2. En `backend/`, copia `.env.example` a `.env` y revisa `DATABASE_URL` (usuario/clave de tu MySQL).
3. Desde `backend/`:
   ```bash
   npx prisma generate
   npx prisma migrate dev
   ```
   La primera vez aplica la migración `init_rbac` (tablas `users`, `roles`, `permissions`, relaciones).
4. Si `prisma generate` falla en Windows con **EPERM** en `query_engine-windows.dll`:
   - Cierra **todas** las terminales con `npm run start:dev` / Nest (Ctrl+C) y **Cursor/VS Code** si sigue fallando (a veces bloquea el `.dll`).
   - En el Administrador de tareas, finaliza procesos **Node.js** que queden.
   - Desde `backend/` ejecuta: **`npm run prisma:generate:clean`** (borra `node_modules/.prisma` y vuelve a generar el cliente).
   - Si persiste: excluye la carpeta del proyecto del análisis en tiempo real del **antivirus** o mueve el repo fuera de carpetas sincronizadas (OneDrive, etc.).

**Versión:** Prisma **5.22.x** en el backend (alineado a `datasource` clásico en `schema.prisma`).

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
- Roadmap: `docs/00-roadmap-general.md`
- Arquitectura: `docs/01-arquitectura-general.md`
- Problemas y riesgos: `docs/20-problemas-detectados.md`, `docs/21-riesgos-pendientes.md`
- Changelog técnico: `docs/22-changelog-tecnico.md`

## Licencia

Privado / tesis — ver metadatos del proyecto.
