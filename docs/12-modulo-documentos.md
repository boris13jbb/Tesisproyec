# Módulo — Registro documental (documentos)

## Objetivo

Ciclo de vida del expediente digital: registro, metadatos, estados, historial y vínculo con series y tipos.

## Alcance

CRUD acotado por permisos; trazabilidad de cambios relevantes.

## Estado actual

**Completado (ETAPA 6).**  
- **BD:** `documentos` + tabla de historial `documento_eventos` (trazabilidad de creación/actualización).
- **API:** `GET /api/v1/documentos` y `GET /api/v1/documentos/:id` (JWT), `POST/PATCH` (ADMIN), `GET /api/v1/documentos/:id/eventos` (JWT).
- **Frontend:** `/documentos` (listado + registrar), `/documentos/:id` (detalle + edición + historial).
- **Seed:** `DOC-0001` y eventos asociados al crear/editar.

## Decisiones técnicas

- Transacciones al crear documento + metadatos; estados documentales como catálogo o enum según modelo.

## Pantallas

- Listado, creación, edición, detalle con historial.

## Tablas relacionadas

- `documentos`: registro documental MVP (FKs a catálogos y usuario).
- `documento_eventos`: eventos `CREADO` / `ACTUALIZADO` con `cambios_json` y `created_by_id`.

## Dependencias

- Tipos documentales, series/subseries, usuarios, auditoría.
