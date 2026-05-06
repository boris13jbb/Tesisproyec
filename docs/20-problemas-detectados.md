# Problemas detectados — SGD-GADPR-LM

## Objetivo

Registrar incidencias técnicas con **identificador**, estado y acción, sin perder el hilo entre iteraciones.

## Alcance

Código, entorno, documentación y herramientas del repositorio.

## Estado actual

Última revisión: **2026-05-06** (cierre **ETAPA 0** documental + saneamiento checklist en repo; ver `docs/29-etapa-0-cierre-y-evidencias.md`).

---

## Registro

| ID | Descripción | Módulo / área | Causa probable | Impacto | Estado | Solución / siguiente paso |
|----|-------------|---------------|----------------|---------|--------|---------------------------|
| P-001 | No existía carpeta `frontend/` ni SPA | ETAPA 1 | — | Bloqueaba UI | **Cerrado** | Vite + React 18 + MUI + Router + axios en `frontend/` |
| P-002 | Sin Prisma / sin modelo persistido | ETAPA 2 | — | Sin persistencia | **Cerrado** (schema + migración `init_rbac` en repo; falta aplicar migración en cada entorno) |
| P-003 | Archivo `.env` local ausente hasta que el desarrollador lo crea desde la plantilla | Entorno | Cada máquina | Sin DB hasta configurar | **Cerrado (ámbito repo)** | `backend/.env.example` + README: copiar a `.env`, definir `DATABASE_URL`; no es déficit ETAPA 0 |
| P-004 | CI/agente sin XAMPP: no puede validar MySQL vivo | Infra | Entorno solo local | No automatizable desde Git | **Cerrado (ámbito repo)** | Procedimiento en `README.md`, `04-modelo-base-de-datos.md`; validación manual del desarrollador |
| P-005 | Archivos vacíos/erróneos eliminados: `17-seguridad…`, `21-changelog…` duplicado | Docs | Numeración previa | Confusión | **Cerrado** | Sustituidos por `18-seguridad-y-hardening.md` y `21-riesgos-pendientes.md`; changelog único en `22` |
| P-006 | Sin `.gitignore` en raíz (añadido en saneamiento 2026-04-19) | Repo | Omisión inicial | Riesgo de commit de secretos | **Cerrado** | `.gitignore` en raíz con `.env` y `storage/*` |
| P-007 | Backend sin prefijo `/api/v1`, sin ConfigModule, sin CORS | Backend | Plantilla NestJS mínima | No alineado a convenciones API | **Cerrado** | `main.ts`: `ConfigModule`, `setGlobalPrefix('api/v1')`, `enableCors`, `ValidationPipe` |
| P-008 | ESLint: promesa flotante en `bootstrap()` | `backend/src/main.ts` | Patrón típico Nest | Warning | **Cerrado** | Uso de `void bootstrap();` |
| P-009 | Sin `README.md` en raíz ni carpeta `storage/` versionada | Repo | ETAPA 0 incompleta | Onboarding pobre | **Cerrado** | `README.md` + `storage/.gitkeep`; `.gitignore` ignora contenido de `storage/` |
| P-010 | Sin `backend/.env.example` | Entorno | No documentado | Fricción al configurar Prisma/JWT | **Cerrado** | Añadido `backend/.env.example` |

## Mejoras al proceso

Tras cada cambio sustantivo, actualizar este archivo y `22-changelog-tecnico.md`.
