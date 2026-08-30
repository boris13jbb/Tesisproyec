> **Retirado el 2026-08-30.** Módulos `series`/`subseries`, rutas `/catalogos/series` y `/catalogos/subseries`, y modelos Prisma `Serie`/`Subserie` fueron eliminados. Ver `docs/22-changelog-tecnico.md` y migración `20260830170000_remove_series_subseries`.

# Módulo — Series y subseries

## Objetivo

Implementar cuadro de clasificación archivística (series documentales y subseries) alineado al expediente.

## Alcance

Jerarquía, códigos únicos, relación con tipos documentales y documentos registrados.

## Estado actual

**Parcial (prototipo).** Tablas `series` y `subseries` (jerarquía 1:N). API `GET /api/v1/series` y `GET /api/v1/subseries` (JWT); `POST/PATCH` para ambos (ADMIN). Frontend: `/catalogos/series` y `/catalogos/subseries`. Seed: serie `ADM` y subserie `ADM-CORR`.

**Snapshot:** alineado a **`docs/README.md` (2026-05-06)**.

## Decisiones técnicas

- Integridad: no eliminar series con documentos asociados (o baja lógica controlada).

## Pantallas

- Árbol o lista jerárquica; formularios de alta/edición.

## Tablas relacionadas

- `series`, `subseries` (FK `subseries.serie_id` → `series.id`). FKs a documentos se implementarán en la etapa de gestión documental.
