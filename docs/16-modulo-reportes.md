# Módulo — Reportes

## Objetivo

Generación de exportaciones **Excel** (ExcelJS) y **PDF** (pdfkit) con filtros y respeto de permisos.

## Alcance

Reportes de documentos, usuarios, auditoría según prioridad del MVP.

## Estado actual

**Implementado (ETAPA 9).** Evidencias de cierre: `docs/38-etapa-9-cierre-y-evidencias.md`.

- **Backend:** exportación de **documentos** a **Excel** (ExcelJS) y **PDF** (pdfkit) en servidor; límite **5000** filas por export (`ReportesService`).
- **Permisos:** endpoints de reportes restringidos a rol **ADMIN** (`ReportesController`).
- **Filtros:** mismos query params que búsqueda/listado (ETAPA 8) para exportar el subconjunto filtrado.
- **Pendiente MVP ampliado:** reportes de **usuarios** y **auditoría** (este fichero los mantiene en alcance declarativo; no hay endpoints aún).

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

Query alineado al listado **`GET /api/v1/auditoria`** (`action`, `result`, `actorEmail`, `resourceType`, `resourceId`, `from`, `to`). Cada export registra **`REPORT_EXPORTED`** en auditoría.

## Dependencias

- Módulos de dominio correspondientes; auditoría para trazabilidad de exportación.
