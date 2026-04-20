# Módulo — Roles y permisos (RBAC)

## Objetivo

Control de acceso basado en **roles** y permisos granulares sobre recursos y acciones.

## Alcance

Definición de roles, matriz permiso ↔ rol, enforcement en backend y UI.

## Estado actual

**Parcial (prototipo).** En backend: decorador `@Roles(...)` y `RolesGuard` sobre rutas (p. ej. `GET /api/v1/admin/ping` restringido a rol `ADMIN`). Permisos granulares en BD (`Permission`, `role_permissions`) aún sin comprobar en guards; la UI no muestra aún matriz de permisos.

## Decisiones técnicas

- Guards en NestJS; decoradores o metadatos por ruta; sincronización de permisos en frontend solo para UX (fuente de verdad en API).

## Estructura prevista

- Tablas: `Role`, `Permission`, tablas de unión; seeds iniciales.

## Endpoints (previstos)

- Gestión de roles/permisos (admin); validación implícita en todos los módulos.

## Pantallas

- Administración de roles (si el alcance lo incluye).

## Dependencias

- Auth, usuarios.
