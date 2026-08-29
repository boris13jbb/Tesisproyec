# Resumen de cambios e implementaciones — 2026-08-28

## Objetivo

Documentar de forma clara **qué se implementó** y **qué archivos/módulos cambiaron** en las entregas subidas a GitHub el **28 de agosto de 2026**, sobre la rama `main` del repositorio [Tesisproyec](https://github.com/boris13jbb/Tesisproyec).

## Commits incluidos

| Commit   | Mensaje |
|----------|---------|
| `1295b44` | feat: agrega catálogos de contrapartes y beneficiarios con campos documentales |
| `91205aa` | docs: actualiza resultados E2E API y nota MFA en plan de reunión |
| `5dae708` | feat: agrega notificaciones SLA, bandeja de trámites y reportes institucionales |

**Alcance total aproximado:** ~82 archivos, +5.500 / −230 líneas (código + docs).

**Documentos relacionados:**

- Plan detallado por fases: [`PLAN_CAMBIOS_REUNION.md`](./PLAN_CAMBIOS_REUNION.md)
- Changelog técnico: [`22-changelog-tecnico.md`](./22-changelog-tecnico.md)
- Manual de usuario: [`27-manual-usuario-sgd-gadpr-lm.md`](./27-manual-usuario-sgd-gadpr-lm.md)
- Modelo de datos: [`04-modelo-base-de-datos.md`](./04-modelo-base-de-datos.md)

---

## 1. Roles, permisos y protección SUPERADMIN

### Qué se implementó

- Rol técnico **SUPERADMIN** reforzado en seed y constantes (`role-constants.ts`).
- Protección de la cuenta SUPERADMIN: no degradar, no desactivar, no reasignar por un ADMIN ordinario (`usuarios.service.ts`).
- Rol **ADMIN** con permisos completos (incluye resolver revisión documental).
- Rol **USUARIO** sin permiso `DOC_REVISION_RESOLVE` (recibe **403** al intentar aprobar/rechazar).
- `RolesGuard` ajustado para que reglas de ADMIN consideren también SUPERADMIN cuando corresponde.
- Utilidades de rol en frontend (`role-utils.ts`).

### Estándar

ISO/IEC 27001:2022 (control de acceso), OWASP ASVS V4 (autorización en servidor).

---

## 2. Catálogos Contraparte y Beneficiario

### Qué se implementó

- Modelos Prisma **Contraparte** y **Beneficiario** (persona natural/jurídica).
- Migración: `20260828120000_contrapartes_beneficiarios_documento_fields`.
- Módulos NestJS CRUD:
  - `backend/src/contrapartes/`
  - `backend/src/beneficiarios/`
- Permisos: `CONTRAPARTES_WRITE`, `BENEFICIARIOS_WRITE`.
- Pantallas frontend:
  - `/catalogos/contrapartes` → `ContrapartesPage.tsx`
  - `/catalogos/beneficiarios` → `BeneficiariosPage.tsx`
- Campos opcionales en **nuevo documento** y **detalle de documento** para vincular contraparte y beneficiario.
- Validación de **cédula y RUC ecuatorianos** (dígito verificador, provincia) en backend y frontend.
- Normalización de texto administrativo a mayúsculas (sin alterar email/contraseñas).
- Utilidades compartidas: `ecuador-id`, `party-catalog`, `party-label`, `text-normalize`.

### Estándar

ISO 15489 (clasificación/partes del expediente), OWASP ASVS V5 (validación de entradas).

---

## 3. Formularios y flujo documental

### Qué se implementó

- Distinción clara en UI entre:
  - **Registrado por** / **Fecha de registro** (solo lectura, desde JWT/`createdAt`)
  - **Dependencia responsable**
  - **Contraparte**
  - **Beneficiario**
- `createdById` tomado del JWT (el cliente no puede inventar el creador).
- Validación: **fecha de emisión no futura**; vencimiento puede ser futuro.
- Soft delete documental (`activo`) y eventos de auditoría (`DOC_CREATED`, `DOC_DEACTIVATED`, cambios de estado, etc.).
- Flujo de revisión ya existente reforzado: BORRADOR/REGISTRADO → EN_REVISION → APROBADO/RECHAZADO.

### Estándar

ISO 15489 (autenticidad, trazabilidad), OWASP ASVS V5/V10.

---

## 4. Dashboard documental

### Qué se implementó

- Bloque de KPIs por estado: Total, Registrados, Borradores, En revisión, Aprobados, Rechazados.
- Indicador claro de documentos **del mes actual** y acumulado de meses anteriores (sin notación ambigua tipo «+N»).
- Endpoint/datos `documentosPorMes` (últimos 12 meses, incluyendo ceros).
- Componente `DocumentosMonthlyChart` (barras MUI, tooltip, responsive).
- Navegación desde pendientes de revisión hacia `/documentos?estado=EN_REVISION`.

### Archivos clave

- `backend/src/dashboard/dashboard.service.ts`
- `frontend/src/pages/DashboardPage.tsx`
- `frontend/src/components/DocumentosMonthlyChart.tsx`

---

## 5. Auditoría (paginación, detalle y semáforo)

### Qué se implementó

- `GET /auditoria` con paginación (`page`, `pageSize`, total); UI con **10** por defecto.
- `GET /auditoria/stats` (totales, por acción, resumen documental).
- Diálogo **Ver detalle** (IP, user-agent, metadata).
- Semáforo de actividad por percentiles (`traffic-light.util.ts` / `traffic-light.ts`).
- Servicio dedicado `auditoria.service.ts`.
- Etiquetas de acciones en frontend (`audit-actions.ts`).

### Estándar

ISO 15489 (registros auditables), ISO/IEC 27001 (trazabilidad), OWASP ASVS V10 (logging sin filtrar secretos).

---

## 6. Notificaciones SLA e in-app

### Qué se implementó

- Migración: `20260828140000_sla_notifications`.
- Campos en documentos: `fecha_ingreso_revision`, `fecha_limite_sla`.
- Tabla `user_notifications` para notificaciones in-app.
- Módulo `backend/src/notifications/`:
  - servicio de notificación (correo HTML + in-app)
  - scheduler de vencimientos (`expiry-notification.scheduler.ts`)
  - controlador API
  - auditoría `NOTIFICATION_DISPATCHED`
- Variables de entorno documentadas en `backend/.env.example` (`NOTIFY_EXPIRY_*`, `SLA_DIAS_REVISION`, etc.).
- Campana in-app en la barra superior: `InAppNotificationsMenu.tsx`.
- Utilidad SLA: `documento-sla.util.ts` (cálculo al enviar a revisión).

### Estándar

ISO 15489 (plazos/recuperación operativa), ISO/IEC 27001 (disponibilidad y alertas).

---

## 7. Bandeja de trámites

### Qué se implementó

- Endpoint `GET /documentos/bandeja-tramites`.
- Pantalla `/bandeja-tramites` → `BandejaTramitesPage.tsx`.
- Vista orientada a documentos en revisión / próximos vencimientos SLA.
- Integración en menú, rutas lazy y breadcrumbs.

### Archivos clave

- `backend/src/documentos/documentos.service.ts` / `documentos.controller.ts`
- `frontend/src/pages/tramites/BandejaTramitesPage.tsx`
- `frontend/src/layouts/MainLayout.tsx`, `App.tsx`, `lazyPages.tsx`, `breadcrumbs.ts`

---

## 8. Reportes institucionales ampliados

### Qué se implementó

- Sección de menú **Reportes** (`/reportes`) consolidada.
- Nuevas exportaciones XLSX (según permisos):
  - usuarios
  - por dependencia
  - por estado
  - actividad de revisión
  - próximos vencimientos
- UI ampliada en `ReportesInstitucionalesPage.tsx`.
- Backend en `reportes.controller.ts` / `reportes.service.ts`.

### Estándar

ISO 15489 (usabilidad/recuperación de información), OWASP ASVS (autorización por rol en exportación).

---

## 9. Pruebas y documentación

### Qué se verificó / documentó

- Compilación backend y frontend.
- Lint.
- Pruebas E2E API: **12/13 OK**; 1 caso requiere ADMIN con MFA ya configurado (política `desiredAdminStepUpAuth`).
- Pruebas E2E UI: Dashboard + Nuevo documento con SUPERADMIN.
- Actualización de:
  - `docs/PLAN_CAMBIOS_REUNION.md`
  - `docs/22-changelog-tecnico.md`
  - `docs/27-manual-usuario-sgd-gadpr-lm.md`
  - `docs/04-modelo-base-de-datos.md`

### Pendiente conocido

- Verificación completa «ADMIN no puede desactivar SUPERADMIN» con un ADMIN que **ya tenga MFA activo** (con sesión válida debe responder **403**, no 401).

---

## 10. Migraciones Prisma aplicadas en estas entregas

| Migración | Contenido |
|-----------|-----------|
| `20260828120000_contrapartes_beneficiarios_documento_fields` | Tablas/campos de contraparte y beneficiario en documentos |
| `20260828140000_sla_notifications` | Fechas SLA en documentos + tabla `user_notifications` |

Tras desplegar en otro entorno local: XAMPP MySQL activo → `npx prisma migrate deploy` → `npx prisma generate` (desde `backend/`).

---

## 11. Mapa rápido: módulo → qué probar

| Módulo | Ruta / acción | Resultado esperado |
|--------|---------------|--------------------|
| Contrapartes | `/catalogos/contrapartes` | CRUD con cédula/RUC válidos |
| Beneficiarios | `/catalogos/beneficiarios` | CRUD opcional, independiente de contraparte |
| Nuevo documento | `/documentos/nuevo` | Campos registro, dependencia, partes, fechas |
| Dashboard | `/` (panel) | KPIs + gráfico mensual 12 meses |
| Auditoría | `/admin/auditoria` | Paginación 10, stats, semáforo, detalle |
| Bandeja | `/bandeja-tramites` | Listado de trámites / SLA |
| Notificaciones | Campana en AppBar | Lectura de alertas in-app |
| Reportes | `/reportes` | Nuevos botones de exportación XLSX |
| Roles | Intentar resolver revisión como USUARIO | **403** |

---

## 12. Resumen ejecutivo

En esta entrega el SGD-GADPR-LM pasó de un núcleo documental ya funcional a un sistema con:

1. **Gobierno de roles** más estricto (SUPERADMIN protegido).
2. **Catálogos de partes** (contraparte/beneficiario) con validación ecuatoriana.
3. **Dashboard y auditoría** más operativos (gráficos, paginación, semáforo).
4. **SLA + notificaciones** (correo e in-app) y **bandeja de trámites**.
5. **Reportes institucionales** ampliados.
6. **Documentación y plan de reunión** alineados con el código desplegado en GitHub.

---

## Historial de este documento

| Fecha | Nota |
|-------|------|
| 2026-08-29 | Creación del resumen a partir de commits `1295b44`, `91205aa` y `5dae708`. |
