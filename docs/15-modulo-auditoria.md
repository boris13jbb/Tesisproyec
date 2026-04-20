# Módulo — Auditoría y trazabilidad

## Objetivo

Registrar eventos relevantes (quién, qué, cuándo, recurso) para cumplimiento y defensa de tesis.

## Alcance

Login/logout, CRUD sensibles, descarga de archivos, cambios de estado documental.

## Estado actual

**No implementado.**

## Decisiones técnicas

- Servicio de auditoría invocado desde services; no depender solo de logs en consola.

## Tablas relacionadas

- Tabla `AuditLog` o equivalente (diseño pendiente).

## Dependencias

- Auth (usuario actual), todos los módulos que generen eventos.
