# Documentación técnica — SGD-GADPR-LM

Índice de la carpeta `docs/`. Los documentos se actualizan **en cada iteración** que toque el área correspondiente.

## Estado del sistema (snapshot — 2026-05-06)

Vista rápida del **código** frente a estos documentos. Lista de brechas y matriz 1–45: **`28-listado-lo-que-deberia-tener-el-sistema.md`**. Línea temporal de cambios: **`22-changelog-tecnico.md`**.

| Área | Implementado hoy (resumen) |
|------|----------------------------|
| **Autenticación** | JWT + refresh HttpOnly, rotación, inactividad (`last_used_at`), throttling global y en `/auth`, lockout por cuenta (`AUTH_LOCKOUT_*`), recuperación de contraseña. |
| **RBAC** | Roles en seed: `ADMIN`, `USUARIO`, `REVISOR`, `AUDITOR`, `CONSULTA`. Autorización principal con `@Roles`; tablas `permissions` / `role_permissions` sin `PermissionsGuard` (backlog `07`). |
| **Documentos** | Estados normalizados y transiciones (`documento-estado.util`); flujo **enviar a revisión** / **resolver** (R-28); `dependencia_id` + `nivel_confidencialidad` en consulta/descarga/export. |
| **Notificaciones** | Correo SMTP opcional (nodemailer) en envío a revisión y al resolver (ver `12`, `28` R-44); sin SMTP el flujo sigue. |
| **Auditoría** | `audit_logs`; API `GET /auditoria` (ADMIN); UI **`/admin/auditoria`**; `AUTHZ_FORBIDDEN` en 403 autenticados; export Excel/PDF de auditoría. |
| **Reportes** | Documentos y auditoría → Excel/PDF (**ADMIN**); **pendientes de revisión** → Excel/PDF (**ADMIN** + **REVISOR**); cada export genera `REPORT_EXPORTED`. |
| **Arranque dev** | En `backend/`, `npm run start:dev` ejecuta `tsbuildinfo:clean` antes de `nest start --watch` para evitar salida `dist` inconsistente en Windows. |

Las fichas **29–39** (“cierre al 100 %”) son **evidencia de hito**; pueden incorporar una nota que remite a este snapshot y a `22`/`28` para cambios posteriores al cierre formal.

## General y arquitectura

| Archivo | Contenido |
|---------|-----------|
| [00-roadmap-general.md](./00-roadmap-general.md) | Fases 0–10 y orden de construcción |
| [29-etapa-0-cierre-y-evidencias.md](./29-etapa-0-cierre-y-evidencias.md) | **Cierre ETAPA 0 al 100%** — checklist vs roadmap y archivo del informe inicial |
| [30-etapa-1-cierre-y-evidencias.md](./30-etapa-1-cierre-y-evidencias.md) | **Cierre ETAPA 1 al 100%** — Vite/React/Nest base (API `/api/v1`, validación, CORS, proxy) |
| [31-etapa-2-cierre-y-evidencias.md](./31-etapa-2-cierre-y-evidencias.md) | **Cierre ETAPA 2 al 100%** — Prisma + MySQL (XAMPP), migraciones, `DATABASE_URL` |
| [32-etapa-3-cierre-y-evidencias.md](./32-etapa-3-cierre-y-evidencias.md) | **Cierre ETAPA 3 al 100%** — JWT, refresh HttpOnly, Argon2, guards RBAC, auditoría auth |
| [33-etapa-4-cierre-y-evidencias.md](./33-etapa-4-cierre-y-evidencias.md) | **Cierre ETAPA 4 al 100%** — layout, rutas protegidas, 403/404, menú por rol, alertas globales |
| [34-etapa-5-cierre-y-evidencias.md](./34-etapa-5-cierre-y-evidencias.md) | **Cierre ETAPA 5 al 100%** — catálogos dependencias/cargos/tipos/series/subseries (API + ADMIN UI) |
| [35-etapa-6-cierre-y-evidencias.md](./35-etapa-6-cierre-y-evidencias.md) | **Cierre ETAPA 6 al 100%** — documentos, eventos dominio, UI listado/detalle/historial |
| [36-etapa-7-cierre-y-evidencias.md](./36-etapa-7-cierre-y-evidencias.md) | **Cierre ETAPA 7 al 100%** — adjuntos, `storage/`, versión, descarga, borrado lógico, eventos archivo |
| [37-etapa-8-cierre-y-evidencias.md](./37-etapa-8-cierre-y-evidencias.md) | **Cierre ETAPA 8 al 100%** — filtros, orden, paginación, búsqueda por adjuntos, UI `/documentos` |
| [38-etapa-9-cierre-y-evidencias.md](./38-etapa-9-cierre-y-evidencias.md) | **Cierre ETAPA 9 al 100%** — Excel/PDF documentos, filtros ETAPA 8, rol ADMIN, UI exportación |
| [39-etapa-10-cierre-y-evidencias.md](./39-etapa-10-cierre-y-evidencias.md) | **Cierre ETAPA 10 (MVP tesis)** — hardening línea base, throttle+auditoría 429, cierre roadmap 0–10 |
| [01-arquitectura-general.md](./01-arquitectura-general.md) | Capas, entornos, contrato API |
| [02-stack-y-convenciones.md](./02-stack-y-convenciones.md) | Stack cerrado, puertos, variables |
| [03-estructura-de-carpetas.md](./03-estructura-de-carpetas.md) | Monorepo, rutas clave |
| [04-modelo-base-de-datos.md](./04-modelo-base-de-datos.md) | Prisma, XAMPP, migraciones |
| [24-prisma-comandos-cli.md](./24-prisma-comandos-cli.md) | Referencia de comandos Prisma CLI |

## Módulos funcionales

| Archivo | Módulo |
|---------|--------|
| [05-modulo-auth.md](./05-modulo-auth.md) | Autenticación y sesión |
| [06-modulo-usuarios.md](./06-modulo-usuarios.md) | Usuarios |
| [07-modulo-roles-permisos.md](./07-modulo-roles-permisos.md) | Roles y permisos |
| [08-modulo-dependencias.md](./08-modulo-dependencias.md) | Dependencias |
| [09-modulo-cargos.md](./09-modulo-cargos.md) | Cargos |
| [10-modulo-tipos-documentales.md](./10-modulo-tipos-documentales.md) | Tipos documentales |
| [11-modulo-series-subseries.md](./11-modulo-series-subseries.md) | Series y subseries |
| [12-modulo-documentos.md](./12-modulo-documentos.md) | Registro documental |
| [13-modulo-archivos.md](./13-modulo-archivos.md) | Archivos y storage |
| [14-modulo-busqueda.md](./14-modulo-busqueda.md) | Búsqueda |
| [15-modulo-auditoria.md](./15-modulo-auditoria.md) | Auditoría |
| [16-modulo-reportes.md](./16-modulo-reportes.md) | Reportes |
| [17-modulo-configuracion.md](./17-modulo-configuracion.md) | Configuración |

## Seguridad, calidad y entorno

| Archivo | Contenido |
|---------|-----------|
| [18-seguridad-y-hardening.md](./18-seguridad-y-hardening.md) | Controles, JWT, archivos, ASVS (referencia) |
| [19-pruebas-y-validaciones.md](./19-pruebas-y-validaciones.md) | Comandos y criterios de prueba |
| [19-mapeo-iso27001-iso15489-owasp-asvs.md](./19-mapeo-iso27001-iso15489-owasp-asvs.md) | Explicación y mapeo (ISO/ASVS → código) |
| [20-problemas-detectados.md](./20-problemas-detectados.md) | Registro de incidencias |
| [21-riesgos-pendientes.md](./21-riesgos-pendientes.md) | Registro de riesgos |
| [22-changelog-tecnico.md](./22-changelog-tecnico.md) | Historial técnico y sesiones ngrok |
| [23-entorno-local-xampp-ngrok.md](./23-entorno-local-xampp-ngrok.md) | XAMPP, puertos, ngrok |
| [25-ui-ux-diseno-sistema-institucional.md](./25-ui-ux-diseno-sistema-institucional.md) | UI/UX institucional, IA, design system, ISO/ASVS |
| [26-cloudflared-tunnel.md](./26-cloudflared-tunnel.md) | Exposición temporal del frontend (Vite) con cloudflared |
| [28-listado-lo-que-deberia-tener-el-sistema.md](./28-listado-lo-que-deberia-tener-el-sistema.md) | Gap vs checklist institucional (1–45) |
| [99-guia-de-prueba-por-modulos.md](./99-guia-de-prueba-por-modulos.md) | Guía de prueba consolidada (formato obligatorio de cierre) |

## Otros

| Archivo | Contenido |
|---------|-----------|
| [27-manual-usuario-sgd-gadpr-lm.md](./27-manual-usuario-sgd-gadpr-lm.md) | Manual de usuario (paso a paso) |
| [etapa-0-auditoria-inicial-y-diagnostico.md](./etapa-0-auditoria-inicial-y-diagnostico.md) | Informe de auditoría ETAPA 0 (**histórico 2026-04-19**); ver `29` para cierre vigente |

**Nota:** el documento único de changelog técnico es **`22-changelog-tecnico.md`**.
