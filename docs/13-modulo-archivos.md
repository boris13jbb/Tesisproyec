# Módulo — Archivos (almacenamiento)

## Objetivo

Subida, almacenamiento bajo `storage/`, metadatos, versiones y descarga controlada con auditoría.

## Alcance

Validación MIME/tamaño/extensión; nombres internos seguros; sin servir disco sin autorización.

## Estado actual

**No implementado.** Carpeta `storage/` creada en raíz con `.gitkeep`.

## Decisiones técnicas

- Rutas físicas no expuestas; streaming desde NestJS; registrar cada descarga.

## Endpoints (previstos)

- `POST` upload multipart; `GET` descarga por id con permiso.

## Dependencias

- Documentos, auditoría, seguridad (`18`).
