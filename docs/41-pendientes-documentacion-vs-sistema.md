# Pendientes de documentación vs estado actual del sistema

**Propósito:** registrar diferencias detectadas entre la documentación y el estado real del repositorio/código, para cerrarlas de forma controlada y auditables (ISO 15489).

**Última actualización:** 2026-05-08

---

## Pendientes críticos (inconsistencias objetivas)

### 1) Inventario de migraciones Prisma desactualizado en algunos documentos

- **Situación real**: `backend/prisma/migrations/` contiene **22** carpetas de migración (al 2026-05-08).
- **Riesgo**: onboarding incorrecto (personas esperando “14/17/18” migraciones), confusión de alcance por etapa, deriva entre `docs/04` y otros docs.
- **Acción**: alinear todas las referencias de conteo de migraciones a la cifra real y dejar “fecha de snapshot” donde aplique.

**Estado de corrección**
- `docs/04-modelo-base-de-datos.md`: corregido a 22 (y actualizado el inventario).
- `docs/24-prisma-comandos-cli.md`: corregido a 22.
- `docs/31-etapa-2-cierre-y-evidencias.md`: corregido a 22.

**Pendiente**
- Revisar si existe alguna otra referencia “14/17/18 migraciones” fuera de `docs/` (READMEs, PDFs, anexos).

---

## Pendientes importantes (alineación “snapshot” y fechas)

### 2) “Snapshot 2026-05-06” vs cambios posteriores

- **Situación**: varios documentos fijan snapshot “2026-05-06”, pero el repo tiene cambios posteriores (por ejemplo: migraciones adicionales y pantallas/admin de seguridad ya presentes).
- **Acción**: donde el documento sea **vivo** (no “cierre de etapa”), actualizar la fecha y el contenido; donde sea “cierre”, mantener fecha de cierre y agregar nota de “estado vivo”.

---

## Pendientes por cubrir (documentos por revisar)

### 3) Revisión completa uno-por-uno de documentos Markdown fuera de `docs/`

- `README.md` (raíz): validar que refleje scripts/puertos/Prisma y que no contradiga `frontend/README.md`.
- `backend/README.md`: actualmente es el boilerplate de NestJS (no describe el sistema real).
- `frontend/README.md`: mezcla sección útil (proxy/allowedHosts) con boilerplate; consolidar y evitar ruido.
- `scripts/README-backups-mysql-xampp.md`: validar que concuerde con `BACKUP_*` y con UI `/admin/respaldos`.
- `backups/automated/README.md`: validar ruta/retención/seguridad.
- `Nueva carpeta/*.md`: identificar si son entregables “históricos” o “vigentes” y rotularlo.

---

## Pendientes funcionales (no solo documentación)

### 4) Configuración: documento `docs/17` era “No implementado” y ahora existe configuración de seguridad/respaldos

- **Estado**: `docs/17-modulo-configuracion.md` actualizado para reflejar:
  - UI `/admin/configuracion` y endpoints `/auth/admin/security-*`.
  - UI `/admin/respaldos` y endpoints `backup`/`dashboard` asociados.
- **Pendiente**: definir si se creará una configuración general tipo `system_settings` (backlog), y documentar el roadmap.

