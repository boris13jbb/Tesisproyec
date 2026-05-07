# Módulo — Roles y permisos (RBAC)

## Objetivo

Control de acceso basado en **roles** y permisos granulares sobre recursos y acciones.

## Alcance

Definición de roles, matriz permiso ↔ rol, enforcement en backend y UI.

## Estado actual

### Completado (MVP institucional)

- **Roles** (`@Roles`, `RolesGuard`): sin cambios; menú/UI sigue usando códigos de rol en JWT (`ADMIN`, `USUARIO`, `REVISOR`, `AUDITOR`, `CONSULTA`).
- **Permisos en BD**: `permissions` + `role_permissions` poblados de forma **idempotente** al ejecutar `npx prisma db seed` (desde `backend/`). **`ADMIN`** recibe todos los códigos; los demás roles reciben un subconjunto alineado con el comportamiento previo (`DOC_READ`, revisión, reportes pendientes para `REVISOR`, etc.).
- **Enforcement técnico**: `@Permissions(...)` + `PermissionsGuard` (AND de códigos requeridos) en rutas de documentos, catálogo (escritura), usuarios, reportes, auditoría, dashboard (admin/backups KPI), backup y política de seguridad. Lista canónica: `backend/src/auth/permission-codes.ts`.
- **API administración**: `GET /api/v1/rbac/permissions`, `GET /api/v1/rbac/roles`, `GET /api/v1/rbac/roles/:codigo/permissions`, `PUT .../permissions` (cuerpo `{ "permissionCodes": ["DOC_READ", ...] }`; reemplazo total), `GET /api/v1/rbac/me/permissions` (opcional UX). Auditoría ante cambios: **`ROLE_PERMISSIONS_UPDATED`**.
- **UI**: pantalla **Administración → Usuarios y roles** → sección **Matriz rol ↔ permiso (base de datos)** (casillas por código + guardar).

**Prerrequisito operativo:** si la BD ya existía **antes** del seed RBAC y no se ejecutó seed (o sólo usuarios sin permisos en `role_permissions`), los usuarios con rol pero sin filas efectivas pueden recibir **`403`** en rutas con `@Permissions` hasta que **`npx prisma db seed`** rellene la matriz o un `ADMIN` ajuste `PUT .../permissions`.

### Pendiente / evolución

- **`CATALOGS_READ`** del §2 sigue como opcional (lecturas públicas JWT de catálogos no llevan `@Permissions`).
- **`DOC_CHANGE_STATE`** y roles institutionales finos (**ADMIN_SEGURIDAD**, etc.) del §3: no implementados; los códigos usados están en `permission-codes.ts`.

**Aclaración “permisos por documento” (registro/concreto):** sigue en §4 / módulo `12`; no es sólo completar casillas RBAC globales por rol.

## Decisiones técnicas

- Guards en NestJS; decoradores o metadatos por ruta; sincronización de permisos en frontend solo para UX (fuente de verdad en API).
- Evolución recomendada: **RBAC + permisos por acción** (ABAC opcional por dependencia/confidencialidad en documentos).

## Estructura prevista / implementada

- Tablas: `roles`, `permissions`, `user_roles`, `role_permissions`; seed idempotente en `backend/prisma/seed.ts`.

## Endpoints RBAC (`/api/v1/rbac/...`)

- Ver § “Estado actual” (implementados).

## Pantallas

- **Usuarios y roles** · matriz **rol ↔ permiso (BD)**.

## Dependencias

- Auth, usuarios.

---

## Pendientes para empezar a desarrollar (backlog accionable)

### 1) Permisos granulares — **implementado base** ✅

Cubiertos: `@Permissions`, `PermissionsGuard`, seed, rutas RBAC administrativas y auditoría `ROLE_PERMISSIONS_UPDATED`. Las **403** por guard siguen usando el filtro `ForbiddenAuditFilter` (**`AUTHZ_FORBIDDEN`**) ante `ForbiddenException`.

Seguimiento sugerido: tests e2e automáticos; matriz HTML “referencia” vs permisos reales (evitar deriva).

### 2) Matriz acción → permiso (referencia histórica; códigos reales en `permission-codes.ts`)

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
