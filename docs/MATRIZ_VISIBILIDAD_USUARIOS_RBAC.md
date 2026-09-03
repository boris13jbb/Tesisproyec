# Matriz de visibilidad — Usuarios, Roles y Permisos (SGD-GADPR-LM)

> Auditoría integral IAM/RBAC — mínimo privilegio (OWASP ASVS V2/V4, ISO/IEC 27001 A.5.15–A.5.18, ISO 15489).  
> Checkpoint previo: `7d9275e` (Documentos). **Sin cambios** Dashboard / Reportes / Documentos / Prisma / DB / seed.  
> Correcciones de esta fase: MFA policy para SUPERADMIN, enforce `USERS_DISABLE`, revocación refresh al desactivar, `debugToken` opt-in, UI alineada a `USERS_*`, **`GET /rbac/me/permissions` para EDITOR_DOC** (sin matriz global).

---

## 1. Roles confirmados

| Rol | Descripción | Puede administrar usuarios | Protecciones |
|-----|-------------|---------------------------|--------------|
| `SUPERADMIN` | Contingencia / mantenimiento; todos los permisos | Sí (máximo) | No degradable/desactivable por ADMIN; solo él asigna `SUPERADMIN`/`ADMIN`; matriz SUPERADMIN protegida |
| `ADMIN` | Gestión institucional operativa | Sí (`USERS_*` vía rol) | No puede tocar SUPERADMIN ni autoescalar; roles asignables limitados |
| `USUARIO` | Operativo documental | No | Sin acceso a `/usuarios` (RolesGuard + UI) |
| `REVISOR` | Revisión documental | No | Idem |
| `AUDITOR` | Lectura / auditoría de negocio | No | Idem |
| `CONSULTA` | Solo lectura documental | No | Idem |
| `EDITOR_DOC` | Edición documental acotada | No | Lectura de `/rbac/me/permissions` habilitada |

Fuente: `role-constants.ts`, seed, `RolesGuard` (ADMIN ⇒ también SUPERADMIN).

**Roles asignables por ADMIN:** `USUARIO`, `REVISOR`, `AUDITOR`, `CONSULTA`, `EDITOR_DOC` (`ROLES_ASSIGNABLE_BY_ADMIN`).

---

## 2. Permisos reales (usuarios / seguridad)

| Permiso | Uso |
|---------|-----|
| `USERS_READ` | Listar / detalle / matriz referencia (`GET /usuarios*`) |
| `USERS_CREATE` | Crear usuario (`POST /usuarios`) |
| `USERS_UPDATE` | Actualizar datos/roles/permisos directos (`PATCH /usuarios/:id`) |
| `USERS_DISABLE` | Cambiar `activo` (create inactivo o toggle) — **enforce en servicio** además de catálogo |
| `USERS_RESET_PASSWORD` | Reset administrativo (`POST /usuarios/:id/reset-password`) |
| `SECURITY_POLICY_READ` / `SECURITY_POLICY_WRITE` | Política MFA/password (admin auth) |
| `BACKUP_*` / `AUDIT_*` | Fuera de este módulo (referenciados en bloqueo de permisos directos) |

**No existen** permisos `RBAC_READ` / `RBAC_MANAGE`. Mutación de matriz rol↔permiso: `PUT /rbac/roles/:codigo/permissions` solo `@Roles('ADMIN')` (+ SUPERADMIN vía guard) + `assertSuperadminRoleMatrixMutationAllowed`.

Permisos **no asignables como directos por ADMIN:** `DOC_REVISION_RESOLVE`, `USERS_CREATE|UPDATE|DISABLE|RESET_PASSWORD`, `SECURITY_POLICY_WRITE`, `BACKUP_RUN`.

---

## 3. Endpoints

| Método | Endpoint | Acción | Rol | Permiso |
|--------|----------|--------|-----|---------|
| GET | `/usuarios` | Listar | ADMIN(+SUPERADMIN) | `USERS_READ` |
| GET | `/usuarios/matriz-acceso-referencia` | Matriz referencia | ADMIN(+SA) | `USERS_READ` |
| GET | `/usuarios/:id` | Detalle | ADMIN(+SA) | `USERS_READ` |
| POST | `/usuarios` | Crear | ADMIN(+SA) | `USERS_CREATE` (+ `USERS_DISABLE` si `activo=false`) |
| PATCH | `/usuarios/:id` | Actualizar | ADMIN(+SA) | `USERS_UPDATE` (+ `USERS_DISABLE` si cambia `activo`) |
| POST | `/usuarios/:id/reset-password` | Reset admin | ADMIN(+SA) | `USERS_RESET_PASSWORD` |
| GET | `/rbac/permissions` | Catálogo | Varios roles + EDITOR_DOC | — |
| GET | `/rbac/roles` | Roles | Idem | — |
| GET | `/rbac/me/permissions` | Efectivos propios | Idem | — |
| GET | `/rbac/roles/:codigo/permissions` | Matriz rol | Idem | — |
| PUT | `/rbac/roles/:codigo/permissions` | Reemplazar matriz | ADMIN(+SA) | — (RolesGuard) |
| GET | `/auth/me` | Identidad JWT | Autenticado | — |
| GET | `/auth/profile` | Perfil **solo lectura** | Autenticado | — |
| POST | `/auth/password-reset/request` | Forgot | Público | — |
| POST | `/auth/password-reset/confirm` | Confirm reset | Público + token | — |
| GET/POST | `/auth/mfa/*` | MFA propio | Autenticado / challenge | — |
| POST | `/auth/mfa/disable` | Deshabilitar MFA **propio** | Autenticado | — |

No hay endpoint administrativo para resetear MFA de terceros.

---

## 4. SUPERADMIN — protecciones

| Control | Resultado |
|---------|-----------|
| Modificación por ADMIN | **Bloqueado** (`assertSuperadminUserMutationAllowed`) |
| Desactivación | **Bloqueado** (también si actor SUPERADMIN intenta `activo=false` sobre SA) |
| Cambio de rol / degradación | **Bloqueado** para no-SA |
| Asignar SUPERADMIN | Solo SUPERADMIN |
| Asignar/revocar ADMIN | Solo SUPERADMIN |
| Matriz permisos rol SUPERADMIN | Solo SUPERADMIN |
| MFA secreto | Cifrado en BD; no en listados; setup solo flujo propio |
| Reset MFA ajeno | **No existe** |

---

## 5. Escalamiento

| Caso | Resultado |
|------|-----------|
| ADMIN → `roles: ['SUPERADMIN']` (self/otro/create) | **403 Forbidden** |
| ADMIN → `roles: ['ADMIN']` a tercero | **403** |
| Permisos directos críticos por ADMIN | **403** |
| Mass assignment (`passwordHash`, `totpSecret`, `id`, …) | **Ignorado** (DTO whitelist class-validator) |

---

## 6. Crear / Editar / Activar

| Flujo | Quién | Notas |
|-------|-------|-------|
| Crear | `USERS_CREATE` | Roles limitados por política; email único; Argon2id; auditoría `USER_CREATED`; invitación opcional |
| Editar datos | `USERS_UPDATE` | email, nombres, dependencia, cargo |
| Cambiar roles | `USERS_UPDATE` | Endpoint mismo PATCH; política SUPERADMIN/ADMIN |
| Permisos directos | `USERS_UPDATE` | Array completo; revoca refresh |
| Activar/desactivar | `USERS_UPDATE` **+** `USERS_DISABLE` | Revoca refresh si desactiva |
| Reset password admin | `USERS_RESET_PASSWORD` | Revoca refresh; no loguea secreto |

**Perfil propio:** `GET /auth/profile` no admite PATCH de rol/permisos/activo/hash.

**Dependencia:** USER no tiene PATCH `/usuarios`; solo ADMIN con `USERS_UPDATE` cambia `dependenciaId` (alineado a alcance documental).

---

## 7. Sesiones tras desactivar

| Token | Comportamiento |
|-------|----------------|
| Refresh | **Revocado** al desactivar / reset password / cambio sensible de roles-permisos |
| Access JWT | Sigue válido hasta expirar **pero** `JwtStrategy.validate` exige `activo` → **401** en cada request autenticado |

Política documentada: no hay denylist de access tokens; defensa = refresh revoke + check `activo` en validate.

---

## 8. Password reset (forgot)

- Token: 32 bytes hex, hash SHA-256 en BD, TTL configurable, uso único, revoca previos.
- Respuesta anti-enumeración `{ ok: true }`.
- `debugToken` solo si `NODE_ENV≠production` **y** `PASSWORD_RESET_DEBUG_TOKEN=true` (opt-in).
- Producción sin SMTP: no expone token; audita skip/fail.

---

## 9. MFA/TOTP

- Secret cifrado; no en listados/sanitize/auditoría meta.
- Enrolamiento: secret/QR solo en flujo `setup/begin` válido.
- Política `desiredAdminStepUpAuth` aplica a **ADMIN y SUPERADMIN**.
- Disable solo sobre cuenta propia (no admin-reset de terceros).

---

## 10. IDOR / USER

| Acción | Resultado |
|--------|-----------|
| USER `GET /usuarios` | **403** (RolesGuard) |
| USER `GET/PATCH /usuarios/:id` | **403** |
| USER cambiar propio rol vía profile | **N/A** (sin PATCH) |
| UI `/admin/usuarios` | RoleRoute → forbidden; menú solo ADMIN |

---

## 11. Frontend

| Superficie | Control |
|------------|---------|
| Ruta `/admin/usuarios` | `RoleRoute(ADMIN|SUPERADMIN)` + `PermissionRoute(USERS_READ)` |
| Botones | `USERS_CREATE` / `UPDATE` / `DISABLE` / `RESET_PASSWORD` vía `/rbac/me/permissions` |
| Sidebar Administración | Solo `userHasAdminAccess` |

Frontend **no** es control de seguridad; backend es autoridad.

---

## 12. Auditoría (sin secretos)

Eventos típicos: `USER_CREATED`, `USER_UPDATED`, `ROLE_ASSIGNED`/`REVOKED`, `USER_DIRECT_PERMISSIONS_UPDATED`, `USER_PASSWORD_RESET`, auth reset/MFA. Meta sin password/token/TOTP.

---

## 13. Casos prohibidos (QA)

1. ADMIN desactiva SUPERADMIN → 403  
2. ADMIN asigna SUPERADMIN → 403  
3. ADMIN crea SUPERADMIN → 403  
4. ADMIN autoescala a SUPERADMIN → 403  
5. Sin `USERS_DISABLE` cambia `activo` → 403  
6. USER lista usuarios → 403  
7. Respuestas sin `passwordHash`/`totpSecret`  
8. Usuario `activo=false` no autentica / JWT validate falla  
9. Permisos críticos no como directos por ADMIN  

---

## 14. Tests automatizados (esta fase)

- `usuarios.service.security.spec.ts`  
- `mfa-totp.admin-policy.spec.ts`  
- `rbac-policy.util.spec.ts` (existente)

---

## 15. QA visual sugerido

| Actor | Resolución | Acción | Esperado |
|-------|------------|--------|----------|
| ADMIN | 1440×900 | `/admin/usuarios` | Lista + acciones según `USERS_*` |
| USER | cualquiera | `/admin/usuarios` | Forbidden; sin ítem Administración |

---

## 16. EDITOR_DOC y lecturas `/rbac/*` (mínimo privilegio)

| Endpoint RBAC | EDITOR_DOC antes | EDITOR_DOC ahora | Uso funcional |
|---------------|------------------|------------------|---------------|
| `GET /rbac/me/permissions` | 403 | **Permitido** | MainLayout, PermissionRoute, Documentos/NuevoDocumento/Detalle: botones `DOC_*` propios |
| `GET /rbac/permissions` | 403 | **403** (revertido) | Solo catálogo admin; EDITOR_DOC no lo necesita |
| `GET /rbac/roles` | 403 | **403** (revertido) | ACL documental solo ADMIN (`canManageDocAccess`) |
| `GET /rbac/roles/:codigo/permissions` | 403 | **403** (revertido) | Paneles admin de matriz |
| `PUT /rbac/roles/:codigo/permissions` | 403 | **403** | Mutación solo ADMIN(+SA) |

**Decisión:** ampliar solo `me/permissions` (necesidad legítima de permisos **propios**). No matriz global.

---

## 17. QA pre-commit IAM (2026-09-02)

### MFA SUPERADMIN

| Rol | MFA enrolado | Comportamiento login (política `desiredAdminStepUpAuth=true`) |
|-----|--------------|---------------------------------------------------------------|
| SUPERADMIN | Sí | Password OK → `mfaRequired` + challenge LOGIN → TOTP → sesión |
| SUPERADMIN | No | Password OK → `mfaSetupRequired` + `setupChallengeToken` → `POST /auth/mfa/setup/begin-login` (otpauth/secret de enrolamiento) → confirm → sesión. **No bloqueo / no loop MFA_REQUIRED** |
| ADMIN | Sí | Igual que antes: `mfaRequired` (verificado `admin@local.test`) |
| ADMIN | No | `mfaSetupRequired` (mismo flujo de enrolamiento) |
| USER | Sí/No | Sin step-up administrativo; sesión directa si password OK |

**Resultado pre-commit:** SUPERADMIN sin TOTP **no** queda inaccesible; se exige enrolamiento por flujo existente. Commit **no** bloqueado por MFA.

### Desactivación / tokens (ApplicationContext + Prisma real)

| Prueba | Resultado |
|--------|-----------|
| ADMIN modifica SUPERADMIN | **403** |
| ADMIN desactiva SUPERADMIN | **403** |
| ADMIN crea SUPERADMIN | **403** |
| ADMIN autoescala a SUPERADMIN | **403** |
| USER creado → login OK → ADMIN desactiva | `activo=false` |
| Access previo tras desactivar | `JwtStrategy` exige `activo` → **401** en requests autenticadas |
| Refresh previo | fila `revokedAt` set + `auth.refresh` → **401** |
| Nuevo login USER inactivo | **401** |
| Respuesta create/list sin `passwordHash` | OK |
| Auditoría `USER_*` sin secretos en meta | OK |

### debugToken

| Condición | Resultado |
|-----------|-----------|
| Variable ausente | No expone (código: solo si `=== 'true'`) |
| `false` | No expone |
| `true` + no producción | Puede exponer solo si el flujo de mail/dev lo requiere |
| Producción (`NODE_ENV=production`) | Jamás |
| QA local: request reset | Respuesta `{ ok: true }` sin `debugToken` en muestra (SMTP OK) |

### Rutas UI

| Actor | Hallazgo |
|-------|----------|
| Anónimo → `/admin/usuarios` | Redirect `/login` |
| USER → menú | Sin sección Administración |
| USER → `/admin/usuarios` | **`/forbidden`** (Acceso denegado) |
| ADMIN UI 1440×900 | Requiere TOTP manual (cuentas ADMIN enroladas); lógica de botones alineada a `USERS_*` en código |

*Documento vivo de la fase Usuarios/RBAC. No versionar hasta aprobación explícita.*
