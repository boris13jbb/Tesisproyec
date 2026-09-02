# Matriz de visibilidad del Dashboard por rol

Documento generado tras auditoría de mínimo privilegio (frontend + backend).  
**Endpoint:** `GET /api/v1/dashboard/summary` — requiere permiso `DASHBOARD_SUMMARY`.

## Roles del sistema

| Rol | Descripción | Alcance esperado |
|---|---|---|
| **SUPERADMIN** | Cuenta técnica de mantenimiento y contingencia | Vista administrativa global; protección especial en mutaciones |
| **ADMIN** | Administrador institucional | Gestión completa según permisos (todos en seed MVP) |
| **USUARIO** | Usuario operativo documental | Solo documentos visibles en su ámbito + «Mi actividad» |
| **REVISOR** | Revisor documental | Alcance documental + pendientes de revisión si tiene `DOC_REVISION_RESOLVE` |
| **AUDITOR** | Auditor interno (consulta) | Lectura documental en ámbito; auditoría solo con `AUDIT_READ` |
| **CONSULTA** | Solo lectura | Igual que USUARIO en MVP (sin crear por defecto) |
| **EDITOR_DOC** | Complemento de edición | Permisos granulares de edición/archivos; no es administrador |

## Permisos relevantes

| Permiso | Uso en Dashboard |
|---|---|
| `DASHBOARD_SUMMARY` | Acceso al endpoint (todos los roles base) |
| `DASHBOARD_ADMIN_READ` | KPI admin: Likert, compliance, lastSignals, insights operativos |
| `USERS_READ` | Actividad por usuario, resumen usuarios |
| `AUDIT_READ` | Auditoría/evaluación compacta, resumen auditoría hoy |
| `DOC_REVISION_RESOLVE` | Pendientes de revisión y acción rápida «Revisar pendientes» |
| `DOC_CREATE` + `DOC_FILES_UPLOAD` | Acción «Nuevo documento» |
| `REPORTS_EXPORT` | Acción «Reportes» |

## Matriz de bloques

| Bloque | SUPERADMIN | ADMIN | REVISOR | AUDITOR | USUARIO |
|---|---|---|---|---|---|
| KPIs documentales | Global (`docWhere` sin filtro) | Global | Alcance | Alcance | Propio/alcance |
| Gestión documental | ✅ | ✅ | ✅ | ✅ | ✅ (alcance) |
| Distribución por tipo | ✅ | ✅ | ✅ | ✅ | ✅ (alcance) |
| Documentos por mes | ✅ | ✅ | ✅ | ✅ | ✅ (alcance) |
| Tipo documental × mes | ✅ | ✅ | ✅ | ✅ | ✅ (alcance) |
| Actividad del mes | ✅ | ✅ | ✅ | ✅ | ✅ (alcance) |
| **Mi actividad** | ❌ | ❌ | ✅ | ✅ | ✅ |
| Pendientes revisión | ✅ | ✅ | ✅ si `DOC_REVISION_RESOLVE` | ❌ | ❌ |
| Acciones rápidas | Según permisos | Según permisos | Según permisos | Según permisos | Según permisos |
| Actividad reciente | Institucional | Institucional | Propia | Propia | Propia |
| Auditoría/evaluación (Likert) | ✅ | ✅ | ❌ | ✅ si `AUDIT_READ` | ❌ |
| Actividad por usuario | ✅ | ✅ si `USERS_READ` | ❌ | ❌ | ❌ |
| Indicadores operativos | ✅ | ✅ | ❌ | Parcial si permisos | ❌ |
| Alertas admin (403/login/backup) | ✅ | ✅ | ❌ | ❌ | ❌ |
| Alertas pendientes revisión | ✅ (scoped) | ✅ | ✅ scoped | ✅ scoped | ✅ scoped |
| Estado del servicio | ✅ | ✅ | ❌ | ❌ | ❌ |

**Leyenda:** ✅ = visible | ❌ = oculto y omitido en API | «alcance» = `documentoVisibilityWhere(viewer)` + `activo: true`

## Control por capa

| Bloque | Control |
|---|---|
| KPIs, gestión, gráficos documentales | **Alcance documental** (`documentoVisibilityWhere`) |
| Mi actividad | **Rol** (no ADMIN) + `createdById` |
| Actividad por usuario | **Rol ADMIN** o permiso **`USERS_READ`** |
| Likert + compliance | **Rol ADMIN** o **`DASHBOARD_ADMIN_READ`** o **`AUDIT_READ`** |
| lastSignals (backup/audit/login) | **Rol ADMIN** o **`DASHBOARD_ADMIN_READ`** |
| Alertas seguridad | **Solo ADMIN/SUPERADMIN** |
| Estado servicio (UI) | **Solo ADMIN/SUPERADMIN** |
| Pendientes lista | **REVISOR** o **`DOC_REVISION_RESOLVE`** o ADMIN |
| Acciones rápidas | **Permiso + acceso real a ruta** (ver § Navegación) |

## Payload API — campos sensibles

| Campo | USER típico | ADMIN |
|---|---|---|
| `actividadPorUsuario` | `null` | Array o `null` sin `USERS_READ` |
| `usuariosResumen` | `null` | Objeto o `null` |
| `auditResumen` | `null` | Objeto si `AUDIT_READ`/admin |
| `compliance` | `[]` | Array completo |
| `lastSignals` | Todos `null` | Timestamps reales |
| `evaluacionLikert` | Vacío (ceros) | Datos reales |
| `miActividadDocumental` | Objeto | `null` |

## Sidebar (coherencia breve)

- **Reportes / Administración / Catálogos:** solo `ADMIN`/`SUPERADMIN` (`RoleRoute`).
- **Nuevo documento:** `DOC_CREATE` + `DOC_FILES_UPLOAD`.
- REVISOR no ve menú admin; usa dashboard para pendientes.

## Navegación y acciones rápidas

**Regla (fase actual):** visibilidad del botón = **permiso necesario** **Y** **acceso real a la ruta** (`RoleRoute` / `PermissionRoute` en `App.tsx`).

Helper: `resolveDashboardRouteAccess()` en `frontend/src/components/dashboard/dashboard-visibility.ts`.

| Acción | Ruta | Guard frontend | Permiso backend | Roles con botón visible |
|---|---|---|---|---|
| Nuevo documento | `/documentos/nuevo` | `PermissionRoute`: `DOC_CREATE` + `DOC_FILES_UPLOAD` | Igual | Quien tenga ambos permisos (o ADMIN) |
| Revisar pendientes | `/documentos?estado=EN_REVISION` | `ProtectedRoute` | `DOC_REVISION_RESOLVE` o rol REVISOR | REVISOR, ADMIN, SUPERADMIN |
| Mis documentos | `/documentos` | `ProtectedRoute` | Autenticado | Todos |
| Documentos registrados | `/documentos?estado=REGISTRADO` | `ProtectedRoute` | Autenticado (no admin) | USUARIO y roles no admin |
| Usuarios | `/admin/usuarios` | `RoleRoute`: ADMIN, SUPERADMIN | `USERS_READ` | **Solo ADMIN / SUPERADMIN** |
| Auditoría | `/admin/auditoria` | `RoleRoute`: ADMIN, SUPERADMIN | `AUDIT_READ` | **Solo ADMIN / SUPERADMIN** |
| Reportes | `/reportes` | `RoleRoute`: ADMIN, SUPERADMIN | `REPORTS_EXPORT` | **Solo ADMIN / SUPERADMIN** |
| Perfil | `/perfil` | `ProtectedRoute` | Autenticado | Todos |

### Permiso backend vs ruta frontend (casos documentados)

| Rol / permiso | Situación |
|---|---|
| **AUDITOR** + `AUDIT_READ` | Permiso en backend; ruta `/admin/auditoria` aún exige ADMIN/SUPERADMIN → **no** se muestra acción rápida Auditoría. |
| **USUARIO** + `USERS_READ` (hipotético) | Mismo criterio para Usuarios/Reportes → botón oculto si `RoleRoute` no admite el rol. |
| **REVISOR** | No ve Usuarios/Auditoría/Reportes en sidebar ni en quick actions. |

Sidebar y acciones rápidas comparten la misma política para rutas administrativas (`isAdmin` / `RoleRoute`).

## Referencia de implementación

- Backend: `backend/src/dashboard/dashboard-summary-visibility.util.ts`
- Frontend: `frontend/src/components/dashboard/dashboard-visibility.ts`
- Servicio: `backend/src/dashboard/dashboard.service.ts` → `getSummary()`
