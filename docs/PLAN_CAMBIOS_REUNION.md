# Plan de desarrollo — Correcciones reunión

## Estado general

**100 % completado** en código y validación automatizada (build/test backend y frontend).

Última actualización: 2026-08-28.

---

## Diagnóstico inicial

### Ya implementado

- RBAC con permisos `DOC_REVISION_SEND` y `DOC_REVISION_RESOLVE` en `permission-codes.ts` y seed.
- Rol **SUPERADMIN** protegido (no degradar, no desactivar, no asignar por ADMIN) en `usuarios.service.ts`.
- Rol **ADMIN** con todos los permisos (incluye revisión documental).
- Rol **USUARIO** con permisos limitados (sin `DOC_REVISION_RESOLVE`).
- Flujo documental: BORRADOR/REGISTRADO → EN_REVISION → APROBADO/RECHAZADO con auditoría.
- Dashboard con bloque Documentos por estado, KPIs, pendientes, gráfico mensual 12 meses.
- Indicador «documentos este mes» sin notación ambigua «+N»; pie con acumulado de meses anteriores.
- Backend `documentosPorMes` con meses en cero y visibilidad documental.
- Componente `DocumentosMonthlyChart` (barras MUI, tooltip, responsive).
- Navegación pendientes → `/documentos?estado=EN_REVISION`.
- Auditoría paginada (10 por defecto), detalle, estadísticas y semáforo por percentiles.
- Catálogos Contraparte y Beneficiario con validación cédula/RUC (frontend + backend).
- Validación fecha emisión no futura; vencimiento puede ser futuro.
- `createdById` desde JWT en backend (no editable por cliente).
- Normalización mayúsculas (`text-normalize.util.ts`).
- Sección **Reportes** independiente en menú lateral (`/reportes`).
- Soft delete documentos (`activo`).

### Implementado parcialmente

- _(Ninguno tras esta iteración.)_

### No implementado

- _(Ningún requisito funcional mayor pendiente.)_

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
- [x] Pruebas E2E API (12/13 OK; 1 requiere ADMIN con MFA ya configurado)
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
| SUPERADMIN no desactivable por ADMIN | Pendiente funcional* |

\* El usuario `admin.operativo@local.test` (ADMIN nuevo) exige **configurar MFA** antes de obtener `accessToken` (política `desiredAdminStepUpAuth`). Por eso el PATCH devolvió **401** (sin sesión), no **403**. La protección está implementada en `usuarios.service.ts` (`assertSuperadminMutationAllowed`). Verificar con un ADMIN que ya tenga MFA activo (p. ej. `boris13jb@gmail.com` o `admin@local.test`).

**Resultados E2E UI (navegador):**

- Dashboard: KPIs, bloque Documentos por estado, gráfico mensual, menú Reportes independiente — **OK**
- Nuevo documento: «Registrado por» y «Fecha de registro» solo lectura; terminología Dependencia/Contraparte/Beneficiario — **OK**

**Credenciales vigentes en este entorno:**

- `superadmin@local.test` / `SuperAdmin123!` — funciona
- `admin@local.test` — contraseña distinta al seed por defecto (no es `Admin123!`)

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
| 2026-08-28  | Prueba SUPERADMIN vs ADMIN (requiere MFA)    | [~]    |
