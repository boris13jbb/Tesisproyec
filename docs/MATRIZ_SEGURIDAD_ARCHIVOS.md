# Matriz — Seguridad de archivos documentales

**Proyecto:** SGD-GADPR-LM (`Tesisproyec`)  
**Checkpoint base:** `6cf6bd7` + hardening de esta fase.  
**Estándares:** OWASP ASVS V4/V5 (File Upload), ISO 15489 (integridad de evidencia), ISO/IEC 27001.

Complementa [13-modulo-archivos.md](./13-modulo-archivos.md) y [MATRIZ_DESBLOQUEO_DOCUMENTAL.md](./MATRIZ_DESBLOQUEO_DOCUMENTAL.md).

## Arquitectura

| Elemento | Implementación real |
|---|---|
| Storage | Filesystem local bajo raíz lógica `storage/` (relativa al repo; no se publica la ruta absoluta al cliente) |
| Root | `path.resolve(process.cwd(), '..', 'storage')` desde el proceso backend |
| Nombre físico | `{archivoId}.pdf` generado en servidor (`crypto.randomUUID`) |
| Nombre original | Campo UX/BD sanitizado; **no** controla el path |
| Path en BD | `pathRel` posix `documentos/{documentoId}/{archivoId}.pdf` |
| MIME | Persistido como `application/pdf` (no el valor crudo del cliente) |
| Tamaño | `buffer.length` (servidor) |
| Asociación | `documento_archivos.documento_id` + UUID en URL; ambas deben coincidir |

No hay `ServeStaticModule` / `express.static` sobre `storage/`. Acceso solo por API JWT.

## Endpoints

| Método | Endpoint | Acción | Permiso | Scope |
|---|---|---|---|---|
| GET | `/documentos/:id/archivos` | Listar activos | `DOC_FILES_READ` | Documento visible |
| POST | `/documentos/:id/archivos` | Subir (multipart `file`) | `DOC_FILES_UPLOAD` | Documento visible + estado mutable |
| GET | `/documentos/:id/archivos/:archivoId/download` | Descargar | `DOC_FILES_DOWNLOAD` | Documento visible + archivo del documento |
| GET | `/documentos/:id/archivos/:archivoId/eventos` | Eventos de archivo | `DOC_FILES_READ` | Documento visible + archivo del documento |
| DELETE | `/documentos/:id/archivos/:archivoId` | Baja lógica | ADMIN + `DOC_FILES_DELETE` | Documento visible + estado mutable |

No existe replace ni preview URL pública. La vista previa del detalle usa el endpoint de download autenticado (blob).

## Permisos

| Acción | Permiso real |
|---|---|
| Listar archivos | `DOC_FILES_READ` |
| Subir | `DOC_FILES_UPLOAD` |
| Descargar | `DOC_FILES_DOWNLOAD` |
| Eliminar | `DOC_FILES_DELETE` (+ rol ADMIN en controller) |
| Reemplazar | No existe (nueva versión = nuevo registro) |

`DOC_UNLOCK` **no** equivale a upload/delete.

## Scope / IDOR-BOLA

- Documento ajeno (UUID conocido): `loadDocumentoVisibleById` → **404**.
- `archivoId` de otro documento: `findFirst({ id, documentoId, activo })` → **404**.
- No hay query/body `path` ni `filename` para FS.
- `documentoId` de URL es la única asociación; el cliente no envía `documentoId` en el body del archivo.

## Estados

| Estado | Upload | Delete | Download |
|---|---|---|---|
| BORRADOR | Según permiso | ADMIN + permiso | Según ACL/permiso |
| REGISTRADO | Según permiso | ADMIN + permiso | Según ACL/permiso |
| RECHAZADO | Según permiso | ADMIN + permiso | Según ACL/permiso |
| EN_REVISION | Bloqueado | Bloqueado | Según ACL/permiso |
| APROBADO | Bloqueado | Bloqueado | Según ACL/permiso |
| ARCHIVADO | Bloqueado | Bloqueado | Según ACL/permiso |

Incluso SUPERADMIN / ADMIN+`DOC_UNLOCK` deben **desbloquear** (`POST .../desbloquear` → `REGISTRADO`) antes de mutar archivos. Después, aplica el permiso de archivos correspondiente.

## Upload

- Memoria (Multer `memoryStorage`) + escritura tras validar.
- Extensión `.pdf`, MIME `application/pdf` **obligatorio** (no se acepta MIME vacío).
- Firma `%PDF`.
- Nombres con `..`, ejecutables compuestos (`malware.exe.pdf`) y tipos activos (html/js/svg/php/…) rechazados.
- 0 bytes → 400.
- Límite: **50 MB** (Multer + servicio). Exceso → **413**.
- Si falla el insert en BD: `unlink` del físico recién escrito.

## Download

- Identificadores UUID → BD → `resolveStoragePathOrThrow` (anclado al root).
- `Content-Disposition: attachment` + filename sanitizado (sin CRLF/comillas).
- `Content-Type`: `application/pdf` o `application/octet-stream` si el MIME histórico no es PDF.
- `Cache-Control: no-store`, `X-Content-Type-Options: nosniff`.
- Archivo físico ausente → 404 genérico (sin path ENOENT).
- Auditoría: `DOC_FILE_DOWNLOADED` + evento `DESCARGADO`.

## Delete

- Baja lógica `activo=false` (conserva evidencia). No borra el binario (ISO 15489).
- Repetir DELETE → 404.
- Freeze de estado protegido igual que upload.

## MIME / extensiones

| Extensión | MIME esperado | Permitido |
|---|---|---:|
| `.pdf` | `application/pdf` | Sí |
| `.exe` `.html` `.js` `.svg` `.php` `.bat` … | cualquiera | No |
| `documento.pdf.exe` | — | No |

Mismatch MIME/extensión → 400.  
Antivirus / parser PDF profundo: **no implementado** (residual).

## Tamaño

| Capa | Límite |
|---|---|
| Multer | 50 MB (`LIMIT_FILE_SIZE` → 413) |
| Servicio | `buffer.length` > 50 MB → 413 |
| Frontend detalle / alta | 50 MB (UX); el backend valida igual |

No hay límite de cantidad de archivos por documento (riesgo de abuso/DoS residual).

## Naming / path traversal

- `originalname` no define el archivo en disco.
- `pathRel` se reconstruye en servidor y se resuelve con anclaje al root (`..`, absolutos Windows/Unix, NUL).
- Encoded `%2e%2e%2f` en el nombre original no altera el path físico (UUID.pdf).

## Exposición pública

Uploads **no** son accesibles sin JWT. No hay `/uploads` público. El frontend descarga con Axios + cookie/JWT, no `window.open` ni token en querystring.

La API **no** expone path absoluto ni `pathRel` en listados.

## Atomicidad / huérfanos

| Caso | Comportamiento |
|---|---|
| FS write OK + BD fail | `unlink` del archivo nuevo |
| Delete BD OK | Físico se conserva (diseño) |
| Huérfano por crash entre write y insert | Posible residual; no hay recolector automático |
| Registro sin fichero | Download 404 |

Symlinks/junctions: la app no crea ni acepta enlaces; residual de SO.

## Auditoría

| Acción | Audit log | Evento dominio |
|---|---|---|
| Upload | `DOC_FILE_UPLOADED` | `SUBIDO` |
| Download | `DOC_FILE_DOWNLOADED` | `DESCARGADO` |
| Delete | `DOC_FILE_DELETED` | `ELIMINADO` |

Meta: `documentoId`, versión, MIME, size/sha en evento de dominio. Sin binario, JWT ni path absoluto.

`AuditService` no se modificó en esta fase.

## Frontend

- Upload/delete ocultos en estados protegidos.
- Confirmación nativa al eliminar.
- Error 413 mapeado a mensaje de tamaño.
- Preview PDF vía download autenticado; `dangerouslySetInnerHTML` solo aplica a HTML de preview **DOCX histórico** (las subidas nuevas son PDF). Residual XSS si existiera DOCX malicioso legado.

## Tests

Util de storage (traversal, MIME, naming), `documentos.security.spec` (IDOR), `documentos.archivos.spec` (vacío, tamaño, cleanup, colisión de path), `documentos.unlock.spec` (freeze).

## Riesgos residuales

| Riesgo | Tipo | Nota |
|---|---|---|
| PDF con JS embebido / malware en PDF válido | MEJORA FUTURA | Firma `%PDF` no es antivirus |
| Sin cuota de cantidad de adjuntos | MEJORA FUTURA | DoS de almacenamiento |
| Físico conservado tras baja lógica | Diseño | Evidencia ISO 15489 |
| Huérfano si el proceso muere entre write e insert | Residual bajo | Cleanup no agresivo |
| Preview DOCX histórico con HTML | Residual | No se aceptan DOCX nuevos |
| Race de versión mismo `originalName` | Residual bajo | Unique `(documentoId, originalName, version)` |
