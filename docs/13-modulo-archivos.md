# Módulo — Archivos (almacenamiento)

## Objetivo

Subida, almacenamiento bajo `storage/`, metadatos, versiones y descarga controlada con auditoría.

## Alcance

Validación MIME/tamaño/extensión; nombres internos seguros; sin servir disco sin autorización.

## Estado actual

**Implementado (ETAPA 7).**  
- **BD:** `documento_archivos` + `documento_archivo_eventos` (tamaño, MIME, sha256, trazabilidad).
- **Storage:** guardado físico bajo `storage/documentos/<documentoId>/...` (ruta no expuesta directamente).
- **Versionado:** versión incremental por documento + nombre (`version`), mantiene historial y permite múltiples cargas del “mismo” archivo.
- **API:**
  - `GET /api/v1/documentos/:id/archivos` (JWT)
  - `POST /api/v1/documentos/:id/archivos` (JWT + `ADMIN`, multipart `file`, máx 10MB, lista blanca MIME)
  - `GET /api/v1/documentos/:id/archivos/:archivoId/download` (JWT, descarga controlada)
  - `GET /api/v1/documentos/:id/archivos/:archivoId/eventos` (JWT)
  - `DELETE /api/v1/documentos/:id/archivos/:archivoId` (JWT + `ADMIN`, borrado lógico)
- **Frontend:** en `/documentos/:id` sección **Archivos** para listar, subir (ADMIN) y descargar.

## Decisiones técnicas

- Rutas físicas no expuestas; streaming desde NestJS; registrar cada descarga.
- Hash de integridad **SHA-256** calculado sobre el binario almacenado.
- **Borrado lógico** por `activo=false` para conservar evidencia y trazabilidad (ISO 15489).

## Requisitos de seguridad y cumplimiento (normativo → control técnico)

### OWASP ASVS (Nivel 2, enfoque en subida/descarga)
- **Validación de archivos (V5 + File Upload)**: whitelist de MIME/extensión, límite de tamaño, nombres seguros, bloqueo de path traversal.
- **Control de acceso (V4)**: descarga/listado solo vía API con JWT; subida/borrado restringido a `ADMIN`.
- **Gestión de sesión (V3)**: descarga requiere sesión válida; ante `401` se fuerza re-login.
- **Logging (V10)**: eventos `SUBIDO`, `DESCARGADO`, `ELIMINADO` (sin exponer rutas físicas ni tokens).

### ISO/IEC 27001:2022 (aplicación práctica)
- **Protección de activos**: los archivos son activos de información; deben protegerse contra acceso no autorizado.
- **Registro de eventos**: toda descarga debe dejar evidencia (quién/cuándo/qué).
- **Disponibilidad**: definir respaldo de `storage/` y restauración (ver `16`/`21`).

### ISO 15489 (gestión documental)
- **Autenticidad**: atribución a usuario (`created_by_id`) y eventos.
- **Integridad**: hash SHA-256 + control de acceso + no sobrescritura de versiones.
- **Fiabilidad y trazabilidad**: versionado + historial de eventos por archivo.
- **Usabilidad/recuperación**: metadatos del archivo (nombre, MIME, tamaño) y vínculos con documento.

## Flujo operativo (resumen)

1) **Subida (ADMIN)**
- UI → `POST /documentos/:id/archivos` (multipart `file`)
- API:
  - valida permisos (ADMIN),
  - valida tamaño, MIME/extensión y nombre,
  - calcula `sha256`,
  - asigna `version` (incremental) para `documentoId + originalName`,
  - guarda binario bajo `storage/documentos/<documentoId>/...`,
  - registra `documento_archivo_eventos` tipo `SUBIDO`.

2) **Listado (JWT)**
- UI → `GET /documentos/:id/archivos`
- API → retorna adjuntos activos y metadatos (sin ruta física).

3) **Descarga (JWT)**
- UI → `GET /documentos/:id/archivos/:archivoId/download`
- API:
  - valida que el archivo pertenezca al documento (anti-IDOR),
  - valida usuario/sesión,
  - hace streaming del binario,
  - registra evento `DESCARGADO` con metadata (por ejemplo IP/UA si se captura).

4) **Borrado lógico (ADMIN)**
- UI → `DELETE /documentos/:id/archivos/:archivoId`
- API → `activo=false` y evento `ELIMINADO`.

## Endpoints (implementados y contrato esperado)

### Listar archivos de un documento
- `GET /api/v1/documentos/:id/archivos` (JWT)
- Respuesta (ejemplo conceptual):
  - `[{ id, version, originalName, mimeType, sizeBytes, sha256, activo, createdAt, createdById }]`

### Subir archivo (multipart)
- `POST /api/v1/documentos/:id/archivos` (JWT + ADMIN)
- `Content-Type: multipart/form-data`
- Campo: `file`
- Respuesta: registro creado (metadatos + versión).

### Descargar archivo (stream)
- `GET /api/v1/documentos/:id/archivos/:archivoId/download` (JWT)
- Respuesta: stream con `Content-Type` del archivo y headers de descarga.

### Ver eventos de un archivo
- `GET /api/v1/documentos/:id/archivos/:archivoId/eventos` (JWT)
- Respuesta: historial `SUBIDO/DESCARGADO/ELIMINADO`.

### Borrado lógico
- `DELETE /api/v1/documentos/:id/archivos/:archivoId` (JWT + ADMIN)
- Respuesta: `204` o registro actualizado (según implementación).

## Reglas de negocio

- **RB-Arch-01 (whitelist)**: solo se admiten tipos MIME/extensiones permitidas (lista blanca).
- **RB-Arch-02 (tamaño)**: máximo **10MB** por archivo (configurable).
- **RB-Arch-03 (anti-IDOR)**: `archivoId` debe pertenecer al `documentoId` de la ruta.
- **RB-Arch-04 (versionado)**: si existe un archivo activo con `originalName`, el siguiente subido crea `version+1`; nunca sobrescribe binarios previos.
- **RB-Arch-05 (borrado lógico)**: eliminar marca `activo=false` y registra evento; no se elimina físicamente por defecto.
- **RB-Arch-06 (auditoría)**: toda descarga registra evento (mínimo: usuario, archivo, timestamp; opcional: IP/UA).

## Validaciones (server-side)

- **MIME real**: validar contra la detección/valor admitido; no confiar solo en extensión.
- **Extensión**: coherencia con MIME permitido.
- **Nombre seguro**: normalización/sanitización para evitar path traversal y caracteres peligrosos.
- **Tamaño**: rechazar payloads > límite.
- **Documento existente**: no permitir subir a documentos inexistentes o inactivos (si aplica).

## Controles de seguridad aplicados

- Archivos **fuera del directorio público**, no se sirven como estáticos.
- Descarga solo vía API con autorización.
- Streaming controlado (reduce uso de memoria y exposición de rutas).
- Hash SHA-256 almacenado para integridad y trazabilidad.
- Eventos de auditoría por archivo (SUBIDO/DESCARGADO/ELIMINADO).

## Manejo de errores (lineamientos)

- `400`: validación (MIME/extensión/tamaño/nombre).
- `401`: sesión inválida/expirada.
- `403`: rol insuficiente (subida/borrado).
- `404`: documento/archivo inexistente o no pertenece (anti-IDOR).
- `500`: error interno (IO/FS/DB) sin exponer rutas físicas.

## Eventos auditables (evidencia)

- `documento_archivo_eventos`:
  - `SUBIDO` (quién, cuándo, versión, metadatos del archivo)
  - `DESCARGADO` (quién, cuándo, opcional IP/UA)
  - `ELIMINADO` (quién, cuándo, borrado lógico)

## Dependencias

- Documentos (relación `documentoId`), auditoría (eventos), seguridad (`18`).

## Mejoras futuras (si se amplía el alcance)

- Antivirus institucional (escaneo en subida y cuarentena).
- Cuotas por usuario/dependencia (prevención de DoS por almacenamiento).
- Verificación de hash en descarga (modo estricto).
- Políticas de retención/disposición (integración con ISO 15489 completa).

## Plan de pruebas (paso a paso)

1) **Subida válida (ADMIN)**
- Acción: en `/documentos/:id` subir un PDF < 10MB.
- Esperado: aparece en listado como `v1` y evento `SUBIDO`.
- Fallos a revisar: `403` (sin ADMIN), `400` (MIME/tamaño), `500` (storage/DB).

2) **Versionado**
- Acción: subir nuevamente un archivo con el mismo nombre.
- Esperado: aparece `v2` (y no se sobrescribe `v1`).

3) **Descarga**
- Acción: descargar `v2`.
- Esperado: descarga correcta y evento `DESCARGADO`.

4) **Anti-IDOR**
- Acción: intentar descargar un `archivoId` de otro documento usando la URL.
- Esperado: `404` o `403` (según decisión), sin filtrar información.

5) **Borrado lógico (ADMIN)**
- Acción: eliminar un archivo.
- Esperado: deja de mostrarse en listado (si filtra solo activos) y evento `ELIMINADO`.

## Dependencias

- Documentos, auditoría, seguridad (`18`).
