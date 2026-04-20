# Módulo — Reportes

## Objetivo

Generación de exportaciones **Excel** (ExcelJS) y **PDF** (pdfkit) con filtros y respeto de permisos.

## Alcance

Reportes de documentos, usuarios, auditoría según prioridad del MVP.

## Estado actual

**Implementado (ETAPA 9).**  
- **Backend:** exportación de documentos a **Excel** (ExcelJS) y **PDF** (pdfkit) en servidor.
- **Permisos:** endpoints de reportes restringidos a rol **ADMIN**.
- **Filtros:** reutiliza los filtros de búsqueda de documentos (ETAPA 8) para exportar solo lo que se consulta.

## Decisiones técnicas

- Generación en servidor; no exponer rutas de plantillas sensibles; límites de filas/tamaño.

## Endpoints (previstos)

- `GET` con query de filtros → stream de archivo.

### Exportar documentos

- `GET /api/v1/reportes/documentos.xlsx`
- `GET /api/v1/reportes/documentos.pdf`

## Dependencias

- Módulos de dominio correspondientes; auditoría para trazabilidad de exportación.
