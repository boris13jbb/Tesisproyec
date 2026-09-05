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

- **Headers seguridad**: Helmet en bootstrap (`http-bootstrap.util.ts`); HSTS **solo** `NODE_ENV=production` (dev/test off; efectivo con HTTPS en proxy); `x-powered-by` deshabilitado; nosniff; `X-Frame-Options: SAMEORIGIN`.
- **CORS:** allowlist exacta `CORS_ORIGIN` + `credentials` (sin wildcard). Sin Origin: permitido. `Origin: null`: denegado.
- **Cookies refresh (local):** `sgd_refresh` HttpOnly, `SameSite=lax`, `path=/`, **sin `Domain`** (host-only). En desarrollo **no mezclar** `http://localhost:5173` y `http://127.0.0.1:5173` en la misma sesión: son hosts distintos y `POST /auth/session/restore` devolverá `restored:false` si la cookie no viaja. Canónico smoke/QA: `http://127.0.0.1:5173`. Allowlist local tipica: ambos orígenes en `CORS_ORIGIN` (para API directa); el SPA debe usar **un** host por sesión. Proxy Vite: `/api` → `http://127.0.0.1:3000` (solo servidor Vite; el browser usa `/api` relativo).
- **Errores no-HTTP:** `SafeExceptionFilter` (sin stack/SQL/credenciales). HttpException conserva status.
- **Booleanos DTO:** `ToSafeBoolean` (`"false"` → false). `enableImplicitConversion` permanece **true** para números de query.
- Matriz operativa: `docs/MATRIZ_HARDENING_OPERATIVO_CONFIGURACION.md`.
- **Dependencias:** runtime prod HIGH **0** (Nest 11.2.3 / multer 2.2.0 / nodemailer 10 / overrides acotados; frontend axios 1.20 + react-router 7.18). Residual moderate exceljs/uuid y xmldom. Matriz: `docs/MATRIZ_DEPENDENCY_HARDENING.md`. Tooling/dev HIGH **0** (Vite 8.0.16 + overrides por major). Matriz: `docs/MATRIZ_TOOLING_DEPENDENCY_HARDENING.md`. Node: backend/runtime **≥20**; **build frontend** con Vite 8.0.16 exige **`^20.19.0` o `>=22.12.0`**. No afirmar “0 vulnerabilidades”.
- **QA institucional end-to-end (2026-09-05):** acceptance + security regression sobre `baeb4a3` (61/404/0; HIGH 0). Smokes LIVE: ADMIN / USUARIO / SUPERADMIN PASS; DOC_UNLOCK negativo y positivo LIVE; host mix `localhost`/`127.0.0.1` documentado (cookie host-only; Auth sin cambios). Matriz: `docs/MATRIZ_QA_INSTITUCIONAL_END_TO_END.md`. **APTO PARA CIERRE TÉCNICO FINAL.** No afirma certificación ni “0 vulnerabilidades”.
- **Rate limiting**: `ThrottlerModule` global (`app.module.ts`); rutas **`/auth`** con `@Throttle` más estricto (`auth.controller.ts`); excesos registrados como `AUTH_RATE_LIMITED` (`throttler-audit.filter.ts`).
- **Lockout por cuenta**: contador e intervalo en `users` (`AUTH_LOCKOUT_MAX_ATTEMPTS`, `AUTH_LOCKOUT_MINUTES`); complementa el throttling por IP.
- **403 auditado**: intentos contra endpoints con rol insuficiente generan **`AUTHZ_FORBIDDEN`** (`forbidden-audit.filter.ts`).
- **Cookies refresh**: `HttpOnly`, `secure` en producción, `sameSite=lax`, `path=/`; `clearCookie` con mismos flags.
- **Validación API**: `ValidationPipe` global (`whitelist`, `forbidNonWhitelisted`, `transform`, `enableImplicitConversion: true`).
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

## Directorio `backups/automated`

- Los volcados **MySQL** (`.sql`) y **ZIP opcional de `storage/`** pueden generarse desde el proceso Nest (`BACKUP_*` en `backend/.env`).
- **Contienen datos completos:** aplicar controles ISO 27001 (mínimo privilegio en NTFS/Linux, sin exposición web, sin versionar en git — ver `.gitignore` y `backups/automated/README.md`).
- La **restauración** no se ejecuta desde la aplicación web; debe ser procedimiento institucional acotado.
- Matriz de controles: `docs/MATRIZ_SEGURIDAD_BACKUPS_RECUPERACION.md`. `BACKUP_VERIFIED` del job no es integridad criptográfica (exit 0 + tamaño > 0).

## Notificaciones / SLA / SMTP

- Destinatarios y `From` se resuelven en servidor (BD / env). No hay envío manual ni destinatario desde el cliente.
- Matriz: `docs/MATRIZ_SEGURIDAD_NOTIFICACIONES_SLA_EMAIL.md`. `NOTIFICATION_DISPATCHED` es intento de despacho, no confirmación de lectura.

## ngrok (temporal)

Detalle operativo, CORS y cookies: `23-entorno-local-xampp-ngrok.md`. Cada sesión debe registrarse en `22-changelog-tecnico.md`.

- **Sesión activa (2026-05-07)**: frontend Vite en `:5175` expuesto por ngrok (ver entrada en `22-changelog-tecnico.md`).

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
