# Plan de rediseño — Dashboard profesional SGD-GADPR-LM

## Objetivo

Transformar el panel principal en un dashboard ejecutivo institucional: jerarquía visual clara, KPIs semánticos, distribución documental, gráfico mensual, pendientes, actividad reciente, alertas y accesos rápidos — respetando RBAC y visibilidad documental existente.

## Arquitectura visual

```
┌─────────────────────────────────────────────────────────────┐
│ HEADER: saludo contextual · fecha · rol · dependencia       │
├─────────────────────────────────────────────────────────────┤
│ KPI GRID (6 estados documentales + contexto secundario)     │
├──────────────────────────┬──────────────────────────────────┤
│ Gestión documental         │ Actividad del mes (comparativa)  │
│ (barras + % reales)        │                                  │
├──────────────────────────┴──────────────────────────────────┤
│ Gráfico documentos por mes (12 meses)                       │
├──────────────────────────┬──────────────────────────────────┤
│ Requieren atención         │ Acciones rápidas (por permiso)   │
├──────────────────────────┼──────────────────────────────────┤
│ Actividad reciente         │ Alertas                          │
├──────────────────────────┴──────────────────────────────────┤
│ [ADMIN] Usuarios · Actividad del sistema · Indicadores ISO   │
│ [ADMIN] Evaluación Likert · Estado servicio (existente)     │
└─────────────────────────────────────────────────────────────┘
```

## Componentes reutilizados

| Componente | Uso |
|------------|-----|
| `PageHeader` | Base de acciones superiores (actualizar, notificaciones) |
| `listSurfaceSx` | Superficie de cards y paneles |
| `DocumentosMonthlyChart` | Gráfico mensual (mejorado visualmente) |
| `EvaluacionLikertCharts` | Semáforo documental (sin cambios funcionales) |
| `EmptyState` | Estados vacíos en secciones |
| `documento-estado.ts` | Labels y tonos semánticos |
| `audit-actions.ts` | Etiquetas de actividad |
| `dashboard-alert-navigation.ts` | Enrutado de alertas |
| `role-utils.ts` | Admin / revisor |

## Componentes nuevos (`frontend/src/components/dashboard/`)

| Componente | Responsabilidad |
|------------|-----------------|
| `DashboardHeader` | Bienvenida, fecha, rol, dependencia |
| `DashboardKpiCard` | Tarjeta KPI ejecutiva reutilizable |
| `DashboardKpiGrid` | Fila responsiva de 6 KPIs documentales |
| `DashboardDocumentStatus` | Bloque «Gestión documental» con barras |
| `DashboardMonthlyComparison` | Actividad del mes vs mes anterior |
| `DashboardPendingReview` | Pendientes EN_REVISION |
| `DashboardRecentActivity` | Últimas acciones de auditoría |
| `DashboardAlerts` | Alertas operativas + ack admin |
| `DashboardQuickActions` | Accesos según permisos |
| `DashboardUsersSummary` | Resumen usuarios (admin) |
| `DashboardAuditSummary` | Actividad del sistema hoy (admin) |
| `DashboardSkeleton` | Loading sin layout shift |
| `DashboardErrorState` | Error con reintentar |
| `dashboard-types.ts` | Tipos alineados al API |
| `dashboard-utils.ts` | Saludo, fechas, porcentajes |

## Datos existentes (endpoint `GET /dashboard/summary`)

- `kpis.*`, `documentos.*`, `documentosPorMes`, `documentosRecientes`
- `evaluacionLikert`, `compliance`, `lastSignals`, `alertasItems`

## Datos adicionales (extensión del mismo endpoint)

| Campo | Descripción | Visibilidad |
|-------|-------------|-------------|
| `actividadMes` | Este mes, mes anterior, variación %, mensaje | Todos |
| `actividadReciente` | Hasta 8 eventos auditados con etiqueta legible | Alcance por rol |
| `pendientesRevision` | Hasta 5 documentos EN_REVISION con tipo | Quien ve pendientes |
| `usuariosResumen` | Activos / inactivos | Admin |
| `auditResumen` | Acciones hoy (ok/fail) | Admin |
| `viewer.dependenciaNombre` | Dependencia del usuario autenticado | Todos (si existe) |

## Jerarquía de color (estados)

| Estado | Acento |
|--------|--------|
| Registrado | `info` / azul neutro |
| Borrador | `secondary` / gris |
| En revisión | `warning` |
| Aprobado | `success` |
| Rechazado | `error` |

Fondo neutro en cards; color en borde, icono, chip o barra fina.

## Diseño responsive

| Breakpoint | Comportamiento |
|------------|----------------|
| ≥1440px | 3 columnas en bloques secundarios; KPIs en 3×2 |
| 1024–1366 | 2 columnas; KPIs 3+3 o 2×3 |
| 768 tablet | 2 columnas donde aplique; gráfico con scroll interno |
| &lt;600 mobile | 1 columna; orden: header → KPIs → pendientes → gráfico → actividad → acciones |

## Comportamiento por rol

| Rol | Contenido |
|-----|-----------|
| **SUPERADMIN / ADMIN** | KPIs globales (ámbito admin), usuarios, auditoría, alertas, compliance, servicio |
| **REVISOR** (con permiso) | Pendientes, KPIs en su ámbito, actividad propia o documental visible |
| **USER** | Solo documentos visibles (`documentoVisibilityWhere`), sin stats globales prohibidas |

## Performance

- Un solo `GET /dashboard/summary` (sin N+1).
- Reutilizar agregaciones existentes; añadir consultas acotadas en paralelo (`Promise.all`).
- Skeletons en carga; sondeo silencioso cada 30s conservado.

## Validación

### Validación técnica

- [x] Backend lint — 0 errores (2026-09-01)
- [x] Backend build — OK (2026-09-01)
- [x] Backend tests — 16 suites / 86 tests OK (incl. `dashboard-mes-comparacion.util.spec.ts`)
- [x] Frontend lint — 0 errores (2026-09-01)
- [x] Frontend build — OK (2026-09-01)

### QA visual — Dashboard (IronBee DevTools, sesión `superadmin@local.test`)

| Viewport | Estado | Evidencia / notas |
|----------|--------|-------------------|
| 1440×900 | [x] | Captura + ARIA: header, 6 KPIs, gestión documental, actividad del mes, gráfico 12 meses, pendientes, acciones rápidas, actividad reciente, alertas, bloques admin (usuarios, auditoría, Likert, indicadores). Sin overflow global. |
| 1024×768 | [x] | Captura full-page: layout 2 columnas, KPIs legibles, gráfico usable, sidebar visible. |
| 768×1024 | [x] | Captura + ARIA: menú hamburguesa, contenido en 1 columna, scroll vertical correcto, sin componentes cortados en viewport inicial. |
| 390×844 | [x] | Verificado en sesión mobile (misma estructura que 768×1024): header compacto, KPIs apilados, acciones rápidas y listas con scroll. |

Problemas visuales corregidos en esta fase: ninguno detectado que requiriera cambio de código.

### QA visual — Usuarios y roles (`/admin/usuarios`, SUPERADMIN)

| Viewport | Estado | Evidencia / notas |
|----------|--------|-------------------|
| 1440×900 | [x] | Pestaña Matriz de acceso: cabecera, primera columna fija, checks, leyenda, scroll horizontal controlado. |
| 1024×768 | [!] | No captura dedicada; comportamiento esperado igual a 1440 con scroll horizontal en matriz (verificado por código + snapshot 1440). |
| 768×1024 | [x] | Pestaña Usuarios: cards mobile, filtros, resumen, paginación, menú acciones por fila. |
| 390×844 | [x] | Captura: tabs Usuarios/Roles/Matriz, buscador, filtros, cards mobile, botón Crear usuario accesible. |

### QA por rol

| Rol | Estado | Notas |
|-----|--------|-------|
| SUPERADMIN | [x] | Dashboard completo + administración usuarios/roles probados en UI. |
| ADMIN | [!] | No sesión dedicada en esta corrida (cuentas admin con MFA). Bloques admin del dashboard validados con SUPERADMIN (equivalente funcional). |
| USER | [!] | Sin credenciales TOTP disponibles en automatización. Alcance documental restringido confirmado en backend (`documentoVisibilityWhere` en `dashboard.service.ts`). |

### PermissionRoute — `/documentos/nuevo`

- [x] Ruta protegida con `DOC_CREATE` + `DOC_FILES_UPLOAD` (`App.tsx` + `PermissionRoute.tsx`).
- [x] SUPERADMIN accede a formulario «Registrar nuevo documento» (navegación por acción rápida).
- [x] Coherencia con `MainLayout` / `DocumentosPage` (mismos permisos para mostrar acción).
- [!] USER sin permisos: denegación a `/forbidden` verificada por implementación; prueba visual con sesión USER pendiente de credenciales MFA.
- [x] Backend mantiene `@Permissions(PERM.DOC_CREATE)` en `POST /documentos`.
