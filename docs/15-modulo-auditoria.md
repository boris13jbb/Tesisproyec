# Módulo — Auditoría y trazabilidad

## Objetivo

Registrar eventos relevantes (quién, qué, cuándo, recurso) para cumplimiento y defensa de tesis.

## Alcance

Login/logout, CRUD sensibles, descarga de archivos, cambios de estado documental.

## Estado actual

**Parcialmente implementado (MVP+).**

- **Trazabilidad por dominio (implementada):**
  - Documento: tabla `documento_eventos` con eventos `CREADO`/`ACTUALIZADO` y `created_by_id`.
  - Archivo: tabla `documento_archivo_eventos` con eventos `SUBIDO`/`DESCARGADO`/`ELIMINADO` y `created_by_id`.
- **Bitácora transversal (`audit_logs`) — implementada en backend:**
  - Tabla `audit_logs` + `AuditService`; eventos AUTH (login/refresh/logout/reset/throttle), administración/usuarios, documentos/archivos donde se integró.
  - **Pendiente para cierre institucional:** pantalla ADMIN de consulta/exportación; política de **retención** y archivo; integridad firma/checksum si el alcance lo exige.

## Decisiones técnicas

- Servicio de auditoría invocado desde services; no depender solo de logs en consola.
- Mantener la **trazabilidad de negocio** (documento/archivo) separada de la **auditoría de seguridad** (eventos transversales), pero correlacionable por `correlationId` cuando aplique.
- Registrar IP/UA **cuando sea útil** para investigación (sin almacenar datos sensibles innecesarios).

## Tablas relacionadas

- **Implementadas:** `documento_eventos`, `documento_archivo_eventos`, **`audit_logs`** (`AuditLog` en Prisma).

## Dependencias

- Auth (usuario actual), todos los módulos que generen eventos.

---

## Diseño — `audit_logs` (bitácora central)

### Objetivo

Tener una bitácora transversal para eventos de **seguridad** y **administración**:
- accesos,
- intentos fallidos,
- cambios de usuarios/roles/permisos,
- denegaciones de autorización (403),
- exportaciones,
- operaciones críticas (subida/borrado lógico, reset password),
- y correlación para reconstrucción de incidentes.

### Tabla sugerida (mínimo viable)

`audit_logs`
- `id` (uuid)
- `created_at` (timestamp)
- **Actor**
  - `actor_user_id` (nullable para eventos anónimos)
  - `actor_email` (opcional, denormalizado para reporte)
- **Acción**
  - `action` (string estable: `AUTH_LOGIN_OK`, `USER_CREATED`, etc.)
  - `result` (`OK`/`FAIL`)
- **Recurso**
  - `resource_type` (ej. `User`, `Documento`, `DocumentoArchivo`)
  - `resource_id` (uuid/string)
- **Contexto**
  - `ip` (varchar)
  - `user_agent` (varchar)
  - `correlation_id` (string)
  - `meta_json` (json/text) sin PII/secretos

Índices sugeridos:
- (`created_at`), (`action`, `created_at`), (`actor_user_id`, `created_at`), (`resource_type`, `resource_id`)

### Eventos mínimos recomendados (MVP+)

**Autenticación**
- `AUTH_LOGIN_OK`, `AUTH_LOGIN_FAIL`
- `AUTH_REFRESH_OK`, `AUTH_REFRESH_FAIL`
- `AUTH_LOGOUT`
- `AUTH_PASSWORD_RESET_REQUEST`, `AUTH_PASSWORD_RESET_CONFIRM_OK`, `AUTH_PASSWORD_RESET_CONFIRM_FAIL`

**Autorización**
- `AUTHZ_DENIED` (403) con `requiredRole/requiredPermission` en `meta_json` (sin exceso de datos)

**Usuarios**
- `USER_CREATED`, `USER_UPDATED`, `USER_ACTIVATED`, `USER_DEACTIVATED`
- `USER_ROLES_CHANGED`
- `USER_PASSWORD_RESET` (admin)

**Documentos y archivos (transversal)**
- `DOC_CREATED`, `DOC_UPDATED`, `DOC_STATE_CHANGED`
- `DOC_FILE_UPLOADED`, `DOC_FILE_DOWNLOADED`, `DOC_FILE_DELETED`

**Reportes**
- `REPORT_EXPORTED` (tipo, filtro resumido, tamaño)

### Integridad y retención

- Retención mínima recomendada (tesis/MVP): 90–180 días (documentar decisión).
- Para instituciones: retención por política, exportación y respaldo de logs.
- Integridad: hashes encadenados o firma (futuro); como mínimo, **acceso restringido** y backups.

---

## Pendientes para empezar a desarrollar (backlog accionable)

1) Crear modelo Prisma `AuditLog` + migración `audit_logs`.
2) Crear `AuditService` con método `log(action, resource, result, meta)`.
3) Integrar `AuditService` en:
   - Auth (login/logout/refresh/reset),
   - Usuarios (create/update/disable/reset),
   - Reportes (export),
   - Guards (403) cuando aplique.
4) Endpoints (ADMIN/AUDITOR):
   - `GET /api/v1/auditoria` con filtros por actor/acción/fecha/recurso
   - `GET /api/v1/auditoria/export` (CSV/Excel) si se requiere evidencia.
