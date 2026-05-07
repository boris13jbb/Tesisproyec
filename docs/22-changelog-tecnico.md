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
