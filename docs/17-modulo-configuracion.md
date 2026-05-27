# Módulo — Configuración general

## Objetivo

Parámetros del sistema (plazos, tamaños máximos, listas auxiliares) gestionables según rol administrativo.

## Alcance

Persistencia en BD o fuente controlada; sin secretos en tablas de configuración UI.

## Estado actual

**Implementado parcialmente (MVP orientado a seguridad y respaldos).**

Este repositorio implementa configuración **administrativa** en dos frentes:

- **Configuración de seguridad (ADMIN)**: pantalla **`/admin/configuracion`**.
- **Respaldos y seguridad (ADMIN)**: pantalla **`/admin/respaldos`** (ejecución manual de mysqldump + registro de verificación auditable).

> Distinción clave: la pantalla de configuración de seguridad separa (1) el **estado efectivo** (lo que el backend aplica hoy con `.env`, guards y validaciones) y (2) la **política institucional** persistida como **registro** en BD (ISO 15489), que no necesariamente altera el runtime automáticamente.

## Decisiones técnicas

- Secretos solo en variables de entorno (`18`, `02`).
  - Ejemplos: `JWT_ACCESS_SECRET`, `DATABASE_URL`, SMTP, rutas a `mysqldump`.
- Parámetros “no secretos” sí pueden persistirse como **registros** auditables (ISO 15489), con trazabilidad `updatedBy` y timestamp.

## Pantallas

- Panel de configuración (alcance acordado con director de tesis).

### Pantallas implementadas (ADMIN)

- **`/admin/configuracion`**: “Parámetros de seguridad”.
  - Lee:
    - `GET /api/v1/auth/admin/security-summary` (estado efectivo).
    - `GET /api/v1/auth/admin/security-policy` (política institucional guardada).
  - Guarda:
    - `POST /api/v1/auth/admin/security-policy` (actualiza `security_policy` y audita `SECURITY_POLICY_UPDATED`).

- **`/admin/respaldos`**: “Respaldos de información”.
  - Lee:
    - `GET /api/v1/dashboard/admin/backup-overview` (KPI + historial desde `audit_logs`).
  - Acciones:
    - `POST /api/v1/backup/admin/run-now` (ejecuta mysqldump “como el cron”; puede tardar varios minutos).
    - `POST /api/v1/dashboard/admin/backup-verification` (registra evidencia `BACKUP_VERIFIED` OK/FAIL).

Guía operativa de respaldo/restauración (local/XAMPP): `scripts/README-backups-mysql-xampp.md`.

---

## Qué falta para empezar a desarrollar (backlog accionable)

### 1) Completar configuración general (parámetros NO secretos)

Parámetros recomendados para un SGD institucional:

**Archivos**
- `MAX_UPLOAD_MB` (ej. 10)
- `ALLOWED_MIME_TYPES` (lista blanca)
- `ALLOWED_EXTENSIONS` (lista blanca)

**Sesión y autenticación**
- `JWT_ACCESS_EXPIRES` (ya existe como env)
- `JWT_REFRESH_DAYS` (ya existe como env)
- `PASSWORD_RESET_MINUTES` (ya existe como env o definir)
- Throttling (**implementado:** `ThrottlerModule` + `@Throttle` en `/auth`; ver `18-seguridad-y-hardening.md`). Umbrales “institucionales” parametrizados en BD serían una evolución de este módulo.

**Auditoría**
- `AUDIT_RETENTION_DAYS`
- `AUDIT_EXPORT_ENABLED`

**Documentos (ISO 15489)**
- catálogo de `ESTADOS_DOCUMENTO` (si se formaliza)
- `RETENTION_POLICIES` (si se implementa conservación/retención)

### 2) Modelo de persistencia (estado actual y recomendado)

**Estado actual:** existe tabla `security_policy` como registro institucional (singleton `id="default"`) y se actualiza desde UI con auditoría.

**Evolución recomendada:** crear tabla `system_settings`:
- `key` (string unique)
- `value_json` (json/text)
- `updated_by_id`
- `updated_at`

Reglas:
- No guardar secretos (tokens, passwords, llaves) aquí.
- Cambios deben generar evento en auditoría transversal (`SETTINGS_UPDATED`).

### 3) Endpoints (ADMIN)

**Implementados (seguridad / respaldos):**

- `GET /api/v1/auth/admin/security-summary` (ADMIN)
- `GET /api/v1/auth/admin/security-policy` (ADMIN)
- `POST /api/v1/auth/admin/security-policy` (ADMIN)
- `GET /api/v1/dashboard/admin/backup-overview` (ADMIN)
- `POST /api/v1/dashboard/admin/backup-verification` (ADMIN)
- `POST /api/v1/backup/admin/run-now` (ADMIN)

**Futuro (configuración general):**

- `GET /api/v1/configuracion` (ADMIN) — lista de settings (no secretos)
- `PATCH /api/v1/configuracion` (ADMIN) — actualizar settings permitidos (validación estricta por `key`)

### 4) UI (ADMIN)

Ruta sugerida: `/admin/configuracion`
- Sección Archivos (límite, MIME, extensiones)
- Sección Sesión (expiraciones informativas)
- Sección Auditoría (retención/export)

### 5) Validaciones y seguridad

- Validación server-side estricta por `key` (no aceptar claves arbitrarias).
- Registrar cambios con actor + IP/UA si aplica.
