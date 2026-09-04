# Matriz de seguridad — Autenticación, sesiones, MFA y recuperación

Auditoría integral (2026-09-03). Backend = autoridad. Sin secretos reales en este documento.

## Arquitectura

| Elemento | Implementación real |
|---|---|
| Access token | JWT HS256 Bearer; claims mínimos (`sub`, `email`); `exp` vía `JWT_ACCESS_EXPIRES` (**default `15m`** en código y `.env.example`). Firma fija `algorithms: ['HS256']`. |
| Refresh token | Cookie HttpOnly `sgd_refresh` (configurable); valor opaco; **hash SHA-256** en `refresh_tokens`; rotación en cada refresh. |
| Sesión DB | Tabla `refresh_tokens` (+ `last_used_at` inactividad). Access JWT **stateless** (no denylist). Cada request revalida usuario `activo` en `JwtStrategy`. |
| Revocación | Logout / reset password / desactivación marcan `revokedAt` en **refresh**. El access JWT ya emitido **no** se revoca por denylist; tras logout/reset permanece usable hasta `exp` (TTL corto). Tras **desactivación**, el mismo access es rechazado en la siguiente request (`activo=false`). |
| Expiración | Access: JWT `exp` (`JWT_ACCESS_EXPIRES`, default 15 min). Refresh: `expires_at` + umbral inactividad. |
| Actor | `req.user` desde BD en `JwtStrategy.validate` (roles frescos por request). |
| MFA state | `user_totp` (secret cifrado AES-GCM); challenges `mfa_login_challenges` (token hasheado, TTL ~5 min). |

**NO existe:** OAuth, SSO, refresh en localStorage, access en cookie.

## Login

| Caso | Comportamiento |
|---|---|
| Usuario válido + password OK | Sesión o challenge MFA/setup según política. |
| Password incorrecto | `401` «Credenciales inválidas»; contador lockout si política habilitada. |
| Usuario inexistente / inactivo | Mismo mensaje genérico `401` (anti-enumeración). |
| Cuenta bloqueada | Mismo mensaje genérico `401`. |

Mensaje de éxito no incluye `passwordHash` ni secretos MFA.

## JWT

- Access **no** incluye permisos congelados críticos: roles se recargan desde BD en cada request.
- Rechaza: firma inválida, algoritmo distinto de HS256, `exp` vencido, usuario inexistente/inactivo.
- Usuario desactivado tras login: siguiente request autenticada → `401` (strategy) + refresh ya revocado por hardening de usuarios.

## Sesiones / Revocación / Logout

| Evento | Refresh | Access JWT ya emitido |
|---|---|---|
| Logout | Revocado + cookie borrada | Sigue válido hasta `exp` (stateless; sin denylist) |
| Password reset self (`/auth/password-reset/confirm`) | Revocados (todos activos del usuario) | Sigue válido hasta `exp` |
| Password reset admin (`/usuarios/:id/reset-password`) | Revocados | Sigue válido hasta `exp` |
| Usuario desactivado | Revocados | **Rechazado** en la siguiente request (`JwtStrategy` exige `activo`) |

Logout y reset **revocan los refresh tokens activos**. Los access JWT ya emitidos son stateless y permanecen válidos hasta su expiración, **salvo** que una validación server-side (p. ej. usuario inactivo) los rechace antes.

No existe endpoint self-service `change-password` en `/auth`; el reset administrativo de usuarios sí revoca refresh.

## Recuperación (forgot / reset)

| Aspecto | Real |
|---|---|
| Request | Respuesta constante (no confirma existencia). |
| Token | Opaco aleatorio; **SHA-256 en BD**; single-use (`usedAt`); expiración. |
| Claim concurrente | `updateMany` condicional `usedAt: null` (solo un ganador). |
| URL reset | Base URL de configuración (no Host header del cliente). |
| Post-reset | Revoca **refresh** activos. Access JWT previos: válidos hasta `exp` (no denylist). |
| SMTP | Opcional vía `MailService`; QA con mock / sin envío real. Debug token solo no-prod + flag. |

## Account enumeration

- Login: mensajes equivalentes.
- Forgot-password: mensajes equivalentes + UX frontend alineada.
- Status codes alineados (`200` request reset; `401` login fallido).

## Rate limiting

| Endpoint | Límite (Throttler) |
|---|---|
| `POST /auth/login` | 8 / 10 min por IP |
| `POST /auth/mfa/verify-login` | 12 / 10 min |
| `POST /auth/mfa/setup/begin-login` | 10 / 10 min |
| `POST /auth/mfa/setup/confirm-login` | 12 / 10 min |
| `POST /auth/password-reset/request` | 5 / 10 min |
| `POST /auth/password-reset/confirm` | 5 / 10 min |

Además: lockout por cuenta desde **SecurityPolicy** (si existe) o env `AUTH_LOCKOUT_*`.

MFA: tras 5 códigos incorrectos en el mismo challenge → challenge invalidado.

## MFA

| Tema | Real |
|---|---|
| Enrollment | Secret generado en servidor; cifrado at-rest (AES-256-GCM). API JSON: `otpauthUrl` + `secretMasked` — **sin** campo independiente `secret`. |
| `otpauthUrl` | URI `otpauth://totp/...` (no es URL HTTP de navegación). **Necesariamente incluye** el parámetro `secret=` para generar QR local y clave manual. No se usa en `window.location` / href / query SPA / analytics. |
| Cache | `Cache-Control: no-store` en `POST /auth/mfa/setup/begin-login` y `POST /auth/mfa/setup/begin`. |
| QR | Local (`qrcode.react`); sin servicio QR externo. |
| Secret en URL HTTP de sesión | No |
| Secret en localStorage/sessionStorage | No (solo estado React; se limpia al completar/volver/unmount) |
| Challenge | Token opaco hasheado; one-time consume atómico (`deleteMany` count=1). |
| SUPERADMIN / ADMIN | MFA obligatorio según `desiredAdminStepUpAuth`; **no** pueden desactivar MFA si la política lo exige. |
| USER | Según política vigente (no forzada admin). |
| Cifrado at-rest | Preferir `MFA_ENCRYPTION_KEY`; si falta, material de `JWT_ACCESS_SECRET` (mejora futura: clave dedicada en prod). |

**Precisión:** el secreto TOTP **no** se elimina del canal de enrollment solo por quitar el campo JSON `secret`; permanece embebido en `otpauthUrl` durante el enrolamiento (diseño TOTP estándar). Sí se evita campo dedicado, storage, logs y auditoría.

## Frontend storage

| Dato | Dónde |
|---|---|
| Access JWT | Memoria (`accessToken.ts`) |
| Refresh | Cookie HttpOnly |
| MFA challenge | Estado React (memoria) |
| Reset token | Query de `/restablecer` (diseño); no persistir en storage |

CSRF clásico: menor riesgo en Bearer access; refresh cookie SameSite=Lax.

## Auditoría (acciones reales)

Ejemplos: `AUTH_LOGIN_FAIL`, `AUTH_LOGIN_OK` (o equivalentes), `AUTH_MFA_*`, `AUTH_PASSWORD_RESET_*`, logout/refresh, `AUTH_RATE_LIMITED`.

**No** auditar: password, TOTP code, secret, reset token plaintext, JWT signing secret.

## Tests

Suite `auth-security.hardening.spec.ts` + suites MFA previas: setup sin `secret`, consume anti-replay, SUPERADMIN no disable MFA, claim reset atómico, lockout desde policy.

## Riesgos residuales

| Tipo | Descripción |
|---|---|
| MEJORA FUTURA | Access JWT en memoria sigue expuesto a XSS de misma origen (mitigado vs localStorage). |
| MEJORA FUTURA | Tras logout/reset, el access JWT sigue válido hasta `exp` (~15m por defecto); refresh sí se revoca. Mitigación actual: TTL corto + check `activo` + UI limpia access en memoria al logout. |
| MEJORA FUTURA | Cifrado MFA cae a material derivado de `JWT_ACCESS_SECRET` si falta `MFA_ENCRYPTION_KEY` — preferir clave dedicada en despliegue. |
| MEJORA FUTURA | Migrar a cookies HttpOnly también para access implica rediseño CSRF. |
| NO BUG | Refresh token existe y está endurecido; no rediseñar. |
| NO BUG | `otpauthUrl` con `secret=` en enrollment es esperado para TOTP; mitigado con no-store, memoria, sin logs/audit. |

## Endpoints auth (matriz)

| Método | Endpoint | Auth | Rate limit | Auditoría |
|---|---|---|---|---|
| POST | `/auth/login` | No | Sí | Sí |
| POST | `/auth/mfa/verify-login` | Challenge | Sí | Sí |
| POST | `/auth/mfa/setup/begin-login` | Setup challenge | Sí | — |
| POST | `/auth/mfa/setup/confirm-login` | Setup challenge | Sí | Sí |
| GET | `/auth/mfa/status` | JWT | — | — |
| POST | `/auth/mfa/setup/begin` | JWT | — | — |
| POST | `/auth/mfa/setup/confirm` | JWT | — | Sí |
| POST | `/auth/mfa/disable` | JWT | — | Sí |
| POST | `/auth/refresh` | Cookie | — | Sí |
| POST | `/auth/session/restore` | Cookie | — | — |
| POST | `/auth/logout` | Cookie/JWT | — | Sí |
| GET | `/auth/me` | JWT | — | — |
| POST | `/auth/password-reset/request` | No | Sí | Sí |
| POST | `/auth/password-reset/confirm` | Reset token | Sí | Sí |
| GET/PUT | `/auth/admin/security-*` | JWT+RBAC | — | Sí |

Ver detalle de rutas adicionales en `05-modulo-auth.md` y `auth.controller.ts`.
