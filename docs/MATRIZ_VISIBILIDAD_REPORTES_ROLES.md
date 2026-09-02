# Matriz de visibilidad — Módulo Reportes (SGD-GADPR-LM)

> Auditoría de seguridad por rol — mínimo privilegio (OWASP ASVS V4, ISO/IEC 27001, ISO 15489).  
> Base estable: commit `aa21ed0` (Dashboard). Sin cambios MFA/Prisma/DB en esta fase.

---

## 1. Roles confirmados (seed + JWT)

| Código | Descripción seed |
|--------|------------------|
| `SUPERADMIN` | Mantenimiento; todos los permisos |
| `ADMIN` | Gestión institucional; todos los permisos |
| `USUARIO` | Operativo documental (alcance propio/dependencia) |
| `REVISOR` | Revisión documental + export pendientes |
| `AUDITOR` | Solo lectura documental (sin reportes institucionales) |
| `CONSULTA` | Solo lectura (igual base que AUDITOR en seed) |
| `EDITOR_DOC` | Complemento granular (sin reportes) |

---

## 2. Permisos relevantes

| Permiso | Uso real en Reportes |
|---------|----------------------|
| `REPORTS_EXPORT` | Exportes institucionales (documentos, usuarios, agregados, documentos-por-usuario, etc.) — **ADMIN/SUPERADMIN** |
| `REPORTS_PENDIENTES` | Export **pendientes-revision** (PDF/XLSX) — **ADMIN, REVISOR** |
| `AUDIT_EXPORT` | Export auditoría PDF/XLSX — **ADMIN/SUPERADMIN** |
| `AUDIT_READ` | UI listado auditoría (`/admin/auditoria`); no sustituye `AUDIT_EXPORT` en exports |
| `USERS_READ` | UI usuarios; export `usuarios.xlsx` exige **`REPORTS_EXPORT`** (no `USERS_READ` aislado) |
| `DASHBOARD_ADMIN_READ` | Gráfico `/dashboard/admin/documentos-por-tipo` en pantalla Reportes — **ADMIN/SUPERADMIN** |
| `DOC_READ` | Prerrequisito operativo; no abre módulo Reportes |

**USER / CONSULTA / AUDITOR / EDITOR_DOC (seed):** no tienen `REPORTS_EXPORT`, `REPORTS_PENDIENTES` ni `AUDIT_EXPORT`.

---

## 3. Inventario de reportes reales

| Reporte | Ruta UI | Endpoint API | Exportación | Permiso + rol |
|---------|---------|--------------|-------------|---------------|
| Pantalla reportes institucionales | `/reportes`, `/admin/reportes` | — | — | `RoleRoute` ADMIN/SUPERADMIN |
| Inventario documental | Reportes + `/documentos` (solo ADMIN botones Excel/PDF) | `GET /reportes/documentos.{xlsx,pdf}` | PDF, XLSX | `@Roles('ADMIN')` + `REPORTS_EXPORT` |
| Pendientes de revisión | `/documentos` (REVISOR) | `GET /reportes/pendientes-revision.{xlsx,pdf}` | PDF, XLSX | `@Roles('ADMIN','REVISOR')` + `REPORTS_PENDIENTES` |
| Auditoría (bitácora) | Reportes | `GET /reportes/auditoria.{xlsx,pdf}` | PDF, XLSX | `@Roles('ADMIN')` + `AUDIT_EXPORT` |
| Usuarios activos | Reportes | `GET /reportes/usuarios.xlsx` | XLSX | `@Roles('ADMIN')` + **`REPORTS_EXPORT` AND `USERS_READ`** |
| Documentos por dependencia | Reportes | `GET /reportes/documentos-por-dependencia.xlsx` | XLSX | `@Roles('ADMIN')` + `REPORTS_EXPORT` |
| Documentos por estado | Reportes | `GET /reportes/documentos-por-estado.xlsx` | XLSX | `@Roles('ADMIN')` + `REPORTS_EXPORT` |
| Actividad de revisión | Reportes | `GET /reportes/actividad-revision.xlsx` | XLSX | `@Roles('ADMIN')` + `REPORTS_EXPORT` |
| Próximos vencimientos | Reportes | `GET /reportes/proximos-vencimiento.xlsx` | XLSX | `@Roles('ADMIN')` + `REPORTS_EXPORT` |
| Documentos por usuario | Reportes (sección dedicada) | `GET /reportes/documentos-por-usuario` (+ `.xlsx`, `.pdf`) | JSON, PDF, XLSX | `@Roles('ADMIN')` + `REPORTS_EXPORT` |
| Gráfico documentos por tipo | Reportes (indicador) | `GET /dashboard/admin/documentos-por-tipo` | — | `@Roles('ADMIN')` + `DASHBOARD_ADMIN_READ` |
| Verificaciones respaldo | Reportes (atajo) | `GET /reportes/auditoria.*?action=BACKUP_VERIFIED` | PDF, XLSX | `@Roles('ADMIN')` + `AUDIT_EXPORT` |

**CSV:** no implementado en el proyecto.

---

## 4. Matriz Reportes × Rol

Leyenda: **GLOBAL** = institucional sin `documentoVisibilityWhere`; **ALCANCE** = `documentoVisibilityWhere(viewer)`; **NO** = 403 / sin menú.

| Reporte / función | SUPERADMIN | ADMIN | REVISOR | AUDITOR | USUARIO | CONSULTA | EDITOR_DOC |
|-------------------|------------|-------|---------|---------|---------|----------|------------|
| UI `/reportes` | GLOBAL | GLOBAL | NO | NO | NO | NO | NO |
| Export documentos (genérico) | GLOBAL | GLOBAL | NO | NO | NO | NO | NO |
| Export pendientes revisión | ALCANCE* | GLOBAL | ALCANCE | NO | NO | NO | NO |
| Export auditoría | GLOBAL | GLOBAL | NO | NO | NO | NO | NO |
| Export usuarios | GLOBAL | GLOBAL | NO | NO | NO | NO | NO |
| Agregados dep/estado/vencimiento | GLOBAL | GLOBAL | NO | NO | NO | NO | NO |
| Actividad revisión (audit global) | GLOBAL | GLOBAL | NO | NO | NO | NO | NO |
| Documentos por usuario | GLOBAL | GLOBAL | NO | NO | NO | NO | NO |
| Gráfico por tipo (dashboard API) | GLOBAL | GLOBAL | NO | NO | NO | NO | NO |
| Sidebar «Reportes» | Sí | Sí | No | No | No | No | No |
| Dashboard Quick Action Reportes | Sí† | Sí† | No | No | No | No | No |

\* REVISOR: mismo helper `documentoVisibilityWhere`; export solo `EN_REVISION` visible.  
† Requiere `REPORTS_EXPORT` + ruta ADMIN (`resolveDashboardRouteAccess`).

---

## 5. Alcance documental (anti-IDOR)

**Helper central:** `documentoVisibilityWhere(viewer)` en `backend/src/documentos/documento-scope.util.ts`.

**Aplica en ReportesService a:**

- `findDocumentos` (exports documentos + pendientes)
- `aggregateDocumentosPorDependencia`
- `aggregateDocumentosPorEstado`
- `findDocumentosPorUsuario`
- `findProximosVencimiento`
- `findPendientesRevision` → delega en `findDocumentos`

**ADMIN/SUPERADMIN:** `jwtUserIsAdmin` → sin filtro adicional (acceso institucional global).

**No aplica scope documental (datos de auditoría/usuarios globales):**

- `findAuditLogs` / exports auditoría
- `findActividadRevision`
- `findUsuariosActivos`

→ Solo accesibles con rol **ADMIN/SUPERADMIN** y permisos correspondientes.

---

## 6. Filtros y query params

| Filtro | Quién puede usarlo (UI) | Backend |
|--------|-------------------------|---------|
| `fechaDesde` / `fechaHasta` | ADMIN en Reportes | Validado; combinado con scope documental |
| `dependenciaId` | ADMIN | No amplía scope; intersecta con visibilidad |
| `tipoDocumentalId` | ADMIN | Idem |
| `estado` | ADMIN | Idem |
| `createdByUserId` | ADMIN (selector usuarios) | Filtra creador **y** aplica `documentoVisibilityWhere` |
| `q`, adjuntos, `incluirInactivos` | ADMIN (`/documentos`) | Idem |
| Auditoría: `action`, `actorUserId`, `from`, `to` | ADMIN | Global audit_logs (sin scope documento) |

**Manipulación API (USER):** `RolesGuard` rechaza antes del servicio → **403**.  
**Manipulación API (REVISOR):** solo endpoints `pendientes-revision.*` con `REPORTS_PENDIENTES`; resto **403**.

---

## 7. Navegación vs backend

| Capa | Reportes institucionales |
|------|--------------------------|
| `App.tsx` | `RoleRoute(['ADMIN','SUPERADMIN'])` en `/reportes` |
| `MainLayout` sidebar | Sección Reportes solo si `userHasAdminAccess` |
| `ReportesController` | `@Roles('ADMIN')` (+ SUPERADMIN vía guard) |
| Dashboard Quick Action | `canOpenReports` = admin route + `REPORTS_EXPORT` |

**Coherente:** USER no ve menú ni puede abrir URL; API devuelve 403.

**Excepción documentada:** REVISOR exporta pendientes desde **`/documentos`** (no desde `/reportes`).

---

## 8. Exportaciones

| Formato | Endpoints | Scope |
|---------|-----------|-------|
| PDF | documentos, auditoría, pendientes, documentos-por-usuario | Según tabla §4 |
| XLSX | todos los anteriores + agregados + usuarios + actividad | Según tabla §4 |
| CSV | — | No implementado |

**Descarga directa:** requiere JWT (cookie HttpOnly / bearer según cliente); sin token → 401.

**Trazabilidad:** cada export registra `REPORT_EXPORTED` en auditoría (`format`, `kind`).

---

## 9. Casos prohibidos (verificados por diseño)

- USER exportar inventario global de documentos → **403** (rol).
- USER `?createdByUserId=otro` → **403** (rol).
- REVISOR export auditoría / usuarios → **403** (rol/permiso).
- AUDITOR acceder `/reportes` → **403** frontend + API.
- Pantalla 3 docs / export 18 (USER) → **no aplica** (USER sin acceso a exports institucionales); REVISOR pendientes usa mismo scope que listado.

---

## 10. Hallazgos de auditoría (sin corregir arquitectura)

| Severidad | Hallazgo | Estado hardening |
|-----------|----------|------------------|
| ~~MEDIO~~ | `usuarios.xlsx` exigía solo `REPORTS_EXPORT` | ✅ Corregido: AND con `USERS_READ` |
| MEDIO | `actividad-revision.xlsx` y auditoría son **globales** (by design ADMIN). | Sin cambio |
| MEDIO | AUDITOR en seed **sin** `AUDIT_READ`/`AUDIT_EXPORT` | Sin cambio |
| ~~BAJO~~ | Sin sanitización Excel formula injection | ✅ `sanitizeSpreadsheetCell` en todos los XLSX |
| ~~BAJO~~ | Export auditoría incluye `metaJson` completo | ✅ Redacción claves sensibles; trazabilidad operativa conservada |
| BAJO | `docs/16-modulo-reportes.md` parcialmente desactualizado | Pendiente doc legacy |

---

## 13. Hardening de exportaciones (fase final)

### 13.1 Autorización `usuarios.xlsx`

- **Antes:** `@Permissions(PERM.REPORTS_EXPORT)` únicamente.
- **Después:** `@Permissions(PERM.REPORTS_EXPORT, PERM.USERS_READ)` — semántica **AND** (documentada en `permissions.decorator.ts` y `PermissionsGuard`).
- **Tests:** `reportes.usuarios-export.authorization.spec.ts` (ADMIN ambos, ADMIN uno solo, USER, SUPERADMIN).

### 13.2 Protección formula injection (XLSX)

- **Helper:** `backend/src/common/spreadsheet-sanitize.util.ts`
- **Aplicación:** `addSanitizedSpreadsheetRow` en `reportes-spreadsheet.util.ts` — todos los exports XLSX del `ReportesController`.
- **Regla:** strings que inician con `=`, `+`, `-`, `@`, tab o CR reciben prefijo `'`.
- **Preservado:** números, booleanos, fechas; PDF sin cambios.
- **Tests:** `spreadsheet-sanitize.util.spec.ts` (incluye verificación ExcelJS sin `cell.formula`).

### 13.3 Auditoría `metaJson`

- **Helper:** `backend/src/auditoria/audit-export-meta.util.ts`
- **Contenido típico:** `decision`, `motivoRechazo`, `documentoId`, `format`, `kind`, `purpose` — operativo y seguro.
- **Riesgo:** claves como `password`, `token`, `accessToken`, `secret`, `totp`, etc. podrían filtrarse si algún flujo las registrara en meta.
- **Decisión:** redactar claves sensibles → `[REDACTED]`; **no** eliminar columna metaJson (trazabilidad ISO 15489).
- **Tests:** `audit-export-meta.util.spec.ts`.

### 13.4 Tests de hardening

| Archivo | Casos |
|---------|-------|
| `reportes.usuarios-export.authorization.spec.ts` | 5 escenarios guard |
| `spreadsheet-sanitize.util.spec.ts` | formula injection + tipos |
| `audit-export-meta.util.spec.ts` | redacción meta |

---

## 11. QA recomendado

| Rol | Acción | Esperado |
|-----|--------|----------|
| SUPERADMIN | `/reportes` + export documentos | 200, datos globales |
| ADMIN | Idem | 200, datos globales |
| USER | URL `/reportes` | `/forbidden`; API `/reportes/*` → 403 |
| REVISOR | `/documentos` → Pendientes Excel/PDF | 200, solo docs visibles EN_REVISION |
| REVISOR | `/reportes` | `/forbidden` |
| AUDITOR | `/reportes` | `/forbidden` |

---

## 12. Tests backend (seguridad)

- `documentos-por-usuario.service.spec.ts` — filtros, revisión, scope REVISOR/ADMIN.
- `reportes.service.security.spec.ts` — scope en `findDocumentos`, agregados, pendientes, `createdByUserId`+scope.
- `reportes.usuarios-export.authorization.spec.ts` — AND `REPORTS_EXPORT` + `USERS_READ`.
- `spreadsheet-sanitize.util.spec.ts` — anti formula injection.
- `audit-export-meta.util.spec.ts` — redacción metaJson export.

---

*Generado en auditoría Fase Reportes — revisar antes de versionar.*
