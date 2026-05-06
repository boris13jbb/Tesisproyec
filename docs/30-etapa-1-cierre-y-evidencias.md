# ETAPA 1 — Base técnica: cierre al 100 % (evidencias)

**Proyecto:** SGD-GADPR-LM  
**Referencia roadmap:** `docs/00-roadmap-general.md` (fila **ETAPA 1 — Base técnica**)  
**Fecha de cierre formal:** **2026-05-06**

---

## Objetivo

Acreditar que la **capa técnica transversal** acordada en el roadmap está implantada antes de adjudicar trabajo solo a ETAPAs de dominio (catálogos, documentos, etc.).

---

## Checklist vs roadmap (`00-roadmap-general.md`)

### Frontend (`frontend/`)

| Entregable | Evidencia | Estado |
|------------|-----------|--------|
| Vite + React + TypeScript | `frontend/package.json`, `frontend/tsconfig*.json`, `frontend/vite.config.ts` | Cumple |
| MUI | `@mui/material`, `@emotion/*` | Cumple |
| axios | `frontend/src/api/client.ts`, dependencia `axios` | Cumple |
| Enrutamiento | `react-router-dom`, `frontend/src/app/App.tsx` | Cumple |
| Stack de formulario (referencia expediente / ETAPA 0 plan) | `react-hook-form`, `zod`, `@hookform/resolvers` | Cumple (dependencias; uso gradual por pantalla) |
| Dev: mismo origen con API (`/api/v1`) | Proxy `server.proxy['/api']` → backend en `vite.config.ts` | Cumple |

### Backend (NestJS)

| Entregable | Evidencia | Estado |
|------------|-----------|--------|
| `ConfigModule` global | `backend/src/app.module.ts` (`ConfigModule.forRoot`, `envFilePath`) | Cumple |
| Validación global de entrada | `ValidationPipe` en `backend/src/main.ts` (`whitelist`, `forbidNonWhitelisted`, `transform`) | Cumple |
| Prefijo de API `/api/v1` | `app.setGlobalPrefix('api/v1')` en `main.ts` | Cumple |
| CORS configurable + credenciales | `enableCors` con `CORS_ORIGIN`; `credentials: true` | Cumple |
| Hardening base HTTP | `helmet`, `cookie-parser`; reducción fingerprint Express | Cumple |

### Monorepo

| Entregable | Evidencia | Estado |
|------------|-----------|--------|
| Scripts de conveniencia | `package.json` en raíz: `install:all`, `dev:all`, `start:dev`, `build`, … | Cumple |
| Documentación de arranque | `README.md`, `EJECUTAR.txt`, `iniciar-desarrollo.cmd` | Cumple |

---

## Alcance fuera de ETAPA 1

- **Prisma / MySQL**, **JWT / usuarios**, **pantallas de negocio** corresponden a **ETAPA 2+** según roadmap; aquí solo se lista que reposan sobre esta base (**módulos bajo `backend/src/*/`, SPA bajo `frontend/src/`**).

---

## Siguiente fase oficial

Según `docs/00-roadmap-general.md`, tras la base técnica sigue la **ETAPA 2**: cierre formal en **`docs/31-etapa-2-cierre-y-evidencias.md`** y modelo en **`docs/04-modelo-base-de-datos.md`**.

---

*Fin del documento de cierre ETAPA 1.*
