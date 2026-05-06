# Módulo — Registro documental (documentos)

## Objetivo

Ciclo de vida del expediente digital: registro, metadatos, estados, historial y vínculo con series y tipos.

## Alcance

CRUD acotado por permisos; trazabilidad de cambios relevantes.

## Estado actual

**Completado (ETAPA 6).** Evidencias de cierre: `docs/35-etapa-6-cierre-y-evidencias.md`.

- **BD:** `documentos` + tabla de historial `documento_eventos` (trazabilidad de creación/actualización).
- **API:** `GET /api/v1/documentos` y `GET /api/v1/documentos/:id` (JWT), `POST/PATCH` (ADMIN), `GET /api/v1/documentos/:id/eventos` (JWT).
- **Frontend:** `/documentos` (listado + registrar), `/documentos/:id` (detalle + edición + historial).
- **Seed:** `DOC-0001` y eventos asociados al crear/editar.

## Decisiones técnicas

- Transacciones al crear documento + metadatos; estados documentales como catálogo o enum según modelo.

## Pantallas

- Listado, creación, edición, detalle con historial.

## Tablas relacionadas

- `documentos`: registro documental MVP (FKs a catálogos y usuario).
- `documento_eventos`: eventos `CREADO` / `ACTUALIZADO` con `cambios_json` y `created_by_id`.

## Dependencias

- Tipos documentales, series/subseries, usuarios, auditoría.

---

## Qué falta para empezar a desarrollar pendientes (backlog accionable)

### 1) Control de acceso por documento (por dependencia/confidencialidad)

**Objetivo:** restringir lectura/descarga/edición según:
- dependencia/área propietaria,
- nivel de confidencialidad,
- rol/permisos.

**Cambios propuestos (modelo)**
- `documentos.dependencia_id` (propietaria) o “área responsable”.
- `documentos.confidencialidad` (`PUBLICO`/`INTERNO`/`RESERVADO`/`CONFIDENCIAL`).

**Cambios propuestos (backend)**
- En `GET /documentos` y `GET /documentos/:id`: filtrar por política (no traer y luego ocultar).
- En descarga de archivos: verificar permiso por documento (anti‑IDOR real).
- Guard/policy de autorización por recurso:
  - `canReadDocumento(user, doc)`
  - `canDownloadArchivo(user, doc)`
  - `canUpdateDocumento(user, doc)`

**Evidencia**
- Pruebas: usuario de otra dependencia no puede ver/buscar/descargar.

### 2) Estados formales + transiciones (máquina de estados)

**Objetivo:** evitar estados “libres” y definir un ciclo documental institucional.

Propuesta mínima:
- `BORRADOR` → `REGISTRADO` → `EN_REVISION` → `APROBADO`/`RECHAZADO` → `ARCHIVADO`

Reglas:
- Solo roles/permiso de revisión pueden pasar a `APROBADO/RECHAZADO`.
- `ARCHIVADO` restringe edición (solo metadatos limitados).

### 3) Flujo de aprobación (bandeja de trabajo)

**Objetivo:** implementar revisión/aprobación (ISO 15489) con evidencia.

Entregables:
- tabla `documento_aprobaciones` o eventos extendidos (`DOC_SUBMITTED`, `DOC_APPROVED`, `DOC_REJECTED`).
- UI:
  - “Enviar a revisión”
  - “Aprobar/Rechazar” (con motivo)
  - Bandeja “Pendientes de revisión” (rol REVISOR).

### 4) Metadatos avanzados por tipo documental

**Objetivo:** que el tipo documental determine campos obligatorios/adicionales.

Opciones:
- JSON schema por `tipo_documental` (en BD) + validación server-side
- tabla `tipo_documental_campos` (definición de campos)

### 5) Integración con retención y conservación (futuro inmediato)

Una vez existan políticas de retención:
- `fecha_archivo`, `fecha_vencimiento`, estado de conservación,
- reportes de próximos a vencer,
- bloqueo de eliminación sin autorización.
