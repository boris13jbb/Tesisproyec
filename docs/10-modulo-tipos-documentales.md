# Módulo — Tipos documentales

## Objetivo

Definir tipologías documentales según política archivística y expediente (metadatos obligatorios por tipo).

## Alcance

CRUD; vínculo con series/subseries y reglas de indexación.

## Estado actual

**Parcial (prototipo).** Tabla `tipos_documentales`; API `GET /api/v1/tipos-documentales` (JWT), `POST` y `PATCH /api/v1/tipos-documentales/:id` (ADMIN). Pantalla `/catalogos/tipos-documentales`. Seed: `MEMO`, `OFICIO`.

**Snapshot:** alineado a **`docs/README.md` (2026-05-06)** — retención por tipo (**R‑32–35**) sigue backlog.

## Decisiones técnicas

- Validación fuerte en creación/edición de documentos según tipo seleccionado.

## Pantallas

- Catálogo de tipos; campos dinámicos o esquema según diseño.

## Tablas relacionadas

- `tipos_documentales` (catálogo base). Vínculo con series/subseries y documentos se implementará en etapas posteriores.
