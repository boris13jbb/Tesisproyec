# Arquitectura

**Proyecto:** SGD-GADPR-LM (`Tesisproyec`)  
**Alcance:** trazabilidad transversal (`audit_logs`), historial documental/archivo, lectura global, export, redacción, IDOR.  
**Estándares:** ISO/IEC 27001:2022, ISO 15489, OWASP ASVS (V2/V4/V5/V7/V8/V10).  
**Autoridad:** el backend. La UI no es fuente de verdad.

| Pieza | Implementación real |
|---|---|
| Escritura | `AuditService.log` → `prisma.auditLog.create` |
| Redacción persistencia | `serializeAuditMetaForPersist` **antes** de guardar |
| Lectura API | `GET /auditoria`, `/stats`, `/:id` + `redactAuditMetaJsonForRead` |
| Export | `GET /reportes/auditoria.xlsx` / `.pdf` + misma redacción + sanitizer CSV/XLSX |
| Historial scoped | `GET /documentos/:id/eventos` y `.../archivos/:archivoId/eventos` (visibilidad del documento, **no** exige `AUDIT_READ`) |
| Mutación REST | **No** hay POST/PATCH/DELETE de `audit_logs` |
| Complemento | `documento_eventos` / `documento_archivo_eventos` (dominio, no snapshot completo del expediente) |

Equivalente de visibilidad por rol: `MATRIZ_VISIBILIDAD_AUDITORIA_TRAZABILIDAD.md`.

# Eventos

Inventario **real** (códigos emitidos por servicios). No se inventan variantes.

| Módulo | Acciones reales | Trigger | Actor | Objeto | Meta típica (segura) |
|---|---|---|---|---|---|
| AUTH | `AUTH_LOGIN_OK`, `AUTH_LOGIN_FAIL` | login / MFA login OK | JWT o cuenta resuelta internamente; fail puede ir sin sesión | User si se resolvió | `reason` genérico; **sin** password |
| AUTH | `AUTH_LOGOUT` | logout | JWT | sesión/refresh record no sensible | resultado |
| AUTH | `AUTH_REFRESH_OK`, `AUTH_REFRESH_FAIL` | cookie refresh | userId si se resolvió | refresh record id si aplica | motivo genérico; **sin** token |
| AUTH | `AUTH_PASSWORD_RESET_REQUEST`, `_MAIL_FAIL`, `_MAIL_SKIP`, `_CONFIRM_FAIL`, `_CONFIRM_OK` | forgot / confirm | interno o userId | User | status/`account`; **sin** reset token ni URL completa |
| AUTH | `AUTH_MFA_CHALLENGE_ISSUED`, `AUTH_MFA_VERIFY_OK`, `AUTH_MFA_VERIFY_FAIL`, `AUTH_MFA_ENABLED`, `AUTH_MFA_DISABLED` | TOTP | JWT o pre-sesión interna | User | `purpose`/fase; **sin** secret, otpauth, código 6 dígitos |
| AUTH | `AUTH_RATE_LIMITED` | 429 throttling (filtro) | si hay user | ruta | no se audita cada 429 de negocio; evita flood |
| AUTH | `SECURITY_POLICY_UPDATED` | política de seguridad | JWT admin | política | campos no secretos |
| AUTH | `AUTHZ_FORBIDDEN` | 403 autenticado | JWT | ruta | method/path; fail-open (`void audit.log`) |
| IAM | `USER_CREATED`, `USER_UPDATED` | CRUD usuario | JWT admin | User objetivo | activo, roles, dependenciaId, cargoId, códigos de permiso; **sin** password |
| IAM | `USER_DIRECT_PERMISSIONS_UPDATED` | delegación/revocación directa | JWT (SUPERADMIN→ADMIN p. ej. `DOC_UNLOCK`) | User objetivo | `antes`/`despues` códigos |
| IAM | `ROLE_ASSIGNED`, `ROLE_REVOKED` | cambio de roles | JWT | User objetivo | códigos de rol |
| IAM | `ROLE_PERMISSIONS_UPDATED` | matriz rol↔permiso | JWT SUPERADMIN | Role | permisos |
| IAM | `USER_PASSWORD_RESET` | reset administrativo | JWT admin ≠ target | User objetivo | sin password |
| IAM | `USER_INVITE_MAIL_SENT`, `_SKIP`, `_FAIL` | invitación | JWT | User | resultado correo |
| Catálogos | `DEPENDENCIA_CREATED`, `_UPDATED`, `_ACTIVATED`, `_DEACTIVATED` | create/update/activo | JWT | Dependencia | codigo, activoAntes/Después |
| Catálogos | `CARGO_CREATED`, `_UPDATED`, `_ACTIVATED`, `_DEACTIVATED` | idem | JWT | Cargo | codigo, dependenciaId |
| Catálogos | `TIPO_DOCUMENTAL_CREATED`, `_UPDATED`, `_ACTIVATED`, `_DEACTIVATED` | idem | JWT | TipoDocumental | codigo, activo |
| Documentos | `DOC_CREATED` | alta | JWT | Documento | contexto operativo |
| Workflow | `DOC_SUBMITTED_FOR_REVIEW` | envío / reenvío tras rechazo | JWT | Documento | transición |
| Workflow | `DOC_REVIEW_RESOLVED` | aprobar/rechazar | JWT revisor | Documento | decision, motivoRechazo (funcional) |
| Workflow | `DOC_STATE_CHANGED` | PATCH estado / unlock / archivo | JWT | Documento | from/to; unlock usa `via: DOC_UNLOCK` |
| DOC_UNLOCK | `DOC_UNLOCKED` | `POST .../desbloquear` | JWT con `DOC_UNLOCK` | Documento | documentoId, estados, motivo, rolActor |
| Documentos | `DOC_ACCESS_UPDATED` | ACL | JWT | Documento | alcance |
| Documentos | `DOC_DEACTIVATED` | baja lógica documento | JWT | Documento | — |
| Archivos | `DOC_FILE_UPLOADED`, `DOC_FILE_DOWNLOADED`, `DOC_FILE_DELETED` | upload/download/baja lógica | JWT | DocumentoArchivo + `meta.documentoId` | versión; **sin** path absoluto ni binario. Delete = baja lógica (binario se conserva) |
| Reportes | `REPORT_EXPORTED` | cualquier export (incl. auditoría) | JWT | kind/format | no reemite en bucle infinito |
| Auditoría | — | no hay alta manual de eventos | — | — | — |
| RUM | `CLIENT_WEB_VITAL_LCP` | POST web-vitals | JWT | ClientPerf | metric/pathname **sin query** |
| Notificaciones | `NOTIFICATION_DISPATCHED` | correo de flujo | sistema/usuario | documento | resultado |
| Panel | `DASHBOARD_ALERT_ACK` | ack alerta | JWT | alerta | — |
| Respaldo | `BACKUP_VERIFIED` | job o registro manual | system o JWT | respaldo | source, tamaño, nombre archivo (basename) |

**DOC_UNLOCK** emite deliberadamente `DOC_UNLOCKED` **y** `DOC_STATE_CHANGED` (`via: DOC_UNLOCK`). No emite `DOC_REVIEW_RESOLVED`.  
**APROBADO → ARCHIVADO** (state-only) emite `DOC_STATE_CHANGED`, **no** `DOC_UNLOCKED`.  
**Reenvío** `RECHAZADO → EN_REVISION` usa `DOC_SUBMITTED_FOR_REVIEW`; no borra el rechazo anterior.

No hay DELETE físico de catálogos: se usa inactivación.

# Actor

Server-side: **Sí**. Sale de JWT / `AuditContext` construido en el servicio.  
No hay endpoint que acepte `body.actorId` / `query.actor` para escribir auditoría.  
Mass assignment: `POST /auditoria` → 404. RUM: action/actor fijos; body extra → 400.

Eventos públicos (login fail, forgot, MFA pre-sesión): actor = userId si la cuenta se resolvió internamente, o nulo / email operativo; **nunca** un usuario autenticado inventado; **nunca** password.

Admin vs objetivo: `USER_UPDATED` / `USER_PASSWORD_RESET` / disable usan `context.actorUserId` del admin y `resource.id` del objetivo (`actorId ≠ targetUserId` cuando aplica).

# Timestamp

Server-side: **Sí** (`createdAt` Prisma `@default(now())`).  
`AuditService` no persiste `createdAt` desde el cliente.  
Spoof `createdAt`/`timestamp` en body: no hay API de escritura de audit.

# Target

`resourceType` / `resourceId` los fija el servicio sobre el recurso operado (documento, archivo, user, catálogo).  
Historial de archivo exige archivo ∈ documento visible.

# Metadata

Solo contexto operativo. Redacción **recursiva** (objetos y arrays de objetos) **antes de persistir** y de nuevo al leer/exportar.  
Claves: set exacto + subcadena (`password`, `token`, `secret`, `authorization`, `cookie`, `otpauth`, `jwt`, `bearer`, `totp`), normalizadas (minúsculas, sin `_`/`-`).  
Residual: una clave de negocio cuyo nombre contenga `secret` (p. ej. hipotética `secretaria`) se redactaría de más (falso positivo de clave, no de valor).

No se persiste `req` / `req.headers` / `req.body` completos como meta.

# Redacción

| Momento | Helper |
|---|---|
| Antes de persistir | `serializeAuditMetaForPersist` |
| GET /auditoria | `redactAuditMetaJsonForRead` |
| Export XLSX | `redactAuditMetaJsonForExport` (PDF sin columna meta) |

# Auth

Login OK/FAIL, logout, refresh OK/FAIL, reset request/confirm/mail skip/fail, rate-limit.  
Respuesta pública de login/forgot sigue genérica (sin enumeración). El audit interno puede anotar `account: NOT_FOUND_OR_INACTIVE`.

# MFA

Challenge / verify / enable / disable. Meta sin secret, sin otpauth, sin código TOTP.  
`otpauthUrl` está en el set de redacción (contiene el secret TOTP).

# Usuarios

Create / update / disable (vía `USER_UPDATED` + `activo`) / permisos directos (`USER_DIRECT_PERMISSIONS_UPDATED`) / roles (`ROLE_*`) / reset admin (`USER_PASSWORD_RESET`).  
No se mezclan “usuario editado” y “permisos cambiados”: hay acciones distintas, más un `USER_UPDATED` de cierre.

# Catálogos

Dependencias, cargos y tipos: created / updated / activated / deactivated. Sin DELETE.

# Documentos

Create, update de estado, review submit, review resolve (approve/reject), archive state-only, unlock, access, deactivate.

No hay versionado completo del documento: la auditoría registra **eventos**, no un snapshot integral. Limitación documentada (no es bug).

# Workflow / DOC_UNLOCK / Archivos

Ver tabla de eventos. Baja de archivo = lógica (`DOC_FILE_DELETED` + evento de dominio `ELIMINADO`).

# Reportes

Exports reales: documentos, auditoría, pendientes, usuarios, por dependencia/estado, actividad revisión, próximos vencimiento, por usuario.  
Todos dejan `REPORT_EXPORTED`. No se fuerza audit de cada lectura de listado.

# Lectura global

`@Roles('ADMIN')` (incluye SUPERADMIN) **y** `AUDIT_READ`.  
USER / CONSULTA / AUDITOR (seed sin `AUDIT_*`) → 403.  
ADMIN sin `AUDIT_READ` → 403.  
Filtros (acción exacta, actor, fechas, recurso) se aplican **después** de esa ACL; no saltan el permiso.

# Historial scoped

Quien ve el documento puede ver su historial. UUID ajeno → 404 (anti-IDOR/BOLA). No exige `AUDIT_READ`.

# Export

`AUDIT_EXPORT` separado de `AUDIT_READ`.  
Política real: ADMIN + `AUDIT_EXPORT` puede exportar **aunque no** tenga `AUDIT_READ`. No se unifican.  
Tope 5000 filas. XLSX: redacción + `addSanitizedSpreadsheetRow` (formula injection).  
Fechas inválidas o `from > to` → 400 **antes** de escribir `REPORT_EXPORTED`.

# IDOR/BOLA

| Superficie | Resultado |
|---|---|
| Audit global sin rol/permiso | 403 |
| Historial documento ajeno | 404 |
| Eventos de archivo ajeno / fileId huérfano | 404 |

# Paginación

Listado: `pageSize` 5–100; `page` ≥ 1; NaN/negativos → default seguro.  
Orden: `createdAt desc` + `id desc` (tie-break).  
Export: `take` 5000.

# XSS

UI de auditoría: `Typography` texto (`humanizeAuditMetaRows`). **No** `dangerouslySetInnerHTML` sobre meta. Un valor `<script>` se muestra como texto.

# Formula injection

Helper existente `sanitizeSpreadsheetCell` (`'=` / `'+` / `'-` / `'@`). No se duplica.

# Integridad

Editable vía API: **No**.  
Eliminable vía API: **No**.  
Cliente no escribe eventos globales.  
Hash-chain / WORM / firma / SIEM: **no implementados** (mejora futura, no bug bloqueante).

Fail de `AuditService`:

| Patrón | Efecto |
|---|---|
| `await audit.log` (mutaciones de negocio) | **Fail-closed**: falla también la operación |
| `void audit.log` (filtros 403/429, algunos caminos) | **Fail-open**: la respuesta principal sigue |

Transacción: el audit global suele ir **después** de la mutación (riesgo residual de mutación OK sin fila de audit si el log falla en un `void`). Dominio documental (`documento_eventos`) puede ir en la misma transacción Prisma.

# Retención

**NO DEFINIDA TÉCNICAMENTE.** No hay TTL, borrado periódico ni archivado automático. Requiere política institucional futura. No se borra nada en esta fase.

# Tests

Ver `auditoria.authorization.spec.ts`, `audit.service.spec.ts`, `audit-export-meta.util.spec.ts`, `audit-list.util.spec.ts`, `reportes.auditoria-export.authorization.spec.ts`, `documentos.security.spec.ts` (historial IDOR), `client-perf.controller.spec.ts`, `spreadsheet-sanitize.util.spec.ts`, más suites de workflow/unlock/IAM.

# Riesgos residuales

| Id | Nivel | Tipo | Nota |
|---|---|---|---|
| R-AUD-INT-01 | — | Política | AUDITOR sin audit global |
| R-AUD-INT-02 | MEDIO aceptado | Diseño | RUM en `audit_logs` (throttle 40/min) |
| R-AUD-INT-03 | BAJO | Gobernanza | Sin retención / hash-chain / WORM / SIEM |
| R-AUD-INT-04 | BAJO | PII | `actorEmail` e IP en columnas (minimización: no se duplica el expediente completo en meta) |
| R-AUD-INT-05 | BAJO | Consistencia | `void audit.log` fail-open |
| R-AUD-INT-06 | BAJO | Redacción | Falso positivo de claves que contienen `secret`/`token` |
| R-AUD-INT-07 | Observación | Producto | Access JWT stateless hasta `exp` post-logout (fase AUTH) |

**BUG BLOQUEANTE:** ninguno identificado tras corrección de redacción de claves compuestas, fechas inválidas y query string RUM.
