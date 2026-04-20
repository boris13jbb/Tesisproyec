# Módulo — Reportes

## Objetivo

Generación de exportaciones **Excel** (ExcelJS) y **PDF** (pdfkit) con filtros y respeto de permisos.

## Alcance

Reportes de documentos, usuarios, auditoría según prioridad del MVP.

## Estado actual

**No implementado.** Dependencias npm pendientes de añadir en backend.

## Decisiones técnicas

- Generación en servidor; no exponer rutas de plantillas sensibles; límites de filas/tamaño.

## Endpoints (previstos)

- `GET` con query de filtros → stream de archivo.

## Dependencias

- Módulos de dominio correspondientes; auditoría para trazabilidad de exportación.
