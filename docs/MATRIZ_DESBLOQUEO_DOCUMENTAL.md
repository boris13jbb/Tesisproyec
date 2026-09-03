# Matriz — Desbloqueo documental controlado e inmutabilidad

**Proyecto:** SGD-GADPR-LM (`Tesisproyec`)  
**Checkpoint base:** `c02c367` (workflow) + esta fase.  
**Estándares:** ISO 15489 (integridad), ISO/IEC 27001, OWASP ASVS V4.

Complementa [MATRIZ_WORKFLOW_ESTADOS_DOCUMENTALES.md](./MATRIZ_WORKFLOW_ESTADOS_DOCUMENTALES.md).

## Objetivo

Congelar contenido en estados protegidos y permitir **reapertura administrativa**
solo mediante endpoint formal + permiso `DOC_UNLOCK` + motivo obligatorio,
sin inventar estados ni bypass por PATCH.

## Estados bloqueados / mutabilidad

| Estado | Edición normal | Requiere unlock | Destino unlock |
|---|---:|---:|---|
| BORRADOR | Sí* | No | — |
| REGISTRADO | Sí* | No | — |
| EN_REVISION | No | Sí | REGISTRADO |
| RECHAZADO | Sí* | No | — |
| APROBADO | No | Sí | REGISTRADO |
| ARCHIVADO | No (solo `activo` histórico) | Sí | REGISTRADO |

\* según permisos normales (`DOC_UPDATE`, archivos, etc.).

## DOC_UNLOCK

- Código: `DOC_UNLOCK`
- Descripción: desbloqueo administrativo de documentos protegidos para corrección.
- **No** equivale a `DOC_UPDATE`.
- **No** equivale a `DOC_FILES_UPLOAD` / `DOC_FILES_DELETE`.
- **No** crea `DOC_EDIT_APPROVED` / `DOC_EDIT_LOCKED` / bypass genérico.

### Fuente de permisos

- Catálogo: `backend/src/auth/permission-codes.ts`
- Seed: upsert del catálogo; **SUPERADMIN** hereda `DOC_UNLOCK` por rol;
  **ADMIN** **no** lo recibe automáticamente (matriz ADMIN = todos excepto `DOC_UNLOCK`).
- Delegación: permiso **directo** (`user_permissions`) solo por **SUPERADMIN** → target **ADMIN**.

## SUPERADMIN / ADMIN delegado

| Acción | SUPERADMIN | ADMIN+DOC_UNLOCK | ADMIN | USER | REVISOR | AUDITOR | CONSULTA | EDITOR_DOC |
|---|---|---|---|---|---|---|---|---|
| Desbloquear (scope propio / visible) | Sí | Sí | No | No | No | No | No | No |
| Desbloquear fuera de visibilidad normal | Sí | No* | No | No | No | No | No | No |
| Otorgar DOC_UNLOCK | Sí | No | No | No | No | No | No | No |
| Revocar DOC_UNLOCK | Sí | No | No | No | No | No | No | No |

\* En la arquitectura actual `documentoVisibilityWhere` da alcance global a ADMIN;
el desbloqueo de ADMIN reutiliza esa visibilidad (no amplía scope). SUPERADMIN usa carga por id.

## Scope

- Endpoint: `POST /documentos/:id/desbloquear`
- Guards: `RolesGuard` (`ADMIN`, que incluye SUPERADMIN) + `@Permissions(DOC_UNLOCK)`
- SUPERADMIN: `loadDocumentoById`
- Otros: `loadDocumentoVisibleById`

## Motivo obligatorio

DTO `DesbloquearDocumentoDto.motivo`: trim, min 3, max 2000. Vacío/whitespace → 400.

## Transiciones de desbloqueo

Solo en el endpoint dedicado (condicional `updateMany` + estado origen):

- `EN_REVISION` → `REGISTRADO` (limpia SLA: `fechaIngresoRevision` / `fechaLimiteSla`)
- `APROBADO` → `REGISTRADO`
- `ARCHIVADO` → `REGISTRADO`

**No** están en la tabla `TRANSICIONES` usada por PATCH. PATCH que intente
`protegido → REGISTRADO` → 400.

Desbloquear estados editables (`BORRADOR`/`REGISTRADO`/`RECHAZADO`) → **409**
(“El documento ya se encuentra en un estado editable.”).

## Inmutabilidad

Sin desbloquear, incluso SUPERADMIN / ADMIN+DOC_UNLOCK:

- no metadata vía PATCH en `EN_REVISION` / `APROBADO`
- `ARCHIVADO`: solo `activo` (política previa); metadatos bloqueados
- no upload / delete de archivos en estados protegidos
- download sigue con `DOC_FILES_READ` / `DOC_FILES_DOWNLOAD` + ACL

### Excepción: APROBADO → ARCHIVADO (state-only)

No es desbloqueo. Es transición administrativa de ciclo de vida:

- PATCH `{ "estado": "ARCHIVADO" }` únicamente
- Permiso: `DOC_UPDATE` (+ rol ADMIN / SUPERADMIN)
- **No** requiere `DOC_UNLOCK`
- Auditoría: `DOC_STATE_CHANGED` (no `DOC_UNLOCKED`)
- Payload mixto (`estado` + metadata) → **400** (anti-bypass de inmutabilidad)

Destinos de reapertura (`APROBADO` → `REGISTRADO` / `BORRADOR` / `EN_REVISION` / `RECHAZADO`)
siguen bloqueados en PATCH; solo `POST .../desbloquear`.

## Separación DOC_UNLOCK / DOC_UPDATE

Tras desbloquear → estado `REGISTRADO`:

- editar metadata requiere `DOC_UPDATE`
- subir archivos requiere `DOC_FILES_UPLOAD` (o rol ADMIN según endpoint)

Archivar (`APROBADO` → `ARCHIVADO`) usa `DOC_UPDATE`, **no** `DOC_UNLOCK`.

## Auditoría

- Acción: `DOC_UNLOCKED` (+ `DOC_STATE_CHANGED` con `via: DOC_UNLOCK`)
- Meta: `documentoId`, `estadoAnterior`, `estadoNuevo`, `motivo`, `rolActor`
- Actor / timestamp: servidor
- **No** emite `DOC_REVIEW_RESOLVED` al desbloquear `EN_REVISION`
- Aprobaciones históricas previas **se conservan** en auditoría

## Concurrencia

`updateMany({ where: { id, estado: desde } })`; `count !== 1` → **409**. Sin last-write-wins.

## IAM

- `PERMISSIONS_NOT_ASSIGNABLE_AS_DIRECT_BY_ADMIN` incluye `DOC_UNLOCK`
- ADMIN no añade ni revoca `DOC_UNLOCK` (puede preservar el ya asignado al editar otros directos)
- Target de `DOC_UNLOCK` directo: solo `ADMIN` (no USER/REVISOR/AUDITOR/CONSULTA/EDITOR_DOC; no SUPERADMIN vía directo)
- Matriz de rol: `DOC_UNLOCK` solo en rol `SUPERADMIN`

## Frontend

- Detalle: botón **Desbloquear para corrección** si SUPERADMIN o ADMIN+DOC_UNLOCK y estado protegido
- Diálogo con advertencia + motivo obligatorio
- **Archivar documento** (solo `APROBADO` + ADMIN + `DOC_UPDATE`): PATCH state-only; diálogo Cancelar/Archivar; **no** pide motivo de desbloqueo
- Editar / upload / delete ocultos o deshabilitados mientras esté congelado
- Usuarios: SUPERADMIN administra `DOC_UNLOCK` en ADMIN; ADMIN no lo ve en catálogo de críticos

## Reportes / SLA

Pendientes y bandeja usan **estado actual** `EN_REVISION` + campos SLA del documento.
Al desbloquear desde `EN_REVISION` se anulan fechas SLA → no queda pendiente ficticio.
**Reportes no modificados** en esta fase.

## ARCHIVADO y `activo`

Tras desbloqueo → `REGISTRADO` sin cambiar `activo` salvo que ya estuviera inactivo.
La excepción PATCH de solo-`activo` en ARCHIVADO se conserva como política previa de baja lógica.

## Tests

- `documento-estado.util.spec.ts` — inmutabilidad / anti-bypass unlock
- `documentos.unlock.spec.ts` — endpoint service
- `desbloquear-documento.dto.spec.ts` — motivo
- `rbac-policy.util.spec.ts` — delegación DOC_UNLOCK

## Riesgos residuales

- ADMIN con visibilidad global histórica: DOC_UNLOCK no reduce ese alcance (reutiliza scope existente).
- Re-seed sobrescribe matriz rol↔permiso; ADMIN no recupera DOC_UNLOCK por rol.
- No hay versionamiento de expediente ni tabla de versiones (fuera de alcance).
