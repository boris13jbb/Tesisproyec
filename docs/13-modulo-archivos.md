# Módulo — Archivos (almacenamiento)

## Objetivo

Subida, almacenamiento bajo `storage/`, metadatos, versiones y descarga controlada con auditoría.

## Alcance

Validación MIME/tamaño/extensión; nombres internos seguros; sin servir disco sin autorización.

## Estado actual

**Implementado (ETAPA 7).**  
- **BD:** `documento_archivos` + `documento_archivo_eventos` (tamaño, MIME, sha256, trazabilidad).
- **Storage:** guardado físico bajo `storage/documentos/<documentoId>/...` (ruta no expuesta directamente).
- **Versionado:** versión incremental por documento + nombre (`version`), mantiene historial y permite múltiples cargas del “mismo” archivo.
- **API:**
  - `GET /api/v1/documentos/:id/archivos` (JWT)
  - `POST /api/v1/documentos/:id/archivos` (JWT + `ADMIN`, multipart `file`, máx 10MB, lista blanca MIME)
  - `GET /api/v1/documentos/:id/archivos/:archivoId/download` (JWT, descarga controlada)
  - `GET /api/v1/documentos/:id/archivos/:archivoId/eventos` (JWT)
  - `DELETE /api/v1/documentos/:id/archivos/:archivoId` (JWT + `ADMIN`, borrado lógico)
- **Frontend:** en `/documentos/:id` sección **Archivos** para listar, subir (ADMIN) y descargar.

## Decisiones técnicas

- Rutas físicas no expuestas; streaming desde NestJS; registrar cada descarga.

## Endpoints (previstos)

- `POST` upload multipart; `GET` descarga por id con permiso.

## Dependencias

- Documentos, auditoría, seguridad (`18`).
