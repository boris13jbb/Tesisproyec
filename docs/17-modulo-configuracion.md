# Módulo — Configuración general

## Objetivo

Parámetros del sistema (plazos, tamaños máximos, listas auxiliares) gestionables según rol administrativo.

## Alcance

Persistencia en BD o fuente controlada; sin secretos en tablas de configuración UI.

## Estado actual

**No implementado.**

## Decisiones técnicas

- Secretos solo en variables de entorno (`18`, `02`).

## Pantallas

- Panel de configuración (alcance acordado con director de tesis).

---

## Qué falta para empezar a desarrollar (backlog accionable)

### 1) Definir “qué se configura” (parámetros NO secretos)

Parámetros recomendados para un SGD institucional:

**Archivos**
- `MAX_UPLOAD_MB` (ej. 10)
- `ALLOWED_MIME_TYPES` (lista blanca)
- `ALLOWED_EXTENSIONS` (lista blanca)

**Sesión y autenticación**
- `JWT_ACCESS_EXPIRES` (ya existe como env)
- `JWT_REFRESH_DAYS` (ya existe como env)
- `PASSWORD_RESET_MINUTES` (ya existe como env o definir)
- `LOGIN_RATE_LIMIT_*` (pendiente si se implementa throttling)

**Auditoría**
- `AUDIT_RETENTION_DAYS`
- `AUDIT_EXPORT_ENABLED`

**Documentos (ISO 15489)**
- catálogo de `ESTADOS_DOCUMENTO` (si se formaliza)
- `RETENTION_POLICIES` (si se implementa conservación/retención)

### 2) Modelo de persistencia (recomendado)

Crear tabla `system_settings`:
- `key` (string unique)
- `value_json` (json/text)
- `updated_by_id`
- `updated_at`

Reglas:
- No guardar secretos (tokens, passwords, llaves) aquí.
- Cambios deben generar evento en auditoría transversal (`SETTINGS_UPDATED`).

### 3) Endpoints (ADMIN)

- `GET /api/v1/configuracion` (ADMIN) — lista de settings (no secretos)
- `PATCH /api/v1/configuracion` (ADMIN) — actualizar settings permitidos

### 4) UI (ADMIN)

Ruta sugerida: `/admin/configuracion`
- Sección Archivos (límite, MIME, extensiones)
- Sección Sesión (expiraciones informativas)
- Sección Auditoría (retención/export)

### 5) Validaciones y seguridad

- Validación server-side estricta por `key` (no aceptar claves arbitrarias).
- Registrar cambios con actor + IP/UA si aplica.
