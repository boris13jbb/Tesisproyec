# Módulo — Auditoría y trazabilidad

## Objetivo

Registrar eventos relevantes (quién, qué, cuándo, recurso) para cumplimiento y defensa de tesis.

## Alcance

Login/logout, CRUD sensibles, descarga de archivos, cambios de estado documental.

## Estado actual

**Implementado (backend + UI `/admin/auditoria` + exports Excel/PDF vía reportes).** Pendiente institucional: **política de retención** de `audit_logs`, firma/checksum opcional y cobertura ampliada de eventos si el archivo lo exige.

- **Trazabilidad por dominio (implementada):**
  - Documento: tabla `documento_eventos` con eventos `CREADO`/`ACTUALIZADO` y `created_by_id`.
  - Archivo: tabla `documento_archivo_eventos` con eventos `SUBIDO`/`DESCARGADO`/`ELIMINADO` y `created_by_id`.
- **Bitácora transversal (`audit_logs`):**
  - Tabla `audit_logs` + `AuditService`; eventos AUTH (login/refresh/logout/reset/rate‑limit), **`AUTHZ_FORBIDDEN`** ante respuestas **403** autenticadas (`forbidden-audit.filter.ts`), administración/usuarios, documentos/archivos donde se integró; flujo documental **`DOC_SUBMITTED_FOR_REVIEW`** / **`DOC_REVIEW_RESOLVED`** (R‑28).
  - **Consulta ADMIN (API):** `GET /api/v1/auditoria` con filtros y paginación (`auditoria.controller.ts`). Filtros: `action` (igualdad exacta al código), `actorUserId` (UUID del actor, prioridad sobre `actorEmail`), fechas `from`/`to`, etc. La respuesta puede incluir **`resourceCodigo`**: código del expediente resuelto desde `documentos.codigo` cuando el evento apunta a `resourceType=Documento` o el `meta_json` trae `documentoId` (p. ej. eventos de archivo). Misma lógica en exportaciones de reportes. Evidencia de hardening MVP: **`docs/39-etapa-10-cierre-y-evidencias.md`**.
  - **UI ADMIN:** página **`/admin/auditoria`** (listado paginado + export Excel/PDF vía `GET /api/v1/reportes/auditoria.{xlsx,pdf}`; columnas de export incluyen código de documento cuando exista).
  - **Pendiente institucional:** política de **retención** y archivo; integridad firma/checksum si el alcance lo exige.

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
- **`AUTHZ_FORBIDDEN`** — HTTP **403** con JWT válido (`meta_json`: método y ruta, sin exponer internals)

**Usuarios**
- `USER_CREATED`, `USER_UPDATED`, `USER_ACTIVATED`, `USER_DEACTIVATED`
- `USER_ROLES_CHANGED`
- `USER_PASSWORD_RESET` (admin)

**Documentos y archivos (transversal)**
- `DOC_CREATED`, `DOC_UPDATED`
- **`DOC_STATE_CHANGED`** — transición válida entre estados del documento (`meta_json`: `from`, `to`)
- **`DOC_SUBMITTED_FOR_REVIEW`** — envío a revisión (`REGISTRADO` → `EN_REVISION`)
- **`DOC_REVIEW_RESOLVED`** — decisión de revisor (`EN_REVISION` → `APROBADO`/`RECHAZADO`; `meta_json` incluye `decision`)
- `DOC_FILE_UPLOADED`, `DOC_FILE_DOWNLOADED`, `DOC_FILE_DELETED`

**Reportes**
- `REPORT_EXPORTED` (tipo, filtro resumido, tamaño)

**Cliente (RUM / rendimiento)**
- **`CLIENT_WEB_VITAL_LCP`** — LCP del panel principal informado por el navegador (`POST /api/v1/client-perf/web-vitals`). `meta_json` incluye `valueMs`, `rating`, `pathname`, `navigationType`, `metricId` (sin PII ni elementos DOM).

**Respaldos (registro manual en aplicación)**
- **`BACKUP_VERIFIED`** — un `ADMIN` registra que ejecutó y validó el respaldo institucional (MySQL/storage). Se expone en **`GET /api/v1/dashboard/summary`** (`lastSignals.lastBackupVerifiedAt`) y se crea con **`POST /api/v1/dashboard/admin/backup-verification`**.

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
