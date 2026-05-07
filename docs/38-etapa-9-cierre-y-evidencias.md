# ETAPA 9 — Reportes: cierre al 100 % (evidencias MVP)

**Proyecto:** SGD-GADPR-LM  
**Referencia roadmap:** `docs/00-roadmap-general.md` (fila **ETAPA 9 — Reportes**)  
**Funcional:** `docs/16-modulo-reportes.md`  
**Fecha de cierre formal:** **2026-05-06**  
**Etapa anterior:** `docs/37-etapa-8-cierre-y-evidencias.md`

---

> **Actualización documental (2026-05-06):** este archivo conserva la **evidencia de cierre** de la etapa 9. El código posterior añadió **`AuditService`** en exportes (`REPORT_EXPORTED`), reportes **`/reportes/auditoria.{xlsx,pdf}`** y **`/reportes/pendientes-revision.{xlsx,pdf}`** (**ADMIN**/**REVISOR** en el segundo). Detalle en `docs/16-modulo-reportes.md`, `docs/22-changelog-tecnico.md` y `docs/README.md` (snapshot).

## Objetivo

Acreditar **exportaciones institucionales** del registro documental en **Excel** y **PDF** generadas en **servidor**, con los **mismos criterios de filtro** que la búsqueda (ETAPA 8), **control de rol ADMIN** en API, y disparo desde la UI **`/documentos`** (bloque filtros/exportación).

> **Nota histórica (contenido al cierre ETAPA 9):** inicialmente las exportaciones de esta etapa no registraban bitácora unificada. **Estado vigente:** ver texto de actualización anterior y `reportes.controller.ts` (`logReportExport`).

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

## Fuera de alcance ETAPA 9 (backlog original)

- Export de **usuarios** desde este módulo (sigue pendiente).
- Plantillas PDF institucionales, branding GADPR, firma electrónica, jobs asíncronos.

**Hecho después del cierre formal:** exports de **auditoría**, **pendientes de revisión** y **`REPORT_EXPORTED`** en `audit_logs` (ver `16`, `22`).

---

## Próximo hito oficial (roadmap)

**ETAPA 10 — Hardening y cierre:** cierre formal **`docs/39-etapa-10-cierre-y-evidencias.md`**. Referencia técnica: `docs/18-seguridad-y-hardening.md`.

---

*Fin del documento de cierre ETAPA 9.*
