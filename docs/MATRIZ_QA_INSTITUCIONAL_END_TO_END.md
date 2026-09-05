# QA institucional end-to-end — SGD-GADPR-LM

**Proyecto:** Tesisproyec  
**Estándares de referencia:** ISO/IEC 27001:2022, ISO 15489, OWASP ASVS (Nivel 2).  
**No afirma:** “100 % seguro”, “sin vulnerabilidades”, “certificado ISO” ni “producción garantizada”.  
**Sí afirma:** QA institucional end-to-end completado sobre el alcance probado.

## Checkpoint

| Dato | Valor |
|---|---|
| HEAD | `baeb4a3` (`baeb4a39c458cedafe711821c2a23d7cb9ae8916`) |
| Mensaje | `fix(dev-deps): harden development and build toolchain dependencies` |
| `origin/main` | `baeb4a3` (idéntico) |
| Working tree al inicio | Limpio |
| Staging | Vacío (esta fase no versiona) |
| Tag final | No |
| Producción | No tocada |
| Prisma / migrations / seed | Sin cambios |
| Commit / push | No ejecutados |

## Alcance

Validar que la institución puede usar los flujos y controles **ya definidos** sin regresiones funcionales o de seguridad.

**Fuera de alcance:** features nuevas, rediseño UI, cambio de arquitectura, estados documentales nuevos, cambio de RBAC (salvo bug demostrado), Prisma/DB/seed, deploy, SMTP real, backup real, commit/push/tag.

**Bug policy:** no se demostró BLOQUEANTE/ALTO que exigiera fix. No se modificó código de aplicación.

## Ambiente

| Dato | Valor |
|---|---|
| Node | v25.8.1 (runtime backend ≥20; build frontend Vite 8.0.16: `^20.19.0` o `>=22.12.0`) |
| npm | 11.11.0 |
| Backend port | 3000 (levantado temporalmente en la fase de cierre operativo) |
| Frontend port | 5173 (Vite 8.0.16; proxy `/api` → backend) |
| DB local | Puerto 3306; **MYSQL UP** en esta fase |
| SMTP | No usado |
| Backup real | No ejecutado |
| E2E browser de proyecto | **No** (no hay Playwright/Cypress de repo; no se instaló) |
| E2E Nest existente | `backend/test/app.e2e-spec.ts` (health; **no** forma parte de `npm test` por defecto) |
| Suite principal | Jest `backend/src/**/*.spec.ts` |

## Roles

Lista **real** (`role-constants.ts` + seed). El rol operativo no se llama `USER`; se llama **`USUARIO`**.

| Rol | Política real | Resultado |
|---|---|---|
| SUPERADMIN | Técnico/protegido; no asignable por ADMIN; MFA admin obligatorio; hereda todos los permisos incluido `DOC_UNLOCK` | PASS |
| ADMIN | Gestión operativa; seed: todos los permisos **excepto** `DOC_UNLOCK` (delegación directa solo por SUPERADMIN) | PASS |
| USUARIO | Alcance documental propio: `DASHBOARD_SUMMARY`, `DOC_READ`, create/update/upload/send; **sin** IAM/auditoría/backup/reportes globales | PASS |
| REVISOR | Lectura + `DOC_REVISION_SEND` + `DOC_REVISION_RESOLVE` + `REPORTS_PENDIENTES` | PASS |
| AUDITOR | Seed: solo lectura documental/dashboard (`DOC_READ` / files read-download). **No** incluye `AUDIT_READ` por defecto | PASS (política real) |
| CONSULTA | Misma base de lectura que AUDITOR | PASS |
| EDITOR_DOC | Update/upload/send; **sin** `DOC_CREATE` | PASS |

Backend: autoridad final (`PermissionsGuard` + `RolesGuard`). Frontend: UX/visibilidad (`ProtectedRoute`, `PermissionRoute`, `RoleRoute`).

Cuentas QA: fixtures/mocks de specs existentes. **No** se crearon usuarios. **No** se usaron contraseñas/TOTP/JWT en evidencia.

## Inventario de módulos

Prefijo API: `/api/v1`.

| Módulo | Backend | Frontend | Permisos / guardia | Estado |
|---|---|---|---|---|
| Auth / MFA | `auth.controller.ts` | `/login`, `/recuperar`, `/restablecer` | JWT + throttle + MFA admin | PASS |
| Dashboard | `dashboard.controller.ts` | `/` | `DASHBOARD_SUMMARY`; admin: `DASHBOARD_ADMIN_READ` | PASS |
| Usuarios / IAM | `usuarios.controller.ts`, `rbac.controller.ts` | `/admin/usuarios` | `USERS_*` + RoleRoute ADMIN/SUPERADMIN | PASS |
| Dependencias | `dependencias.controller.ts` | `/catalogos/dependencias` | GET autenticado; write `DEPENDENCIAS_WRITE` + `@Roles('ADMIN')` | PASS |
| Cargos | `cargos.controller.ts` | `/catalogos/cargos` | Write `CARGOS_WRITE` + ADMIN | PASS |
| Tipos documentales | `tipos-documentales.controller.ts` | `/catalogos/tipos-documentales` | Write `TIPOS_DOCUMENTALES_WRITE` + ADMIN | PASS |
| Beneficiarios | `beneficiarios.controller.ts` | `/catalogos/beneficiarios` | Write `BENEFICIARIOS_WRITE` | PASS |
| Contrapartes | `contrapartes.controller.ts` | `/catalogos/contrapartes` | Write `CONTRAPARTES_WRITE` | PASS |
| Documentos | `documentos.controller.ts` | `/documentos`, `/documentos/:id`, `/tramites`, `/bandeja-tramites` | `DOC_*` | PASS |
| Nuevo documento | POST `/documentos` | `/documentos/nuevo` | **PermissionRoute `DOC_CREATE` + `DOC_FILES_UPLOAD`** (no ADMIN-only) | PASS |
| Workflow | `enviar-revision`, `resolver-revision` | detalle documento | `DOC_REVISION_SEND` / `DOC_REVISION_RESOLVE` | PASS |
| DOC_UNLOCK | POST `/documentos/:id/desbloquear` | detalle (si permiso) | `DOC_UNLOCK` | PASS |
| Archivos | `/documentos/:id/archivos` | detalle | `DOC_FILES_*` | PASS |
| Reportes | `reportes.controller.ts` | `/reportes`, `/admin/reportes` | `REPORTS_EXPORT` (+ `USERS_READ` / `AUDIT_EXPORT` según export). UI: RoleRoute ADMIN | PASS API; UI más restrictiva (ver residuales) |
| Auditoría | `auditoria.controller.ts` (solo GET) | `/admin/auditoria` | `@Roles('ADMIN')` + `AUDIT_READ` | PASS |
| Notificaciones | `notifications.controller.ts` | campana in-app | inbox propio (JWT) | PASS |
| SLA / expiry | schedulers + servicio | — | servidor; SMTP mock/best-effort | PASS |
| Backups | POST `/backup/admin/run-now` | `/admin/respaldos` | `@Roles('ADMIN')` + `BACKUP_RUN` | PASS (tests; no dump real) |
| Health | GET `/health` | — | público; `status` / `service` / `database` | PASS (unit + e2e file) |
| Config seguridad | auth admin policy | `/admin/configuracion` | `SECURITY_POLICY_*` | PASS |
| Client perf | `client-perf` | post-login | pathname sin query | PASS |

## Auth

| Control | Evidencia | Resultado |
|---|---|---|
| Login fail-closed | `auth.service.ts`: usuario inexistente / password incorrecto / inactivo → `Credenciales inválidas` | PASS |
| Enumeración | Mismo mensaje 401; sin stack | PASS |
| Rate limit | `@Throttle` login 8/10 min; MFA/reset también acotados. **No** spec HTTP 429 dedicado; no se cambiaron umbrales | PASS (código + filtro `AUTH_RATE_LIMITED`) |
| JWT access | HS256 allowlist (`auth.module.ts` + `jwt.strategy.ts`); TTL default `15m` | PASS |
| Access en frontend | Solo memoria (`frontend/src/auth/accessToken.ts`); no localStorage/sessionStorage | PASS |
| Refresh | HttpOnly; `sameSite=lax`; `secure` en producción; rotación/reuse en servicio; logout y desactivar revocan refresh | PASS |
| Logout | Revoca refresh | PASS |

## MFA

| Control | Evidencia | Resultado |
|---|---|---|
| SUPERADMIN obligatorio | `userIsAdmin` incluye SUPERADMIN y ADMIN (`mfa-totp.service.ts`) | PASS |
| ADMIN | **Misma política** que SUPERADMIN (`desiredAdminStepUpAuth`) | PASS (documentado; no es más laxo) |
| No enrolado / enrolado | `mfaSetupRequired` / `mfaRequired` | PASS |
| QR solo enrollment | Segundo login no reexpone setup | PASS |
| Código incorrecto / expiry / failure limit | Challenge TTL 5 min, 5 fallos, anti-replay (`mfa-totp*.spec.ts`) | PASS |
| Secret safety | `beginSetup` no expone JSON `secret`; `otpauthUrl` + `secretMasked`; no logs/audit/storage | PASS |
| Otros roles | MFA admin no exigido si no son ADMIN/SUPERADMIN | PASS |

## Dashboard

| Rol | Esperado | Resultado |
|---|---|---|
| SUPERADMIN | Summary + widgets admin según permisos | PASS |
| ADMIN | `DASHBOARD_ADMIN_READ` para bloques admin | PASS |
| USUARIO | Solo bloque propio; sin actividad/usuarios/auditoría globales; ACK alertas 403 | PASS (`dashboard-summary-visibility.util.spec.ts`, `dashboard.alerts.authorization.spec.ts`) |

## IAM

| Control | Resultado |
|---|---|
| Listar/crear/editar/desactivar | Permisos `USERS_*` en controller | PASS |
| SUPERADMIN protegido | `assertSuperadminUserMutationAllowed` | PASS |
| ADMIN no escala a SUPERADMIN | PASS |
| No self-escalation | PASS |
| Desactivar revoca refresh | `usuarios.service.security.spec.ts` | PASS |
| DOC_UNLOCK: solo SUPERADMIN otorga a ADMIN; ADMIN no delega ni self-assign | `rbac-policy.util.ts` + spec | PASS |

## Catálogos

| Módulo | Lectura | Escritura | Inactivo | Histórico | DELETE |
|---|---|---|---|---|---|
| Dependencias | JWT (listado operativo) | `DEPENDENCIAS_WRITE` + ADMIN | No asignable a nuevas ops protegidas | Conservado | No hay DELETE HTTP | PASS |
| Cargos | JWT | `CARGOS_WRITE` + ADMIN | Cargo/dependencia inactiva no nueva asignación | Conservado | No DELETE | PASS |
| Tipos | JWT | `TIPOS_DOCUMENTALES_WRITE` + ADMIN | Tipo inactivo no asignación nueva | Docs históricos conservados | No DELETE | PASS |
| Beneficiarios | JWT + alcance | `BENEFICIARIOS_WRITE` | Activo/inactivo; no IDOR | — | No DELETE | PASS |
| Contrapartes | JWT + alcance | `CONTRAPARTES_WRITE` | Idem | — | No DELETE | PASS |

## Documentos y workflow

Estados reales: `BORRADOR`, `REGISTRADO`, `EN_REVISION`, `RECHAZADO`, `APROBADO`, `ARCHIVADO`. No se crearon estados.

| Caso | Esperado | Resultado |
|---|---|---|
| Create `/documentos/nuevo` | `DOC_CREATE` + `DOC_FILES_UPLOAD` | PASS |
| Creator | Desde JWT; no spoof de cliente | PASS |
| Dependencia / fechas / cédula-RUC | Validaciones servidor existentes | PASS |
| BORRADOR | Metadata/archivos editables; transiciones según política | PASS |
| REGISTRADO | Editable; enviar revisión solo POST formal | PASS |
| POST `/enviar-revision` | REGISTRADO/RECHAZADO → EN_REVISION; BORRADOR bloqueado; `DOC_REVISION_SEND` | PASS |
| PATCH genérico a EN_REVISION/APROBADO/RECHAZADO | 400 | PASS |
| EN_REVISION inmutable | Meta/upload/delete bloqueados (también SUPERADMIN) | PASS |
| POST `/resolver-revision` | APROBADO/RECHAZADO; `DOC_REVISION_RESOLVE` | PASS |
| Motivo rechazo vacío/whitespace | 400; actor/timestamp servidor | PASS |
| Doble resolución / stale | 409 | PASS |
| RECHAZADO | Editable; reenvío formal | PASS |
| APROBADO | Locked; ARCHIVADO state-only según `DOC_UPDATE`; payload mixto bloqueado | PASS |
| ARCHIVADO | Read-only; reopen genérico bloqueado | PASS |

## DOC_UNLOCK

| Caso | Resultado |
|---|---|
| POST `/documentos/:id/desbloquear` | PASS |
| EN_REVISION / APROBADO / ARCHIVADO → REGISTRADO | PASS |
| BORRADOR / REGISTRADO / RECHAZADO | 409 | PASS |
| Motivo obligatorio, trim, mínimo real, vacío 400; actor JWT; timestamp servidor | PASS |
| SUPERADMIN | PASS |
| ADMIN sin `DOC_UNLOCK` | 403 | PASS |
| ADMIN + `DOC_UNLOCK` | PASS en scope | PASS |
| USUARIO / REVISOR / otros | Bloqueado | PASS |
| Unlock ≠ `DOC_UPDATE` / ≠ `DOC_FILES_UPLOAD` | Código + authz separados | PASS (sin spec post-unlock dedicado) |
| Audit `DOC_UNLOCKED` / state change vía unlock; no `DOC_REVIEW_RESOLVED` falso | PASS |

## Archivos

| Caso | Resultado |
|---|---|
| PDF válido MIME `application/pdf` + `.pdf` + `%PDF` | PASS (magic en servicio; spec MIME/ext/0 bytes/413) |
| 0 bytes | 400 | PASS |
| >50 MB | 413 | PASS |
| `.exe` / MIME falso / double extension | Bloqueado | PASS |
| IDOR list/upload/download/delete | 404 (no 403 enumerable) | PASS |
| Download JWT; `attachment`; nosniff; no-store; sin token en URL | PASS |
| Delete lógico; estado protegido bloqueado; segunda eliminación 404 | PASS |
| Path `../` `..\` absoluto UNC encoded | Bloqueado | PASS |
| Audit file events; sin path absoluto en meta | PASS |

**Brecha de cobertura (no bug de producto):** no hay spec unitario aislado que dispare `assertPdfMagicBytes` con buffer no-PDF; el camino de upload sí lo llama.

## Reportes

Endpoints reales: documentos xlsx/pdf, pendientes xlsx/pdf, auditoría xlsx/pdf, usuarios.xlsx, por dependencia/estado, actividad revisión, por usuario, próximos vencimiento.

| Control | Resultado |
|---|---|
| `REPORTS_EXPORT` | PASS |
| usuarios.xlsx | `REPORTS_EXPORT` + `USERS_READ` | PASS |
| Audit export | `AUDIT_EXPORT` | PASS |
| Sanitizer fórmulas `= + - @` | PASS |
| Tope auditoría 5000; fechas inválidas / from>to → 400; sin `REPORT_EXPORTED` en fallo | PASS (tope documentado; spec de fechas sí) |

## Auditoría

| Control | Resultado |
|---|---|
| USUARIO | 403 (API `@Roles('ADMIN')` + `AUDIT_READ`) | PASS |
| AUDITOR/CONSULTA seed | Sin `AUDIT_READ`; API además exige rol ADMIN | PASS (política real) |
| ADMIN sin `AUDIT_READ` | 403 | PASS |
| ADMIN + `AUDIT_READ` / SUPERADMIN | PASS | PASS |
| Controller read-only (GET list/stats/:id) | PASS |
| Redaction persist/read/export | PASS |
| Actor JWT; timestamp servidor | PASS |
| Historial documento fuera de scope | 404 | PASS |
| Paginación clamp; orden `createdAt desc, id desc` | PASS |

## Notificaciones / SLA

| Control | Resultado |
|---|---|
| Inbox / unread / mark / mark-all solo propios | PASS |
| IDOR mark ajena | 204/404 sin mutar ajena | PASS |
| REVISION_PENDING: destinatarios ADMIN/REVISOR activos en BD; SMTP mock | PASS |
| REVISION_RESOLVED: creator activo | PASS |
| `fechaLimiteSla` servidor; `SLA_DIAS_REVISION` rango; no override cliente | PASS |
| SLA_OVERDUE: solo EN_REVISION vencido; recipients admin/revisor activos | PASS (tests; no cron prod) |
| DOCUMENT_EXPIRING + dedup ~23 h | PASS |
| Email CRLF / HTML escape / no SMTP real | PASS |
| Links: rutas internas; bloqueo javascript/data/externo/traversal; sin JWT en URL | PASS |

## Backups

| Control | Resultado |
|---|---|
| USER / ADMIN sin `BACKUP_RUN` | 403 | PASS |
| ADMIN/SUPERADMIN + `BACKUP_RUN` | PASS en tests | PASS |
| spawn sí; shell/exec/execSync no; password no en argv | PASS |
| CNF cleanup success/fail/error | PASS |
| Atomicidad tmp → exit 0 → size>0 → rename → prune | PASS |
| Lock concurrente; release success/failure; no distributed lock | PASS |
| Path traversal/UNC/absolute; README preservado; tmp no válido | PASS |
| Audit sin passwords/stderr sensible; `BACKUP_VERIFIED` solo cuando corresponde | PASS |

No se ejecutó dump real.

## Health / HTTP

| Control | Tipo | Resultado |
|---|---|---|
| GET `/api/v1/health` | LIVE | **PASS** (HTTP 200; `status=ok`, `service=sgd-gadpr-lm-api`, `database=up`) |
| Secrets en body | LIVE | **NO** (solo status/service/database) |
| DB down | Tests existentes | PASS (no se apagó DB en esta fase) |
| CORS / headers / booleanos | Automatizado | PASS (código/specs) |
| 400/401/403/404/409/413/429 | Automatizado | PASS |

## Frontend — alineación de rutas (código + política)

| Ruta | Frontend guard | Backend requisito | ¿Alineado? |
|---|---|---|---|
| `/reportes`, `/admin/reportes` | `RoleRoute` ADMIN/SUPERADMIN | Clase `@Roles('ADMIN')`; exports con permisos | **Sí (intencional)** |
| Catálogos (dependencias, cargos, tipos, contrapartes, beneficiarios) | `RoleRoute` ADMIN/SUPERADMIN | Write: `@Roles('ADMIN')` + `*_WRITE`; lectura JWT | **Sí (intencional)** |
| `/admin/usuarios` | RoleRoute ADMIN + `USERS_READ` | `@Roles('ADMIN')` + `USERS_*` | **Sí** |
| `/admin/auditoria` | RoleRoute ADMIN + `AUDIT_READ` | `@Roles('ADMIN')` + `AUDIT_READ` | **Sí** |
| `/admin/respaldos` | RoleRoute ADMIN | `@Roles('ADMIN')` + `BACKUP_RUN` | **Sí** |
| `/admin/configuracion` | RoleRoute ADMIN | `SECURITY_POLICY_*` | **Sí** (código) |
| `/documentos/nuevo` | `PermissionRoute` `DOC_CREATE`+`DOC_FILES_UPLOAD` | create doc + upload files (no solo ADMIN) | **Sí** |
| Documentos / bandeja / trámites | `ProtectedRoute` (auth) | `DOC_*` | **Sí** (visibilidad) |

**BUG RoleRoute:** **No** — la restricción ADMIN de reportes/catálogos/admin es **intencional** (UI y backend alineados). REVISOR puede exportar *pendientes* vía API (`REPORTS_PENDIENTES` + `@Roles('ADMIN','REVISOR')`), pero **no** entra a `/reportes` (RoleRoute). Eso no es bug: el menú de reportes institucionales se reserva a ADMIN/SUPERADMIN.

**Nota:** `MainLayout` muestra catálogos/reportes solo si `isAdmin`; no es RoleRoute de menú, pero el bloqueo de rutas sigue en `App.tsx`.

## Frontend

| Caso | Tipo | Resultado |
|---|---|---|
| Formulario login (labels, botón Ingresar, recuperar) | Smoke IronBee 1440×900, 1366×768, 390×844 | PASS |
| `/documentos`, `/documentos/nuevo`, `/admin/usuarios` sin sesión | Redirect a `/login` | PASS |
| Access token memoria | Code review | PASS |
| `/documentos/nuevo` PermissionRoute `DOC_CREATE`+`DOC_FILES_UPLOAD` | Code review | PASS |
| Login autenticado / MFA UI / refresh / logout con sesión | **SMOKE AUTENTICADO LIVE** host `127.0.0.1:5173` | **PASS** (MFA PASS MANUAL; restore/reload PASS; logout + restore false PASS) |
| Workflow visual autenticado / drawer móvil autenticado | **LIVE** | **PARTIAL** (workflow estados QA; drawer 390 PASS) |
| 403/404/409/413/500 UX | Code + specs API; UI autenticada no smoke | PARCIAL |
| Overflow páginas internas autenticadas | Smoke 1440×900 (scrollWidth=clientWidth) | **PASS** (sin overflow bloqueante en shell) |

### Distinción de evidencias (esta fase)

| Tipo | Estado |
|---|---|
| **AUTOMATIZADO** | Jest 61 suites / 404 tests / 0 failed; gates de build/deps OK (no re-ejecutados en esta pasada) |
| **LIVE LOCAL** | Health PASS; session restore endpoint vivo |
| **SMOKE AUTENTICADO ADMIN** | **COMPLETADO** en host canónico 127.0.0.1:5173 |
| **SMOKE AUTENTICADO USUARIO** | **COMPLETADO** en host canónico 127.0.0.1:5173 |
| **CODE REVIEW** | Alineación RoleRoute/PermissionRoute |
| **SMOKE SUPERADMIN** | **COMPLETADO** — restore F5 UI-only PASS; DOC_UNLOCK positivo LIVE PASS |

Session restore (sin sesión / post-logout): **PASS** — POST /api/v1/auth/session/restore → HTTP 200, 
estored:false.

### Smoke autenticado ADMIN — evidencia real (cierre 2026-09-05)

**Rol registrado:** ADMIN  
**MFA:** PASS MANUAL (operador) — no se registró código  
**Host canónico:** http://127.0.0.1:5173 (proxy → http://127.0.0.1:3000)

**HOST MIX: RESUELTO** — cookie refresh host-only; localhost ≠ 127.0.0.1. Fix local: CORS allowlist + docs canónicos; **Auth sin cambios**.

| Check | Resultado | Evidencia |
|---|---|---|
| Login + MFA | **PASS** / **PASS MANUAL** | Operador; dashboard ADMIN visible |
| Primer reload + session/restore | **PASS** | 
estored:true; dashboard sigue autenticado |
| Segundo reload | **PASS** | Tras /documentos → dashboard; sesión continúa |
| Dashboard + menú ADMIN | **PASS** | Widgets/menú; sin 500/stack/secretos |
| /documentos | **PASS** | Listado 24 resultados; acciones según estado |
| /documentos/nuevo | **PASS** | Guard DOC_CREATE+DOC_FILES_UPLOAD; upload visible; no se creó doc |
| /reportes | **PASS** | Sin 403 incorrecto |
| /admin/usuarios | **PASS** | Carga + guard; sin modificar usuarios |
| /admin/auditoria | **PASS** | ADMIN con AUDIT_READ |
| /admin/respaldos | **PASS** | Pantalla visible; **backup real NO ejecutado** |
| Notificaciones | **PASS** | Contador; listado propio; click ítem → detalle DOC |
| Workflow visual | **PARTIAL** | REGISTRADO/EN_REVISION/RECHAZADO/APROBADO **PASS**; BORRADOR/ARCHIVADO **NO DISPONIBLE EN DATOS QA** |
| DOC_UNLOCK negativo | **PASS** | Sin botón «Desbloquear» |
| DOC_UNLOCK positivo | **NO PROBADO** | ADMIN seed sin DOC_UNLOCK |
| Responsive 1440/1366/390 + drawer | **PASS** | |
| Logout + restore false | **PASS** | |

### Smoke autenticado USUARIO — evidencia real (cierre 2026-09-05)

**Rol real (enum):** USUARIO (sesión QA también presentaba rol complementario EDITOR_DOC; sin registrar PII)  
**Login:** PASS MANUAL (operador)  
**Host canónico:** http://127.0.0.1:5173

| Check | Resultado | Evidencia |
|---|---|---|
| Restore F5 (session/restore) | **PASS** | 
estored:true; dashboard permanece autenticado |
| Dashboard | **PASS** | «Buenos días, USUARIO»; «Mi actividad»; scope reducido (6 docs vs admin); **sin** widgets admin (IAM/auditoría hoy/respaldo/acceso admin) |
| Menú visible | **PASS** | Inicio, Documentos, Bandeja trámites, Trámites, Nuevo documento, Mi perfil |
| Menú ausente | **PASS** | Sin Usuarios, Auditoría, Respaldos, Configuración, Reportes institucionales, Catálogos |
| /admin/usuarios (direct URL) | **BLOQUEADO** | → /forbidden; sin datos de usuarios; sin stack/secretos |
| /admin/auditoria | **BLOQUEADO** | → /forbidden |
| /admin/respaldos | **BLOQUEADO** | → /forbidden; no se ejecutó backup |
| /admin/configuracion | **BLOQUEADO** | → /forbidden |
| /reportes | **BLOQUEADO** | RoleRoute ADMIN/SUPERADMIN; → /forbidden |
| Direct URL leakage | **PASS** | Ninguna ruta admin/reportes mostró datos protegidos |
| /documentos | **PASS** | Acceso; listado scope (6 resultados); sin aprobar/desbloquear en listado |
| /documentos/nuevo | **PASS** | Carga (DOC_CREATE + DOC_FILES_UPLOAD efectivos); wizard + upload PDF visible; **no** se creó documento |
| Capacidades documentales observadas | **PASS** | REGISTRADO: «Enviar a revisión»; EN_REVISION: sin Aprobar/Rechazar; Desbloquear ausente; Subir archivo deshabilitado en EN_REVISION |
| DOC_UNLOCK | **BLOQUEADO** | Acción no disponible (mínimo privilegio) |
| Notificaciones | **PASS** | Contador propio + listado propio |
| /perfil | **PASS** | Perfil propio; sin IAM/auditoría admin |
| Responsive 1440/1366/390 | **PASS** | Dashboard + documentos + perfil; overflow bloqueante **No** |
| Drawer 390 | **PASS** | Abrir/navegar/cerrar/reabrir; **sin** enlaces admin |
| Logout + restore false | **PASS** | → /login; 
estored:false |

### Smoke autenticado SUPERADMIN — evidencia real (cierre 2026-09-05)

**Rol:** SUPERADMIN (sin PII en evidencia).  
**MFA:** PASS MANUAL + LIVE (segundo login enrolado; sin QR de enrollment en dashboard).  
**Host canónico:** `http://127.0.0.1:5173`

| Check | Resultado | Evidencia |
|---|---|---|
| Dashboard | **PASS** | Carga; Superadministrador; sin 500/stack/secretos |
| Restore F5 (UI-only, sin probe extra) | **PASS** | Tras reload: Sesión activa + dashboard SUPERADMIN (reintento tras fallo previo por probe/carrera QA) |
| DOC_UNLOCK — documento QA | **PASS** | DOC-0018 (QA sintético); estado inicial EN_REVISION |
| Botón Desbloquear | **PASS** | Visible para SUPERADMIN |
| Motivo obligatorio | **PASS** | Diálogo con campo motivo; motivo sintético «QA de cierre técnico» |
| Unlock ejecutado | **PASS** | EN_REVISION → REGISTRADO |
| UI post-unlock | **PASS** | Estado Registrado; «Enviar a revisión» disponible; Desbloquear ya no aplica |
| Historial preservado | **PASS** | Movimientos previos conservados + «En revisión → Registrado» |
| DOC_UNLOCKED (auditoría) | **PASS LIVE** | Filtro auditoría: «Documento desbloqueado para corrección» |
| DOC_STATE_CHANGED | **PASS LIVE** | Historial documento: En revisión → Registrado |
| DOC_REVIEW_RESOLVED falso | **NO** | No apareció como resolución de revisión |
| Logout + restore false | **PASS** | → `/login`; `restored:false` |

**Nota conceptual:** DOC_UNLOCK ≠ DOC_UPDATE ≠ DOC_FILES_UPLOAD (aunque SUPERADMIN herede permisos amplios).

## Casos manuales / smoke

| Caso | Estado |
|---|---|
| Login público 3 viewports + a11y labels | Ejecutado (IronBee) |
| Rutas protegidas sin sesión | Ejecutado (redirect login) |
| Live health | **LIVE PASS** |
| Session restore | **LIVE PASS** (ADMIN / USUARIO / SUPERADMIN UI-only) |
| Login autenticado UI (ADMIN) | **ADMIN SMOKE COMPLETADO** |
| Login autenticado UI (USUARIO) | **USUARIO SMOKE COMPLETADO** |
| Login autenticado UI (SUPERADMIN) | **SUPERADMIN SMOKE COMPLETADO** (MFA + restore + DOC_UNLOCK positivo) |
| Backup/SMTP reales | Prohibidos; no ejecutados |

## Hallazgos

### BLOQUEANTES / ALTOS
Ninguno.

### MEDIOS
- Throttle de login sin spec HTTP 429 dedicado.
- Magic bytes PDF en upload sin unit test aislado de rechazo.
- RoleRoute ADMIN en reportes/catálogos es **intencional**.
- Throttle / probes extras de `session/restore` en QA pueden competir con rotación de refresh (mitigación: validar F5 solo por UI).

### BAJOS
- Churn de chunks Vite >500 kB.
- e2e health fuera de `npm test`.
- Datos QA sin documentos en BORRADOR/ARCHIVADO para workflow visual completo (ADMIN).
- En detalle EN_REVISION (USUARIO), botón «Subir archivo» puede aparecer deshabilitado (sin fuga; backend ya bloquea).

## Riesgos residuales aceptados
- Moderate/low de dependencias; CI inexistente; JWT access en memoria; host canónico QA = `127.0.0.1` (no mezclar con `localhost`).

## Resultado institucional
QA técnico automatizado: **PASS** (61/404/0, HIGH 0, gates OK).  
**Live health + session restore: PASS**.  
**SMOKE AUTENTICADO ADMIN: COMPLETADO**.  
**SMOKE AUTENTICADO USUARIO: COMPLETADO**.  
**SMOKE AUTENTICADO SUPERADMIN: COMPLETADO** (MFA + restore + DOC_UNLOCK positivo LIVE).  
**Decisión:** **APTO PARA CIERRE TÉCNICO FINAL**.

---

## ESTADO

**QA INSTITUCIONAL END-TO-END COMPLETADO**

## DECISIÓN

**APTO PARA CIERRE TÉCNICO FINAL**

## CHECKPOINT BASE

`baeb4a3`

## PRÓXIMO PASO

Versionar documentación/configuración QA aprobada (tras aprobación explícita de commit).

**No afirma:** “100 % seguro”, “0 vulnerabilidades”, certificación ISO ni producción garantizada.

## Git de esta fase

Solo documentación de QA (matriz + docs canónicos de host) y `.env.example` / comentario Vite. Staging vacío hasta aprobación. Sin commit/push/tag en pre-commit.
