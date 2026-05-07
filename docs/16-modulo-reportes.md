# Módulo — Reportes

## Objetivo

Generación de exportaciones **Excel** (ExcelJS) y **PDF** (pdfkit) con filtros y respeto de permisos.

## Alcance

Reportes de documentos, usuarios, auditoría según prioridad del MVP.

## Estado actual

**Implementado (ETAPA 9 + extensiones post‑cierre — 2026-05-06).** Evidencia de hito ETAPA 9: `docs/38-etapa-9-cierre-y-evidencias.md`.

- **Backend:** generación en servidor con **ExcelJS** y **pdfkit**; límite **5000** filas en exportes basados en listado de documentos (`ReportesService`).
- **Permisos:**
  - **`ReportesController`** declara rol base **`ADMIN`** (`@Roles('ADMIN')` a nivel de clase).
  - **Excepción explícita:** `GET .../pendientes-revision.{xlsx,pdf}` permiten **`ADMIN`** y **`REVISOR`** (`@Roles('ADMIN', 'REVISOR')` en el método), con las **mismas reglas de visibilidad** que `GET /documentos` (dependencia + confidencialidad).
- **Filtros (documentos genéricos):** mismos query params que búsqueda/listado (ETAPA 8): `q`, `estado`, catálogos, fechas, adjuntos, orden, `incluirInactivos` (sin paginación en el export: tope del servicio).
- **Auditoría:** `GET /api/v1/reportes/auditoria.xlsx` y `.pdf` (**ADMIN**), alineados a filtros de `GET /api/v1/auditoria`.
- **Trazabilidad:** cada export registra **`REPORT_EXPORTED`** en `audit_logs` con `meta` que incluye `format` y `kind` (`documentos` | `auditoria` | `pendientes_revision`).
- **Frontend:** `/documentos` — export Excel/PDF genérico (ADMIN); botones **“Pendientes revisión”** (REVISOR); `/admin/auditoria` — export (ADMIN).
- **Backlog:** reporte dedicado de **usuarios** (no implementado).

## Decisiones técnicas

- Generación en servidor; no exponer rutas de plantillas sensibles; límites de filas/tamaño.

## Endpoints (activos)

`GET` con query de filtros → stream de archivo (`Content-Disposition: attachment`).

### Exportar documentos

- `GET /api/v1/reportes/documentos.xlsx`
- `GET /api/v1/reportes/documentos.pdf`

Query alineado a `docs/14-modulo-busqueda.md` (sin `page`/`pageSize`: el reporte trae hasta el tope del servicio).

### Exportar auditoría (bitácora `audit_logs`)

- `GET /api/v1/reportes/auditoria.xlsx`
- `GET /api/v1/reportes/auditoria.pdf`

Query alineado al listado **`GET /api/v1/auditoria`** (`action`, `result`, `actorEmail`, `resourceType`, `resourceId`, `from`, `to`). **Solo ADMIN.** Cada export registra **`REPORT_EXPORTED`** (`kind=auditoria`).

### Exportar pendientes de revisión (solo `EN_REVISION`)

- `GET /api/v1/reportes/pendientes-revision.xlsx`
- `GET /api/v1/reportes/pendientes-revision.pdf`

Sin filtros adicionales: lista documentos en estado **EN_REVISION** visibles para el usuario. **ADMIN** y **REVISOR.** `REPORT_EXPORTED` con `kind=pendientes_revision`.

## Dependencias

- Módulos de dominio correspondientes; auditoría para trazabilidad de exportación.
