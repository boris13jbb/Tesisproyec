# ETAPA 9 — Reportes: cierre al 100 % (evidencias MVP)

**Proyecto:** SGD-GADPR-LM  
**Referencia roadmap:** `docs/00-roadmap-general.md` (fila **ETAPA 9 — Reportes**)  
**Funcional:** `docs/16-modulo-reportes.md`  
**Fecha de cierre formal:** **2026-05-06**  
**Etapa anterior:** `docs/37-etapa-8-cierre-y-evidencias.md`

---

## Objetivo

Acreditar **exportaciones institucionales** del registro documental en **Excel** y **PDF** generadas en **servidor**, con los **mismos criterios de filtro** que la búsqueda (ETAPA 8), **control de rol ADMIN** en API, y disparo desde la UI **`/documentos`** (bloque filtros/exportación).

> **Auditoría de exportación:** en el código actual el módulo `reportes` **no** invoca `AuditService` al generar `.xlsx` / `.pdf`. La trazabilidad transversal sigue disponible donde esté cableada (`15-modulo-auditoria.md`); registrar descargas de reportes como evento dedicado es **mejora** para ETAPA 10 / backlog (`21`).

---

## Checklist vs roadmap (`00-roadmap-general.md`)

| Entregable | Evidencia | Estado |
|------------|-----------|--------|
| **Excel (ExcelJS)** | `GET .../reportes/documentos.xlsx` — `@Header` spreadsheet, workbook + hoja `Documentos`, stream al cliente (`reportes.controller.ts`) | Cumple |
| **PDF (pdfkit)** | `GET .../reportes/documentos.pdf` — A4, listado texto por ítem (`reportes.controller.ts`) | Cumple |
| **Permisos** | `JwtAuthGuard` + `RolesGuard` + `@Roles('ADMIN')` en `ReportesController` | Cumple |
| **Filtros coherentes con búsqueda** | Mismas queries que listado `GET /documentos`: `q`, `estado`, `tipoDocumentalId`, `serieId`, `subserieId`, fechas ISO, adjuntos (`archivoNombre`, `archivoMime`, `archivoSha256`), `incluirInactivos`, `sortBy`, `sortDir` (`ReportesService.findDocumentos`) | Cumple |
| **Protección de escala** | `take` máximo **5000** filas en `findDocumentos` | Cumple MVP |
| **UI** | `DocumentosPage.tsx`: **`Exportar Excel`** / **`Exportar PDF`** con `responseType: 'blob'` y mismos params que la consulta | Cumple |

---

## Endpoints de referencia

- `GET /api/v1/reportes/documentos.xlsx`
- `GET /api/v1/reportes/documentos.pdf`

(Parámetro de consulta opcional igual que ETAPA 8; ver `reportes.controller.ts`.)

---

## Fuera de alcance ETAPA 9 (backlog)

- Export de **usuarios** y **auditoría** desde este módulo (prioridad declarada en `16`, no implementada en código actual).
- Plantillas PDF institucionales, branding GADPR, firma electrónica, jobs asíncronos.
- Registro explícito en bitácora de cada exportación (recomendado en hardening).

---

## Próximo hito oficial (roadmap)

**ETAPA 10 — Hardening y cierre:** cierre formal **`docs/39-etapa-10-cierre-y-evidencias.md`**. Referencia técnica: `docs/18-seguridad-y-hardening.md`.

---

*Fin del documento de cierre ETAPA 9.*
