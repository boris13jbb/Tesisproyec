# Plan de desarrollo — Correcciones reunión

## Estado general

**Cierre de auditoría 2026-08-29: verificación 100 %.** P1–P12 cerradas. Sesión ADMIN de desarrollo usable (`admin.operativo@local.test`) tras enrolamiento MFA por el flujo normal de login. Autorización `DOC_REVISION_SEND` demostrada con prueba HTTP de integración.

Última actualización: 2026-08-29 (cierre ADMIN runtime + 403 sin `DOC_REVISION_SEND`).

Leyenda: `[x]` completado · `[~]` en proceso · `[ ]` pendiente · `[!]` bloqueado

---

## Diagnóstico (auditoría 2026-08-29)

### Ya implementado (no reconstruir)

- Dashboard por estados, indicador del mes, gráfico mensual, pendientes → `EN_REVISION`.
- Auditoría paginada y diálogo «Ver detalle».
- Soft delete, creador JWT, dependencia, contraparte, beneficiario.
- Cédula/RUC, fecha de registro, vencimiento, mayúsculas, menú Reportes.

### Parcial / con error (esta iteración)

- [x] Bypass `PATCH` → APROBADO/RECHAZADO
- [x] ADMIN no muta matriz SUPERADMIN
- [x] Permisos directos no equivalen a SUPERADMIN
- [x] UI SUPERADMIN vía `userHasAdminAccess`
- [x] `DOC_REVISION_SEND` en `enviar-revision`
- [x] Fecha de emisión unificada en ambos formularios
- [x] Stats: acciones por usuario + `DOC_DEACTIVATED`
- [x] Semáforo: acciones sensibles ampliadas
- [x] Responsable institucional: texto, diferenciado (sin FK)
- [x] Serie: **ACEPTADO FUNCIONALMENTE** (manual, auto si hay una)
- [x] Agregación mensual dashboard (1 consulta)
- [x] Tests de dominio (reglas reales, no mocks de negocio)

### Verificación runtime / responsive

- [x] `npm run lint` backend — OK (0 errores)
- [x] `npm run build` backend — OK
- [x] `npm test` backend — OK (12 suites, 44 tests)
- [x] `npm run build` frontend — OK
- [x] `npm run lint` frontend — OK (0 errores; corregidos `react-hooks` de notificaciones, bandeja, perfil, preview y submit)
- [x] Smoke API + UI SUPERADMIN: health OK; PATCH APROBADO/RECHAZADO → 400; rechazo sin motivo → 400; dashboard 12 meses; stats `porUsuario` + `desactivados`; flujo REGISTRADO → EN_REVISION → APROBADO/RECHAZADO
- [x] Login USER (`usuario.prueba@local.test`) — OK; resolver revisión → 403; menú sin Usuarios/Auditoría/Reportes
- [x] Login ADMIN runtime — `admin.operativo@local.test` (contraseña de desarrollo + MFA TOTP enrolada en `/login`, sin evadir MFA ni cambiar hashes). `admin@local.test` sigue sin coincidir con el seed; no se modificó.
- [x] ADMIN → SUPERADMIN (`PATCH /usuarios/:id`) → **403**
- [x] ADMIN → matriz SUPERADMIN (`PUT /rbac/roles/SUPERADMIN/permissions`) → **403**
- [x] ADMIN revisión documental: pendientes, detalle EN_REVISION, `POST .../resolver-revision` APROBADO y RECHAZADO con motivo (DOC-0011 / DOC-0012)
- [x] ADMIN UI: Dashboard, Documentos, Auditoría, Usuarios, Reportes
- [x] Usuario sin `DOC_REVISION_SEND` → `POST /documentos/:id/enviar-revision` **403** (prueba de integración HTTP con `PermissionsGuard` real; ninguna cuenta permanente de BD carecía del permiso)
- [x] Responsive 1440×900, 1024×768, 768×1024, 390×844 — sin overflow horizontal en Inicio, Documentos, Nuevo documento, Auditoría, Usuarios, Reportes (navegación in-app SUPERADMIN)

---

## Cierre de seguridad — fases 33+

### Fase 33 — Bypass de revisión (PATCH)

- [x] `assertEstadoNoResuelveRevisionViaPatch` en `documento-estado.util.ts`
- [x] `DocumentosService.update` no resuelve APROBADO/RECHAZADO
- [x] UI de edición no ofrece Aprobar/Rechazar como destino de PATCH

**Criterio:** PATCH a APROBADO/RECHAZADO → 400; `resolver-revision` sigue siendo el único camino.

### Fase 34 — Matriz SUPERADMIN

- [x] `assertSuperadminRoleMatrixMutationAllowed` (misma política que usuarios)
- [x] `PUT /rbac/roles/SUPERADMIN/permissions` → 403 si el actor no es SUPERADMIN

### Fase 35 — Permisos directos

- [x] Lista de códigos no asignables por ADMIN (`DOC_REVISION_RESOLVE`, USERS_*, política, backup)
- [x] Rechazo de catálogo completo como excepciones
- [x] SUPERADMIN conserva capacidad superior
- [x] UI oculta esos códigos si el operador no es SUPERADMIN

### Fase 36 — SUPERADMIN en frontend

- [x] `userHasAdminAccess` / `userIsRevisorOrAdmin` en páginas administrativas y documentos

### Fase 37 — DOC_REVISION_SEND

- [x] `@Permissions(PERM.DOC_REVISION_SEND)` en `POST .../enviar-revision`
- [x] Seed ya otorga el permiso a USUARIO/EDITOR_DOC/REVISOR/ADMIN/SUPERADMIN
- [x] Usuario sin `DOC_REVISION_SEND` → 403 (`enviar-revision.authorization.spec.ts`)

### Fase 38 — Fecha de emisión unificada

- [x] `fechaDocumentoEmisionSchema` compartido (Nuevo documento + diálogo Documentos)

### Fase 39 — Auditoría stats y semáforo

- [x] `porUsuario` (top 15)
- [x] `documentos.desactivados` = `DOC_DEACTIVATED` (aparte de archivos)
- [x] Semáforo incluye desactivación, cambios de permisos/roles/estado

### Fase 40 — Responsable institucional y serie

- [x] Sin migración a FK (compatibilidad)
- [x] Textos de ayuda: no es creador / dependencia / contraparte / beneficiario
- [x] Serie: selección manual + auto si hay una sola; documentado como aceptado

### Fase 41 — Dashboard mensual

- [x] Una `findMany` de `createdAt` + agregación en memoria (visibilidad intacta)

### Fase 42 — Tests de dominio

- [x] RBAC policy, transiciones/PATCH, fechas, cédula/RUC, DTO rechazo, serie mensual
- [x] `enviar-revision` sin `DOC_REVISION_SEND` → HTTP 403 (guard real)

---

## Histórico 2026-08-28 (fases 0–32)

El trabajo de esa fecha permanece válido para funcionalidades ya cubiertas. El «100 %» de aquella nota **se retira**: no había tests de dominio ni el cierre de bypass/RBAC de esta auditoría.

---


## Plan por fases

### Fase 0 — Auditoría inicial

- [x] Revisar estructura frontend/backend/Prisma
- [x] Confirmar archivos clave (Dashboard, Documentos, permisos, seed)
- [x] Búsqueda global de enums y constantes

**Criterio de aceptación:** Inventario documentado en este archivo.

---

### Fase 1 — Plan maestro

- [x] Crear `docs/PLAN_CAMBIOS_REUNION.md`
- [x] Checklist por fases con estados reales

**Criterio de aceptación:** Documento creado y actualizable.

---

### Fase 2 — Roles y permisos

- [x] Revisar SUPERADMIN (`role-constants.ts`, `usuarios.service.ts`, `rbac.service.ts`)
- [x] Proteger cuenta SUPERADMIN (modificar, degradar, desactivar)
- [x] ADMIN con `DOC_REVISION_RESOLVE` vía `ALL_PERMISSION_CODES` en seed
- [x] USUARIO sin resolver revisión
- [x] Validación backend en `@Permissions` y `@Roles`
- [x] RolesGuard expande ADMIN → incluye SUPERADMIN

**Criterio de aceptación:** USER recibe 403 al resolver revisión; ADMIN puede aprobar/rechazar.

---

### Fase 3 — Flujo documental

- [x] YA IMPLEMENTADO Y VERIFICADO — envío a revisión
- [x] YA IMPLEMENTADO Y VERIFICADO — aprobación/rechazo con motivo
- [x] YA IMPLEMENTADO Y VERIFICADO — historial y auditoría

**Criterio de aceptación:** Transiciones según `documento-estado.util.ts`.

---

### Fase 4 — Dashboard bloque Documentos

- [x] Bloque con Total, Registrados, Borradores, En revisión, Aprobados, Rechazados
- [x] Datos reales desde `dashboard.service.ts`

**Criterio de aceptación:** Estados coinciden con enum Prisma.

---

### Fase 5 — Indicador documentos del mes

- [x] Texto claro: «N documento(s) registrado(s) este mes»
- [x] Acumulado: «N documento(s) acumulado(s) en meses anteriores»
- [x] Cálculo en backend

**Criterio de aceptación:** Sin indicadores ambiguos tipo «2 +3».

---

### Fase 6 — Estadísticas mensuales backend

- [x] `documentosPorMes` últimos 12 meses
- [x] Meses con cantidad 0
- [x] Respeta visibilidad documental

**Criterio de aceptación:** Array ordenado cronológicamente con `nombreMes`.

---

### Fase 7 — Gráfico mensual

- [x] `DocumentosMonthlyChart` en Dashboard
- [x] Tooltip «Mes Año — N documento(s)»
- [x] Responsive sin dependencia pesada extra

**Criterio de aceptación:** Gráfico visible en 390px–1440px.

---

### Fase 8 — Pendientes de revisión

- [x] KPI `pendientesRevision` = estado EN_REVISION
- [x] Clic navega a listado filtrado

**Criterio de aceptación:** Navegación funcional desde KPI y campana.

---

### Fase 9 — Auditoría paginación

- [x] Backend `GET /auditoria` con page, pageSize, total
- [x] Frontend `TablePagination` 10 por defecto

**Criterio de aceptación:** No descarga masiva de registros.

---

### Fase 10 — Auditoría presentación

- [x] Columnas Fecha, Usuario, Acción, Recurso, Resultado
- [x] Diálogo «Ver detalle» con IP, user-agent, metadata

**Criterio de aceptación:** Detalle reutiliza datos existentes.

---

### Fase 11 — Estadísticas de auditoría

- [x] `GET /auditoria/stats` con totales, documentos, por acción
- [x] Cálculo en backend

**Criterio de aceptación:** Panel resumen en `AuditoriaPage`.

---

### Fase 12 — Semáforo de actividad

- [x] `traffic-light.util.ts` con percentiles p33/p66
- [x] Chips en auditoría por usuario

**Criterio de aceptación:** Color calculado matemáticamente, no por nombre.

---

### Fase 13 — Trazabilidad

- [x] Soft delete documentos (`activo`)
- [x] Eventos auditados (DOC_CREATED, DOC_STATE_CHANGED, etc.)

**Criterio de aceptación:** Acciones sensibles registradas con actor y timestamp.

---

### Fase 14 — Serie documental

- [x] Conservada como clasificación archivística (serie → subserie)
- [x] Etiqueta y ayuda en formulario

**Criterio de aceptación:** No confundida con usuario ni dependencia.

---

### Fase 15 — Usuario creador

- [x] Backend `createdById` desde JWT
- [x] UI formulario: campos solo lectura «Registrado por» y «Fecha de registro»

**Criterio de aceptación:** Cliente no envía ID de creador editable.

---

### Fase 16 — Dependencia responsable

- [x] Catálogo institucional en formulario
- [x] Etiqueta «Dependencia responsable»

**Criterio de aceptación:** Separada del usuario creador.

---

### Fase 17 — Contraparte / razón social

- [x] Modelo Prisma `Contraparte` (natural/jurídica)
- [x] Catálogo y CRUD con validación

**Criterio de aceptación:** Cédula/RUC validados en backend.

---

### Fase 18 — Beneficiario

- [x] Modelo opcional en documento
- [x] Catálogo independiente de contraparte

**Criterio de aceptación:** Opcional en formulario.

---

### Fase 19 — Terminología formulario

- [x] Añadir «Registrado por» y «Fecha de registro» visibles
- [x] Responsable institucional, Contraparte, Beneficiario diferenciados

**Criterio de aceptación:** Sin ambigüedad entre roles del formulario.

---

### Fase 20 — Cédula ecuatoriana

- [x] `ecuador-id.util.ts` backend + `ecuador-id.ts` frontend
- [x] Dígito verificador y provincia

**Criterio de aceptación:** Backend rechaza cédula inválida.

---

### Fase 21 — RUC ecuatoriano

- [x] Validación persona natural (001) y jurídica
- [x] Normalización sin guiones

**Criterio de aceptación:** Duplicados rechazados en servicio.

---

### Fase 22 — Fecha de emisión

- [x] `assertFechaEmisionNoFutura` backend
- [x] `fechaEmisionErrorMessage` frontend + max en input date

**Criterio de aceptación:** Mañana rechazado; ayer/hoy válidos.

---

### Fase 23 — Fecha de registro

- [x] `createdAt` automático en Prisma
- [x] Mostrar en formulario como solo lectura

**Criterio de aceptación:** No editable manualmente.

---

### Fase 24 — Fecha de vencimiento

- [x] Puede ser futura; campo separado visualmente

**Criterio de aceptación:** Sin restricción de emisión aplicada.

---

### Fase 25 — Mayúsculas

- [x] `normalizeAdministrativeText` en backend
- [x] Utilidad frontend `text-normalize.ts`

**Criterio de aceptación:** Email/contraseñas no transformados.

---

### Fase 26 — Usuarios

- [x] PK `id`, UNIQUE `email`
- [x] Sin usar email como PK

**Criterio de aceptación:** Esquema coherente en `schema.prisma`.

---

### Fase 27 — Reportes

- [x] Ruta `/reportes` y sección menú independiente
- [x] `/admin/reportes` conservado (misma página)

**Criterio de aceptación:** Navegación reorganizada sin perder funcionalidad.

---

### Fase 28 — Responsive

- [x] Dashboard Grid responsive
- [x] Gráfico con overflow-x auto
- [x] Auditoría y formularios con breakpoints MUI

**Criterio de aceptación:** Sin overflow horizontal global evidente.

---

### Fase 29 — Base de datos

- [x] Sin migraciones destructivas en esta iteración
- [x] Modelos Contraparte, Beneficiario, campos documento ya migrados

**Criterio de aceptación:** No se ejecutó `migrate reset`.

---

### Fase 30 — Pruebas por fase

- [x] Compilación backend y frontend
- [x] Lint ejecutado
- [x] Pruebas E2E API (13/13 OK con verificación manual SUPERADMIN)
- [x] Pruebas E2E UI (Dashboard + Nuevo documento verificados en navegador con SUPERADMIN)

**Resultados E2E API (2026-08-28, reintento tras cooldown):**

| Prueba | Resultado |
|--------|-----------|
| Login SUPERADMIN | OK |
| Dashboard bloque documentos | OK |
| documentosPorMes 12 meses | OK |
| KPI pendientesRevision | OK |
| creadosEsteMes + acumulados | OK |
| Auditoría paginación | OK |
| Auditoría stats | OK |
| Fecha emisión mañana rechazada | OK |
| Cédula inválida rechazada | OK |
| SUPERADMIN resolver revisión | OK |
| **Login USUARIO** | **OK** |
| **USUARIO sin DOC_REVISION_RESOLVE** | **OK** |
| **USUARIO resolver → 403** | **OK** |
| SUPERADMIN no desactivable por ADMIN | OK (verificado manualmente en UI) |

**Resultados E2E UI (navegador):**

- Dashboard: KPIs, bloque Documentos por estado, gráfico mensual, menú Reportes independiente — **OK**
- Nuevo documento: «Registrado por» y «Fecha de registro» solo lectura; terminología Dependencia/Contraparte/Beneficiario — **OK**

**Credenciales vigentes en este entorno:**

- `superadmin@local.test` / `SuperAdmin123!` — funciona
- `admin.operativo@local.test` — sesión ADMIN usable tras MFA (flujo normal de login)
- `admin@local.test` — contraseña distinta al seed por defecto (no es `Admin123!`); no se alteró el hash

**Criterio de aceptación:** Build OK; pruebas manuales documentadas abajo.

---

### Fase 31 — Calidad

- [x] Revisión de imports y código muerto en archivos tocados
- [x] Sin `console.log` añadidos

**Criterio de aceptación:** Diff limpio.

---

### Fase 32 — Lint / build / tests

- [x] `npm run lint` frontend (5 errores preexistentes en otros archivos; no introducidos por este cambio)
- [x] `npm run build` frontend — **OK**
- [x] `npm run lint` backend (errores preexistentes de reglas estrictas; no bloquean build)
- [x] `npm run build` backend — **OK** (tras `prisma:generate:clean`)
- [x] `npm test` backend — **OK** (1 suite, 1 test)

**Criterio de aceptación:** Resultados registrados en reporte final.

---

## Registro de progreso

| Fecha       | Actividad                                      | Estado |
|-------------|------------------------------------------------|--------|
| 2026-08-28  | Auditoría inicial completa                     | [x]    |
| 2026-08-28  | Creación plan maestro                          | [x]    |
| 2026-08-28  | Campos Registrado por / Fecha registro en UI   | [x]    |
| 2026-08-28  | Manual usuario §7.4 actualizado                | [x]    |
| 2026-08-28  | Lint + build frontend OK                       | [x]    |
| 2026-08-28  | Build backend bloqueado (Prisma EPERM)         | [x]    |
| 2026-08-28  | `prisma:generate:clean` + build + test backend | [x]    |
| 2026-08-28  | Pruebas E2E USUARIO (login, permisos, 403)     | [x]    |
| 2026-08-28  | Prueba SUPERADMIN vs ADMIN (verificación manual UI) | [x]    |
| 2026-08-29  | Cierre auditoría: bypass PATCH, RBAC, tests, smoke API | [x]    |
| 2026-08-29  | Verificación: lint frontend 0, USER 403, responsive 4 VP | [x]    |
| 2026-08-29  | Login ADMIN runtime (`admin.operativo` + MFA)          | [x]    |
| 2026-08-29  | Usuario sin DOC_REVISION_SEND → 403                    | [x]    |

---

## Pendientes de esta fase

Ninguno.

## Siguiente fase

**Siguiente fase: desarrollo y ampliación del módulo de Reportes.**

No forma parte de este cierre. El checkpoint de versionado deja el código estable para iniciar esa fase posteriormente.
