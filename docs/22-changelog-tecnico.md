# Changelog técnico — SGD-GADPR-LM

## Objetivo

Registrar cambios relevantes en **entorno**, **migraciones Prisma**, **exposición ngrok** y decisiones que afecten despliegue local o seguridad.

## Alcance

Entradas breves enlazadas a módulos y a `18-seguridad-y-hardening.md` cuando aplique.

## Estado actual

- Activo desde baseline 2026-04-19.

## Formato por entrada

```
### YYYY-MM-DD — Título corto
- Qué cambió (migración, variable, puerto, etc.).
- Referencia a sección en docs/ si aplica.
```

---

## Registro

### 2026-09-04 — Hardening operativo / CORS / headers / errores

- **Operativo existente:** `main.ts` (Helmet, cookie-parser, ValidationPipe, CORS, prefijo `api/v1`) + `GET /health` + Throttler. **No** hay Docker, Nginx, Swagger ni static.
- **Endurecido:** allowlist CORS exacta (sin `*` / substring); HSTS solo `production` (efectivo con HTTPS en proxy); PORT sanitizado; 500 internos sin stack/SQL/credenciales (`SafeExceptionFilter`); booleanos DTO con `ToSafeBoolean` (`"false"` ≠ true). `enableImplicitConversion` **sigue true** (query numbers).
- **npm audit (--omit=dev, solo diagnóstico):** 0 critical, 5 high, 3 moderate, 1 low — preexistente, lockfile sin cambios. Fase futura: DEPENDENCY HARDENING.
- Matriz: `MATRIZ_HARDENING_OPERATIVO_CONFIGURACION.md`.

### 2026-09-04 — Hardening notificaciones / SLA / SMTP

- **Operativo existente:** in-app (`user_notifications`) + `MailService` (nodemailer) + cron `NOTIFY_EXPIRY_*` + SLA de revisión. **No** hay cola, send manual, GET `:id` ni provider externo.
- **Endurecido:** destinatario solo desde BD (se ignoran emails del caller); envío SMTP uno a uno; CRLF en subject/to; HTML de usuario escapado; `APP_PUBLIC_URL` http(s); dedup SLA 23 h **dentro** del servicio; usuarios inactivos omitidos; error SMTP sanitizado; campana solo navega UUID interno.
- Matriz: `MATRIZ_SEGURIDAD_NOTIFICACIONES_SLA_EMAIL.md`. `NOTIFICATION_DISPATCHED` = intento de despacho (no “entregado al usuario”).

### 2026-09-03 — Hardening backups / recuperación (acceso y filesystem)

- **Operativo existente:** `mysqldump` vía `spawn` (sin shell) + cron opcional + `POST /backup/admin/run-now`. **No** hay API de list/download/delete/restore.
- **Endurecido:** lock `try/finally`; dump vacío no queda como válido; escritura `.tmp`→`rename`; `.cnf` citado + `mode: 0o600`; actor JWT en trigger manual; stderr/notas sanitizados; nombre de BD anti-flag; prune anclado al root.
- **Git:** ignore `*.dump`/`*.bak`/`*.tmp` bajo `/backups/**` (sin tocar migrations Prisma).
- Matriz: `MATRIZ_SEGURIDAD_BACKUPS_RECUPERACION.md`. `BACKUP_VERIFIED` del job = exit 0 + size > 0 (no SHA-256).

### 2026-09-03 — Auditoría transversal (trazabilidad / privacidad / integridad)

- **Redacción:** claves compuestas (`setupChallengeToken`, `otpauthUrl`, `Set-Cookie`, etc.) además del set exacto; sigue aplicándose **antes de persistir**.
- **API:** fechas inválidas y `from > to` → 400; paginación NaN/negativa/enorme clampada; orden `createdAt desc` + `id desc`.
- **Export auditoría:** mismas fechas 400 **antes** de `REPORT_EXPORTED`; tope 5000; redacción + sanitizer de fórmulas.
- **RUM:** `pathname` sin query/fragmento.
- Matriz: `MATRIZ_AUDITORIA_TRAZABILIDAD_INTEGRAL.md`.

### 2026-09-03 — Hardening autenticación / MFA / reset password

- **MFA:** SUPERADMIN no puede desactivar TOTP si la política exige MFA admin; challenge one-time atómico; invalidación tras N fallos; setup sin campo JSON `secret` (sí `otpauthUrl` con `secret=` embebido + `secretMasked`); `Cache-Control: no-store` en begin setup.
- **JWT:** firma/verify restringidos a HS256; access TTL `JWT_ACCESS_EXPIRES` (default `15m`). Logout/reset revocan **refresh**; access ya emitido es stateless hasta `exp` (desactivación sí corta access vía `activo`).
- **Reset:** claim concurrente con `updateMany` (`usedAt: null`); lockout runtime desde `SecurityPolicy`.
- **UI:** clave manual TOTP derivada del `otpauthUrl` en memoria (sin persistir).
- Matriz: `MATRIZ_SEGURIDAD_AUTENTICACION_SESIONES.md` (precisión otpauth + revocación refresh vs access).

### 2026-09-03 — Hardening seguridad de archivos documentales

- **API:** nombre físico `UUID.pdf` (no `originalname`); MIME/extensión obligatorios + firma `%PDF`; límite 50 MB también en servicio (413); download `attachment` + `nosniff`; delete usa visibilidad del documento.
- **Multer:** `LIMIT_FILE_SIZE` → 413 sin stack.
- Matriz: `MATRIZ_SEGURIDAD_ARCHIVOS.md`.

### 2026-09-03 — Inmutabilidad protegida + DOC_UNLOCK

- **API:** estados `EN_REVISION`/`APROBADO`/`ARCHIVADO` congelan metadata y archivos; `POST /documentos/:id/desbloquear` (motivo obligatorio, `DOC_UNLOCK`, concurrencia condicional) → `REGISTRADO`.
- **Excepción:** `APROBADO` → `ARCHIVADO` state-only (`PATCH { estado: ARCHIVADO }`, permiso `DOC_UPDATE`); payload mixto → 400; no emite `DOC_UNLOCKED`.
- **IAM:** permiso `DOC_UNLOCK` (seed: solo SUPERADMIN por rol; ADMIN por delegación directa SUPERADMIN→ADMIN).
- **UI:** **Archivar documento** en detalle (APROBADO); **Desbloquear para corrección** separado.
- Matriz: `MATRIZ_DESBLOQUEO_DOCUMENTAL.md`. Residual ALTO post-aprobación: **corregido** vía política de desbloqueo.

### 2026-09-03 — Hardening workflow estados documentales

- **API:** PATCH no puede fijar `EN_REVISION`/`APROBADO`/`RECHAZADO`; reenvío `RECHAZADO`→`EN_REVISION` vía `POST .../enviar-revision`; resolución/envío con `updateMany` condicionado (anti doble resolución).
- Matriz: `MATRIZ_WORKFLOW_ESTADOS_DOCUMENTALES.md`. Residual: mutabilidad post-aprobación (decisión funcional).

### 2026-09-03 — Hardening Tipos documentales (RBAC, asignación, histórico)

- **API:** `incluirInactivos` solo ADMIN/SUPERADMIN; detalle inactivo → 404 no-admin; auditoría `TIPO_DOCUMENTAL_*`; `assertAssignable` en create/cambio de tipo en documentos (histórico mismo id no revalida `activo`).
- **UI:** botones de catálogo con `TIPOS_DOCUMENTALES_WRITE`; selector de edición documental conserva tipo histórico inactivo.
- Matriz: `MATRIZ_VISIBILIDAD_TIPOS_DOCUMENTALES.md`.

### 2026-08-30 — Gestión visual de roles y permisos (SUPERADMIN / ADMIN)

- **Backend:** `ADMIN` retirado de `ROLES_ASSIGNABLE_BY_ADMIN`; solo SUPERADMIN puede asignar o revocar rol Administrador. Auditoría `ROLE_ASSIGNED` / `ROLE_REVOKED` al cambiar roles; revocación de refresh tokens en cambios sensibles (ADMIN, REVISOR) y permisos directos.
- **Frontend:** drawer **Gestionar acceso** en Usuarios con switches multi-rol, panel de permisos efectivos (origen heredado vs adicional), permisos adicionales con un clic, pestaña Roles y permisos con switches inmediatos sobre `role_permissions`.
- Manual: `27-manual-usuario-sgd-gadpr-lm.md`; roles: `07-modulo-roles-permisos.md`.

### 2026-08-30 — Retiro de Series y Subseries

- **Prisma:** migración `20260830170000_remove_series_subseries`. Quita FK e índice `documentos.subserie_id`, tablas `subseries` y `series`, y permisos `SERIES_WRITE` / `SUBSERIES_WRITE`. Los documentos existentes se conservan (código, asunto, tipo, dependencia, archivos, auditoría).
- **API:** se eliminan `SeriesModule` y `SubseriesModule`; `POST/PATCH /documentos` ya no exige `subserieId`; listados y reportes dejan de filtrar por serie/subserie.
- **UI:** menú Catálogos sin Series/Subseries; ruta `/clasificacion` retirada; formulario, detalle, bandeja y exportaciones sin clasificación Serie/Subserie. El clasificador vigente es **Tipo documental** + **Dependencia**.
- Manual: `27-manual-usuario-sgd-gadpr-lm.md`. Modelo: `04-modelo-base-de-datos.md`.

### 2026-08-30 — Clasificación documental unificada (Serie → Subserie)

- **Frontend (UX):** en Nuevo documento y Editar, un solo selector **Clasificación documental** agrupado por serie; el valor sigue siendo `subserieId`. Detalle y bandeja muestran `Serie → Subserie` (códigos secundarios). Catálogos Series/Subseries se mantienen.
- **Base de datos:** sin cambios de schema ni migraciones (`Documento.subserieId` + `Subserie.serieId`).
- Manual: `27-manual-usuario-sgd-gadpr-lm.md`; fichas `50` / `51`.

### 2026-08-30 — Permisos por defecto del rol USUARIO ampliados

- **Seed:** `USUARIO` incluye `DOC_CREATE`, `DOC_UPDATE`, `DOC_FILES_UPLOAD` además de consulta, descarga y envío a revisión.
- **Excluidos:** `DOC_FILES_DELETE`, `DOC_REVISION_RESOLVE` y permisos administrativos.
- Matriz de referencia (backend + frontend) y descripción humana del rol actualizadas.
- Ejecutado `npx prisma db seed` (idempotente; sincroniza `role_permissions` sin reset).
- Sin cambios de esquema Prisma.

### 2026-08-30 — Rediseño UX Administración → Usuarios y roles

- **Frontend:** pestañas Usuarios / Roles y permisos / Matriz de acceso; permisos humanizados (`permission-display.ts`, `role-display.ts`).
- Componentes: `RolePermissionsPanel`, `AccessMatrix`, `AdditionalPermissionsSection`, `PermissionRow`.
- Sin cambios de BD, guards ni lógica RBAC backend; mismos endpoints `GET/PUT /rbac/roles/:codigo/permissions` y `GET /usuarios`.
- Manual §5.1 actualizado.

### 2026-08-30 — Wizard creación documento (archivo → metadatos → upload)

- **UI:** `NuevoDocumentoPage` con Stepper; botón y menú lateral unificados a `/documentos/nuevo`.
- Eliminado diálogo «Registrar documento» de la bandeja (ya no crea sin archivo).
- Secuencia: `POST /documentos` → `POST /documentos/:id/archivos`; reintento de upload sin duplicar registro.
- Sin cambios de BD / Prisma.

### 2026-08-30 — UI sin JSON crudo (historial de archivo y auditoría)

- **Frontend:** utilidades `file-meta-format.ts` y `audit-meta-format.ts` (tamaño, MIME, IP, etiquetas de evento).
- Modal **Historial del archivo** y diálogo **Detalle de auditoría** muestran metadatos humanizados; SHA-256 solo en «Información técnica» colapsada.
- Sin cambios de BD / Prisma / permisos.

### 2026-08-30 — Onboarding otro PC (README / EJECUTAR / docs 42)

- Checklist de clon: env, `migrate deploy`, `generate`, **`db seed`**, storage/backups no versionados; tabla por apartado (auth, catálogos, documentos, archivos, reportes, dashboard).

### 2026-08-30 — Dashboard Likert: enlace al listado filtrado

- **API:** `GET /documentos?likert=OPTIMO|MODERADO|CRITICO` (misma lógica que `evaluacionLikert`).
- **UI:** tarjetas/barras Likert navegan a Documentos; aviso de filtro activo y limpieza.

### 2026-08-30 — Dashboard: gráficos Escala de Likert (salud documental)

- **Backend:** `GET /dashboard/summary` incluye `evaluacionLikert` (Óptimo / Moderado / Crítico) con umbral 60 días, rechazados, inactivos y SLA vencido; util `evaluacion-likert.util.ts` + tests. Sin migración.
- **Frontend:** bloque `EvaluacionLikertCharts` en el panel Inicio (tarjetas KPI + donut + barras + proporción). Manual §4.1 actualizado.

### 2026-08-30 — Reportes: documentos por usuario (JSON / PDF / Excel)

- **Backend:** `GET /reportes/documentos-por-usuario` (+ `.pdf` / `.xlsx`); filtros `createdByUserId`, `estado`, `tipoDocumentalId`, `dependenciaId`, `fechaDesde`/`fechaHasta`; resumen KPI y `porUsuario`; revisor/motivo desde última auditoría `DOC_REVIEW_RESOLVED` (sin migración).
- **Frontend:** sección «Reporte de documentos por usuario» en `ReportesInstitucionalesPage` (`DocumentsByUserReportSection`).
- **Manual:** §12 actualizado. Tests: `documentos-por-usuario.util.spec.ts`, `documentos-por-usuario.service.spec.ts`.

### 2026-08-29 — Checkpoint de cierre (revisión tutoría)

- Cierre estable de las correcciones de reunión: RBAC y SUPERADMIN, flujo de revisión documental, Dashboard, Auditoría (stats y semáforo), validaciones (fechas, cédula/RUC, PATCH), datos documentales, responsive, tests de dominio/autorización y QA runtime.
- Tag previsto: `v1.0-revision-tutor-completada`.
- **Siguiente fase: desarrollo y ampliación del módulo de Reportes.**

### 2026-08-29 — Cierre ADMIN runtime y 403 sin DOC_REVISION_SEND

- Login ADMIN usable: `admin.operativo@local.test` enroló TOTP por el flujo normal de `/login` (sin reset de BD ni cambio de hashes).
- ADMIN no muta SUPERADMIN (PATCH usuario 403; PUT matriz 403). Revisión formal APROBADO/RECHAZADO OK.
- Prueba de integración: usuario autenticado sin `DOC_REVISION_SEND` → `POST /documentos/:id/enviar-revision` 403.
- Plan: `docs/PLAN_CAMBIOS_REUNION.md` — 100 %.

### 2026-08-29 — Verificación de cierre (lint frontend + runtime)

- Lint frontend: 8 errores `react-hooks` corregidos (efectos diferidos, deps de memo, submit sin `handleSubmit` en render).
- Login `admin@local.test` sigue 401 (hash distinto al seed); `admin.operativo@local.test` pide MFA. USER `usuario.prueba@local.test` → 403 al resolver revisión.
- Responsive 1440/1024/768/390 sin overflow horizontal (navegación SUPERADMIN).
- Plan: `docs/PLAN_CAMBIOS_REUNION.md` — ADMIN marcado `[!]` (superado el mismo día con MFA de `admin.operativo`).

### 2026-08-29 — Cierre de hallazgos de auditoría (RBAC, revisión, stats)

- `PATCH /documentos/:id` ya no puede pasar a APROBADO/RECHAZADO; solo `POST .../resolver-revision`.
- `PUT /rbac/roles/SUPERADMIN/permissions` prohibido para ADMIN; permisos directos sensibles no asignables por ADMIN.
- `DOC_REVISION_SEND` en envío a revisión; UI SUPERADMIN unificada; fecha de emisión compartida; stats `porUsuario` + `DOC_DEACTIVATED`; dashboard mensual en una consulta.
- Tests de dominio Jest. Decisión responsable/serie: `docs/53-responsable-institucional-y-serie.md`.
- Plan: `docs/PLAN_CAMBIOS_REUNION.md` deja de declarar 100 %.

### 2026-08-29 — Resumen consolidado de entregas 2026-08-28

- Nuevo documento: `docs/52-resumen-cambios-implementados-2026-08-28.md` (contrapartes/beneficiarios, dashboard, auditoría, SLA/notificaciones, bandeja, reportes, commits `1295b44`–`5dae708`).
- Enlace añadido en `docs/README.md`.

### 2026-08-28 — R-44/R-27/R-28: notificaciones, bandeja SLA y reportes institucionales ampliados

- **Migración** `20260828140000_sla_notifications`: `documentos.fecha_ingreso_revision`, `fecha_limite_sla`; tabla `user_notifications`.
- **Backend:** módulo `notifications` (correo HTML + in-app, cron vencimientos `NOTIFY_EXPIRY_*`, auditoría `NOTIFICATION_DISPATCHED`); `GET /documentos/bandeja-tramites`; SLA al enviar a revisión (`SLA_DIAS_REVISION`); reportes XLSX: usuarios, por dependencia, por estado, actividad revisión, próximos vencimientos.
- **Frontend:** `/bandeja-tramites`, campana in-app en barra superior, nuevos botones en `/reportes`.
- **Docs:** `27-manual-usuario`, `04-modelo-base-de-datos` (26 migraciones).

### 2026-08-28 — RBAC SUPERADMIN, dashboard documental, auditoría paginada, catálogos contraparte/beneficiario

- **Backend:** rol `SUPERADMIN` en seed; protección de cuenta técnica en `usuarios.service`; permisos `CONTRAPARTES_WRITE` / `BENEFICIARIOS_WRITE`; migración `20260828120000_contrapartes_beneficiarios_documento_fields`; módulos `contrapartes` y `beneficiarios`; validaciones EC cédula/RUC, fechas emisión/vencimiento, mayúsculas administrativas; dashboard `documentosPorMes` + totales por estado; auditoría paginada (10), `GET /auditoria/stats` y detalle por id; `includeCatalogos` con contraparte/beneficiario en documentos.
- **Frontend:** bloque DOCUMENTOS y gráfico mensual en dashboard; auditoría con stats, semáforo y diálogo detalle; sección menú **Reportes** (`/reportes`); pantallas Contrapartes/Beneficiarios; formularios nuevo/detalle documento con campos opcionales; util `party-label`; etiquetas auditoría `DOC_CREATED` / `DOC_DEACTIVATED`.
- **Docs:** `04-modelo-base-de-datos.md`, `27-manual-usuario-sgd-gadpr-lm.md`.

### 2026-08-28 — Tema global: tokens secondary en shell y superficies compartidas

- **Frontend:** `appTheme` (AppBar, menú lateral, inputs), `listSurfaces`, `EmptyState` y badge SGD del menú usan `palette`/`alpha` en lugar de hex sueltos; coherencia en modo oscuro.
- **Docs:** manual `27` §4.2.

### 2026-08-28 — Panel y detalle documental: paleta del tema en KPI y vista previa

- **Frontend:** `DashboardPage` KPIs usan `accent` de paleta MUI (`primary`/`warning`/`success`/`error`) en lugar de hex. `DocumentoDetallePage` ajusta contenedores de vista previa y pantalla completa a tokens del tema (lienzo del documento en blanco para legibilidad).
- **Docs:** manual `27` §4.1.

### 2026-08-28 — Pantallas públicas: tokens del tema institucional

- **Frontend:** `LoginPage`, `SplashInicioPage`, `AuthLayout`, `NotFoundPage` y `ForbiddenPage` sustituyen hex fijos por paleta MUI (`primary`, `secondary`, `error`, `background`). Flujos de auth sin cambio.
- **Docs:** manual `27` §2.1.

### 2026-08-28 — Perfil y Nuevo documento: iconos de sección

- **Frontend:** `PerfilUsuarioPage` usa `SectionHeader`, `ActivoChip` y línea de actividad con color del tema. `NuevoDocumentoPage` sustituye letras D/U/S y hex en zona de carga por `SectionHeader` y `secondary.main`.
- **Docs:** manual `27` §2.3 y §6 (nuevo documento).

### 2026-08-28 — Usuarios y roles: iconos de sección y listado unificado

- **Frontend:** `UsuariosPage` elimina `INSTITUTIONAL_TEAL`, letras U/P/M y hex fijos. Directorio en `ListPanel` con `PeopleOutlined`; matrices con `SectionHeader` (`VpnKeyOutlined`, `TableChartOutlined`); chips Activos del tema; botón guardar RBAC `color="secondary"`.
- **Docs:** manual `27` §5.1, guía de menú `44` §3.1.

### 2026-08-28 — Reportes y Configuración: iconos de sección y chips del tema

- **Frontend:** `ReportesInstitucionalesPage` sustituye letras P/D y hex por `SectionHeader` (parámetros, gráfico, listado) y barras con paleta MUI. `ConfiguracionSeguridadPage` usa `SectionHeader` + `ControlStatusChip` (success/outlined) en lugar de letras S/A y `#e8f5e9`. APIs y flujos sin cambio.
- **Docs:** manual `27` §12–13, guía de menú `44` §3.4–3.5.

### 2026-08-28 — Respaldos: iconos de sección y chips de verificación

- **Frontend:** `RespaldosSeguridadPage` sustituye letras R/P/I y hex fijos por `SectionHeader`, `ListPanel` con icono de respaldo y `BackupEstadoChip` (`auditResultChipColor`). mysqldump, registro de verificación y diálogos sin cambio.
- **Docs:** manual `27` §11, guía de menú `44` §3.3.

### 2026-08-28 — Auditoría: icono de listado y chips de resultado

- **Frontend:** `AuditoriaPage` sustituye la letra «A» por `FactCheckOutlinedIcon`; `AuditResultChip` usa `auditResultChipColor` (tema MUI). Filtros, paginación y exportación Excel/PDF sin cambio.
- **Docs:** manual `27` §10, guía de menú `44` §3.2.

### 2026-08-28 — Catálogos Dependencias, Cargos y Tipos: mismo patrón visual

- **Frontend:** `DependenciasPage`, `CargosPage` y `TiposDocumentalesPage` usan iconos del menú, `CatalogCodigoChip` / `CatalogNombreCell` (también Series/Subseries). CRUD, validaciones y baja lógica sin cambio.
- **Docs:** manual `27` §6.1–6.3, guías `47`/`48`/`49`, menú `44`.

### 2026-08-28 — Catálogos Series/Subseries: iconos y chips de tema

- **Frontend:** `SeriesPage` y `SubseriesPage` sustituyen letras «S/SS» por iconos, chips de código y `ActivoChip` con paleta MUI. Formularios, validaciones y baja lógica sin cambio. `ListPanel` usa el mismo fondo de badge que `SectionHeader`.
- **Docs:** manual `27` §6.4, guías `50`/`51`, menú `44`.

### 2026-08-28 — Clasificación: iconos y chips alineados al resto del SGD

- **Frontend:** `ClasificacionDocumentalPage` deja hex fijos (teal/navy/azul) y reutiliza `SectionHeader` (extraído del detalle), chips de recuento y `confidencialidadChipColor`. Catálogo, agregados y solo lectura sin cambio.
- **Docs:** manual `27` §7.2.2, guía de menú `44`.

### 2026-08-28 — Usuarios: un rol institucional editable (sin acumulación)

- **Frontend:** en `/admin/usuarios` el diálogo Crear/Editar deja de usar un selector múltiple de códigos. El administrador elige **un rol institucional** (radios con nombre y ayuda) y, si aplica, el complemento **Editor documental**. Al guardar se reemplaza la asignación (`PATCH /usuarios/:id` con `roles`).
- Si la cuenta tenía varios roles apilados, la UI avisa y al guardar queda el rol elegido (mínimo privilegio, ISO/IEC 27001 A.5.18).
- **Docs:** manual `27` §5.1, módulo `06`.

### 2026-08-28 — Trámites (Kanban): chips e iconos unificados con bandeja

- **Frontend:** `FlujoTramitePage` reutiliza `DocumentoListCard` (variante compacta) y `documentoEstadoChipColor` / `documentoEstadoTone`. Sin cambio de API, visibilidad ni transiciones; el tablero sigue siendo solo lectura.
- **Docs:** manual `27` §7.2.1, guía de menú `44`.

### 2026-08-28 — Detalle documental con tarjetas (mismo flujo y permisos)

- **Frontend:** `DocumentoDetallePage` alinea cabecera de flujo, vista previa, metadatos, adjuntos e historial al estilo de tarjetas del panel; ACL y botones de revisión sin cambio de reglas.
- Colores de estado reutilizan `documentoEstadoChipColor` / `documentoEstadoTone`.
- **Docs:** manual `27` §8.1.

### 2026-08-28 — Bandeja documental en tarjetas (misma lógica de filtros)

- **Frontend:** vista **tarjetas** por defecto en `/documentos` (estilo del panel); conmutador a **tabla**; preferencia `sgd.ui.documentosView`. Filtros, paginación, exportaciones y permisos sin cambio.
- Colores de estado unificados (`documentoEstadoTone` / `documentoEstadoChipColor`) reutilizados en dashboard y bandeja.
- **Docs:** manual `27` §7.2, guía de menú `44`.

### 2026-08-27 — Shell con menú colapsable, tema oscuro y panel tipo dashboard

- **MainLayout:** menú lateral colapsable en escritorio (iconos / etiquetas) con preferencia en `localStorage` (`sgd.ui.sidebarOpen`); botón **Ocultar menú**; sección **Cuenta → Mi perfil**; conmutador claro/oscuro en la barra superior (solo shell autenticado; login permanece claro).
- **Dashboard:** tarjetas KPI con iconos, lista de **actividad reciente** (expedientes reales) y panel de **indicadores / señales** sin datos simulados. Campana con badge de alertas o pendientes.
- **Tema:** `createAppTheme(mode)` en `appTheme.ts`; `ColorModeProvider` anidado en el layout autenticado (`sgd.ui.colorMode`).
- **Docs:** manual `27`, guía de menú `44`, diseño `25`.

### 2026-07-13 — Subida de adjuntos: solo PDF

- **Backend:** whitelist MIME limitada a `application/pdf`; validación de extensión `.pdf` y firma de contenido `%PDF`.
- **Frontend:** selectores de archivo y mensajes en Nuevo documento / Detalle documentan solo PDF.
- **Docs:** `13-modulo-archivos.md`, manual `27`.

### 2026-07-13 — UI/UX Dashboard + CTAs al tema secondary

- **Dashboard:** sin `Container` duplicado; paneles con `listSurfaceSx`; avatar con `secondary.main`.
- **Detalle documento / Usuarios / Perfil / Respaldos:** CTAs y acentos críticos usan `color="secondary"` (o token del tema) en lugar de hex hardcodeados en botones.

### 2026-07-13 — UI/UX pantallas edge + responsive shell

- **404 / 403:** iconografía y CTA secondary.
- **Recuperar / Restablecer / Nuevo documento:** CTAs teal del tema y superficies `listSurfaceSx`.
- **Splash:** decoración oculta en móvil estrecho.
- **MainLayout:** padding responsive y ancho de contenido hasta 1360px en `xl`.

### 2026-07-13 — UI/UX resto de módulos (shell unificado)

- **Superficies:** Clasificación, Trámites, Perfil, Reportes, Respaldos y Configuración usan `listSurfaceSx` (y tablas `listTableContainerSx` donde aplica).
- **Layout:** se eliminó `Container` duplicado respecto al shell principal; CTAs críticos pasan a `color="secondary"` (teal del tema).
- Sin cambio de lógica de negocio ni de endpoints.

### 2026-07-13 — UI/UX catálogos y detalle documental

- **Catálogos:** Dependencias, Series, Subseries, Tipos documentales y Cargos usan `FilterPanel`/`ListPanel`/`ActivoChip`; CTAs en cabecera; estado como chip.
- **Detalle documento:** superficies alineadas a `listSurfaceSx`; layout sin `Container` duplicado respecto al shell.
- Magic Patterns sin créditos en esta iteración; se reutilizó el sistema visual ya definido.

### 2026-07-13 — UI/UX listados densos (FilterPanel / ListPanel)

- **Componentes:** `FilterPanel`, `ListPanel`, `listSurfaces` para unificar filtros y tablas.
- **Páginas:** Documentos (acciones en cabecera, CTA teal), Auditoría y Usuarios alineados al shell institucional.
- **Boceto Magic Patterns:** [SGD Listado Documentos UX](https://www.magicpatterns.com/c/xoy8fivnvwyodazdcpk5zs).

### 2026-07-13 — UI/UX shell institucional (Magic Patterns + Context7 MUI)

- **Frontend:** tema MUI reforzado (tokens navy/teal, overrides de navegación, inputs, cards, focus); shell `MainLayout` con marca SGD, menú agrupado, avatar de cuenta y breadcrumbs; login sin control fantasma «Mantener sesión»; MFA con `slotProps.htmlInput` (MUI v9); `PageHeader` / `EmptyState` / `AuthLayout` / KPI dashboard refinados.
- **Docs:** manual `27` y guía `25` (v1.2) alineados.
- **Diseño de referencia Magic Patterns:** [SGD-GADPR-LM Shell UX](https://www.magicpatterns.com/c/xoklbb3nsdlvg6bvn6x8c5) (inspiración; implementación productiva en MUI del repo).
- **Referencias:** Context7 Material UI (theming / slotProps v9); ISO 27001 / ASVS en UX de sesión visible y controles reales.

### 2026-05-27 — Documentación y UI: solo controles reales y exigibles

- **Principio:** interfaz sin promesas de certificación ISO, sin políticas futuras editables ni botones que no ejecutan (restore remoto, «Guardar política» sin efecto en runtime).
- **Frontend (ya en código):** panel «Indicadores operativos de seguridad», pantalla de configuración con estado operativo de **historial de contraseñas** y **MFA administrativa (TOTP)**, respaldos con diálogos de procedimiento, textos institucionales; y flujo de login con verificación en dos pasos cuando la política lo exige.
- **Backend:** `getAdminSecuritySummary` ahora expone **passwordReuseHistory** y **adminMfa**; se implementa verificación TOTP para ADMIN y rechazo de reuso de contraseñas según `security_policy.desired_password_history_count`; nuevos endpoints `POST /auth/mfa/*`.
- **Docs:** nuevo `45-principio-ui-controles-reales.md`; actualizados `17`, `27`, `44`, `25`, `41`, `99`, `docs/README.md`, índice de pantallas mockup.
- **Referencias:** ISO/IEC 27001, ISO 15489, OWASP ASVS como **diseño**, no certificación en UI.

### 2026-05-07 — ngrok — Frontend Vite (5175)

- **Comando:** `ngrok http 5175`
- **URL pública:** `https://05ff-200-112-221-9.ngrok-free.app`
- **Propósito:** acceso remoto temporal fuera de la LAN para revisión/demos.
- **Alcance:** solo UI (SPA) en `frontend/` (no expone directamente la API).
- **Riesgos:** exposición pública temporal (enumeración de rutas, fuerza bruta contra login si el backend también es accesible por otros medios).
- **Medidas:** tiempo mínimo del túnel, usar datos de prueba, no compartir credenciales, cerrar túnel al terminar.
- **Referencia:** `18-seguridad-y-hardening.md` → sección “ngrok (temporal)” y `23-entorno-local-xampp-ngrok.md`.

### 2026-05-07 — RBAC granular: `PermissionsGuard`, API `/rbac`, seed `role_permissions`, UI «Matriz rol ↔ permiso»

- **Backend:** `permission-codes.ts`, `@Permissions`, `PermissionsGuard`, módulo `rbac/` (listar permisos/roles; `GET/PUT .../roles/:codigo/permissions`; `GET /rbac/me/permissions`). Cambios registrados **`ROLE_PERMISSIONS_UPDATED`**.
- **Seed:** `permissions` + asignaciones por rol después de crear roles (idempotente).
- **Rutas:** documentos (incl. archivos/revisión), catálogo escrituras, usuarios, reportes, auditoría lista, dashboard admin/backup KPI, ejecutar backup, política seguridad GET/POST auth.
- **Frontend:** pantalla usuarios · sección matriz BD + botón **Permisos por rol (BD)**.
- **Docs:** `07`, `README` snapshot RBAC, `27-manual` § 5.1.

### 2026-05-07 — Seguimiento respaldos: `.gitignore`, carpeta `backups/automated`, script PowerShell y hardening doc

- **Repo:** ignorar `*.sql` / `*.zip` bajo `backups/automated/`; `README.md` de la carpeta con reglas de permisos y no exposición web.
- **Script:** `scripts/configure-local-backups.ps1` — añade bloque `BACKUP_*` a `backend/.env` si falta `BACKUP_MYSQLDUMP_PATH`.
- **Docs:** `18-seguridad-y-hardening.md` (directorio de respaldos), `scripts/README-backups-mysql-xampp.md` (checklist), `27-manual-usuario` § 11.

### 2026-05-07 — Respaldos: mysqldump automático (cron), registro FAIL y `POST /backup/admin/run-now`

- **Backend:** módulo `backup/` + `ScheduleModule` — `MysqlDumpBackupService` ejecuta `mysqldump` con `.cnf` temporal (sin password en línea de comandos), rotación `BACKUP_KEEP_COUNT`, ZIP opcional de `storage/` (`BACKUP_INCLUDE_STORAGE_ZIP`); auditoría `BACKUP_VERIFIED` con `meta.source=scheduled_mysqldump` y resultado OK/FAIL.
- **API:** `POST /api/v1/backup/admin/run-now` (ADMIN) — mismo flujo sin esperar al cron.
- **Dashboard:** `POST .../backup-verification` acepta `result` OK|FAIL; `backup-overview` v2 añade `automatedBackup` y `historial[].source`.
- **Frontend:** radios OK/FAIL, columna Origen, tarjeta y botón mysqldump inmediato.
- **Docs:** `scripts/README-backups-mysql-xampp.md`, `27-manual-usuario-sgd-gadpr-lm.md` § 11, `backend/.env.example`.

### 2026-05-07 — Rendimiento: prefetch post-login + LCP en panel (RUM auditado)

- **Frontend:** `PostLoginPerfScheduler` + `perf/postLoginPrefetch.ts` — `requestIdleCallback` precarga chunks de `/`, `/documentos`, `/perfil` y GET alineados (resumen dashboard, perfil, bandeja documentos por defecto, catálogos de bandeja, `health`, `admin/ping` si ADMIN). Dependencia **`web-vitals`**; hook `useDashboardLcpReporting` en `DashboardPage`.
- **Backend:** `POST /api/v1/client-perf/web-vitals` (JWT, throttle) → `audit_logs` (`CLIENT_WEB_VITAL_LCP`, `resourceType=ClientPerf`).
- **Docs:** `40-rendimiento-post-login-web-vitals.md`, `15-modulo-auditoria.md`, `27-manual-usuario` § 1.5.
- **PR:** rama `perf/post-login-prefetch-web-vitals` → `main`.

### 2026-05-06 — Respaldos (ADMIN): KPI + historial real desde auditoría `BACKUP_VERIFIED`

- **API:** `GET /api/v1/dashboard/admin/backup-overview` — hasta 50 filas recientes de `BACKUP_VERIFIED`, conteos OK/FAIL en 90 días, último OK y texto opcional `BACKUP_EXPECTED_SCHEDULE_HINT` desde entorno (sin cron en la app).
- **API:** `POST .../dashboard/admin/backup-verification` — meta ampliada (`tipoRespaldo`, `tamanoLabel`, `tamanoBytes`, `notes`) persistida en `meta` del log de auditoría.
- **Frontend:** `/admin/respaldos` consume el overview; elimina datos ilustrativos ficticios; formulario de registro con campos opcionales.
- **Docs:** `27-manual-usuario-sgd-gadpr-lm.md` § 11, `backend/.env.example`.

### 2026-05-06 — Auditoría (ADMIN): expediente por código real y filtros coherentes con BD

- **API/UI:** respuesta `GET /api/v1/auditoria` y exports `reportes/auditoria.{xlsx,pdf}` enriquecidos con `resourceCodigo` (lookup `documentos.codigo` por `Documento.resourceId` o `meta.documentoId`).
- **Filtros:** `action` pasa de `contains` a **igualdad exacta**; nuevo query `actorUserId` (UUID); la UI deja de filtrar solo por correo inferido.
- **Código:** `backend/src/auditoria/audit-list.util.ts` compartido con `ReportesService.findAuditLogs`.
- **Docs:** `15-modulo-auditoria.md`, `27-manual-usuario-sgd-gadpr-lm.md` § 10.

### 2026-05-06 — Identidades (ADMIN): último ingreso real y matriz desde API

- **Datos:** migración `20260506143000_user_ultimo_login` — columna `users.ultimo_login_at` (actualizada en `AUTH_LOGIN_OK` con credenciales).
- **API:** `GET /api/v1/usuarios/matriz-acceso-referencia` — matriz efectiva alineada a `access-matrix.reference.ts` (evita matriz solo en cliente).
- **Perfil:** `GET .../auth/me/profile` prioriza `ultimoLoginAt` persistido y conserva respaldo por auditoría.
- **UI:** `/admin/usuarios` — dependencia/cargo visibles, estado **Suspendido**, último ingreso formateado, matriz consumida del servidor, acción **Ir a usuarios para asignar roles** (sin botón “guardar” ficticio).
- **Docs:** `04-modelo-base-de-datos.md`, `27-manual-usuario-sgd-gadpr-lm.md` § 5.1.

### 2026-05-06 — Clasificación documental: ficha y tabla con datos reales (agregados + honestidad sobre retención)

- **API:** `GET /api/v1/documentos/clasificacion-agregados` — por serie/subserie activa del catálogo: cuenta de expedientes visibles (`activo` + misma función de alcance que `GET /documentos`), dependencia y nivel de confidencialidad predominantes entre esos registros (`DocumentosService.getClasificacionAgregados`).
- **Frontend:** `/clasificacion` consume ese endpoint junto al catálogo; ficha muestra métricas reales sin inventar plazos/disposición final; tabla añade **Expedientes visibles** por serie; botón Actualizar coherente con otras pantallas.
- **Docs:** `27-manual-usuario-sgd-gadpr-lm.md` § 7.2.2.

### 2026-05-07 — Trámites (Kanban): tablero con datos consolidados desde API

- **API:** `GET /api/v1/documentos/tablon-tramites` agrupa cargas por las cuatro columnas + totales borrador/rechazado (`DocumentosService.findTablonTramites`), misma visibilidad que `GET /documentos`.
- **Listados:** `pageSize` máximo en `GET /documentos` pasa a **200** (antes 100) para grandes bandejas cuando se necesite.
- **UI:** `/tramites` consume el tablero en una llamada; tarjetas muestran **tipo documental** + asunto compacto + dependencia; botón actualizar.

### 2026-05-07 — Vite: mitigación riesgo `allowedHosts` vs LAN (`frontend/vite.config`)

- **`server.allowedHosts`:** política repo documentada sin lista fija en config (valor por defecto Vite permite IPs/LAN + localhost).
- **Túneles:** usar `__VITE_ADDITIONAL_SERVER_ALLOWED_HOSTS` (fusión oficial) según manual Vite — evita repetir errores tipo “sin conexión” con `Host` al acceder por `192.168.*.*`.
- **Refs:** `docs/02-stack-y-convenciones.md`, `.env.example` del frontend.

### 2026-05-06 — Sincronización de documentación con el estado del código (`docs/`)

- Actualización transversal del índice (`README.md` snapshot), roadmap (`00`), arquitectura/stack (`01`, `02`, `03`), modelo (`04`), módulos `12`, `15`, `16`, `17`, `18`, pruebas (`19`), riesgos/problemas (`20`, `21`), listado de brechas (`28`), manual (`27`), cierres de etapa `38`/`39` y notas `29`–`37` donde aplica — alineados a revisión documental (**R‑28**), reportes (**R‑39**), auditoría UI, lockout (**R‑9**) y desarrollo estable (`tsbuildinfo:clean` + `start:dev`).

### 2026-05-06 — R-39/R-28: reporte “pendientes de revisión” (ADMIN/REVISOR)

- **API:** `GET /api/v1/reportes/pendientes-revision.{xlsx,pdf}` (usa mismas reglas de visibilidad que lectura).
- **Auditoría:** `REPORT_EXPORTED` con `kind=pendientes_revision`.
- **Frontend:** botones “Pendientes revisión (Excel/PDF)” en `/documentos` para rol **REVISOR**.
- **Docs:** `28-listado-lo-que-deberia-tener-el-sistema.md`, `12-modulo-documentos.md`, `27-manual-usuario-sgd-gadpr-lm.md`.

### 2026-05-06 — R-44 (MVP): notificaciones por correo en revisión documental (best-effort)

- **Backend:** envía correo si SMTP está configurado:
  - envío a revisión → notifica a usuarios **ADMIN/REVISOR** activos;
  - resolución (aprobado/rechazado) → notifica al **creador** (incluye motivo en rechazo).
- **Nota:** sin SMTP, el flujo funciona igual (no bloquea).
- **Docs:** `28-listado-lo-que-deberia-tener-el-sistema.md`, `12-modulo-documentos.md`.

### 2026-05-05 — R-28: rechazo con motivo obligatorio y auditoría

- **API:** `POST .../resolver-revision` acepta `motivo` requerido si `decision: "RECHAZADO"` (DTO `ResolverRevisionDto`; validación global con `trim`).
- **Auditoría:** `DOC_REVIEW_RESOLVED.meta` incluye **`motivoRechazo`** en rechazos.
- **Frontend:** diálogo de confirmación antes de rechazar (`DocumentoDetallePage`).
- **Docs:** `28-listado-lo-que-deberia-tener-el-sistema.md`, `12-modulo-documentos.md`, `27-manual-usuario-sgd-gadpr-lm.md`.

### 2026-05-10 — R-28 MVP: enviar a revisión y resolver (rol REVISOR)

- **API:** `POST /api/v1/documentos/:id/enviar-revision`, `POST .../resolver-revision` + DTO `ResolverRevisionDto`.
- **Reglas:** envío solo desde **REGISTRADO** (creador o ADMIN); resolución **EN_REVISION** (ADMIN o REVISOR); auditoría `DOC_SUBMITTED_FOR_REVIEW` / `DOC_REVIEW_RESOLVED`.
- **Frontend:** acciones en detalle; aviso a **REVISOR** en listado de documentos.
- **Docs:** `28-listado...`, `12-modulo-documentos.md`, `06-modulo-usuarios.md`, `15-modulo-auditoria.md`, `27-manual-usuario-sgd-gadpr-lm.md`.

### 2026-05-09 — R-27 MVP: catálogo y transiciones de estado en documentos

- **Datos:** migración `20260509153000_normalize_documento_estados` (valores huérfanos → `REGISTRADO`).
- **Backend:** `documento-estado.util.ts`; validación en `create`/`update`; bloqueo de adjuntos si **ARCHIVADO**; **`DOC_STATE_CHANGED`** en auditoría.
- **Frontend:** `constants/documento-estado.ts`; filtro Estado en listado; estado inicial en alta; select en edición detalle + deshabilitar carga/eliminación de archivos archivados.
- **Docs:** `28-listado-lo-que-deberia-tener-el-sistema.md`, `04-modelo-base-de-datos.md`, `12-modulo-documentos.md`, `15-modulo-auditoria.md`, `27-manual-usuario-sgd-gadpr-lm.md`.

### 2026-05-08 — Listado gap 28: auditoría 403 + lockout por cuenta en login

- **Datos:** migración `20260508120000_user_login_lockout` (`failed_login_attempts`, `locked_until` en `users`).
- **Backend:** `ForbiddenAuditFilter` (`AUTHZ_FORBIDDEN`); `AuthService.login` con `AUTH_LOCKOUT_*` y auditoría `ACCOUNT_LOCKED` / intentos fallidos en `AUTH_LOGIN_FAIL` (mensaje genérico al cliente).
- **Docs:** `28-listado-lo-que-deberia-tener-el-sistema.md`, `04-modelo-base-de-datos.md`, `05-modulo-auth.md`, `15-modulo-auditoria.md`, `18-seguridad-y-hardening.md`, `27-manual-usuario-sgd-gadpr-lm.md`, `.env.example`.

### 2026-05-07 — ETAPA 10: cierre formal MVP tesis (documentación y evidencias)

- **Nuevo:** `docs/39-etapa-10-cierre-y-evidencias.md` (hardening: Helmet, ValidationPipe, Throttler global + `@Throttle` auth, `ThrottlerAuditFilter`, `GET /auditoria` ADMIN).
- **Actualización:** `00-roadmap-general.md`; `38-etapa-9-cierre-y-evidencias.md`; `18-seguridad-y-hardening.md`; `15-modulo-auditoria.md`; `docs/README.md`; `README.md` raíz; `EJECUTAR.txt`.

### 2026-05-07 — Listado gap 28: confidencialidad por documento + auditoría en UI + roles extendidos en administración

- **Datos/API:** migración Prisma documento `dependencia_id` / `nivel_confidencialidad`; filtro anti‑IDOR en `documentos` y reportes; JWT con `dependenciaId`.
- **UI:** `/admin/auditoria` (filtros + export Excel/PDF vía reportes); formulario/detalle documento con dependencia y confidencialidad; **`Usuarios`:** selector de roles `REVISOR` / `AUDITOR` / `CONSULTA` además de `ADMIN` / `USUARIO`.
- **Docs:** `28-listado...`, `04-modelo-base-de-datos.md`, `15-modulo-auditoria.md`, `16-modulo-reportes.md`, `scripts/README-backups-mysql-xampp.md`, `27-manual-usuario-sgd-gadpr-lm.md`.

### 2026-05-06 — ETAPA 9: cierre formal al 100 % (documentación y evidencias)

- **Nuevo:** `docs/38-etapa-9-cierre-y-evidencias.md` (`GET /reportes/documentos.{xlsx,pdf}`, ExcelJS/pdfkit, filtros ETAPA 8, límite 5000 filas, guards ADMIN).
- **Actualización:** `00-roadmap-general.md`; `16-modulo-reportes.md`; `docs/README.md`; `README.md` raíz; `EJECUTAR.txt`; `27-manual-usuario-sgd-gadpr-lm.md` (exportación ADMIN).

### 2026-05-06 — ETAPA 8: cierre formal al 100 % (documentación y evidencias)

- **Nuevo:** `docs/37-etapa-8-cierre-y-evidencias.md` (`GET /documentos` con `q`, filtros catálogo/fechas, adjuntos `archivo*`, `sortBy`/`sortDir`, `page`/`pageSize`, UI `DocumentosPage`).
- **Actualización:** `00-roadmap-general.md`; `36-etapa-7-cierre-y-evidencias.md`; `14-modulo-busqueda.md`; `docs/README.md`; `README.md` raíz; `EJECUTAR.txt`.

### 2026-05-06 — ETAPA 7: cierre formal al 100 % (documentación y evidencias)

- **Nuevo:** `docs/36-etapa-7-cierre-y-evidencias.md` (CRUD adjuntos, `storage/`, versiones, eventos `SUBIDO`/`DESCARGADO`/`ELIMINADO`, límite 10MB, UI `/documentos/:id`).
- **Actualización:** `00-roadmap-general.md`; `35-etapa-6-cierre-y-evidencias.md` (nota archivos); `13-modulo-archivos.md` (enlace evidencias); `docs/README.md`; `README.md` raíz; `EJECUTAR.txt`.

### 2026-05-06 — ETAPA 6: cierre formal al 100 % (documentación y evidencias)

- **Nuevo:** `docs/35-etapa-6-cierre-y-evidencias.md` (`documentos/` API, `documento_eventos`, `/documentos`, `/documentos/:id`; línea respecto ETAPA 7/archivos).
- **Actualización:** `00-roadmap-general.md`; `34-etapa-5-cierre-y-evidencias.md`; `12-modulo-documentos.md` (enlace al `35`); `docs/README.md`; `README.md` raíz; `EJECUTAR.txt`.

### 2026-05-06 — ETAPA 5: cierre formal al 100 % (documentación y evidencias)

- **Nuevo:** `docs/34-etapa-5-cierre-y-evidencias.md` (cinco catálogos: API `dependencias|cargos|tipos-documentales|series|subseries`, páginas `/catalogos/*`, mutaciones ADMIN).
- **Actualización:** `00-roadmap-general.md`; `33-etapa-4-cierre-y-evidencias.md` (siguiente fase); `docs/README.md`; `README.md` raíz; `EJECUTAR.txt`.

### 2026-05-06 — ETAPA 4: cierre formal al 100 % (documentación y evidencias)

- **Nuevo:** `docs/33-etapa-4-cierre-y-evidencias.md` (`MainLayout`, `ProtectedRoute`, `RoleRoute`, `/forbidden`, 404, `AppNotifications`/axios).
- **Actualización:** `00-roadmap-general.md`; `32-etapa-3-cierre-y-evidencias.md` (enlace a `33`); `docs/README.md`; `README.md` raíz; `EJECUTAR.txt`.

### 2026-05-06 — ETAPA 3: cierre formal al 100 % (documentación y evidencias)

- **Nuevo:** `docs/32-etapa-3-cierre-y-evidencias.md` (JWT, refresh+rotación, Argon2, `JwtAuthGuard`/`RolesGuard`, throttling auth, `audit_logs` para eventos AUTH, `session/restore`).
- **Actualización:** `docs/00-roadmap-general.md`; `docs/05-modulo-auth.md` (endpoints `session/restore`, auditoría central, ASVS logging); `docs/31-etapa-2-cierre-y-evidencias.md` (siguiente fase); `docs/README.md`; `README.md` raíz; `EJECUTAR.txt`.

### 2026-05-06 — ETAPA 2: cierre formal al 100 % (documentación y evidencias)

- **Nuevo:** `docs/31-etapa-2-cierre-y-evidencias.md` (checklist: `schema.prisma`, 14 migraciones, `DATABASE_URL` / XAMPP, Prisma 5.22.x).
- **Actualización:** `docs/04-modelo-base-de-datos.md` (listado ordenado de migraciones, RBAC+sesión+usuarios institucional, tablas seguridad/consulta §5); `00-roadmap-general.md`; `docs/README.md`; `README.md` raíz; `docs/30-etapa-1-cierre-y-evidencias.md` (siguiente fase); `EJECUTAR.txt`.

### 2026-05-06 — ETAPA 1: cierre formal al 100 % (documentación y evidencias)

- **Nuevo:** `docs/30-etapa-1-cierre-y-evidencias.md` (checklist: frontend Vite/React/MUI/axios/Router + RHF/Zod; Nest `ConfigModule`, `ValidationPipe`, `/api/v1`, CORS, proxy Vite).
- **Actualización:** `00-roadmap-general.md` (bloque *Estado actual*); `docs/README.md`; `README.md` raíz; `03-estructura-de-carpetas.md` (árbol y nota de módulos Nest).

### 2026-05-06 — ETAPA 0: cierre formal al 100 % (documentación y evidencias)

- **Objetivo:** cumplir entregables del roadmap fila ETAPA 0 (`/docs`, `.gitignore`, `storage/`, plantillas `.env.example`, README, deuda registrada).
- **Nuevo:** `docs/29-etapa-0-cierre-y-evidencias.md` (checklist comprobado + distinción informe inicial archivado).
- **Actualización:** bandera de archivo en `etapa-0-auditoria-inicial-y-diagnostico.md`; `00-roadmap-general.md` (bloque *Estado actual*); `docs/20-problemas-detectados.md` (P-003/P-004 cerrados en ámbito repositorio; revisión 2026-05-06); índice `docs/README.md`; `21-riesgos-pendientes.md` (fecha actual).
- **README raíz:** enlace a evidencias ETAPA 0.
- **`EJECUTAR.txt`:** referencia rápida a `docs/29-etapa-0-cierre-y-evidencias.md`.

### 2026-04-20 — ETAPA 9: reportes (Excel/PDF)

- **Backend:** `GET /api/v1/reportes/documentos.xlsx` (ExcelJS) y `GET /api/v1/reportes/documentos.pdf` (pdfkit).
- **Permisos:** solo `ADMIN` puede exportar.
- **Frontend:** botones “Exportar Excel / Exportar PDF” en `/documentos` usando filtros actuales.

### 2026-04-20 — ETAPA 8: búsqueda y paginación de documentos

- **API:** `GET /api/v1/documentos` con filtros (`q`, catálogos, estado, fechas) y paginación (`page`, `pageSize`).
- **API (mejora):** ordenamiento (`sortBy`, `sortDir`) y búsqueda por adjuntos (`archivoNombre`, `archivoMime`, `archivoSha256`).
- **Frontend:** `/documentos` con filtros, ordenamiento por columnas (click) y navegación Anterior/Siguiente.

### 2026-04-20 — ETAPA 7: archivos (upload/download) con trazabilidad

- **Prisma:** modelos `DocumentoArchivo` + `DocumentoArchivoEvento`; migración `20260421193000_add_documento_archivos`.
- **Prisma (mejora):** versionado en `documento_archivos.version`; migración `20260421194500_documento_archivos_versionado`.
- **Storage:** guardado físico bajo `storage/` (no público), nombres internos seguros.
- **API:** listado, upload (ADMIN) y descarga (JWT) por documento.
- **API (mejora):** eventos por archivo + borrado lógico (ADMIN) y registro de IP en descargas.
- **Frontend:** sección Archivos en `/documentos/:id` (subir/descargar/historial/eliminar).

### 2026-04-20 — ETAPA 6 (cierre): historial de documentos + detalle/edición

- **Prisma:** modelo `DocumentoEvento`; migración `20260421190000_add_documento_eventos`.
- **API:** `GET /api/v1/documentos/:id/eventos` y registro automático de eventos `CREADO/ACTUALIZADO`.
- **Frontend:** ruta `/documentos/:id` (detalle + edición + historial) y navegación desde el listado.

### 2026-04-21 — ETAPA 6 (inicio): registro documental MVP

- **Prisma:** modelo `Documento`; migración `20260421180000_add_documentos_mvp`.
- **API:** `DocumentosModule` en `/api/v1/documentos` (JWT; mutaciones solo `ADMIN`).
- **Frontend:** `/documentos` (listado + registrar documento).
- **Seed:** `DOC-0001` (tipo `MEMO`, subserie `ADM-CORR`).

### 2026-04-21 — ETAPA 5: catálogo Series/Subseries

- **Prisma:** modelos `Serie` y `Subserie`; migración `20260421170000_add_series_subseries`.
- **API:** `SeriesModule` (`/api/v1/series`) y `SubseriesModule` (`/api/v1/subseries`) con JWT; mutaciones solo `ADMIN`.
- **Frontend:** `/catalogos/series` y `/catalogos/subseries`, menú bajo Catálogos.
- **Seed:** `ADM` y `ADM-CORR`.

### 2026-04-21 — ETAPA 5: catálogo Tipos documentales

- **Prisma:** modelo `TipoDocumental`; migración `20260421160000_add_tipos_documentales`.
- **API:** `TiposDocumentalesModule` en `/api/v1/tipos-documentales` (JWT; mutaciones solo `ADMIN`).
- **Frontend:** `/catalogos/tipos-documentales`, menú bajo Catálogos.
- **Seed:** `MEMO`, `OFICIO`.

### 2026-04-21 — ETAPA 5: catálogo Cargos

- **Prisma:** modelo `Cargo` + FK opcional a `Dependencia`; migración `20260421140000_add_cargos`.
- **API:** `CargosModule` en `/api/v1/cargos` (mismo patrón JWT / ADMIN que dependencias).
- **Util:** `src/common/prisma-util.ts` (`isPrismaCode`) usado por dependencias y cargos.
- **Frontend:** `/catalogos/cargos`, menú bajo Catálogos.
- **Seed:** cargos `DIR-GEN` (con GADPR-LM) y `ASIST` (sin dependencia).

### 2026-04-21 — ETAPA 5 (inicio): catálogo Dependencias

- **Prisma:** modelo `Dependencia`, migración `20260421120000_add_dependencias`.
- **API:** `DependenciasModule`, `GET/POST/PATCH` bajo `/api/v1/dependencias` (JWT; mutaciones solo `ADMIN`).
- **Seed:** dos dependencias de ejemplo (`GADPR-LM`, `SGD`) tras migración.
- **Frontend:** ruta `/catalogos/dependencias`, entrada de menú **Catálogos → Dependencias**.
- Tras pull: `npx prisma migrate deploy` y `npx prisma generate` (o `npm run prisma:generate:clean` en Windows si EPERM).

### 2026-04-20 — Documentación: comandos Prisma CLI

- Nuevo `docs/24-prisma-comandos-cli.md` (tablas de referencia + scripts `backend/package.json` + nota EPERM Windows); entrada en `docs/README.md`.

### 2026-04-20 — ETAPA 4: shell UI + rutas protegidas + RBAC en API

- **Frontend:** `MainLayout` (AppBar, drawer de navegación, salida de sesión), `ProtectedRoute` (redirección a `/login`), `DashboardPage` (salud API + verificación `GET /admin/ping` para ADMIN), `ForbiddenPage` (`/forbidden`), login con redirección si ya hay sesión; eliminada `HomePage` pública en favor del panel autenticado.
- **Frontend (refinamiento):** menú y rutas condicionados por rol (`ADMIN`) + notificaciones globales (API caída / sesión expirada).
- **Backend:** `@Roles()` + `RolesGuard`, `GET /api/v1/admin/ping` (JWT + rol `ADMIN`).
- **Docs:** `00-roadmap-general.md`, `03-estructura-de-carpetas.md`, `07-modulo-roles-permisos.md`.

### 2026-04-20 — ETAPA 3: auth JWT + refresh HttpOnly + login frontend

- **Migración:** `20260420103000_add_refresh_tokens` — tabla `refresh_tokens` (hash SHA-256 del refresh opaco).
- **Backend:** `AuthModule` (`login`, `refresh`, `logout`, `me`); cookie HttpOnly para refresh; `JWT_ACCESS_EXPIRES`, `JWT_REFRESH_DAYS`, `REFRESH_COOKIE_NAME`; tipos `JwtSignOptions` para `signAsync`; `JwtStrategy` devuelve usuario con roles para `GET /api/v1/auth/me`.
- **Seed:** `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` en `backend/.env.example`; `npx prisma db seed`.
- **Frontend:** `AuthProvider`, `useAuth`, token de acceso en memoria, interceptores axios (Bearer + reintento con `/auth/refresh`), ruta `/login`, `HomePage` con sesión y cierre de sesión.
- **Validado:** `npm run build` + `npm run lint` (backend y frontend), `npm test` y `npm run test:e2e` en backend.

### 2026-04-20 — Script `prisma:generate:clean` (EPERM Windows)

- `backend/scripts/clean-prisma-client.js` + `npm run prisma:generate:clean`: borra `node_modules/.prisma` y ejecuta `prisma generate` para evitar bloqueo del motor en Windows.

### 2026-04-20 — ETAPA 2: Prisma 5 + MySQL, RBAC inicial

- **ORM:** `prisma` y `@prisma/client` **5.22.0** (evita cambios de configuración de Prisma 7 sobre `datasource url`).
- **Esquema:** `User`, `Role`, `Permission`, `UserRole`, `RolePermission`; tablas en inglés con `@@map` a nombres SQL coherentes.
- **NestJS:** `PrismaModule` global + `PrismaService`; `GET /api/v1/health` incluye `database: 'up' | 'down'` según `SELECT 1` (API puede arrancar sin MySQL).
- **Migración:** `prisma/migrations/20260420001500_init_rbac/migration.sql` — aplicar con `npx prisma migrate dev` desde `backend/` con XAMPP y BD creada.
- **Frontend:** `HomePage` muestra estado de la base de datos según el health.
- **Scripts:** `prisma:generate`, `prisma:migrate`, `prisma:studio` en `backend/package.json`.

### 2026-04-19 — Script `free:3000` (puerto ocupado)

- `npm run free:3000` en raíz o en `backend/`: libera el puerto 3000 (`npx kill-port`) antes de `start:dev` cuando aparece `EADDRINUSE`.

### 2026-04-19 — `package.json` en raíz del monorepo

- Scripts de conveniencia: `npm run install:all` (instala `backend` + `frontend`), `npm run start:dev`, `npm run dev`, `build`, `lint`, `test` desde la raíz sin `cd`.
- Motivo: evitar error `ENOENT` al ejecutar npm en la raíz sin `package.json`.

### 2026-04-19 — ETAPA 1: frontend Vite + React 18 y API shell NestJS

- **Frontend:** proyecto en `frontend/` (Vite, React 18, TS, MUI, React Router, axios, RHF y Zod instalados; shell con `HomePage` que llama a `GET /health`, `NotFoundPage`, tema MUI).
- **Backend:** `@nestjs/config`, `class-validator`/`class-transformer`; prefijo global `api/v1`; CORS desde `CORS_ORIGIN`; `ValidationPipe` global; endpoint `GET /api/v1/health`; eliminado `AppService` boilerplate.
- **Pruebas:** `npm run test` y `npm run test:e2e` en backend actualizados; frontend `npm run build` y `npm run lint` OK.
- **Entorno:** `frontend/.env.example` con `VITE_API_URL`. React fijado a **18.x** (stack oficial).
- **Siguiente:** ETAPA 2 — Prisma + MySQL (XAMPP).

### 2026-04-19 — Toma de control técnico: auditoría, docs `00`–`23`, saneamiento mínimo

- Auditoría de estructura: solo `backend/` (Nest sin Prisma); sin `frontend/`; sin `schema.prisma`.
- Documentación: creados `00`, `05`–`17`, `18`–`21`, `23`, `docs/README.md`; eliminados archivos vacíos/erróneos (`17-seguridad` duplicado, `21-changelog` duplicado); referencias `17`→`18` en `01` y `02`.
- Raíz: `README.md`, `.gitignore`, `storage/.gitkeep`, `backend/.env.example`.
- Código: `void bootstrap()` en `main.ts` para cumplir ESLint (`no-floating-promises`).
- Validado en backend: `npm run build`, `npm run lint` (0 errores), `npm run test` (pass).
- Próximo hito planificado: **ETAPA 1** — scaffolding `frontend/`, ConfigModule NestJS, prefijo `/api/v1`, CORS (sin pantallas de negocio hasta ordenar base).

### 2026-04-19 — ETAPA 0: auditoría inicial y baseline documental

- Repositorio sin código de aplicación previo; existían borradores parciales en `docs/` con numeración distinta.
- Unificación de documentación bajo esquema `00`–`23`; referencias cruzadas actualizadas.
- Inicio de **ETAPA 1** (base técnica): scaffolding planificado de `frontend/` (Vite + React + TS) y `backend/` (NestJS + TS), más `storage/` y `.env.example`.

### 2026-04-19 — Documentación inicial de infraestructura local (histórico)

- Línea base conceptual: XAMPP (MySQL/MariaDB), Prisma, NestJS, Vite; ngrok solo para exposición temporal documentada.

---

### Plantilla — Sesión ngrok (copiar y rellenar)

```
### YYYY-MM-DD — ngrok — [API | Frontend | ambos]
- Comando: `ngrok http PUERTO`
- URL pública: https://...
- Propósito: (demo, callback, prueba móvil, ...)
- Endpoints / alcance: ...
- Cierre: (hora / túnel detenido sí/no)
```

### Plantilla — Sesión cloudflared (copiar y rellenar)

```
### YYYY-MM-DD — cloudflared — Frontend (5173)
- Comando: `cloudflared tunnel --url http://localhost:5173`
- URL pública: https://...
- Propósito: (demo, prueba móvil, revisión externa, ...)
- Duración: (inicio–fin)
- Alcance: (solo frontend / rutas específicas)
- Notas seguridad: (CORS, cookies, datos de prueba, etc.)
- Cierre: túnel detenido (sí/no)
```
