# Roadmap general — SGD-GADPR-LM

## Objetivo

Ordenar el desarrollo del prototipo por **fases dependientes**, sin adelantar pantallas antes de tener base técnica, datos y seguridad mínima definidos en el expediente `GADPR-LM-ETI-SGD-2026-001`.

## Alcance

Desde auditoría inicial hasta hardening final; el detalle por módulo vive en `05`–`17` y en el expediente.

## Estado actual

**ETAPA 0 (auditoría y saneamiento):** **cerrada al 100 %** según evidencias (`docs/29-etapa-0-cierre-y-evidencias.md`, 2026-05-06). El informe `etapa-0-auditoria-inicial-y-diagnostico.md` permanece como **documento histórico** (2026-04-19).

**ETAPA 1 (base técnica — shell API + SPA):** **cerrada al 100 %** según evidencias (`docs/30-etapa-1-cierre-y-evidencias.md`, 2026-05-06).

**ETAPA 2 (BD + Prisma + XAMPP):** **cerrada al 100 %** según evidencias (`docs/31-etapa-2-cierre-y-evidencias.md`, 2026-05-06). Modelo y migraciones detallados en `docs/04-modelo-base-de-datos.md`.

**ETAPA 3 (seguridad y auth — MVP):** **cerrada al 100 %** según evidencias (`docs/32-etapa-3-cierre-y-evidencias.md`, 2026-05-06). Permisos granulares en guard: backlog `docs/07-modulo-roles-permisos.md`.

**ETAPA 4 (navegación y shell UI):** **cerrada al 100 %** según evidencias (`docs/33-etapa-4-cierre-y-evidencias.md`, 2026-05-06).

**ETAPA 5 (catálogos institucionales):** **cerrada al 100 %** según evidencias (`docs/34-etapa-5-cierre-y-evidencias.md`, 2026-05-06). Estados formales/parametría amplia viven en backlog (`12`, `17`).

**ETAPA 6 (gestión documental — MVP + trazabilidad “6A”):** **cerrada al 100 %** según evidencias (`docs/35-etapa-6-cierre-y-evidencias.md`, 2026-05-06). Máquina de estados/aprobación/por dependencia: backlog en `12-modulo-documentos.md`.

**ETAPA 7 (archivos — storage, versiones, borrado lógico, trazabilidad):** **cerrada al 100 %** según evidencias (`docs/36-etapa-7-cierre-y-evidencias.md`, 2026-05-06). AV/cuotas/política por dependencia: backlog (`13`, `21`, `28`).

**Completado:** ETAPA 8 (búsqueda + ordenamiento + adjuntos), ETAPA 9 (reportes Excel/PDF).

**Siguiente foco:** ETAPA 10 — Hardening y cierre (checklist final + documentación de entrega).

---

## Fases (orden obligatorio)

| Etapa | Nombre | Entregables principales |
|-------|--------|-------------------------|
| **0** | Auditoría y saneamiento | `/docs` completo, `.gitignore`, `storage/`, `.env.example`, README, deuda registrada |
| **1** | Base técnica | `frontend/` Vite+React+TS+MUI, axios, routing; NestJS: Config, validación global, `/api/v1`, CORS |
| **2** | BD + Prisma + XAMPP | `schema.prisma`, migraciones, BD creada en XAMPP, validación en phpMyAdmin |
| **3** | Seguridad y auth | Usuarios, roles, permisos, JWT + refresh HttpOnly, Argon2id, guards, auditoría de login |
| **4** | Navegación y shell UI | Layout, dashboard, menú, 403/404, estados de error/red |
| **5** | Catálogos | Dependencias, cargos, tipos documentales, series/subseries, estados, configuración |
| **6** | Gestión documental | CRUD documento, metadatos, estados, historial (**incluye trazabilidad mínima por dominio**) |
| **7** | Archivos | Subida, validación, `storage/`, versiones, descarga con trazabilidad |
| **8** | Búsqueda | Simple y avanzada, filtros, paginación, permisos por rol |
| **9** | Reportes | ExcelJS, pdfkit, permisos |
| **10** | Hardening y cierre | Limpieza, revisión seguridad, documentación final, backlog |

### Nota sobre “6A” (sub-entregable)

En el expediente y en evaluaciones académicas suele aparecer “**6A**” como sub-entregable asociado a **trazabilidad/auditoría mínima** dentro de Gestión Documental.  
En este proyecto se considera “6A” como **toda evidencia verificable de historial de cambios del documento** (y su atribución a usuario), implementada mediante `documento_eventos` y sus endpoints asociados (ver `12-modulo-documentos.md` y `19-mapeo-iso27001-iso15489-owasp-asvs.md`).

La **auditoría transversal institucional** (bitácora central unificada para seguridad/administración) se gestiona como extensión posterior dentro del módulo `15-modulo-auditoria.md` y se robustece en ETAPA 10.

## Decisiones técnicas

- Stack cerrado: ver `02-stack-y-convenciones.md`.
- No microservicios ni PostgreSQL como línea base.
- ngrok solo para exposición temporal (`23-entorno-local-xampp-ngrok.md`).

## Problemas y riesgos

Seguimiento en `20-problemas-detectados.md` y `21-riesgos-pendientes.md`.

## Mejoras futuras

Institucionalización, despliegue en intranet, backups operativos — fuera del MVP de tesis salvo extensión acordada.

---

## Backlog de pendientes (para iniciar desarrollo de brechas)

> Este backlog traduce el documento de brechas `28-listado-lo-que-deberia-tener-el-sistema.md` a un orden ejecutable.

### Prioridad Alta (seguridad + evidencia)

1) **Auditoría transversal (`audit_logs`)**
- Ver `15-modulo-auditoria.md`
- Incluye: historial de accesos, denegaciones 403, exportaciones, cambios de usuario/roles, reset password.

2) **Rate limiting / lockout en autenticación**
- Ver `05-modulo-auth.md` (pendientes)

3) **Permisos granulares (PermissionsGuard)**
- Ver `07-modulo-roles-permisos.md`

4) **Control de acceso por documento (dependencia/confidencialidad)**
- Ver `12-modulo-documentos.md` y `13-modulo-archivos.md`

5) **Backups + restauración (BD + storage + logs)**
- Ver `21-riesgos-pendientes.md` (R-016) y módulo `17` (parámetros)

### Prioridad Media (ISO 15489 “completo”)

6) **Estados formales + transiciones**
- Ver `12-modulo-documentos.md`

7) **Flujo de aprobación**
- Ver `12-modulo-documentos.md`

8) **Retención y conservación**
- Crear módulo específico (pendiente) o ampliar configuración (`17`) + reportes (`16`)

### Prioridad Baja (institucionalización avanzada)

9) Notificaciones (pendientes / vencimientos)
10) AV/cuotas (archivos) y controles avanzados (firma digital, WORM, SIEM/WAF/MFA)
