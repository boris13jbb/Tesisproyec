# Manual de comandos — ejecución local (SGD-GADPR-LM)

**Audiencia:** desarrolladores y evaluadores que levantan el sistema en su PC.  
**Sistema operativo de referencia:** Windows (PowerShell o `cmd`). En Linux/macOS sustituye `copy` por `cp`.

**Ruta del repositorio (ejemplo):**

```text
C:\Users\BRS\Documents\Tesisproyec
```

---

## 1. Requisitos previos

| Requisito | Acción |
|-----------|--------|
| Node.js LTS | Instalado y en el `PATH` (`node -v`, `npm -v`) |
| XAMPP | Servicio **MySQL** o **MariaDB** **iniciado** (puerto típico **3306**) |
| Base de datos vacía | Crear en phpMyAdmin o SQL, p. ej. `gestion_documental_gadpr_lm` con cotejamiento **utf8mb4** |

---

## 2. Primera vez (clon o máquina nueva)

### 2.1 Desde la raíz del repositorio

```powershell
cd "C:\Users\BRS\Documents\Tesisproyec"
npm run install:all
```

Equivale a `npm install` en `backend/` y en `frontend/`.

### 2.2 Variables de entorno — backend

```powershell
cd backend
copy .env.example .env
```

Editar `backend\.env`:

- `DATABASE_URL` — usuario, contraseña y nombre de la base en XAMPP.
- Secretos JWT y demás según `.env.example`.

### 2.3 Variables de entorno — frontend

```powershell
cd ..\frontend
copy .env.example .env.local
```

En desarrollo local suele bastar el proxy de Vite (no definir `VITE_API_URL` salvo caso especial). Ver `frontend/README.md`.

### 2.4 Prisma — migraciones y cliente

Con **MySQL activo** y la base creada:

```powershell
cd ..\backend
npx prisma migrate deploy
npx prisma generate
```

**Primera migración en un entorno nuevo** (si aún no hay historial aplicado y el equipo usa flujo de desarrollo):

```powershell
npx prisma migrate dev
```

### 2.5 Datos iniciales (seed)

```powershell
npx prisma db seed
```

Usuario administrador por defecto (si no cambiaste `SEED_ADMIN_*` en `.env`):

| Campo | Valor típico |
|-------|----------------|
| Correo | `admin@local.test` |
| Contraseña | `Admin123!` (o la definida en `SEED_ADMIN_PASSWORD`) |

> En `.env.example` la contraseña de seed aparece como placeholder; en desarrollo el seed usa `Admin123!` si no defines otra válida (mínimo 8 caracteres).

---

## 3. Arranque diario (desarrollo)

### 3.1 Opción A — Windows, una acción (recomendada)

Doble clic en la raíz del repo:

```text
iniciar-desarrollo.cmd
```

Abre **backend** (`:3000`) y **frontend** (`:5173`) en ventanas separadas. **MySQL debe estar activo antes.**

### 3.2 Opción B — una sola terminal (raíz)

```powershell
cd "C:\Users\BRS\Documents\Tesisproyec"
npm run dev:all
```

Arranca backend y frontend en paralelo (`concurrently`).

### 3.3 Opción C — dos terminales (manual)

**Terminal 1 — API:**

```powershell
cd "C:\Users\BRS\Documents\Tesisproyec\backend"
npm run start:dev
```

**Terminal 2 — interfaz web:**

```powershell
cd "C:\Users\BRS\Documents\Tesisproyec\frontend"
npm run dev
```

### 3.4 Desde la raíz (atajos)

```powershell
cd "C:\Users\BRS\Documents\Tesisproyec"
npm run start:dev    # solo backend
npm run dev          # solo frontend
```

---

## 4. URLs y comprobación rápida

| Recurso | URL |
|---------|-----|
| Interfaz (Vite) | http://localhost:5173 |
| Login | http://localhost:5173/login |
| API base | http://localhost:3000 |
| Salud del API | http://localhost:3000/api/v1/health |

**Orden recomendado:** MySQL → backend → frontend. Si solo corre Vite, el proxy puede devolver `ECONNREFUSED` contra el puerto 3000.

---

## 5. Comandos Prisma (carpeta `backend/`)

Ejecutar siempre desde `backend/`:

| Objetivo | Comando |
|----------|---------|
| Aplicar migraciones del repo (otro PC / despliegue) | `npx prisma migrate deploy` |
| Crear migración nueva tras cambiar `schema.prisma` | `npx prisma migrate dev` |
| Regenerar cliente | `npx prisma generate` |
| Regenerar tras EPERM en Windows | `npm run prisma:generate:clean` |
| Datos iniciales / permisos seed | `npx prisma db seed` |
| Inspeccionar tablas (UI) | `npx prisma studio` |
| Estado de migraciones | `npx prisma migrate status` |

**Scripts npm en `backend/`:**

```powershell
npm run prisma:migrate          # migrate dev
npm run prisma:generate
npm run prisma:generate:clean
npm run prisma:studio
```

**Desde la raíz del monorepo:**

```powershell
npm run prisma:migrate
npm run prisma:generate
npm run prisma:generate:clean
```

Referencia ampliada: [24-prisma-comandos-cli.md](./24-prisma-comandos-cli.md).

---

## 6. Calidad, compilación y pruebas

### 6.1 Backend (`backend/`)

```powershell
npm run lint
npm run format
npm run build
npm run test
npm run test:e2e
```

### 6.2 Frontend (`frontend/`)

```powershell
npm run lint
npm run build
npm run preview
```

### 6.3 Monorepo (raíz)

```powershell
npm run build
npm run lint
npm run test
```

---

## 7. Solución de problemas frecuentes

### 7.1 Puerto 3000 ocupado (`EADDRINUSE`)

Desde la **raíz**:

```powershell
npm run free:3000
npm run start:dev
```

Desde `backend/`:

```powershell
npm run free:3000
npm run start:dev
```

O liberar el puerto y arrancar en un paso:

```powershell
cd backend
npm run start:dev:free
```

**Manual (Windows):**

```powershell
netstat -ano | findstr ":3000"
tasklist /FI "PID eq <PID>"
taskkill /PID <PID> /F
```

### 7.2 `EPERM` al ejecutar `prisma generate`

1. Detener backend, `prisma studio` y terminales con Node (**Ctrl+C**).
2. Cerrar procesos Node huérfanos si hace falta (Administrador de tareas).
3. Desde `backend/`:

```powershell
npm run prisma:generate:clean
```

4. Revisar antivirus o sincronización (OneDrive) sobre `node_modules`.

### 7.3 Backend en otro puerto

En `backend/.env`:

```env
PORT=3001
```

Ajustar `VITE_API_URL` en el frontend si no usas el proxy por defecto.

---

## 8. Producción (referencia breve)

```powershell
cd backend
npm run build
npm run start:prod
```

```powershell
cd frontend
npm run build
```

Los artefactos del frontend quedan en `frontend/dist/`; sirven con un servidor estático o integración acordada. No usar credenciales de seed en producción.

---

## 9. Documentación relacionada

| Documento | Contenido |
|-----------|-----------|
| [README.md](../README.md) (raíz) | Onboarding resumido |
| [EJECUTAR.txt](../EJECUTAR.txt) | Hoja rápida Windows |
| [27-manual-usuario-sgd-gadpr-lm.md](./27-manual-usuario-sgd-gadpr-lm.md) | Uso de la aplicación (usuario final) |
| [04-modelo-base-de-datos.md](./04-modelo-base-de-datos.md) | Modelo y migraciones |
| [23-entorno-local-xampp-ngrok.md](./23-entorno-local-xampp-ngrok.md) | XAMPP y túneles temporales |
| [19-pruebas-y-validaciones.md](./19-pruebas-y-validaciones.md) | Criterios y comandos de prueba |
| [99-guia-de-prueba-por-modulos.md](./99-guia-de-prueba-por-modulos.md) | Guía de prueba por módulo |

---

**Última actualización:** 2026-05-26 — alineado a scripts de `package.json` en raíz, `backend/` y `frontend/`.
