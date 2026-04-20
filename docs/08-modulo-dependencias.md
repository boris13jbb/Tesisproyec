# Módulo — Dependencias (organizacionales)

## Objetivo

Catálogo de unidades organizativas (dependencias) para clasificar usuarios y documentos.

## Alcance

CRUD de dependencias; integridad referencial con usuarios y documentos.

## Estado actual

**Parcial (prototipo).** Tabla `dependencias` en Prisma; API `GET /api/v1/dependencias` (JWT), `POST` y `PATCH /api/v1/dependencias/:id` (JWT + rol `ADMIN`); código único normalizado a mayúsculas. Pantalla en frontend: `/catalogos/dependencias` (listado; alta/edición solo ADMIN).

## Estructura prevista

- Entidad catálogo; validación de unicidad de código/nombre según reglas de negocio.

## Endpoints

- `GET /api/v1/dependencias` — listado; query `incluirInactivos=true|false`.
- `GET /api/v1/dependencias/:id` — detalle.
- `POST /api/v1/dependencias` — alta (ADMIN).
- `PATCH /api/v1/dependencias/:id` — actualización / baja lógica vía `activo` (ADMIN).

## Pantallas

- Lista y formulario de dependencia.

## Tablas relacionadas

- Definir en `schema.prisma` (pendiente).
