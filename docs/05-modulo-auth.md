# Módulo — Autenticación y sesión

## Objetivo

Gestionar identidad del usuario, emisión de tokens y cierre de sesión de forma segura.

## Alcance

Login, logout, refresh, expiración; **recuperación de credenciales (olvidé mi contraseña)**; identificación del usuario actual (`/me`); integración con usuarios/roles y lineamientos de auditoría.

## Estado actual

**Implementado (prototipo).**

- **Backend**:
  - JWT de acceso (Bearer) + refresh opaco en cookie HttpOnly (hash SHA-256 en tabla `refresh_tokens`).
  - **Rotación de refresh (ASVS V3)**: cada `POST /auth/refresh` invalida el refresh usado y emite uno nuevo (misma `expires_at` en BD que el token anterior); la cookie HttpOnly se renueva desde el servidor.
  - **Inactividad (ASVS V3)**: columna `last_used_at` en `refresh_tokens`; si no hay refresh dentro del umbral `SESSION_INACTIVITY_MINUTES`, la sesión deja de poder renovarse.
  - Rate limiting en login y recuperación (ver infra / `@nestjs/throttler`).
  - Argon2id en usuarios.
  - Recuperación de credenciales: tokens opacos (hash SHA-256 en BD), un solo uso, expiración; **opcionalmente envío SMTP** (`MailService`/nodemailer) del enlace a `/restablecer?token=`.
  - Endpoints:
    - `POST /api/v1/auth/login`
    - `POST /api/v1/auth/refresh`
    - `POST /api/v1/auth/logout`
    - `GET /api/v1/auth/me`
    - `POST /api/v1/auth/password-reset/request`
    - `POST /api/v1/auth/password-reset/confirm`
- **Frontend**:
  - `AuthProvider` (token access en memoria), `axios` con `withCredentials` e interceptor de refresh.
  - Pantallas: `/login`, `/recuperar`, `/restablecer`.

## Decisiones técnicas

- JWT access + refresh HttpOnly; Argon2id para contraseñas (módulo usuarios).
- **Access token en memoria** (no `localStorage`) para reducir exposición ante XSS (ASVS V3/V8).
- **Refresh opaco** persistido como hash en BD para permitir revocación (logout y reset de contraseña).

## Requisitos de seguridad (normativo → control técnico)

### OWASP ASVS (Nivel 2, secciones clave)
- **V2 Autenticación**: credenciales validadas en servidor, mensajes genéricos, no enumeración.
- **V3 Sesión**: expiración de access, refresh en cookie HttpOnly, logout revoca.
- **V4 Control de acceso**: `/me` y operaciones protegidas por JWT; mutaciones administrativas por rol (ver `07`).
- **V5 Validación**: DTOs + `ValidationPipe` global (`whitelist`, `forbidNonWhitelisted`, `transform`).
- **V10 Logging**: eventos relevantes definidos (pendiente bitácora central en `15-modulo-auditoria.md`).

### ISO/IEC 27001:2022 (aplicación práctica)
- **Control de acceso / IAM**: autenticación centralizada; roles en token (vía `/me`).
- **Registro de eventos**: diseño de eventos auditables (login/logout, reset password, denegaciones).
- **Gestión de credenciales**: hash fuerte (Argon2id), restablecimiento seguro, invalidación de sesión.

### ISO 15489 (interacción con gestión documental)
- La autenticación/identidad sustenta la **atribución** de acciones (`created_by_id`) en trazabilidad documental (quién hizo qué y cuándo).

## Estructura prevista

- Backend: `AuthModule`, `AuthService`, `AuthController`, strategies/guards.
- Frontend: pantalla login, almacenamiento de access en memoria o almacén seguro acordado.

## Flujos

- Login → tokens; refresh periódico; logout revoca/borra refresh.
- Recuperación:
  - Solicitud (`/password-reset/request`) → **respuesta constante** (no revela si el correo existe) y generación de token (si aplica).
  - Confirmación (`/password-reset/confirm`) → valida token (vigente y no usado), actualiza `password_hash`, marca token como usado e invalida refresh tokens activos.

### Diagrama (texto)

1) **Login**
- UI → `POST /auth/login`
- API → valida credenciales → crea refresh (hash en BD) → set cookie HttpOnly → retorna access + usuario

2) **Uso normal**
- UI → requests con `Authorization: Bearer <access>`
- Si `401` → UI → `POST /auth/refresh` (cookie) → nuevo access → reintenta request

3) **Logout**
- UI → `POST /auth/logout` (cookie) → API revoca refresh → limpia cookie (en respuesta)

4) **Olvidé mi contraseña**
- UI → `POST /auth/password-reset/request` (email) → API responde **siempre** `{ ok: true }`
- UI → `POST /auth/password-reset/confirm` (token + newPassword) → API actualiza password, marca token usado e invalida sesiones

## Endpoints

- `POST /api/v1/auth/login` — body `{ email, password }`; responde `{ accessToken, user }` y fija cookie de refresh.
- `POST /api/v1/auth/refresh` — usa cookie; responde `{ accessToken, user }`.
- `POST /api/v1/auth/logout` — revoca refresh en BD y borra cookie (204).
- `GET /api/v1/auth/me` — cabecera `Authorization: Bearer <access>`; usuario con roles.

### Recuperación de credenciales (olvidé mi contraseña)

- `POST /api/v1/auth/password-reset/request`
  - Body: `{ email }`
  - Respuesta: `202 { ok: true }` (y **en dev** opcional `debugToken` para pruebas controladas)
  - Seguridad: anti-enumeración, revoca tokens previos no usados, expiración.

- `POST /api/v1/auth/password-reset/confirm`
  - Body: `{ token, newPassword }`
  - Respuesta: `200 { ok: true }` o `401` si token inválido/expirado/usado/revocado
  - Efecto: actualiza contraseña (Argon2id) e invalida sesiones (refresh tokens) para forzar re-login.

## Pantallas

- `/login` — inicio de sesión.
- `/recuperar` — solicitar enlace/token de restablecimiento (siempre muestra mensaje genérico).
- `/restablecer` — ingresar token y nueva contraseña.

## Tablas relacionadas

- `users`, `roles`, `user_roles`, etc. (RBAC).
- `refresh_tokens`: hash del refresh opaco, `expires_at`, `revoked_at`, FK a `users`.
- `password_reset_tokens`: hash SHA-256 del token opaco, `expires_at`, `used_at`, `revoked_at`, metadata (`requested_ip`, `user_agent`), FK a `users`.

## Cookies y sesión

- **Cookie refresh**:
  - Nombre: `REFRESH_COOKIE_NAME` (default `sgd_refresh`)
  - Flags:
    - `HttpOnly: true`
    - `sameSite: lax`
    - `secure: true` en producción
    - `path: /`
    - `maxAge` según `JWT_REFRESH_DAYS`
- **Access token**:
  - Se usa en header `Authorization: Bearer ...`
  - Vida: `JWT_ACCESS_EXPIRES` (default `15m`)
  - Almacenamiento: **memoria** (frontend), nunca en `localStorage` para refresh.

## Validaciones

- Política de contraseñas; rate limiting recomendado en login.
- Recuperación: token un solo uso, expiración (por defecto 30 min), no divulgar existencia de usuario.

## Permisos

- Público: login; resto según rol.

## Reglas de negocio

- **RB-Auth-01**: si el usuario está inactivo (`activo=false`), el login debe fallar con mensaje genérico.
- **RB-Auth-02**: el refresh token debe ser revocable; logout marca `revoked_at`.
- **RB-Auth-03**: el restablecimiento de contraseña invalida sesiones vigentes (revoca refresh tokens activos).
- **RB-Auth-04**: `password-reset/request` no revela si el correo existe (anti-enumeración).
- **RB-Auth-05**: el token de reset es **un solo uso** (`used_at`) y expira (`expires_at`).

## Eventos auditables (pendiente de bitácora central)

Cuando exista `audit_logs` (ver `15-modulo-auditoria.md`), registrar:
- `AUTH_LOGIN_OK` / `AUTH_LOGIN_FAIL`
- `AUTH_REFRESH_OK` / `AUTH_REFRESH_FAIL` (sin registrar tokens)
- `AUTH_LOGOUT`
- `AUTH_PASSWORD_RESET_REQUEST`
- `AUTH_PASSWORD_RESET_CONFIRM_OK` / `AUTH_PASSWORD_RESET_CONFIRM_FAIL`

## Manejo de errores (lineamientos)

- Respuestas genéricas en auth para evitar filtración (ej. “Credenciales inválidas”).
- No exponer stack traces ni detalles internos al cliente.
- En frontend, ante `401` repetido tras refresh: limpiar sesión y redirigir a `/login`.

## Dependencias

- Módulo usuarios; configuración JWT.

## Problemas / riesgos

- Ver `20` y `21` globales.

## Mejoras futuras

MFA, bloqueo por intentos fallidos.

## Plan de pruebas (paso a paso)

1) **Login OK**
- Acción: iniciar sesión en `/login` con `admin@local.test`.
- Esperado: respuesta `200` con `accessToken` y cookie `sgd_refresh`; redirección a `/`.
- Fallos a revisar: `500` (migraciones pendientes), CORS, usuario inactivo.

2) **Refresh**
- Acción: con sesión activa, forzar `401` (esperar expiración o limpiar access en memoria).
- Esperado: frontend llama `/auth/refresh`, recibe nuevo access y reintenta.
- Fallos a revisar: cookie no enviada (CORS/withCredentials), refresh revocado.

3) **Logout**
- Acción: cerrar sesión desde menú.
- Esperado: cookie se limpia, refresh revocado en BD, UI vuelve a login.

4) **Recuperación (request)**
- Acción: `/recuperar` enviar email existente y no existente.
- Esperado: misma respuesta visible (anti-enumeración), backend devuelve `202 { ok: true }` (en dev puede incluir `debugToken`).

5) **Recuperación (confirm)**
- Acción: `/restablecer` con token válido + contraseña nueva (>=8).
- Esperado: `200 { ok: true }`, y sesiones previas invalidadas (relogin requerido).

---

## Pendientes para empezar a desarrollar (backlog accionable)

### 1) ~~Rate limiting / lockout (ASVS V2)~~ (MVP aplicado)

**Estado:** implementado por IP/throttler (`@nestjs/throttler`) sobre login y rutas de reset; logout y consultas fuera del alcance; ver `AUTH_RATE_LIMITED` en `audit_logs`.

**Opcional siguiente nivel**
- Límite adicional por **email normalizado** en login (combinar IP + email como clave).

### 2) ~~Control de sesiones (ASVS V3)~~ (MVP+ aplicado)

**Estado:** rotación en cada refresh + política `SESSION_INACTIVITY_MINUTES` + `last_used_at` en BD.

**Institucional (pendiente si se escala)**:
- tabla `sessions` extendida por dispositivo, revocación administrativa masiva y catálogo de sesiones activas en UI.

### 3) ~~Correo institucional para recuperación (producción)~~ (implementado sobre SMTP)

**Estado:**
- Backend envía correo mediante **nodemailer** cuando `SMTP_HOST` (o `SMTP_SERVER`) y `SMTP_FROM_EMAIL` están configurados (`MailService`).
- El cuerpo incluye enlace `PASSWORD_RESET_FRONTEND_URL` + `PASSWORD_RESET_PATH` + `token` (SPA `/restablecer?token=`).
- **Anti-enumeración:** la API sigue respondiendo `202 { ok: true }` aunque el correo no exista; no se envía correo en ese caso.
- **Producción sin SMTP:** se audita `AUTH_PASSWORD_RESET_MAIL_SKIP` (cuenta existente) y **no** se devuelve `debugToken`.
- **Fallo SMTP:** se audita `AUTH_PASSWORD_RESET_MAIL_FAIL`; en **no producción** se puede devolver `debugToken` como respaldo.
- Variables: ver `backend/.env.example`.

**Opcional siguiente nivel:** plantillas HTML institucional, cola de correo y proveedor institucional (relay).

### 4) Auditoría transversal (dependencia directa)

Al implementar `audit_logs` (ver `15-modulo-auditoria.md`), integrar:
- login ok/fail,
- logout,
- refresh ok/fail,
- password reset request/confirm.
