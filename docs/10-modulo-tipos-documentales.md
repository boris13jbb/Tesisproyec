# Módulo — Tipos documentales

## Objetivo

Definir tipologías documentales según política archivística y expediente (metadatos obligatorios por tipo).

## Alcance

CRUD; vínculo con series/subseries y reglas de indexación.

## Estado actual

**Operativo endurecido.** Tabla `tipos_documentales`; API JWT + mutaciones `ADMIN` + `TIPOS_DOCUMENTALES_WRITE`; catálogo operativo solo activos; asignación documental exige tipo activo (histórico conservado). Matriz: `MATRIZ_VISIBILIDAD_TIPOS_DOCUMENTALES.md`. Seed: `MEMO`, `OFICIO`.

**Snapshot:** alineado a **`docs/README.md` (2026-05-06)** — retención por tipo (**R‑32–35**) sigue backlog.

## Decisiones técnicas

- Validación fuerte en creación/edición de documentos según tipo seleccionado.

## Pantallas

- Catálogo de tipos; campos dinámicos o esquema según diseño.

## Tablas relacionadas

- `tipos_documentales` (catálogo base). Vínculo con series/subseries y documentos se implementará en etapas posteriores.
