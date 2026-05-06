# ETAPA 0 — Auditoría inicial y diagnóstico técnico

**Proyecto:** SGD-GADPR-LM — Gestión documental institucional digitalizada (GADPR-LM)  
**Referencia:** expediente `GADPR-LM-ETI-SGD-2026-001`  
**Fecha del informe:** 2026-04-19  
**Alcance:** inspección del repositorio, contraste con stack oficial y expediente, sin implementación de código en la sesión de auditoría.

---

> ### Aviso de archivo (consulta estado vigente)
>
> Este documento es un **snapshot histórico** del repositorio en **2026-04-19**. Las tablas siguientes (**§2–10**) **no** reflejan el estado actual del código (hay `frontend/`, Prisma, auth, dominio SGD implementados en etapas posteriores).
>
> **Evidencias de saneamiento ETAPA 0 cerrada al 100%:** `docs/29-etapa-0-cierre-y-evidencias.md`.  
> **Roadmap actual:** `docs/00-roadmap-general.md`.

---

## 1. Objetivo del paso (ETAPA 0)

Auditar el repositorio, contrastarlo con el expediente técnico y el stack obligatorio, registrar brechas, problemas y riesgos, y dejar definida la documentación faltante y el primer bloque de implementación ejecutable posterior.

---

## 2. Análisis previo

### 2.1 Estructura real del workspace

| Elemento | Estado |
|----------|--------|
| `backend/` | NestJS plantilla mínima (`AppModule`, `AppController`, `main.ts`). |
| `frontend/` | No existe (React 18 + Vite + MUI no está en el repositorio). |
| `prisma/` / `schema.prisma` | No existe en `backend/` (no hay ORM ni modelo persistido). |
| `storage/` | No aparece en la raíz (no hay carpeta de archivos aún). |
| `docs/` | Parcial: existen `01`, `02`, `03`, `04`, `22`; faltan el resto de la lista obligatoria (`00`, `05`–`21`, `23`). |
| `.env` / `.env.example` | No hay archivos `.env*` visibles en la auditoría (coherente con no versionar secretos; falta plantilla documentada). |
| `.gitignore` en raíz | No localizado (riesgo de versionar `.env` o artefactos si no se añade). |
| `README.md` en raíz | No existe (solo el README por defecto de Nest en `backend/`). |

### 2.2 Dependencias y scripts (`backend/package.json`)

- **Scripts:** `build`, `format` (Prettier), `lint` (ESLint), `test` (Jest), `start:dev`, etc.
- **Dependencias runtime actuales:** `@nestjs/common`, `@nestjs/core`, `@nestjs/platform-express`, `reflect-metadata`, `rxjs`.

**Faltan** respecto al stack oficial declarado para el producto: Prisma, JWT/cookies, Argon2, class-validator (u otra validación API acordada), ExcelJS, pdfkit, `@nestjs/config`, etc.

**Conclusión:** el backend es un esqueleto NestJS, no el API del SGD descrito en el expediente.

### 2.3 Código fuente (`backend/src`)

Archivos propios: `main.ts`, `app.module.ts`, `app.controller.ts`, `app.service.ts`, `app.controller.spec.ts`.

No hay módulos de dominio, guards, PrismaService ni rutas `/api/v1`.

- **Duplicidad de lógica de negocio:** no aplica aún.
- **Código muerto:** no se detectó más allá del boilerplate Nest (tests incluidos).

### 2.4 Documentación existente vs expediente

Los archivos en `docs/` (`01`, `02`, `03`, `04`) describen arquitectura y convenciones coherentes con el expediente (`Nueva carpeta/expediente-tecnico-gestion-documental-gadpr-lm.md`).

**Inconsistencia detectada:** en `01-arquitectura-general.md` y `02-stack-y-convenciones.md` se enlaza `17-seguridad-y-hardening.md`, mientras que `22-changelog-tecnico.md` menciona `18-seguridad-y-hardening.md`. La especificación del proyecto exige **`18-seguridad-y-hardening.md`** — unificar numeración y enlaces al cerrar la base documental.

### 2.5 Conexión XAMPP / MySQL

No es posible comprobar desde el entorno de análisis que MySQL en XAMPP esté levantado ni que exista la base `gestion_documental_gadpr_lm` sin ejecutar un cliente SQL en la máquina del desarrollador.

**Estado registrable:** conexión no verificada en esta auditoría; pendiente validación local (`mysql` / phpMyAdmin) al iniciar ETAPA 2.

### 2.6 Alineación con restricciones de stack

No se detectó PostgreSQL, Firebase, Docker como base, ni otro ORM sustitutivo. El gap principal es la **ausencia de frontend, Prisma y módulos de seguridad**, no un stack alternativo.

---

## 3. Plan del primer bloque de implementación (post ETAPA 0 documental)

**Nota:** este plan está definido para ejecutarse en la siguiente iteración, no como parte de la sola auditoría.

Cuando se autorice el siguiente paso, el **primer bloque acotado** propuesto alinea con **ETAPA 1 — Base técnica**:

1. **Raíz del monorepo:** `README.md` con cómo levantar el backend, enlace a `docs/`, puertos de referencia.
2. **`.gitignore`** en la raíz (y revisión de `backend/.gitignore` si aplica): `node_modules`, `.env`, `storage/*` con excepciones seguras, logs, `dist`, etc.
3. **Carpeta `storage/`** con `.gitkeep` (o equivalente) y regla documentada de no versionar binarios reales.
4. **`backend/.env.example`:** `DATABASE_URL`, `PORT`, placeholders JWT/CORS (sin secretos reales).
5. **Scaffolding `frontend/`:** Vite + React + TypeScript; dependencias del stack: MUI, React Router, React Hook Form, Zod, axios; estructura de carpetas acordada a `03-estructura-de-carpetas.md`.
6. **Backend:** `ConfigModule`, validación global, prefijo global `/api/v1`, CORS hacia `http://localhost:5173`, estructura de carpetas por módulos (aunque vacíos). Opcional aislar Prisma en un **segundo sub-bloque** (ETAPA 2).

**Variante de máximo control:** limitar el primer bloque a los puntos 1–4 más actualización documental y dejar Vite para el bloque siguiente.

---

## 4. Implementación (esta sesión)

No se implementó código ni nuevos archivos de aplicación en la iteración de solo diagnóstico.

---

## 5. Limpieza técnica aplicada

No aplicable en esta iteración (solo auditoría).

---

## 6. Validaciones ejecutadas

| Verificación | Resultado |
|--------------|-----------|
| Backend `npm run build`, `npm run lint`, `npm run test` | Ejecutados tras saneamiento mínimo (2026-04-19): OK; lint sin errores (warning resuelto en `main.ts`). |
| Frontend | No aplica aún (no hay `frontend/`). |
| Conexión MySQL XAMPP | No verificada desde el agente; validación manual pendiente. |

Los comandos completos por paquete están en `19-pruebas-y-validaciones.md`.

---

## 7. Documentación — archivos `.md` a crear o actualizar

### 7.1 Crear (plantilla mínima: objetivo, alcance, estado actual, decisiones, pendientes)

| Archivo | Estado (2026-04-19) |
|---------|---------------------|
| `docs/00-roadmap-general.md` | Creado |
| `docs/05-modulo-auth.md` … `docs/17-modulo-configuracion.md` | Creados (baseline) |
| `docs/18-seguridad-y-hardening.md` | Creado (sustituye intento vacío `17`) |
| `docs/19-pruebas-y-validaciones.md` | Creado |
| `docs/20-problemas-detectados.md` | Creado |
| `docs/21-riesgos-pendientes.md` | Creado |
| `docs/23-entorno-local-xampp-ngrok.md` | Creado |
| `docs/README.md` | Índice de `docs/` |

### 7.2 Actualizar

| Archivo | Motivo |
|---------|--------|
| `docs/01-arquitectura-general.md` | Enlace a seguridad: `18-seguridad-y-hardening.md`. |
| `docs/02-stack-y-convenciones.md` | Mismo ajuste; coherencia con numeración oficial. |
| `docs/03-estructura-de-carpetas.md` | Reflejar estado real (solo `backend/`, sin `frontend/` ni `prisma/`). |
| `docs/04-modelo-base-de-datos.md` | Sección estado actual: sin `schema.prisma` hasta ETAPA 2. |
| `docs/22-changelog-tecnico.md` | Entrada ETAPA 0: auditoría 2026-04-19. |

Opcional: `docs/README.md` como índice de `00`–`23`.

---

## 8. Problemas detectados

| ID | Descripción | Módulo / área | Estado |
|----|-------------|---------------|--------|
| P-001 | No existe aplicación React/Vite; stack frontend documentado no materializado | Repo / ETAPA 1 | Abierto |
| P-002 | No hay Prisma, `DATABASE_URL` ni migraciones | BD / ETAPA 2 | Abierto |
| P-003 | Backend sin autenticación, validación global ni prefijo API versionado | Backend / ETAPA 1–3 | Abierto |
| P-004 | Inconsistencia `17-seguridad…` vs `18-seguridad…` entre documentos | `docs/` | **Cerrado** (unificado en `18`; refs en `01`/`02`) |
| P-005 | Sin `.gitignore` raíz detectado; riesgo de commits indebidos | Repo | **Cerrado** (`.gitignore` en raíz) |
| P-006 | Sin `.env.example` en backend; onboarding frágil | Entorno | **Cerrado** (`backend/.env.example`) |
| P-007 | Conexión XAMPP/MySQL no verificada en esta sesión | Infra | Pendiente verificación local |

---

## 9. Riesgos pendientes

| ID | Riesgo | Mitigación sugerida |
|----|--------|---------------------|
| R-001 | Retraso si se mezclan ETAPA 1 y 2 sin orden | Mantener bloques: monorepo + convenciones primero; Prisma después. |
| R-002 | Documentación desincronizada del código | Actualizar `03`, `04`, `22` en cada entrega de features. |
| R-003 | Secretos en Git sin `.gitignore` | Añadir reglas y revisar historial si ya se commiteó `.env`. |

---

## 10. Siguiente paso recomendado

1. **ETAPA 1 — Base técnica:** scaffolding `frontend/` (Vite + React + TS + MUI + Router + RHF + Zod + axios); en NestJS: `ConfigModule`, prefijo global `/api/v1`, CORS, validación global (class-validator), estructura de carpetas por dominio (sin pantallas de negocio aún).
2. Crear `backend/.env` local a partir de `.env.example` y validar MySQL en XAMPP antes de instalar Prisma (**ETAPA 2**).

---

## Referencias cruzadas

| Documento | Relación |
|-----------|----------|
| `01-arquitectura-general.md` | Visión de capas y entornos |
| `02-stack-y-convenciones.md` | Stack cerrado y variables de entorno |
| `03-estructura-de-carpetas.md` | Estructura objetivo vs real |
| `04-modelo-base-de-datos.md` | Prisma y XAMPP |
| `22-changelog-tecnico.md` | Registro de hitos y cambios técnicos |

---

*Fin del informe ETAPA 0.*
