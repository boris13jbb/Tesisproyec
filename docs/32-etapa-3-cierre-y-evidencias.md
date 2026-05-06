# ETAPA 3 — Seguridad y auth: cierre al 100 % (evidencias MVP)

**Proyecto:** SGD-GADPR-LM  
**Referencia roadmap:** `docs/00-roadmap-general.md` (fila **ETAPA 3 — Seguridad y auth**)  
**Documentación funcional:** `docs/05-modulo-auth.md`, `docs/06-modulo-usuarios.md`, `docs/07-modulo-roles-permisos.md`  
**Fecha de cierre formal:** **2026-05-06**

---

## Objetivo

Acreditar controles mínimos de **identidad**, **sesión** y **autorización por rol (RBAC)** alineados al stack del expediente, sobre la base de datos y API de etapas previas.

> **Alcance MVP:** autorización **por rol codificado** (`ADMIN`, `USUARIO`) con `JwtAuthGuard` + `RolesGuard` y tablas `permissions` / `role_permissions` **preparadas pero no usadas como fuente única de verdad** — backlog en `docs/07-modulo-roles-permisos.md` (PermissionsGuard). Esto **no bloquea** el cierre ETAPA 3 como fase de prototipo descrita en el roadmap.

---

## Checklist vs roadmap (`00-roadmap-general.md`)

| Entregable | Evidencia | Estado |
|------------|-----------|--------|
| **Usuarios** (cuentas, hash, activación) | `backend/src/usuarios/*`, modelo `User` en `schema.prisma` | Cumple |
| **Roles / permisos (base RBAC)** | Tablas `roles`, `permissions`, `user_roles`, `role_permissions`; seed roles; `Roles` + `RolesGuard` | Cumple base |
| **JWT** (access) | `JwtModule`, `JwtStrategy`, `JwtAuthGuard`; claims en token; `JWT_ACCESS_SECRET` / expiración configurables | Cumple |
| **Refresh HttpOnly** | Cookie en `auth.controller` (`httpOnly`, `sameSite`, `secure` en prod); tabla `refresh_tokens` con rotación e inactividad (`auth.service`) | Cumple |
| **Argon2id** | `argon2.verify` / hash en login y flujos usuario (`auth.service`, `usuarios.service`) | Cumple |
| **Guards** | `JwtAuthGuard`, `RolesGuard` importados en controladores que requieren rol | Cumple |
| **Auditoría de eventos de login/sesión** | `AuditService` en `auth.service` (`AUTH_LOGIN_*`, `AUTH_REFRESH_*`, `AUTH_LOGOUT`, reset); tabla `audit_logs` | Cumple (MVP+) |
| **Rate limiting auth** | `@Throttle` en login y reset; `ThrottlerGuard` global + filtro `AUTH_RATE_LIMITED` | Cumple base |

### Endpoints de autenticación (referencia rápida)

| Método | Ruta | Rol |
|--------|------|-----|
| POST | `/api/v1/auth/login` | Público |
| POST | `/api/v1/auth/refresh` | Cookie refresh |
| POST | `/api/v1/auth/session/restore` | Cookie refresh (respuesta 200 sin fallo HTTP en ausencia de sesión) |
| POST | `/api/v1/auth/logout` | Cookie refresh |
| GET | `/api/v1/auth/me` | JWT |

Recuperación de contraseña: `POST .../password-reset/request`, `POST .../password-reset/confirm`.

### Frontend (evidencia complementaria)

| Elemento | Ubicación típica |
|----------|------------------|
| Token access en memoria + `withCredentials` | `frontend/src/api/client.ts`, `frontend/src/auth/*` |
| Bootstrap sin 401 ruidoso | `POST /auth/session/restore` en `AuthProvider` |
| Rutas protegidas / rol ADMIN | `ProtectedRoute`, `RoleRoute`, `App.tsx` |

---

## Fuera de alcance de ETAPA 3 (siguientes iteraciones)

- **PermissionsGuard** por códigos en BD (`07`).
- **MFA**, **lockout por cuenta** tras N fallos consecutivos (throttle actual es principalmente por IP/ventana).
- **Políticas por documento / dependencia** (`12`, `28`).

---

## Próximo hito oficial (roadmap)

**ETAPA 4** — navegación y shell UI: cierre formal en **`docs/33-etapa-4-cierre-y-evidencias.md`**.

---

*Fin del documento de cierre ETAPA 3.*
