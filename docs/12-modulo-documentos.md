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

- Transacciones al crear documento + metadatos.
- **Estados documentales:** catálogo y transiciones en `backend/src/documentos/documento-estado.util.ts` (NORMALIZACIÓN SQL `20260509153000_normalize_documento_estados`); evento de dominio `ACTUALIZADO` + **`DOC_STATE_CHANGED`** en `audit_logs`.

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

**Estado:** **MVP aplicado en backend** (listado, detalle, eventos, exportes y archivos usan la misma política de visibilidad).

- **Modelo:** `documentos.dependencia_id` (propietaria) + `documentos.nivel_confidencialidad` (`PUBLICO` / `INTERNO` / `RESERVADO` / `CONFIDENCIAL`), migración `20260507153000_*`.
- **Backend:** filtrado en consulta (no “ocultar en UI”); descarga de adjuntos y reportes alineados; JWT incluye `dependenciaId` del usuario.
- **Pendiente institucional:** reglas más finas (clasificación por serie, excepciones, elevación auditada), y **`PermissionsGuard`** si se exige matriz por permiso (`07`).

### 2) Estados formales + transiciones (máquina de estados)

**Estado:** **MVP aplicado en código** (transiciones válidas en backend; UI con select de estados; **ADMIN** ejecuta cualquier salto permitido por la tabla de transiciones).

**Implementado:**
- Alta: **BORRADOR** o **REGISTRADO**.
- Ciclo ejemplo: `BORRADOR → REGISTRADO | ARCHIVADO`, `REGISTRADO → EN_REVISION | ARCHIVADO`, `EN_REVISION → APROBADO | RECHAZADO`, `RECHAZADO → EN_REVISION | ARCHIVADO`, `APROBADO → ARCHIVADO`, **`ARCHIVADO` terminal**.
- **`ARCHIVADO`:** no permite subir/eliminar adjuntos ni cambiar metadatos salvo campo **activo** en BD.

**Pendiente institucional:**
- Opcional: prohibir que **ADMIN** cambie `estado` vía **PATCH** y forzar solo workflow.
- Notificaciones y bandeja dedicada (ver §3).

### 3) Flujo de aprobación (bandeja de trabajo)

**Estado:** **MVP en código (R-28).**

- **API**
  - `POST /api/v1/documentos/:id/enviar-revision` — **REGISTRADO** → **EN_REVISION**; actor: **creador del documento** o **ADMIN**; requiere visibilidad del documento (misma regla que lectura).
  - `POST /api/v1/documentos/:id/resolver-revision` — cuerpo `{ "decision": "APROBADO" | "RECHAZADO", "motivo"?: string }`; si **RECHAZADO**, **`motivo` obligatorio** (3–2000 caracteres, `trim`), almacenado en auditoría como `meta.motivoRechazo`; actor: **ADMIN** o **REVISOR**; solo si **EN_REVISION**.
- **Auditoría:** `DOC_SUBMITTED_FOR_REVIEW`, `DOC_REVIEW_RESOLVED` (además de `DOC_STATE_CHANGED`).
- **UI:** botones en detalle; “bandeja” mínima = filtro de listado **Estado → En revisión** (texto guía para rol **REVISOR**).
- **Reportes:** `GET /api/v1/reportes/pendientes-revision.{xlsx,pdf}` (ADMIN/REVISOR) para export rápido de lo que está en **EN_REVISION**.

**Pendiente:** varias rondas de revisión, cola propia, SLA dedicado, canal in-app.

**Notificaciones (R-44, MVP):**
- Si el backend tiene **SMTP configurado**, se envía correo (best-effort):
  - a **ADMIN/REVISOR** cuando un documento se envía a revisión;
  - al **creador** cuando la revisión se aprueba o rechaza (incluye motivo si hay).

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
