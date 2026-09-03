# Matriz de visibilidad — Módulo Documentos (SGD-GADPR-LM)

> Auditoría integral de seguridad documental — mínimo privilegio (OWASP ASVS V4, ISO/IEC 27001, ISO 15489).  
> Checkpoint previo: `29556f1` (Reportes). Sin cambios MFA / Prisma / DB / seed en esta fase.  
> Corrección aplicada: IDOR en `uploadArchivo` + anclaje de path en descarga + alineación UI de botones + **hardening `dependenciaId` en creación**.

---

## 1. Roles confirmados (seed + JWT)

| Código | Descripción |
|--------|-------------|
| `SUPERADMIN` | Mantenimiento; todos los permisos; alcance documental global |
| `ADMIN` | Gestión institucional; todos los permisos; alcance global |
| `USUARIO` | Operativo: crear, subir, enviar revisión; alcance propio/dependencia |
| `REVISOR` | Resolver revisión + export pendientes; alcance por scope |
| `AUDITOR` | Solo lectura documental + descarga |
| `CONSULTA` | Solo lectura documental + descarga (igual base que AUDITOR) |
| `EDITOR_DOC` | Lectura + `DOC_UPDATE`/`DOC_FILES_UPLOAD`/`DOC_REVISION_SEND` (edición vía API restringida a ADMIN) |

---

## 2. Permisos documentales reales

| Permiso | Función |
|---------|---------|
| `DOC_READ` | Listado, detalle, eventos de documento, tablón, bandeja |
| `DOC_CREATE` | Alta de documento + sugerencia de código |
| `DOC_UPDATE` | PATCH metadatos/estado (también exige rol **ADMIN** en controller) |
| `DOC_ACCESS_MANAGE` | ACL por documento (exige rol **ADMIN**) |
| `DOC_REVISION_SEND` | Enviar `REGISTRADO` → `EN_REVISION` |
| `DOC_REVISION_RESOLVE` | Aprobar/rechazar (exige rol **ADMIN** o **REVISOR**) |
| `DOC_FILES_READ` | Listar archivos y eventos de archivo |
| `DOC_FILES_UPLOAD` | Subir PDF (exige documento **visible** al actor) |
| `DOC_FILES_DOWNLOAD` | Descargar / base de preview en UI |
| `DOC_FILES_DELETE` | Soft-delete de archivo (exige rol **ADMIN**) |

---

## 3. Inventario de endpoints

| Método | Endpoint | Función | Permiso | Alcance |
|--------|----------|---------|---------|---------|
| GET | `/documentos` | Listado paginado | `DOC_READ` | `documentoVisibilityWhere` (items + total) |
| GET | `/documentos/next-codigo` | Siguiente código | `DOC_CREATE` | N/A |
| GET | `/documentos/tablon-tramites` | Kanban | `DOC_READ` | Scope vía `findAll` |
| GET | `/documentos/bandeja-tramites` | Bandeja EN_REVISION | `DOC_READ` | Scope vía `findAll` |
| GET | `/documentos/:id` | Detalle | `DOC_READ` | Visible → 404 si no |
| GET | `/documentos/:id/access` | Leer ACL | `DOC_ACCESS_MANAGE` + ADMIN | Admin |
| PUT | `/documentos/:id/access` | Actualizar ACL | `DOC_ACCESS_MANAGE` + ADMIN | Admin |
| POST | `/documentos` | Crear | `DOC_CREATE` | `createdById` = JWT |
| GET | `/documentos/:id/eventos` | Historial documento | `DOC_READ` | Visible |
| GET | `/documentos/:id/archivos` | Listar adjuntos | `DOC_FILES_READ` | Visible |
| POST | `/documentos/:id/archivos` | Subir PDF | `DOC_FILES_UPLOAD` | **Visible** (post-hardening) |
| GET | `/documentos/:id/archivos/:archivoId/download` | Descargar | `DOC_FILES_DOWNLOAD` | Visible + path anclado |
| GET | `/documentos/:id/archivos/:archivoId/eventos` | Historial archivo | `DOC_FILES_READ` | Visible |
| POST | `/documentos/:id/enviar-revision` | Enviar revisión | `DOC_REVISION_SEND` | Visible + (creador\|admin) |
| POST | `/documentos/:id/resolver-revision` | Aprobar/rechazar | `DOC_REVISION_RESOLVE` + ADMIN\|REVISOR | Visible + EN_REVISION |
| DELETE | `/documentos/:id/archivos/:archivoId` | Eliminar archivo | `DOC_FILES_DELETE` + ADMIN | Admin |
| PATCH | `/documentos/:id` | Editar | `DOC_UPDATE` + ADMIN | Admin |

**Preview:** no hay endpoint público; la UI usa el mismo `download` con JWT.

---

## 4. Helper de alcance — `documentoVisibilityWhere(viewer)`

Archivo: `backend/src/documentos/documento-scope.util.ts`

| Condición | Visibilidad |
|-----------|-------------|
| ADMIN / SUPERADMIN | Sin filtro (global) |
| `accessPolicy ≠ RESTRICTED` + `PUBLICO` | Sí |
| `accessPolicy ≠ RESTRICTED` + creador | Sí |
| `accessPolicy ≠ RESTRICTED` + misma dependencia + `INTERNO`\|`RESERVADO` | Sí |
| `CONFIDENCIAL` (INHERIT) | Solo creador (no por dependencia) |
| `RESTRICTED` | Creador **o** ACL user/role READ |

Usado en: listado (count+items), detalle, eventos, archivos, download, upload, enviar/resolver revisión, Dashboard/reportes documentales.

Fallo de visibilidad → **404** «Documento no encontrado» (anti-enumeración).

---

## 5. Matriz Documentos × Rol

Leyenda: **G** = global · **S** = scope · **Prop** = creador · **NO** = denegado · **AdminAPI** = solo vía rol ADMIN en API

| Función | SUPERADMIN | ADMIN | REVISOR | AUDITOR | USUARIO | CONSULTA | EDITOR_DOC |
|---------|------------|-------|---------|---------|---------|----------|------------|
| Listar | G | G | S | S | S | S | S |
| Ver detalle | G | G | S | S | S | S | S |
| Crear | Sí | Sí | NO | NO | Sí | NO | NO\* |
| Editar (PATCH) | AdminAPI | AdminAPI | NO | NO | NO† | NO | NO† |
| Subir archivo | G | G | NO‡ | NO | S | NO | S |
| Preview (vía download) | G | G | S | S | S | S | S |
| Descargar | G | G | S | S | S | S | S |
| Eliminar archivo | AdminAPI | AdminAPI | NO | NO | NO | NO | NO |
| Enviar revisión | G | G | Prop§ | NO | Prop | NO | Prop§ |
| Aprobar | Sí | Sí | S | NO | NO | NO | NO |
| Rechazar | Sí | Sí | S | NO | NO | NO | NO |
| Historial documento | G | G | S | S | S | S | S |
| Historial archivo | G | G | S | S | S | S | S |
| Buscar / filtrar | G | G | S | S | S | S | S |
| Acceso directo por ID | G | G | S→404 | S→404 | S→404 | S→404 | S→404 |
| ACL documento | Sí | Sí | NO | NO | NO | NO | NO |

\* Seed EDITOR_DOC sin `DOC_CREATE`.  
† Seed otorga `DOC_UPDATE` pero controller exige `@Roles('ADMIN')`.  
‡ Seed REVISOR sin `DOC_FILES_UPLOAD`.  
§ Si es creador y tiene `DOC_REVISION_SEND`.

---

## 6. Transiciones de estado

| Desde | Hacia | Acción | Permiso / control |
|-------|-------|--------|-------------------|
| — | `BORRADOR` \| `REGISTRADO` | Alta | `DOC_CREATE` |
| `BORRADOR` | `REGISTRADO` | PATCH | `DOC_UPDATE` + ADMIN |
| `BORRADOR` \| `REGISTRADO` | `ARCHIVADO` | PATCH | `DOC_UPDATE` + ADMIN |
| `REGISTRADO` | `EN_REVISION` | `POST .../enviar-revision` | `DOC_REVISION_SEND` + (creador\|admin) |
| `EN_REVISION` | `APROBADO` | `POST .../resolver-revision` | `DOC_REVISION_RESOLVE` + ADMIN\|REVISOR |
| `EN_REVISION` | `RECHAZADO` | `POST .../resolver-revision` | Idem + motivo ≥3 |
| `RECHAZADO` | `EN_REVISION` | `POST .../enviar-revision` | Reenvío formal (mismo permiso send) |
| `RECHAZADO` | `ARCHIVADO` | PATCH | ADMIN + `DOC_UPDATE` |
| `APROBADO` | `ARCHIVADO` | PATCH | ADMIN |
| `ARCHIVADO` | — | — | Terminal |

**Prohibido vía PATCH genérico:** destinos `EN_REVISION`, `APROBADO`, `RECHAZADO` (`assertEstadoNoResuelveRevisionViaPatch`).  
Matriz ampliada: [MATRIZ_WORKFLOW_ESTADOS_DOCUMENTALES.md](./MATRIZ_WORKFLOW_ESTADOS_DOCUMENTALES.md).

---

## 7. Archivos

| Control | Política real |
|---------|---------------|
| Formato | Solo PDF (extensión `.pdf` + MIME `application/pdf` + magic `%PDF`) |
| Tamaño | Multer 50 MB |
| Nombre | `sanitizeName` (sin `/\\?%*:|"<>`, máx 120) |
| Ruta | `storage/documentos/{documentoId}/{uuid}_{name}` |
| Upload | Documento visible al actor + no `ARCHIVADO` |
| Download | Documento visible + archivo activo + path anclado al storage root |
| Delete | Soft `activo=false` + rol ADMIN |
| Huérfanos | Si falla la TX tras escribir disco → `unlink` del archivo físico |

---

## 8. Creación y mass assignment

- `createdById` **solo** desde JWT (`viewer.id`).
- ValidationPipe global: `whitelist` + `forbidNonWhitelisted`.
- Create DTO **no** acepta: `createdById`, `activo`, `accessPolicy`.
- Update DTO **no** acepta: `createdById`, `codigo`.
- `dependenciaId` en create: ver §8.1 (resolución servidor).

### 8.1 Creación y dependencia

| Rol | Puede crear (`DOC_CREATE`) | Puede elegir dependencia | Dependencias permitidas |
|-----|----------------------------|--------------------------|-------------------------|
| SUPERADMIN | Sí | Sí | Cualquiera **activa** y existente |
| ADMIN | Sí | Sí | Cualquiera **activa** y existente |
| USUARIO | Sí | No | Solo la de su cuenta (o `null` si no tiene) |
| REVISOR | No (seed) | — | — |
| AUDITOR | No (seed) | — | — |
| CONSULTA | No (seed) | — | — |
| EDITOR_DOC | No (seed sin `DOC_CREATE`) | — | — |

**Backend:** `resolveCreateDocumentoDependencia(viewer, requested, creatorDependenciaId)`

- **ADMIN/SUPERADMIN:** si envían `dependenciaId` → debe existir y estar activa; si omiten → fallback a dependencia del creador en BD/JWT (puede ser `null`).
- **No admin:** se ignora la intención de ampliar ámbito:
  - con dependencia propia → siempre se asigna la propia (aunque omitan el campo);
  - si envían otra UUID → **403 Forbidden**;
  - sin dependencia en cuenta → solo creación con `null`; enviar UUID → **403**.
- Manipulación de `POST /documentos` con body alterado **no** amplía el scope.

**Frontend (Nuevo Documento):**

- ADMIN/SUPERADMIN: selector completo de dependencias.
- Resto: campo **solo lectura** con su dependencia (o aviso sin dependencia).

**Tests:** `documentos.create-dependencia.spec.ts` (propia, ajena, omitida, inexistente, sin dependencia, JWT creator).

**Scope post-create:** el documento queda con la dependencia efectiva del actor no-admin → coherente con `documentoVisibilityWhere` (propiedad + misma dependencia INTERNO/RESERVADO).

---

## 9. Frontend (coherencia post-auditoría)

| Botón | Condición UI alineada |
|-------|----------------------|
| Editar | Solo ADMIN/SUPERADMIN |
| Eliminar archivo | Solo ADMIN/SUPERADMIN |
| ACL | Solo ADMIN/SUPERADMIN |
| Subir | `DOC_FILES_UPLOAD` o admin |
| Descargar / Preview | `DOC_FILES_DOWNLOAD` o admin |
| Historial archivo | `DOC_FILES_READ` o admin |
| Enviar revisión | REGISTRADO + (creador\|admin) + `DOC_REVISION_SEND` |
| Aprobar/Rechazar | EN_REVISION + (ADMIN\|REVISOR) + `DOC_REVISION_RESOLVE` |

Rutas: `/documentos` y `/documentos/:id` con sesión; `/documentos/nuevo` exige `DOC_CREATE` ∧ `DOC_FILES_UPLOAD`.

---

## 10. Casos prohibidos (verificados)

1. USER A abre UUID de documento B fuera de scope → **404**.
2. USER A descarga / historial / upload sobre documento B → **404**.
3. USER con `DOC_UPDATE` hace PATCH → **403** (rol).
4. USER aprueba revisión → **403**.
5. CONSULTA/AUDITOR sube archivo → **403**.
6. PATCH a APROBADO/RECHAZADO → **400**.
7. Filtro `dependenciaId` ajena no elimina scope (AND).
8. `total` del listado usa el mismo `where` que `items`.
9. Spoof `createdById` en body de create → ignorado / rechazado; creator = JWT.

---

## 11. Hallazgos y mitigaciones

| Severidad | Hallazgo | Estado |
|-----------|----------|--------|
| CRÍTICO | Upload sin `documentoVisibilityWhere` (IDOR) | ✅ Corregido |
| MEDIO | `pathRel` en download sin anclar a storage root | ✅ Corregido |
| MEDIO | UI mostraba Editar/Eliminar/ACL/Descargar sin alinear RolesGuard/permisos | ✅ Corregido UI |
| MEDIO | Create permitía `dependenciaId` ajena a no-admin | ✅ Corregido: resolución servidor |
| BAJO | `DOC_UPDATE` en seed USUARIO/EDITOR_DOC no usable vía API | Documentado (sin cambio seed) |
| BAJO | `/documentos` sin `PermissionRoute(DOC_READ)` | UX: 403/error al cargar; backend OK |

---

## 12. QA / evidencias

- Tests: `documento-scope.util.spec.ts`, `documentos.security.spec.ts`, `documentos.authorization.spec.ts`, más suites existentes de estado/revisión.
- No MFA / Prisma / DB / seed modificados.
- No commit en esta fase (revisión previa del informe).
