# Módulo — Roles y permisos (RBAC)

## Objetivo

Control de acceso basado en **roles** y permisos granulares sobre recursos y acciones.

## Alcance

Definición de roles, matriz permiso ↔ rol, enforcement en backend y UI.

## Estado actual

**Completado (roles).** En backend: decorador `@Roles(...)` y `RolesGuard` sobre rutas (p. ej. `GET /api/v1/admin/ping` restringido a rol `ADMIN`; mutaciones de catálogos y documentos restringidas a `ADMIN`). En frontend: rutas y menú condicionados por rol (p. ej. catálogos solo `ADMIN`).

**Ejemplos de granularidad por ruta (sin `PermissionsGuard`):** resolución de revisión documental (`POST /api/v1/documentos/:id/resolver-revision`) permite **`ADMIN`** o **`REVISOR`**; export **pendientes de revisión** (`GET /api/v1/reportes/pendientes-revision.{xlsx,pdf}`) idem — ver `12` y `16`.

**Pendiente (permiso granular).** La parte de permisos granulares en BD (`Permission`, `role_permissions`) queda como base de datos preparada, pero aún no se usa como fuente de autorización en guards.

## Decisiones técnicas

- Guards en NestJS; decoradores o metadatos por ruta; sincronización de permisos en frontend solo para UX (fuente de verdad en API).
- Evolución recomendada: **RBAC + permisos por acción** (ABAC opcional por dependencia/confidencialidad en documentos).

## Estructura prevista

- Tablas: `Role`, `Permission`, tablas de unión; seeds iniciales.

## Endpoints (previstos)

- Gestión de roles/permisos (admin); validación implícita en todos los módulos.

## Pantallas

- Administración de roles (si el alcance lo incluye).

## Dependencias

- Auth, usuarios.

---

## Pendientes para empezar a desarrollar (backlog accionable)

### 1) Permisos granulares en backend (fuente de verdad)

**Objetivo:** que el backend autorice por **permiso** (no solo por rol), usando `Permission` y `role_permissions`.

- **Entregables**
  - Decorador `@Permissions('USERS_CREATE', 'USERS_UPDATE', ...)`
  - Guard `PermissionsGuard` que:
    - obtenga permisos del usuario (por roles → permisos),
    - compare contra permisos requeridos,
    - niegue por defecto (fail secure).
  - Seeds de permisos y asignación a roles.

- **Evidencia**
  - Pruebas negativas: usuario sin permiso recibe `403`.
  - Registro en auditoría transversal: **`AUTHZ_FORBIDDEN`** ante HTTP **403** (usuario autenticado sin rol suficiente).

### 2) Matriz acción → permiso (mínimo recomendado)

> Nota: los códigos son sugeridos; se pueden ajustar, pero deben ser **estables**.

#### Usuarios
- `USERS_READ`, `USERS_CREATE`, `USERS_UPDATE`, `USERS_DISABLE`, `USERS_RESET_PASSWORD`

#### Catálogos
- `CATALOGS_READ`
- `DEPENDENCIAS_WRITE`, `CARGOS_WRITE`, `TIPOS_DOCUMENTALES_WRITE`, `SERIES_WRITE`, `SUBSERIES_WRITE`

#### Documentos
- `DOC_READ`, `DOC_CREATE`, `DOC_UPDATE`, `DOC_CHANGE_STATE`

#### Archivos
- `DOC_FILES_READ`, `DOC_FILES_UPLOAD`, `DOC_FILES_DOWNLOAD`, `DOC_FILES_DELETE`

#### Reportes
- `REPORTS_EXPORT`

#### Auditoría
- `AUDIT_READ`, `AUDIT_EXPORT`

### 3) Roles institucionales mínimos (propuesta)

- **ADMIN_SEGURIDAD**: gestiona usuarios/roles/permisos, ve auditoría y seguridad.
- **ADMIN_CATALOGOS**: gestiona catálogos.
- **OPERADOR**: registra/actualiza documentos (según política) y sube archivos.
- **REVISOR**: revisa y cambia estados (aprobación).
- **AUDITOR**: consulta auditoría/reportes, sin modificar registros.
- **CONSULTA**: solo lectura/descarga según autorización.

### 4) Integración con control por documento (futuro inmediato)

Para el requisito “control de acceso por documento”:
- añadir políticas por **dependencia** y **confidencialidad** en documentos (ver módulo `12`),
- y reforzar con permisos + ABAC (propiedad/área).
