# Módulo — Usuarios

## Objetivo

Administración de cuentas de usuario del sistema (alta, baja lógica, actualización).

## Alcance

- **Administración de usuarios (ADMIN):** alta, edición, **activación/desactivación**, asignación de **roles**, asignación de **dependencia** y **cargo**, y restablecimiento de contraseña (temporal) con invalidación de sesiones.
- **Perfil propio (usuario final):** se resuelve vía `GET /api/v1/auth/me` (sin edición en este MVP).

## Estado actual

**Implementado (prototipo, completo para el alcance MVP).**

- **Backend:** módulo `UsuariosModule` con endpoints administrativos bajo JWT + rol `ADMIN`.
  - `GET /api/v1/usuarios` (ADMIN; incluye `ultimoLoginAt` cuando exista en BD)
  - `GET /api/v1/usuarios/matriz-acceso-referencia` (ADMIN) — misma política efectiva que el código NestJS (`access-matrix.reference.ts`; respaldo en cliente en `frontend/src/constants/roles-access-matrix.ts`).
  - `GET /api/v1/usuarios/:id` (ADMIN)
  - `POST /api/v1/usuarios` (ADMIN)
  - `PATCH /api/v1/usuarios/:id` (ADMIN)
  - `POST /api/v1/usuarios/:id/reset-password` (ADMIN)
- **Frontend:** pantalla `/admin/usuarios` (ADMIN) — «Administración de identidades»: tabla de usuarios (cargo/dependencia/último ingreso desde API), **matriz solo informativa** cargada desde `GET …/matriz-acceso-referencia` (respaldo local si falla la red), enlace para **asignar roles desde la tabla** (sin persistencia ficticia desde la matriz), y mismo flujo de:
  - listado,
  - creación,
  - edición (roles/dependencia/cargo),
  - activar/desactivar,
  - restablecer contraseña.

**Notas de seguridad (ASVS):**
- No se expone `password_hash`.
- Email se normaliza a minúsculas.
- Contraseñas se almacenan con **Argon2id**.
- La gestión de usuarios está restringida a `ADMIN` (mínimo privilegio).
- Restablecer contraseña **revoca refresh tokens** (fuerza re-login).

## Decisiones técnicas

- Hash Argon2id; no exponer hash ni datos innecesarios en API.
- `dependencia_id` y `cargo_id` son **opcionales** y usan `ON DELETE SET NULL` para no bloquear el catálogo.

## Estructura prevista

- Backend: `UsuariosModule`; DTOs con validación.
- Frontend: listado, formulario, detalle (según permisos).

## Endpoints (implementados)

- `GET /api/v1/usuarios` (ADMIN) — lista usuarios (sin hash) con roles y referencias.
- `GET /api/v1/usuarios/:id` (ADMIN) — detalle.
- `POST /api/v1/usuarios` (ADMIN) — crea usuario:
  - body: `{ email, password, nombres?, apellidos?, activo?, dependenciaId?, cargoId?, roles?, invitarPorCorreo? }`
  - regla: si `roles` se omite → asigna `USUARIO`
  - **`invitarPorCorreo`** (opcional, por defecto efectivo `true` si se omite): genera token en `password_reset_tokens` y envía **correo SMTP** con enlace a la pantalla de **`/restablecer`** para que el usuario defina su contraseña (misma seguridad que recuperación: un solo uso, expiración). Si SMTP no está configurado o falla el envío, el usuario sigue existiendo con la contraseña temporal del body; respuesta incluye **`invitacionCorreo`**: `{ solicitada, enviada, motivoOmitido? }`.
  - Vigencia del enlace: variable `USER_INVITE_MINUTES` (por defecto 4320 ≈ 72 h).
- `PATCH /api/v1/usuarios/:id` (ADMIN) — actualiza usuario:
  - permite cambiar `email`, `nombres`, `apellidos`, `activo`, `dependenciaId`, `cargoId`, `roles`
  - si se envía `roles` → reemplaza asignación actual
- `POST /api/v1/usuarios/:id/reset-password` (ADMIN) — restablece contraseña y revoca sesiones.
- Perfil actual: `GET /api/v1/auth/me` (JWT).

## Pantallas

- `/admin/usuarios` (ADMIN): lista, crear, editar, activar/desactivar, reset pass.

## Tablas relacionadas

- `users` (incluye `dependencia_id`, `cargo_id`), `roles`, `user_roles`.
- Catálogos usados por UI: `dependencias`, `cargos`.

## Campos principales (UI/API)

- **Email** (único, normalizado a minúsculas)
- **Nombres / Apellidos**
- **Dependencia** (opcional)
- **Cargo** (opcional)
- **Roles** (`ADMIN`, `USUARIO`, `REVISOR`, `AUDITOR`, `CONSULTA`). **`REVISOR`:** además del alcance de consulta JWT, puede **`POST /documentos/:id/resolver-revision`** (junto con **ADMIN**). **`AUDITOR`**/**`CONSULTA`:** mismo alcance funcional base que **`USUARIO`** hasta flujos propios.
- **Activo** (habilitado / inhabilitado)

## Validaciones

- `email`: formato válido.
- `password` / `newPassword`: mínimo 8 caracteres.
- `dependenciaId`, `cargoId`: UUID (opcional).
- `roles`: lista no vacía cuando se envía; valida contra catálogo de `roles`.

## Permisos

- Típicamente solo administradores gestionan terceros; usuario edita perfil limitado.

## Eventos auditables (`audit_logs`)

- `USER_CREATED`, `USER_UPDATED`, `USER_PASSWORD_RESET`
- Invitación por correo tras alta: `USER_INVITE_MAIL_SENT`, `USER_INVITE_MAIL_FAIL`, `USER_INVITE_MAIL_SKIP` (p. ej. sin SMTP).

## Dependencias

- Auth, roles, dependencias, cargos.
