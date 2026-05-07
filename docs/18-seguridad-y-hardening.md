# Seguridad y hardening — SGD-GADPR-LM

## Objetivo

Definir la línea base de **controles técnicos** alineados como referencia con ISO/IEC 27001:2022 (gestión de seguridad de la información), ISO 15489 (gestión documental) y OWASP ASVS, **sin** pretender certificación formal en el alcance de tesis.

## Alcance

Autenticación, autorización, datos, archivos, comunicaciones en desarrollo local y pruebas; exposición temporal con ngrok.

## Estado actual

**Implementación:** aplicada en el MVP. Este documento se mantiene como **referencia** y registro de controles implementados.

**Cierre roadmap:** evidencias formales de hardening dentro del MVP en **`docs/39-etapa-10-cierre-y-evidencias.md`** (**ETAPA 10**).

## Decisiones técnicas

| Área | Decisión |
|------|----------|
| Autenticación | JWT access token (vida corta); refresh en **cookie HttpOnly** |
| Contraseñas | **Argon2id** (costes acordados en código) |
| API | Validación servidor (class-validator / DTOs); no confiar solo en el cliente |
| Errores | Mensajes genéricos al cliente; no filtrar stack ni detalles internos |
| Archivos | Lista blanca MIME/extensión, tamaño máximo, nombres seguros; servir vía API con permiso |
| Auditoría | Eventos críticos (login, cambios sensibles, descarga) en modelo dedicado |
| Headers | **Helmet** para headers de seguridad; deshabilitar `x-powered-by` |
| HTTPS local | Opcional; **ngrok** aporta HTTPS en demos temporales |

## Estructura prevista (código)

- Backend: `AuthModule`, guards JWT y de permisos, `Audit` o equivalente.
- Frontend: rutas protegidas, no almacenar refresh en `localStorage`.

## Flujos

1. Login → access + Set-Cookie refresh → requests con `Authorization: Bearer`.
2. Refresh → nuevo access; rotación de refresh según diseño.
3. Logout → invalidar refresh en servidor (lista/bloqueo) cuando exista persistencia.

## Controles implementados (resumen)

- **Headers seguridad**: Helmet en `backend/src/main.ts`.
- **Rate limiting**: `ThrottlerModule` global (`app.module.ts`); rutas **`/auth`** con `@Throttle` más estricto (`auth.controller.ts`); excesos registrados como `AUTH_RATE_LIMITED` (`throttler-audit.filter.ts`).
- **Lockout por cuenta**: contador e intervalo en `users` (`AUTH_LOCKOUT_MAX_ATTEMPTS`, `AUTH_LOCKOUT_MINUTES`); complementa el throttling por IP.
- **403 auditado**: intentos contra endpoints con rol insuficiente generan **`AUTHZ_FORBIDDEN`** (`forbidden-audit.filter.ts`).
- **Cookies refresh**: `HttpOnly`, `secure` en producción, `sameSite=lax`, `path=/`; `clearCookie` con mismos flags.
- **Validación API**: `ValidationPipe` global (`whitelist`, `forbidNonWhitelisted`, `transform`).
- **RBAC por rol**: `RolesGuard` + `@Roles(...)`; mutaciones y reportes típicamente **ADMIN**; excepción documentada: export **pendientes de revisión** permite **ADMIN** o **REVISOR** (`reportes.controller.ts`).
- **Archivos**: lista blanca MIME, tamaño máximo, nombres seguros, descarga controlada vía API.
- **Trazabilidad**:
  - `documento_eventos` (CREADO/ACTUALIZADO)
  - `documento_archivo_eventos` (SUBIDO/DESCARGADO/ELIMINADO)

## Controles OWASP ASVS (resumen)

- Validación y sanitización de entradas.
- Sesiones y tokens con expiración.
- Protección de rutas y datos por rol.
- Subida de archivos acotada y trazada.

## ngrok (temporal)

Detalle operativo, CORS y cookies: `23-entorno-local-xampp-ngrok.md`. Cada sesión debe registrarse en `22-changelog-tecnico.md`.

## cloudflared tunnel (temporal)

Uso alternativo para exponer el **frontend Vite (5173)** de forma temporal. Reglas mínimas:

- Mantener el túnel activo el **menor tiempo posible**.
- Usar **datos de prueba** (evitar PII / información real).
- Si el flujo de auth depende de cookies/JWT, revisar impacto en **CORS** y flags de cookies (`HttpOnly`, `SameSite`, `Secure`).
- Registrar cada sesión en `22-changelog-tecnico.md`.

Manual operativo: `26-cloudflared-tunnel.md`.

## Problemas detectados

- Seguimiento activo en `20-problemas-detectados.md` cuando existan hallazgos verificados.

## Riesgos pendientes

- Exponer API por ngrok sin restricción de IP o credenciales débiles → mitigar con tokens fuertes, tiempo de sesión corto y cierre del túnel al terminar.

## Mejoras futuras

WAF, MFA institucional, HSM, pentest formal — fuera del MVP de tesis.
