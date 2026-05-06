# ETAPA 8 — Búsqueda: cierre al 100 % (evidencias MVP)

**Proyecto:** SGD-GADPR-LM  
**Referencia roadmap:** `docs/00-roadmap-general.md` (fila **ETAPA 8 — Búsqueda**)  
**Funcional:** `docs/14-modulo-busqueda.md`  
**Fecha de cierre formal:** **2026-05-06**  
**Etapa anterior:** `docs/36-etapa-7-cierre-y-evidencias.md`

---

## Objetivo

Acreditar **consulta y refinamiento** del registro documental: texto libre, filtros por metadatos, **ordenamiento**, **paginación**, y criterios sobre **adjuntos** (nombre/MIME/SHA-256), con **JWT** en el API y experiencia coherente en **`/documentos`**.

> **Permisos:** el listado usa el mismo modelo que el resto de documentos (**lectura para usuario autenticado**; no hay aún filtrado por dependencia/confidencialidad — backlog `12`, `28`). La **autorización por rol** sigue aplicando a **mutaciones** (ETAPA 6), no a esta fase de solo consulta.

---

## Checklist vs roadmap (`00-roadmap-general.md`)

| Entregable | Evidencia | Estado |
|------------|-----------|--------|
| **Búsqueda simple / texto** | Query `q` en `GET /documentos` (`documentos.controller.ts`); barra de búsqueda en `DocumentosPage.tsx` | Cumple |
| **Filtros avanzados** | `estado`, `tipoDocumentalId`, `serieId`, `subserieId`, `fechaDesde`, `fechaHasta`, `incluirInactivos` | Cumple MVP |
| **Búsqueda por adjuntos** | `archivoNombre`, `archivoMime`, `archivoSha256` (coincidencia sobre adjuntos **activos** en servicio/listado) | Cumple |
| **Ordenamiento** | `sortBy` ∈ `codigo` \| `fechaDocumento` \| `estado`; `sortDir` ∈ `asc` \| `desc`; cabeceras de tabla clicables en UI | Cumple |
| **Paginación** | `page`, `pageSize`; respuesta tipada `{ page, pageSize, total, items }` desde backend | Cumple |
| **UI** | `/documentos`: filtros, orden, pagina **Anterior/Siguiente**. Botones de exportación sobre la misma pantalla se acreditan en **ETAPA 9** (`38-etapa-9-cierre-y-evidencias.md`). | Cumple |

---

## API (referencia)

`GET /api/v1/documentos` — parámetros alineados a `docs/14-modulo-busqueda.md`.

---

## Fuera de alcance ETAPA 8 (backlog)

- Índices adicionales en BD y benchmarks de rendimiento sobre tablas grandes.
- Búsqueda full‑text institucional, facetas complejas o guardado de consultas favoritas.

---

## Próximo hito oficial (roadmap)

**ETAPA 9 — Reportes:** evidencia **`docs/38-etapa-9-cierre-y-evidencias.md`**. Funcional: `docs/16-modulo-reportes.md`.

---

*Fin del documento de cierre ETAPA 8.*
