# Módulo — Configuración general

## Objetivo

Parámetros del sistema (plazos, tamaños máximos, listas auxiliares) gestionables según rol administrativo, y **transparencia** de controles de seguridad verificables.

## Alcance

Persistencia en BD o fuente controlada; sin secretos en tablas de configuración UI.

## Estado actual

**Implementado parcialmente (MVP orientado a seguridad y respaldos).**

Este repositorio implementa configuración **administrativa** en dos frentes:

- **Configuración de seguridad (ADMIN)**: pantalla **`/admin/configuracion`**.
- **Respaldos y seguridad (ADMIN)**: pantalla **`/admin/respaldos`** (ejecución manual de mysqldump + registro de verificación auditable).

> **Principio de UI (2026-05-27):** ver [45-principio-ui-controles-reales.md](./45-principio-ui-controles-reales.md). La pantalla de seguridad **no** ofrece campos editables que no cambien el runtime; muestra lo que el servidor aplica y permite **Registrar revisión** (notas + instantánea en auditoría).

## Decisiones técnicas

- Secretos solo en variables de entorno (`18`, `02`).
  - Ejemplos: `JWT_ACCESS_SECRET`, `DATABASE_URL`, SMTP, rutas a `mysqldump`.
- Parámetros “no secretos” pueden persistirse como **registros** auditables (ISO 15489), con trazabilidad `updatedBy` y timestamp.

## Pantallas

### Pantalla `/admin/configuracion` — Parámetros de seguridad

**Columna izquierda — Autenticación y acceso (solo lectura)**

Tarjetas con valores **en uso hoy**, leídos de `GET /api/v1/auth/admin/security-summary`:

- Longitud mínima de contraseña (aplicada al crear usuarios y restablecer clave).
- Bloqueo por contraseña incorrecta (intentos y minutos).
- Duración de sesión y días de “mantener sesión” en el equipo.
- Límite de intentos en la pantalla de ingreso (throttle por conexión).

Aviso explícito: bloqueo y sesión se ajustan en **configuración del servidor** (`.env`), no desde esta pantalla.

**Registro de revisión institucional**

- Campo de **notas** + botón **Registrar revisión**.
- `POST /api/v1/auth/admin/security-policy` guarda notas y una instantánea de los valores efectivos; audita **`SECURITY_POLICY_UPDATED`**.
- **No** sustituye cambiar `.env`. Los controles operativos de **historial de contraseñas** y **MFA para administradores** se aplican según el registro `security_policy` y se muestran como evidencia/estado en UI.

**Columna derecha — Protecciones del sistema**

Lista de controles activos en el despliegue (validación, sesión, navegador, archivos). Badge **Activa** / **No activo**. Detalle técnico (ASVS, JWT, etc.) solo en tooltip ℹ️.

### Pantalla `/admin/respaldos` — Respaldos y seguridad

| Acción | ¿Ejecuta en servidor? |
|--------|------------------------|
| Ejecutar mysqldump ahora | Sí (`POST /backup/admin/run-now`) |
| Registrar verificación | Sí (auditoría) |
| Ver procedimiento de restauración | No (diálogo orientativo) |
| Cómo probar un respaldo | No (diálogo orientativo) |

Textos de usuario sin códigos `BACKUP_VERIFIED`; el código de acción permanece en auditoría para soporte.

Guía operativa: `scripts/README-backups-mysql-xampp.md`.

---

## Endpoints (ADMIN)

**Seguridad / respaldos (implementados):**

| Método | Ruta | Uso |
|--------|------|-----|
| GET | `/api/v1/auth/admin/security-summary` | Controles efectivos (UI lectura) |
| GET | `/api/v1/auth/admin/security-policy` | Último registro + notas |
| POST | `/api/v1/auth/admin/security-policy` | Registrar revisión |
| GET | `/api/v1/dashboard/admin/backup-overview` | KPI e historial verificaciones |
| POST | `/api/v1/dashboard/admin/backup-verification` | Registrar verificación manual |
| POST | `/api/v1/backup/admin/run-now` | Volcado MySQL manual |

**Futuro (configuración general):**

- `GET /api/v1/configuracion` — settings no secretos (tabla `system_settings` propuesta).
- `PATCH /api/v1/configuracion` — actualización validada por clave.

---

## Qué falta (backlog)

### Configuración general (`system_settings`)

Parámetros recomendados: `MAX_UPLOAD_MB`, `ALLOWED_MIME_TYPES`, `AUDIT_RETENTION_DAYS`, políticas de retención documental en catálogo, etc.

### Controles de seguridad avanzados (código + UI)

- Ajustes finos de experiencia (p. ej. pantallas de administración/recuperación de TOTP y flujos de re-enrolamiento).
- Aplicar valores de `security_policy` al runtime sin depender solo de `.env` (diseño explícito requerido).

---

## Validaciones y seguridad

- Validación server-side estricta en endpoints existentes.
- Registrar cambios con actor + IP/UA en auditoría.
- Fail secure: no exponer secretos ni stack traces en UI.
