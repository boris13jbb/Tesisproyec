# Matriz de visibilidad — Auditoría, historial y trazabilidad

**Proyecto:** SGD-GADPR-LM (`Tesisproyec`)  
**Alcance:** `AuditLog` transversal, historial documental (`DocumentoEvento` / `DocumentoArchivoEvento`), API de consulta, exportación y UI `/admin/auditoria`.  
**Estándares:** ISO/IEC 27001:2022 (evidencia/trazabilidad), ISO 15489 (registros confiables), OWASP ASVS (V4 acceso, V7/V8 secretos/datos, V10 logging).

## Objetivo

Documentar el comportamiento **real** de generación, lectura, alcance, redacción e integridad de la auditoría, sin inventar endpoints ni permisos. El **backend es autoridad**; la UI solo refleja rol + permiso.

## Modelo

### `AuditLog` → `audit_logs`

| Campo | Uso | Sensibilidad |
|---|---|---|
| `id` | Identificador UUID del evento | Baja |
| `createdAt` | Timestamp servidor (`@default(now())`) | Baja |
| `actorUserId` | Usuario autenticado (FK opcional) | Media (identificador) |
| `actorEmail` | Correo del actor (copia operativa) | Media (PII) |
| `action` | Código de acción (`AUTH_*`, `USER_*`, `DOC_*`, …) | Baja |
| `result` | `OK` / `FAIL` | Baja |
| `resourceType` | Tipo de recurso afectado | Baja |
| `resourceId` | Id del recurso | Media |
| `ip` | Origen IP del request (si el caller lo aporta) | Media |
| `userAgent` | User-Agent truncado | Baja |
| `correlationId` | Correlación técnica opcional | Baja |
| `metaJson` | JSON operativo; **redactado al persistir y al leer/exportar** | Alta si llega secreto (mitigado) |

### `DocumentoEvento` → `documento_eventos`

| Campo | Uso | Sensibilidad |
|---|---|---|
| `id` | Id del evento de dominio | Baja |
| `documentoId` | Documento afectado | Media |
| `tipo` | Tipo de evento de dominio | Baja |
| `cambiosJson` | Diff/snapshot de cambios | Media |
| `createdById` | Actor servidor | Media |
| `createdAt` | Timestamp servidor | Baja |

### `DocumentoArchivoEvento` → `documento_archivo_eventos`

| Campo | Uso | Sensibilidad |
|---|---|---|
| `id` | Id | Baja |
| `documentoArchivoId` | Archivo afectado | Media |
| `tipo` | Tipo | Baja |
| `metaJson` | Meta de archivo (nombre, hash, etc.) | Media |
| `createdById` | Actor | Media |
| `createdAt` | Timestamp servidor | Baja |

**Nota:** No se modifica Prisma en esta fase.

## Roles

| Rol | Auditoría global | Historial documento | Exportar | Scope |
|---|---|---|---|---|
| SUPERADMIN | Sí (`@Roles('ADMIN')` expande SUPERADMIN) + `AUDIT_READ` | Según visibilidad documental | Sí con `AUDIT_EXPORT` | Global |
| ADMIN | Sí + `AUDIT_READ` | Según visibilidad | Sí con `AUDIT_EXPORT` | Global |
| AUDITOR | **No** (política: seed sin `AUDIT_*`; matriz «Auditoría del sistema»=false) | Si tiene `DOC_READ` y ve el documento | No | Solo dominio documental |
| REVISOR | No | Si ve el documento | No | Documental |
| USUARIO | No | Si ve el documento | No | Documental |
| CONSULTA | No | Si ve el documento | No | Documental |
| EDITOR_DOC | No | Si ve el documento | No | Documental |

El rol **AUDITOR** es lectura documental / auditoría de **negocio**; no auditoría global de seguridad. No es vulnerabilidad: política vigente (seed + matriz). El backlog aspiracional «ADMIN/AUDITOR» en `docs/15-modulo-auditoria.md` no prevalece.

## Permisos

| Permiso | Uso |
|---|---|
| `AUDIT_READ` | `GET /auditoria`, `GET /auditoria/stats`, `GET /auditoria/:id`; ruta UI `/admin/auditoria` |
| `AUDIT_EXPORT` | `GET /reportes/auditoria.xlsx`, `GET /reportes/auditoria.pdf`; botones Exportar en UI |

No existen `AUDIT_MANAGE` / `AUDIT_DELETE` en el catálogo.

## Endpoints

| Método | Endpoint | Función | Rol | Permiso | Scope |
|---|---|---|---|---|---|
| GET | `/auditoria` | Listado paginado | ADMIN(+SA) | `AUDIT_READ` | Global `audit_logs` |
| GET | `/auditoria/stats` | Agregados / semáforo | ADMIN(+SA) | `AUDIT_READ` | Global |
| GET | `/auditoria/:id` | Detalle | ADMIN(+SA) | `AUDIT_READ` | Global; **404** si no existe |
| GET | `/reportes/auditoria.xlsx` | Export Excel | ADMIN(+SA) | `AUDIT_EXPORT` | Global (tope interno) |
| GET | `/reportes/auditoria.pdf` | Export PDF | ADMIN(+SA) | `AUDIT_EXPORT` | Global; sin columna meta |
| GET | `/documentos/:id/eventos` | Historial documento | Autenticado | `DOC_READ` | `documentoVisibilityWhere` |
| GET | `/documentos/:id/archivos/:archivoId/eventos` | Historial archivo | Autenticado | `DOC_FILES_READ` | Documento visible + archivo del documento |
| POST | `/client-perf/web-vitals` | RUM LCP → `audit_logs` | Autenticado | — | Acción fija; actor JWT |

**No hay** `POST`/`PATCH`/`PUT`/`DELETE` de registros de auditoría para clientes.

## Generación de eventos

- Única escritura de `audit_logs`: `AuditService.log` (servidor).
- `action`, `result`, `resource`, `meta` los definen los servicios (auth, usuarios, documentos, RBAC, reportes, filtros 403/429, backup, etc.).
- `actorUserId` / `actorEmail` / `ip` / `userAgent` salen del contexto JWT/request del caller — **no** del body de un DTO de auditoría.
- `createdAt` lo asigna la BD.
- Meta se serializa con `serializeAuditMetaForPersist` (redacción antes de guardar).

## Historial documental

- `DocumentosService.findEventos` → `loadDocumentoVisibleById` → `documentoVisibilityWhere`.
- Si el viewer no puede abrir el documento: **404** genérico (anti-IDOR), sin listar eventos.

## Historial de archivos

- Misma visibilidad de documento + comprobación `archivoId` pertenece a `documentoId`.
- Archivo ajeno / de otro documento: **404**.

## MetaJson

- Persistencia: redacción central.
- Lectura API: `redactAuditMetaJsonForRead` en listado/detalle.
- Export XLSX: misma redacción; PDF no incluye meta.
- Claves típicas enmascaradas: `password`, `passwordHash`, `token`, `accessToken`, `refreshToken`, `resetToken`, `authorization`, `cookie`, `secret`, `totp`, `totpSecret`, `otp`, `otpauth`, `mfaSecret`, `jwt`, `challengeToken`, etc.

## Datos sensibles

Se permite trazabilidad operativa (`reason`, ids, decisión de revisión) **sin** credenciales. PII mínima (`actorEmail`, IP) visible solo a ADMIN con `AUDIT_READ`.

## Redacción

| Capa | Comportamiento |
|---|---|
| A. Antes de persistir | Sí (`AuditService.log`) |
| B. Al leer API | Sí (`AuditoriaController`) |
| C. Al exportar | Sí (XLSX); PDF omite meta |

## Exportación

- Requiere `AUDIT_EXPORT` (además de rol ADMIN).
- Excel: sanitizer de fórmulas (fase Reportes) + meta redactada.
- UI: botones Exportar solo si el usuario tiene `AUDIT_EXPORT`.

## IDOR/BOLA

| Superficie | Protección |
|---|---|
| Auditoría global | Rol ADMIN + `AUDIT_READ` (USER → 403) |
| Evento por id | Mismo gate; 404 si no existe |
| Historial documento | Scope documental |
| Historial archivo | Scope documental + pertenencia |

Filtros (`actorUserId`, `action`, fechas, …) **restringen** el `where`; el `count` y el `findMany` usan el **mismo** predicado (items y total coherentes). Un USER no alcanza esos filtros.

## Filtros

No amplían privilegios: solo aplican sobre el conjunto ya autorizado (global admin o vacío vía 403).

## Paginación

`total` y `items` comparten `buildAuditWhere`.

## Integridad

| Aspecto | Estado |
|---|---|
| Create | Solo servidor vía `AuditService.log` |
| Update/Delete API | No existen |
| Actor | Servidor |
| Timestamp | Servidor/DB |
| Hash-chain / WORM / SIEM | No implementados (mejora futura) |

## Retención

No hay política automática de borrado/archivado de `audit_logs` en código. Documentar retención institucional fuera de esta fase.

## Matriz por rol

| Función | SUPERADMIN | ADMIN | AUDITOR | REVISOR | USER | CONSULTA | EDITOR_DOC |
|---|---|---|---|---|---|---|---|
| Auditoría global | Sí* | Sí* | No† | No | No | No | No |
| Detalle evento | Sí* | Sí* | No† | No | No | No | No |
| Historial documento | Según doc | Según doc | Según doc | Según doc | Según doc | Según doc | Según doc |
| Historial archivo | Según doc | Según doc | Según doc | Según doc | Según doc | Según doc | Según doc |
| Filtrar | Sí* | Sí* | No† | No | No | No | No |
| Buscar | N/A global | N/A | No | No | No | No | No |
| Exportar | Sí‡ | Sí‡ | No | No | No | No | No |
| Modificar evento | No | No | No | No | No | No | No |
| Eliminar evento | No | No | No | No | No | No | No |

\* Con `AUDIT_READ`.  
† Seed actual sin `AUDIT_*` y API con `@Roles('ADMIN')`.  
‡ Con `AUDIT_EXPORT`.

## Casos prohibidos

1. USER consulta `/auditoria` → 403.  
2. USER abre `/admin/auditoria` → forbidden (rol + `AUDIT_READ`).  
3. USER lee eventos de documento no visible → 404.  
4. Cliente envía `actorId` falsificado en body de auditoría → no hay endpoint que lo acepte.  
5. Persistencia/lectura/export de `password` / tokens / TOTP en meta → `[REDACTED]`.  
6. Mutar o borrar filas de auditoría vía API REST normal → no disponible.

## QA

- Tests: `auditoria.authorization.spec.ts`, `audit.service.spec.ts`, `audit-export-meta.util.spec.ts`, exports reportes (fase previa).  
- Manual: ADMIN listado/filtros/export; USER URL directa → forbidden; historial en detalle documental solo si hay visibilidad.

## Riesgos residuales

| Id | Severidad | Descripción | Mitigación actual / pendiente |
|---|---|---|---|
| R-AUD-01 | Observación funcional | Rol `AUDITOR` sin `AUDIT_READ` / sin auditoría global | **Política actual intencional** (seed + matriz UI); no es vulnerabilidad. Backlog aspiracional en `15-modulo-auditoria.md` no prevalece sobre matriz vigente |
| R-AUD-02 | MEDIO (aceptado) | RUM `CLIENT_WEB_VITAL_LCP` en `audit_logs` | JWT + DTO whitelist + action fija + `@Throttle(40/min)` + global 200/min; deuda: tabla dedicada |
| R-AUD-03 | BAJO | `actorEmail contains` | Solo actores con auditoría global; no amplía scope |
| R-AUD-04 | BAJO | Sin retención automática ni hash-chain | Mejora futura de gobernanza; no bloquea versionado |

## Correcciones de esta fase (código)

- Redacción al **persistir** y al **leer** meta.  
- `GET /auditoria/:id` → **404** si no existe.  
- UI: `PermissionRoute(AUDIT_READ)` + botones export condicionados a `AUDIT_EXPORT`.  
- Tests de autorización/redacción/persistencia + anti-falsificación RUM + historial archivo IDOR.

## QA final pre-commit

### client-perf / RUM

| Campo audit | Fuente | Manipulable por cliente |
|---|---|---|
| `action` | Servidor fijo `CLIENT_WEB_VITAL_LCP` | No |
| `result` | Servidor fijo `OK` | No |
| `actorUserId` / `actorEmail` | JWT | No |
| `resourceType` / `resourceId` | Servidor `ClientPerf` / `null` | No |
| `correlationId` | Servidor `null` | No |
| `createdAt` | BD | No |
| `meta.metric|valueMs|rating|pathname|navigationType|metricId` | DTO validado | Solo dentro de rangos/whitelist |
| Headers Authorization / cookies / password | No se aceptan en DTO | Rechazo `forbidNonWhitelisted` |

- Auth: JWT obligatorio.  
- Rate-limit: `@Throttle({ limit: 40, ttl: 60_000 })` + ThrottlerGuard global 200/min.  
- Log flooding: mitigado (no ilimitado); residual MEDIO por compartir tabla con evidencia.  
- `audit_logs` **sí** documentado para RUM (`docs/15`, `docs/40`); es deuda de diseño mezclar telemetría con evidencia de seguridad.  
- Comentario solo en `client-perf.controller.ts` de esta fase: **REVERTIDO** (sin ruido en commit).

### Decisión AUDITOR

- Seed: mismos permisos base que `CONSULTA` (`DOC_*` lectura + dashboard); **sin** `AUDIT_*`.  
- Matriz UI/backend: módulo «Auditoría del sistema» = **false** para AUDITOR.  
- API: `@Roles('ADMIN')` + `AUDIT_READ` (no admite rol AUDITOR).  
- Intención real: lectura documental / auditoría de **negocio**, no auditoría global de seguridad.  
- Decisión: **no cambiar seed**; no bloquear versionado. Observación funcional, no vulnerabilidad.

### Meta persistida

- `AuditService.log` → `serializeAuditMetaForPersist` antes de `prisma.create`.  
- Lectura API y export también redactan.

### QA ADMIN / USER / historial

- ADMIN UI 1440×900 (`admin@local.test` + MFA): `/admin/auditoria` OK — listado (1055 en rango por defecto), stats, filtros (`AUTH_LOGIN_FAIL` → 53), paginación (1–10 → 11–20), detalle MFA/login-fail sin secretos (motivo `BAD_PASSWORD` operacional), Exportar Excel/PDF visibles (`AUDIT_EXPORT`), console 0 errores, Network `GET /auditoria`+`/stats` 200, id inexistente **404**.  
- USER: sin menú Administración; `GET /auditoria*` → **403**; sin `AUDIT_READ`.  
- Historial documento/archivo (API USER): visible → 200; ajeno → **404** (también tests).

### Riesgos residuales aceptados para versionar

- RUM en `audit_logs` (MEDIO, throttled).  
- `actorEmail contains` (BAJO).  
- Sin retención automática (BAJO / gobernanza futura).  
- AUDITOR sin global: política, no bug.
