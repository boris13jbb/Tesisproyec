# Matriz de visibilidad — Tipos documentales

**Proyecto:** SGD-GADPR-LM (`Tesisproyec`)  
**Alcance:** catálogo `TipoDocumental`, FK en Documentos, asignación, IDOR/BOLA.  
**Estándares:** ISO/IEC 27001:2022, ISO 15489, OWASP ASVS (V4/V5).

## Objetivo

Asegurar que los tipos documentales:

- se administran con `ADMIN`/`SUPERADMIN` + `TIPOS_DOCUMENTALES_WRITE`;
- se consumen como catálogo operativo (solo activos) por usuarios autenticados;
- no se asignan a documentos nuevos si están inactivos;
- conservan la relación histórica en documentos ya registrados;
- no admiten DELETE físico (baja lógica vía `activo`).

## Modelo

| Campo | Uso | Editable | Sensibilidad |
|---|---|---|---|
| `id` | UUID PK | No | Baja |
| `codigo` | Único institucional | Solo crear (inmutable en PATCH) | Baja |
| `nombre` | Visible | Sí | Baja |
| `descripcion` | Opcional | Sí | Baja |
| `activo` | Baja lógica | Sí (PATCH) | Media |
| `createdAt` / `updatedAt` | BD | No | Baja |

## Relación con Documentos

| Relación | FK | Nullable | onDelete | Uso |
|---|---|---|---|---|
| Documento → TipoDocumental | `documentos.tipo_documental_id` | No | Restrict | Clasificación tipológica |

Desactivar un tipo:

- **NO** borra documentos;
- **NO** nullifica históricos;
- **NO** reasigna automáticamente.

## Roles

| Rol | Listar activos | Ver inactivos | Crear | Editar | Activar | Desactivar | Eliminar |
|---|---|---|---|---|---|---|---|
| SUPERADMIN | Sí | Sí | Sí + WRITE | Sí + WRITE | Sí + WRITE | Sí + WRITE | No |
| ADMIN | Sí | Sí | Sí + WRITE | Sí + WRITE | Sí + WRITE | Sí + WRITE | No |
| USUARIO / REVISOR / AUDITOR / CONSULTA / EDITOR_DOC | Sí (catálogo) | No | No | No | No | No | No |

## Permisos

| Permiso real | Uso |
|---|---|
| `TIPOS_DOCUMENTALES_WRITE` | POST y PATCH del catálogo (+ `@Roles('ADMIN')`, que incluye SUPERADMIN) |

No existe `TIPOS_DOCUMENTALES_READ` separado: el listado operativo es JWT-only.

## Endpoints

| Método | Endpoint | Acción | Rol | Permiso |
|---|---|---|---|---|
| GET | `/tipos-documentales` | Catálogo activos; `incluirInactivos` solo ADMIN | JWT | — |
| GET | `/tipos-documentales/:id` | Detalle (inactivo → 404 no-admin) | JWT | — |
| POST | `/tipos-documentales` | Crear | ADMIN(+SA) | `TIPOS_DOCUMENTALES_WRITE` |
| PATCH | `/tipos-documentales/:id` | Editar / activar-desactivar | ADMIN(+SA) | `TIPOS_DOCUMENTALES_WRITE` |

Sin DELETE. Sin PUT.

## Catálogo operativo

Selectores de documento (`/documentos/nuevo`, detalle, filtros) usan `GET /tipos-documentales` **sin** `incluirInactivos` → solo activos.

| Quién | Activos | Inactivos |
|---|---|---|
| USER / roles operativos | Sí | No (`incluirInactivos` → 403) |
| ADMIN / SUPERADMIN | Sí | Sí con `incluirInactivos=true` |

## Crear

- Rol: ADMIN/SUPERADMIN + `TIPOS_DOCUMENTALES_WRITE`.
- DTO: `codigo`, `nombre`, `descripcion?` (whitelist; `activo`/`id` → 400).
- Normalización: código uppercase/trim; nombre trim (utilidades administrativas del proyecto).
- Estado inicial: `activo=true` (default Prisma).
- Duplicado `codigo` (unique DB): ConflictException.
- Auditoría: `TIPO_DOCUMENTAL_CREATED` (actor JWT).

## Editar

- Campos: `nombre`, `descripcion`, `activo`.
- Código: **no** editable en PATCH.
- Auditoría: `TIPO_DOCUMENTAL_UPDATED` / `_ACTIVATED` / `_DEACTIVATED`.

## Activar / Desactivar

| Caso | Nueva asignación | Histórico |
|---|---|---|
| Tipo activo | Sí | Sí |
| Tipo inactivo | No (400) | Sí (FK intacta) |
| Tipo inexistente | No | N/A |
| Eliminado físico | Impedido por Restrict si hubiera docs | N/A (sin DELETE API) |

## Eliminar

No existe endpoint DELETE. Preferida baja lógica (`activo=false`).

## Nueva asignación documental

Backend (`TiposDocumentalesService.assertAssignable`):

- create documento: exige tipo existente y **activo**;
- update documento: solo revalida activo si `tipoDocumentalId` **cambia**;
- mismo id histórico (aunque luego inactivo): permitido.

## Histórico

Documento con tipo luego inactivado:

- conserva `tipoDocumentalId`;
- UI detalle muestra `codigo — nombre`;
- selector de edición incluye opción histórica si ya no está en activos.

## Cambio de tipo

Permitido vía `PATCH /documentos/:id` con `ADMIN` + `DOC_UPDATE` (política documental preexistente). Destino inactivo → 400.

| Estado documento | ¿PATCH metadatos permitido? | ¿Cambiar `tipoDocumentalId` actualmente? |
|---|---:|---:|
| BORRADOR | Sí* | Sí* |
| REGISTRADO | Sí* | Sí* |
| EN_REVISION | Sí* | Sí* |
| APROBADO | Sí* | Sí* |
| RECHAZADO | Sí* | Sí* |
| ARCHIVADO | No (salvo `activo`) | No |

\* Si el actor tiene `DOC_UPDATE`. Esta fase **no amplió** esa capacidad; solo endureció que el destino sea activo. Residual: futura auditoría de workflow/estados.

## IDOR/BOLA

- USER: POST/PATCH/`incluirInactivos` → 403.
- Detalle inactivo no-admin → 404 anti-enumeración.
- ADMIN sin WRITE → 403 en mutaciones.

## Mass assignment

`ValidationPipe` whitelist + `forbidNonWhitelisted`. Create no acepta `activo`/`id`.

## Auditoría

| Acción | Evento |
|---|---|
| Crear | `TIPO_DOCUMENTAL_CREATED` |
| Editar datos | `TIPO_DOCUMENTAL_UPDATED` |
| Activar | `TIPO_DOCUMENTAL_ACTIVATED` |
| Desactivar | `TIPO_DOCUMENTAL_DEACTIVATED` |

Actor: `actorUserId` / email desde JWT (contexto servidor).

## Frontend

| Ruta | Control |
|---|---|
| `/catalogos/tipos-documentales` | `RoleRoute(ADMIN\|SUPERADMIN)`; botones con `TIPOS_DOCUMENTALES_WRITE` |
| Sidebar Catálogos | Solo ADMIN (no es control de seguridad) |
| `/documentos/nuevo` | Selector solo activos vía API |

## Matriz por rol (funciones)

| Función | SUPERADMIN | ADMIN | USER | REVISOR | AUDITOR | CONSULTA | EDITOR_DOC |
|---|---|---|---|---|---|---|---|
| Listar activos | Sí | Sí | Sí | Sí | Sí | Sí | Sí |
| Ver inactivos | Sí | Sí | No | No | No | No | No |
| Detalle activo | Sí | Sí | Sí | Sí | Sí | Sí | Sí |
| Detalle inactivo | Sí | Sí | 404 | 404 | 404 | 404 | 404 |
| Crear | +WRITE | +WRITE | No | No | No | No | No |
| Editar | +WRITE | +WRITE | No | No | No | No | No |
| Activar/Desactivar | +WRITE | +WRITE | No | No | No | No | No |
| Eliminar | No | No | No | No | No | No | No |
| Usar en documento nuevo | Sí* | Sí* | Sí* | Sí* | Sí* | Sí* | Sí* |
| Ver histórico en documento | Sí | Sí | Sí** | Sí** | Sí** | Sí** | Sí** |

\* Si tiene permiso de creación documental.  
\*\* Según alcance documental (scope/IDOR).

## QA

1. ADMIN+WRITE: listar, crear (cancelar), editar (cancelar), incluir inactivos.
2. USER: `GET ?incluirInactivos=true` → 403; ruta admin → forbidden UI.
3. POST documento con tipo inactivo → 400.
4. Editar documento manteniendo tipo histórico inactivo → OK.
5. Mass assignment create → 400.
6. Console limpia en catálogo 1440×900.

## Riesgos residuales

| Riesgo | Severidad | Nota |
|---|---|---|
| Race create código duplicado | Bajo | Unique DB + ConflictException; residual TOCTOU aceptable |
| Filtro documentos por tipo inactivo | Bajo | Requiere UUID conocido; listado de tipos para USER no lo expone |
| Cambio de tipo en APROBADO | Medio documentado | Permitido por política actual de PATCH; no rediseñado |
