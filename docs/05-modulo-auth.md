# Módulo — Autenticación y sesión

## Objetivo

Gestionar identidad del usuario, emisión de tokens y cierre de sesión de forma segura.

## Alcance

Login, logout, refresh, expiración; integración con usuarios y auditoría de acceso.

## Estado actual

**Implementado (prototipo).** Backend: `AuthModule`, JWT de acceso (Bearer), refresh opaco en cookie HttpOnly (hash SHA-256 en tabla `refresh_tokens`), Argon2id en usuarios, `POST /api/v1/auth/login`, `POST /api/v1/auth/refresh`, `POST /api/v1/auth/logout`, `GET /api/v1/auth/me`. Frontend: `AuthProvider`, token de acceso en memoria, `axios` con `withCredentials` e interceptor de refresh, pantalla `/login`.

## Decisiones técnicas

- JWT access + refresh HttpOnly; Argon2id para contraseñas (módulo usuarios).

## Estructura prevista

- Backend: `AuthModule`, `AuthService`, `AuthController`, strategies/guards.
- Frontend: pantalla login, almacenamiento de access en memoria o almacén seguro acordado.

## Flujos

- Login → tokens; refresh periódico; logout revoca/borra refresh.

## Endpoints

- `POST /api/v1/auth/login` — body `{ email, password }`; responde `{ accessToken, user }` y fija cookie de refresh.
- `POST /api/v1/auth/refresh` — usa cookie; responde `{ accessToken, user }`.
- `POST /api/v1/auth/logout` — revoca refresh en BD y borra cookie (204).
- `GET /api/v1/auth/me` — cabecera `Authorization: Bearer <access>`; usuario con roles.

## Pantallas

- Login, recuperación de contraseña (si aplica en alcance).

## Tablas relacionadas

- `users`, `roles`, `user_roles`, etc. (RBAC).
- `refresh_tokens`: hash del refresh opaco, `expires_at`, `revoked_at`, FK a `users`.

## Validaciones

- Política de contraseñas; rate limiting recomendado en login.

## Permisos

- Público: login; resto según rol.

## Dependencias

- Módulo usuarios; configuración JWT.

## Problemas / riesgos

- Ver `20` y `21` globales.

## Mejoras futuras

MFA, bloqueo por intentos fallidos.
