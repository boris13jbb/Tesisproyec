# Matriz de visibilidad — Dependencias y estructura organizacional

**Proyecto:** SGD-GADPR-LM (`Tesisproyec`)  
**Alcance:** catálogo `Dependencia`, FKs a usuarios/documentos/cargos, alcance documental, IDOR/BOLA, asignación de inactivas.  
**Estándares:** ISO/IEC 27001:2022, ISO 15489 (organización documental), OWASP ASVS (V4 control de acceso, V5 validación).

## Objetivo

Asegurar que la unidad organizativa:

- se administra con mínimo privilegio (`ADMIN` + `DEPENDENCIAS_WRITE`);
- se consume como catálogo operativo (activas) por autenticados para selects;
- no permite ampliar scope vía `dependenciaId` manipulada;
- al desactivarse no destruye usuarios ni documentos históricos;
- no se asigna en nuevas altas si está inactiva.

## Modelo

| Campo | Uso | Editable | Sensibilidad |
|---|---|---|---|
| `id` | UUID PK | No (server) | Baja |
| `codigo` | Código único (`@unique`, VarChar 32) | Solo al crear | Baja |
| `nombre` | Nombre visible | Sí (ADMIN+WRITE) | Baja |
| `descripcion` | Texto opcional | Sí | Baja |
| `activo` | Baja lógica | Sí (activar/desactivar) | Media (impacto operativo) |
| `createdAt` / `updatedAt` | Auditoría temporal BD | No | Baja |

Prisma: `onDelete: SetNull` en User, Documento y Cargo → **no** cascade destructivo.

## Relaciones

| Relación | FK | Obligatoria | Efecto de desactivar |
|---|---|---|---|
| User → Dependencia | `users.dependencia_id` nullable | No | Usuario conserva FK; login OK; scope sigue usando su `dependenciaId` |
| Documento → Dependencia | `documentos.dependencia_id` nullable | No | Documento histórico conserva FK; no se borra |
| Cargo → Dependencia | `cargos.dependencia_id` nullable | No | Cargo conserva FK |

## Roles

| Rol | Listar activas | Listar inactivas | Crear | Editar/Desactivar | Asignar a usuario | Asignar a documento |
|---|---|---|---|---|---|---|
| SUPERADMIN | Sí | Sí | Sí + WRITE | Sí + WRITE | Sí (IAM) | Sí (doc create) |
| ADMIN | Sí | Sí | Sí + WRITE | Sí + WRITE | Sí (IAM) | Sí |
| USUARIO | Sí (catálogo) | No (403) | No | No | No (propia server-side) | No (propia) |
| REVISOR | Sí | No | No | No | No | No |
| AUDITOR | Sí | No | No | No | No | No |
| CONSULTA | Sí | No | No | No | No | No |
| EDITOR_DOC | Sí | No | No | No | No | Según DOC_* |

## Permisos

| Permiso real | Uso |
|---|---|
| `DEPENDENCIAS_WRITE` | `POST` / `PATCH` catálogo (además de `@Roles('ADMIN')`) |

No existe `DEPENDENCIAS_READ` / `DELETE` en catálogo: lectura de activas = JWT autenticado (selectores).

## Endpoints

| Método | Endpoint | Acción | Rol | Permiso |
|---|---|---|---|---|
| GET | `/dependencias` | Listado (activas; `incluirInactivos` solo ADMIN) | Autenticado | — |
| GET | `/dependencias/:id` | Detalle (inactiva → 404 si no ADMIN) | Autenticado | — |
| POST | `/dependencias` | Crear | ADMIN(+SA) | `DEPENDENCIAS_WRITE` |
| PATCH | `/dependencias/:id` | Editar / activar-desactivar | ADMIN(+SA) | `DEPENDENCIAS_WRITE` |

No hay `DELETE /dependencias/:id`.

## Crear

- Validación DTO: código 2–32, nombre 2–200, descripción opcional.
- Normalización administrativa de código/nombre.
- Unicidad de `codigo` (constraint BD + ConflictException).
- Mass assignment: `id`/`activo`/`createdAt` no están en DTO (`forbidNonWhitelisted`).
- Auditoría: `DEPENDENCIA_CREATED` (actor JWT).

## Editar

- Campos: `nombre`, `descripcion`, `activo`.
- Código inmutable.
- Nombre vacío tras normalizar → 400.
- Auditoría: `DEPENDENCIA_UPDATED` / `DEPENDENCIA_ACTIVATED` / `DEPENDENCIA_DEACTIVATED`.

## Activar / desactivar

| Aspecto | Comportamiento real |
|---|---|
| Dependencia activa | Asignable a usuarios y documentos nuevos |
| Dependencia inactiva | No asignable en altas nuevas (usuario/documento) |
| Usuarios asociados | Conservan FK; login no se corta por inactividad de área |
| Documentos asociados | Conservan FK; visibles según `documentoVisibilityWhere` |
| Selectores UI nuevas altas | Solo activas (`GET` sin `incluirInactivos`) |
| Histórico | Documento/detalle puede mostrar dependencia embebida aunque luego se desactive |

## Eliminar

- Endpoint físico: **no existe**.
- Política: baja lógica (`activo=false`).
- Integridad: `onDelete: SetNull` (riesgo residual si se borrara fila a mano en BD).

## Dependencia de usuario

- USER no autoasigna `dependenciaId` (IAM endurecido fase previa).
- ADMIN al crear/editar usuario: dependencia debe existir y estar **activa** (o `null`).
- Cambio X→Y: scope documental del viewer pasa a Y vía JWT/`dependenciaId`; documentos de X siguen existiendo; visibilidad previa puede mantenerse por `createdBy` / ACL / misma dependencia histórica según helper.

## Dependencia de documento

- Create: `resolveCreateDocumentoDependencia` + `assertDependenciaExists` (rechaza inactiva).
- USER: fuerza su dependencia; no inyecta ajena.
- Update doc: misma validación si cambia `dependenciaId`.

## Dependencia inactiva

- Catálogo operativo: excluida.
- `incluirInactivos=true`: solo ADMIN/SUPERADMIN.
- Detalle UUID inactiva: 404 para no-admin.

## Cambio de dependencia

| Caso | Resultado |
|---|---|
| USER A: X → Y (ADMIN) | Nuevo scope por Y; docs creados en X no se reasignan |
| ACL individual | Puede mantener acceso a doc ajeno a la nueva dependencia |
| Reasignación masiva automática | No existe |

## Scope documental

`documentoVisibilityWhere(viewer)` usa `viewer.dependenciaId` del servidor/JWT, no el body.

## IDOR/BOLA

| Acción | USER | Resultado |
|---|---|---|
| GET listado activas | Sí | 200 (catálogo mínimo) |
| GET incluir inactivas | No | 403 |
| GET detalle inactiva | No | 404 |
| POST/PATCH | No | 403 |
| DELETE | N/A | 404 ruta |

## Mass assignment

DTO create/update whitelist; campos de sistema rechazados.

## Auditoría

| Acción | Código |
|---|---|
| Crear | `DEPENDENCIA_CREATED` |
| Editar datos | `DEPENDENCIA_UPDATED` |
| Activar | `DEPENDENCIA_ACTIVATED` |
| Desactivar | `DEPENDENCIA_DEACTIVATED` |

Actor desde JWT; meta sin secretos (redacción central `d4e9e9a`).

## Frontend

| Ruta | Protección |
|---|---|
| `/catalogos/dependencias` | `RoleRoute(ADMIN\|SUPERADMIN)` |
| Botones Nueva/Editar | `DEPENDENCIAS_WRITE` |
| USER URL manual | `/forbidden` (rol) |

## Matriz por rol

| Función | SUPERADMIN | ADMIN | USUARIO | REVISOR | AUDITOR | CONSULTA | EDITOR_DOC |
|---|---|---|---|---|---|---|---|
| Listar activas | Sí | Sí | Sí | Sí | Sí | Sí | Sí |
| Detalle activa | Sí | Sí | Sí | Sí | Sí | Sí | Sí |
| Ver inactivas | Sí | Sí | No | No | No | No | No |
| Crear | Sí* | Sí* | No | No | No | No | No |
| Editar | Sí* | Sí* | No | No | No | No | No |
| Activar/Desactivar | Sí* | Sí* | No | No | No | No | No |
| Eliminar | No | No | No | No | No | No | No |
| Asignar a usuario | Sí† | Sí† | No | No | No | No | No |
| Asignar a documento | Sí | Sí | Propia | Propia‡ | Propia‡ | Propia‡ | Propia‡ |

\* Con `DEPENDENCIAS_WRITE`.  
† Con permisos IAM de usuarios.  
‡ Si el rol tiene `DOC_CREATE` / flujo de creación.

## Casos prohibidos

1. USER `?incluirInactivos=true` → 403.  
2. USER POST/PATCH dependencia → 403.  
3. Asignar dependencia inactiva a usuario o documento nuevo → 400.  
4. USER `dependenciaId` ajena en create documento → 403.  
5. DELETE físico vía API → no disponible.

## QA

- Tests: `dependencias.authorization.spec.ts`, `documentos.create-dependencia.spec.ts` (inactiva), IAM users self-patch (fase previa).  
- Manual ADMIN: `/catalogos/dependencias` 1440×900 listado/filtros/editar (sin borrar datos reales).  
- USER: ruta catálogo → forbidden; API escritura → 403.

## Riesgos residuales

| Id | Severidad | Descripción | Mitigación |
|---|---|---|---|
| R-DEP-01 | BAJO | Unicidad solo por `codigo` (nombre puede repetirse) | Política actual; no unique en nombre |
| R-DEP-02 | BAJO | Race create duplicado código | Constraint BD P2002 |
| R-DEP-03 | MEDIO (aceptado) | Listado de activas abierto a todo JWT | Necesario para selects; sin PII |
| R-DEP-04 | BAJO | Cargo puede referenciar dependencia inactiva al editar cargo | Fuera de alcance estricto; reportado |
| R-DEP-05 | BAJO | Sin retención/archivado de catálogo | Gobernanza futura |

## Correcciones de esta fase

- `incluirInactivos` y detalle inactiva restringidos a ADMIN.  
- Auditoría create/update/activar/desactivar.  
- Validación dependencia activa al asignar usuario.  
- UI escribe solo con `DEPENDENCIAS_WRITE`.  
- Tests de autorización + documento inactiva.
