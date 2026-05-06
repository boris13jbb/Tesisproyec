# ETAPA 6 — Gestión documental: cierre al 100 % (evidencias MVP)

**Proyecto:** SGD-GADPR-LM  
**Referencia roadmap:** `docs/00-roadmap-general.md` (fila **ETAPA 6 — Gestión documental**)  
**Funcional:** `docs/12-modulo-documentos.md`  
**Fecha de cierre formal:** **2026-05-06**

---

## Objetivo

Acreditar el **registro documental** con metadatos vinculados a catálogos, **lectura** para usuarios autenticados, **alta/edición** para **ADMIN**, y **trazabilidad mínima por dominio** (sub-entregable “6A”: `documento_eventos`).

> **Nota:** Los endpoints de **archivos** adjuntos viven en el mismo controlador `documentos`; el cierre **funcional y de evidencias** de esa capa está en **`docs/36-etapa-7-cierre-y-evidencias.md`**. Aquí solo se referencian como soporte al expediente digital.

---

## Checklist vs roadmap (`00-roadmap-general.md`)

| Entregable | Evidencia | Estado |
|------------|-----------|--------|
| **CRUD documento (núcleo)** | `POST /documentos`, `PATCH /documentos/:id` — `RolesGuard` **ADMIN** (`documentos.controller.ts`). `GET` lista y detalle — **`JwtAuthGuard`** | Cumple MVP |
| **Metadatos + catálogos** | DTOs `CreateDocumentoDto` / `UpdateDocumentoDto`; FK en modelo Prisma a tipos/subseries/serie y usuario creador (`schema.prisma`) | Cumple |
| **Estados** | Campo `estado` (texto / valores de negocio MVP); **sin** máquina de estados institucional → backlog `12-modulo-documentos.md` §2 | Parcial (aceptado MVP) |
| **Historial / trazabilidad mínima (“6A”)** | `GET /documentos/:id/eventos`; tabla `documento_eventos` (`DocumentoEvento`), eventos `CREADO` / `ACTUALIZADO` con actor | Cumple |

### Frontend

| Pantalla | Ruta | Rol |
|----------|------|-----|
| Listado + alta | `/documentos` | Lista **JWT**; crear **ADMIN** (`DocumentosPage.tsx`) |
| Detalle + edición + historial documento | `/documentos/:id` | Ver **JWT**; editar **ADMIN**; historial documento visible (`DocumentoDetallePage.tsx`) |

### Modelo de datos

- `documentos`, `documento_eventos` — inventario en `docs/04-modelo-base-de-datos.md`.

---

## Fuera de alcance ETAPA 6 (backlog)

- **Control de acceso por documento** (dependencia/confidencialidad / anti‑IDOR por recurso): `12-modulo-documentos.md` §1 y `28-listado…`.
- **Estados formales + flujo de aprobación**: `12-modulo-documentos.md` §2–3.

---

## Próximo hito oficial (roadmap)

**ETAPA 7 — Archivos:** evidencia dedicada **`docs/36-etapa-7-cierre-y-evidencias.md`** (subida, descarga, versiones, borrado lógico, eventos `documento_archivo_eventos`). Detalle: `docs/13-modulo-archivos.md`.

---

*Fin del documento de cierre ETAPA 6.*
