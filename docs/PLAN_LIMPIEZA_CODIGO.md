# Plan de limpieza de código — Tesisproyec

Checkpoint de referencia: `v1.0-revision-tutor-completada`

## Estado inicial

- Proyecto estable: auth, MFA, RBAC, documentos, dashboard, auditoría, reportes y tests operativos.
- Trabajo previo reciente: rediseño dashboard y módulo Usuarios (sin commit pendiente de revisión visual).
- Objetivo de esta fase: limpieza segura, consolidación de duplicados menores y documentación técnica — **sin cambiar reglas de negocio ni UI**.

## Áreas revisadas

| Área | Alcance |
|------|---------|
| Backend NestJS | controllers, services, guards, utils, DTOs, módulos |
| Frontend React | pages, components, hooks, utils, routes, constants |
| Prisma | schema y migraciones (solo lectura; sin cambios estructurales) |
| Docs / scripts | inventario; sin eliminar documentación histórica |
| Dependencias npm | revisión por referencias; sin desinstalación agresiva |

## Código muerto detectado

| Elemento | Ubicación | Evidencia | Acción |
|----------|-----------|-----------|--------|
| `institutional-ux.ts` completo | `frontend/src/constants/` | 0 imports en repo (`STANDARDS_PROJECT_NOTE`, `SPLASH_TRUST_ITEMS`, `complianceMetricEvidenceLabel`) | [x] Eliminar |
| `mensajeErrorApi()` wrapper | `UsuariosPage.tsx` | Alias trivial de `getApiErrorMessage` | [x] Eliminar; usar helper central |
| `displayUsuario()` local | `UserAccessDrawer.tsx` | Duplica `user-display.ts` | [x] Consolidar import |

## Duplicaciones detectadas

| Duplicación | Fuente única elegida | Acción |
|-------------|---------------------|--------|
| `displayUsuario` en drawer vs `user-display.ts` | `components/admin/users/user-display.ts` | [x] Consolidar |
| `mensajeErrorApi` vs `getApiErrorMessage` | `utils/api-error-message.ts` | [x] Consolidar |
| Checks admin frontend (`userHasAdminAccess`) | `auth/role-utils.ts` | [x] Ya centralizado — sin cambios |
| Checks admin backend (`jwtUserIsAdmin`) | `auth/request-user.ts` | [x] Ya centralizado — sin cambios |
| RBAC SUPERADMIN backend | `auth/rbac-policy.util.ts` | [x] Mantener — capa de seguridad |

## Archivos candidatos a eliminación

| Archivo | Estado |
|---------|--------|
| `frontend/src/constants/institutional-ux.ts` | [x] Eliminado (sin referencias) |
| Migraciones Prisma | [!] Bloqueado — no eliminar |
| `docs/PLAN_DASHBOARD_PROFESIONAL.md` | [!] Bloqueado — documentación de trabajo reciente |

## Riesgos

- **NestJS metadata**: providers/guards usados vía decorators — no eliminar sin revisar módulos.
- **Rutas lazy**: componentes cargados en `lazyPages.tsx` pueden no aparecer en imports directos.
- **Seguridad por capas**: RBAC en UI + backend + `rbac-policy.util` — no fusionar agresivamente.
- **Prisma**: migraciones y seed intocables en esta fase.

## Plan de refactorización

| Fase | Descripción | Estado |
|------|-------------|--------|
| 0 | Crear este plan | [x] |
| 1 | Inventario backend/frontend | [x] |
| 2 | Imports no utilizados | [x] |
| 3 | Variables/constantes sin uso | [x] |
| 4 | Funciones no utilizadas | [x] |
| 5 | Componentes React sin uso | [x] |
| 6 | Páginas y rutas | [x] Verificadas — todas enrutadas |
| 7 | Backend NestJS | [x] Sin providers huérfanos detectados |
| 8 | DTOs | [x] Todos referenciados en controllers |
| 9–11 | Utils duplicados | [x] Consolidación menor frontend |
| 12 | Archivos sin uso | [x] 1 archivo eliminado |
| 13 | Barrel files | [x] No existen `index.ts` en el repo |
| 14 | Código comentado | [x] Sin bloques grandes detectados |
| 15 | console.log debug | [x] Solo seed + warn de arranque (intencional) |
| 16 | TODO/FIXME | [x] Ninguno en código productivo |
| 17–19 | Comentarios/JSDoc | [x] Añadidos en `role-utils.ts` |
| 24 | Dependencias npm | [x] Todas con referencias verificadas |
| 26 | Prisma | [x] Sin cambios |
| 27–28 | Seguridad / auditoría | [x] Sin modificaciones semánticas |
| 32 | Validación final | [x] Completado |

## Resultado de validaciones (2026-09-01)

| Check | Resultado |
|-------|-----------|
| Backend lint | ✅ OK |
| Backend build | ✅ OK |
| Backend tests | ✅ 16 suites / 86 tests |
| Frontend lint | ✅ 0 errores |
| Frontend build | ✅ OK |
| Smoke test | ✅ `/login` carga correctamente (MFA bloquea flujo completo automatizado) |

## Métricas de esta fase de limpieza

| Métrica | Valor |
|---------|-------|
| Archivos eliminados | 1 (`institutional-ux.ts`) |
| Funciones eliminadas/consolidadas | 2 (`mensajeErrorApi`, `displayUsuario` local en drawer) |
| Duplicaciones consolidadas | 2 |
| Dependencias npm eliminadas | 0 |
| Cambios estructurales DB | 0 |
| Comentarios JSDoc añadidos | 4 funciones en `role-utils.ts` |

## Archivos que requieren revisión manual

- Cambios previos sin commitear (dashboard, usuarios, backend dashboard) conviven en el working tree — revisar diff completo antes de versionar.
- `SplashInicioPage` nunca consumió `institutional-ux.ts`; si se desean textos de cumplimiento en splash, reintroducirlos de forma conectada (no como archivo huérfano).
