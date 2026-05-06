# ETAPA 7 — Archivos: cierre al 100 % (evidencias MVP)

**Proyecto:** SGD-GADPR-LM  
**Referencia roadmap:** `docs/00-roadmap-general.md` (fila **ETAPA 7 — Archivos**)  
**Funcional:** `docs/13-modulo-archivos.md`  
**Fecha de cierre formal:** **2026-05-06**

---

## Objetivo

Acreditar la **gestión de adjuntos digitales** del expediente: validación, almacenamiento bajo `storage/`, **versionado**, **descarga controlada**, **borrado lógico** y **trazabilidad** por eventos de archivo.

---

## Checklist vs roadmap (`00-roadmap-general.md`)

| Entregable | Evidencia | Estado |
|------------|-----------|--------|
| **Subida** | `POST /documentos/:id/archivos` — `multipart/form-data`, campo **`file`**, `FileInterceptor` límite **10 MB** (`documentos.controller.ts`); lógica en `DocumentosService.uploadArchivo` (MIME/extensión, nombre seguro, SHA-256) | Cumple |
| **Validación** | Whitelist MIME/tamaño en servicio; sin servir carpetas estáticas públicas | Cumple (MVP) |
| **`storage/`** | Binarios bajo `storage/documentos/<documentoId>/…` (contenido en `.gitignore`; `.gitkeep` en raíz `storage/`) | Cumple |
| **Versiones** | Columna `version` en `documento_archivos`; regla incremental por `documentoId` + nombre original (migración `20260421194500_*`) | Cumple |
| **Descarga con trazabilidad** | `GET .../archivos/:archivoId/download` — JWT; `prepareDownloadArchivo` valida pertenencia documento↔archivo; evento **`DESCARGADO`** | Cumple |
| **Borrado lógico** | `DELETE .../archivos/:archivoId` — ADMIN; `activo=false`; evento **`ELIMINADO`** | Cumple |
| **Trazabilidad** | Tabla `documento_archivo_eventos`; `GET .../archivos/:archivoId/eventos`; eventos **`SUBIDO`** / **`DESCARGADO`** / **`ELIMINADO`** | Cumple |

### API (prefijo `/api/v1`)

| Método | Ruta | Acceso |
|--------|------|--------|
| GET | `/documentos/:id/archivos` | JWT |
| POST | `/documentos/:id/archivos` | JWT + **ADMIN** |
| GET | `/documentos/:id/archivos/:archivoId/download` | JWT |
| GET | `/documentos/:id/archivos/:archivoId/eventos` | JWT |
| DELETE | `/documentos/:id/archivos/:archivoId` | JWT + **ADMIN** |

### Frontend

- Sección **Archivos** en **`/documentos/:id`** (`DocumentoDetallePage.tsx`): listado, subida (ADMIN), descarga, historial por archivo, eliminación lógica (ADMIN).
- Cliente axios: `FormData` sin forzar `Content-Type: application/json` (`frontend/src/api/client.ts`).

---

## Fuera de alcance ETAPA 7 (backlog)

- Antivirus institucional, cuotas por usuario, verificación SHA-256 en cada descarga automática.
- Autorización por **dependencia/confidencialidad** del documento (anti‑IDOR “real” de negocio más allá de JWT + pertenencia doc↔archivo): `12` / `13` / `28`.

---

## Próximo hito oficial (roadmap)

**ETAPA 8 — Búsqueda** (filtros/paginación en `GET /documentos`, UI): evidencia **`docs/37-etapa-8-cierre-y-evidencias.md`** (opcional). Detalle: `docs/14-modulo-busqueda.md`.

---

*Fin del documento de cierre ETAPA 7.*
