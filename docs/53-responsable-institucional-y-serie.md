# Responsable institucional y serie documental — decisión técnica

Fecha: 2026-08-29.

## Responsable institucional

El campo `documentos.responsable_institucional` (Prisma: `responsableInstitucional`) **permanece como texto** (`VarChar(250)`), normalizado a mayúsculas en API.

**No se convierte a FK** en esta iteración:

- Hay registros existentes con texto libre.
- Relacionarlo ahora a `users` o `cargos` exigiría migración, backfill y reglas de integridad que no están definidas por el GADPR-LM.
- Ya existen FKs distintas: `created_by_id` (usuario que registra), `dependencia_id` (área), `contraparte_id`, `beneficiario_id`.

El campo es una **referencia nominal** (persona o cargo mencionado en el expediente), no el actor de sesión ni el área propietaria.

## Serie documental

La serie es clasificación archivística (cuadro serie → subserie). **No se automatiza** por dependencia ni por usuario. Si solo hay una serie/subserie activa, el alta puede preseleccionarla. Estado: **aceptado funcionalmente**.
