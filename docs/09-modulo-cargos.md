# Módulo — Cargos

## Objetivo

Catálogo de cargos o puestos asociables a usuarios para reportes y permisos contextuales.

## Alcance

CRUD de cargos; relación opcional con usuarios.

## Estado actual

**Parcial (prototipo).** Tabla `cargos` con FK opcional a `dependencias`; API `GET /api/v1/cargos` (JWT), `POST` y `PATCH /api/v1/cargos/:id` (ADMIN). Pantalla `/catalogos/cargos` (listado; alta/edición ADMIN). Seed: `DIR-GEN`, `ASIST`.

## Endpoints

- `GET /api/v1/cargos` — listado con `dependencia` anidada; query `incluirInactivos`.
- `GET /api/v1/cargos/:id` — detalle.
- `POST` / `PATCH` — mutaciones (ADMIN).

## Pantallas

- Lista y formulario de cargo.

## Tablas relacionadas

- Pendiente de diseño en Prisma.
