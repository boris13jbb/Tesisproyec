# Roadmap general — SGD-GADPR-LM

## Objetivo

Ordenar el desarrollo del prototipo por **fases dependientes**, sin adelantar pantallas antes de tener base técnica, datos y seguridad mínima definidos en el expediente `GADPR-LM-ETI-SGD-2026-001`.

## Alcance

Desde auditoría inicial hasta hardening final; el detalle por módulo vive en `05`–`17` y en el expediente.

## Estado actual

**Completado:** ETAPA 0–1 (shell API + SPA), ETAPA 2 (Prisma + RBAC + migraciones), ETAPA 3 (auth JWT + refresh HttpOnly + seed admin), **ETAPA 4** parcial: layout con AppBar y drawer, panel principal (`/`), rutas protegidas, página 403, demo `GET /admin/ping` con `@Roles('ADMIN')`.

**Siguiente foco:** ETAPA 5 — continuar catálogos (**tipos documentales**, series/subseries) tras **dependencias** y **cargos** (`08`, `09`); opcional: refinamientos de shell (menú por permisos, estados de red globales).

---

## Fases (orden obligatorio)

| Etapa | Nombre | Entregables principales |
|-------|--------|-------------------------|
| **0** | Auditoría y saneamiento | `/docs` completo, `.gitignore`, `storage/`, `.env.example`, README, deuda registrada |
| **1** | Base técnica | `frontend/` Vite+React+TS+MUI, axios, routing; NestJS: Config, validación global, `/api/v1`, CORS |
| **2** | BD + Prisma + XAMPP | `schema.prisma`, migraciones, BD creada en XAMPP, validación en phpMyAdmin |
| **3** | Seguridad y auth | Usuarios, roles, permisos, JWT + refresh HttpOnly, Argon2id, guards, auditoría de login |
| **4** | Navegación y shell UI | Layout, dashboard, menú, 403/404, estados de error/red |
| **5** | Catálogos | Dependencias, cargos, tipos documentales, series/subseries, estados, configuración |
| **6** | Gestión documental | CRUD documento, metadatos, estados, historial |
| **7** | Archivos | Subida, validación, `storage/`, versiones, descarga con trazabilidad |
| **8** | Búsqueda | Simple y avanzada, filtros, paginación, permisos por rol |
| **9** | Reportes | ExcelJS, pdfkit, permisos |
| **10** | Hardening y cierre | Limpieza, revisión seguridad, documentación final, backlog |

## Decisiones técnicas

- Stack cerrado: ver `02-stack-y-convenciones.md`.
- No microservicios ni PostgreSQL como línea base.
- ngrok solo para exposición temporal (`23-entorno-local-xampp-ngrok.md`).

## Problemas y riesgos

Seguimiento en `20-problemas-detectados.md` y `21-riesgos-pendientes.md`.

## Mejoras futuras

Institucionalización, despliegue en intranet, backups operativos — fuera del MVP de tesis salvo extensión acordada.
