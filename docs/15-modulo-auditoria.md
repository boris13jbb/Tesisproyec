# Módulo — Auditoría y trazabilidad

## Objetivo

Registrar eventos relevantes (quién, qué, cuándo, recurso) para cumplimiento y defensa de tesis.

## Alcance

Login/logout, CRUD sensibles, descarga de archivos, cambios de estado documental.

## Estado actual

**Parcialmente implementado (MVP).**

- **Trazabilidad por dominio (implementada):**
  - Documento: tabla `documento_eventos` con eventos `CREADO`/`ACTUALIZADO` y `created_by_id`.
  - Archivo: tabla `documento_archivo_eventos` con eventos `SUBIDO`/`DESCARGADO`/`ELIMINADO` y `created_by_id`.
- **Auditoría de seguridad institucional (pendiente):**
  - Bitácora central unificada (`audit_logs`) para eventos transversales (auth, administración, cambios de permisos/roles, exportaciones, errores de autorización, intentos fallidos, etc.).
  - Política de retención/archivo de logs y mecanismos de integridad.

## Decisiones técnicas

- Servicio de auditoría invocado desde services; no depender solo de logs en consola.
- Mantener la **trazabilidad de negocio** (documento/archivo) separada de la **auditoría de seguridad** (eventos transversales), pero correlacionable por `correlationId` cuando aplique.

## Tablas relacionadas

- **Implementadas:** `documento_eventos`, `documento_archivo_eventos`.
- **Pendiente (diseño objetivo):** `audit_logs` (o `AuditLog`) para auditoría transversal.

## Dependencias

- Auth (usuario actual), todos los módulos que generen eventos.
