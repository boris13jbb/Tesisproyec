# Módulo — Búsqueda y consulta

## Objetivo

Búsqueda simple y avanzada por metadatos, filtros y permisos por rol.

## Alcance

Listados paginados, ordenamiento, visor de documento/archivo según permisos.

## Estado actual

**Implementado (ETAPA 8).**  
- **API:** `GET /api/v1/documentos` (JWT) con filtros y paginación.
- **Filtros:** `q` (código/asunto/descr.), `estado`, `tipoDocumentalId`, `serieId`, `subserieId`, `fechaDesde`, `fechaHasta`, `incluirInactivos`.
- **Adjuntos (búsqueda):** `archivoNombre`, `archivoMime`, `archivoSha256` (match sobre adjuntos activos).
- **Ordenamiento:** `sortBy` (`codigo` | `fechaDocumento` | `estado`) y `sortDir` (`asc` | `desc`).
- **Paginación:** `page`, `pageSize` → respuesta `{ page, pageSize, total, items }`.
- **Frontend:** `/documentos` con barra de búsqueda, filtros y paginación.

## Decisiones técnicas

- Consultas optimizadas en Prisma; índices en columnas de filtro frecuente (definir en migraciones).

## Pantallas

- Búsqueda, resultados, detalle desde consulta.

## Endpoints

- `GET /api/v1/documentos`
  - Query:
    - `q`
    - `archivoNombre`
    - `archivoMime`
    - `archivoSha256`
    - `estado`
    - `tipoDocumentalId`
    - `serieId`
    - `subserieId`
    - `fechaDesde` (ISO)
    - `fechaHasta` (ISO)
    - `sortBy`, `sortDir`
    - `page`, `pageSize`
    - `incluirInactivos`
