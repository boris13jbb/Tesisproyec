# Matriz de visibilidad — Cargos y organización

**Proyecto:** SGD-GADPR-LM (`Tesisproyec`)  
**Alcance:** catálogo `Cargo`, FK a Dependencia y Usuarios, asignación, IDOR/BOLA.  
**Estándares:** ISO/IEC 27001:2022, ISO 15489, OWASP ASVS (V4/V5).

## Objetivo

Asegurar que los cargos:

- se administran con `ADMIN` + `CARGOS_WRITE`;
- se consumen como catálogo operativo (activos) por autenticados;
- no se asignan si están inactivos o su dependencia está inactiva;
- respetan coherencia `user.dependenciaId` ↔ `cargo.dependenciaId` en nuevas asignaciones;
- no cambian de dependencia si hay usuarios asignados (evita escalamiento organizacional silencioso).

## Modelo

| Campo | Uso | Editable | Sensibilidad |
|---|---|---|---|
| `id` | UUID PK | No | Baja |
| `codigo` | Único | Solo crear | Baja |
| `nombre` | Visible | Sí | Baja |
| `descripcion` | Opcional | Sí | Baja |
| `dependenciaId` | FK opcional a Dependencia | Sí (sin usuarios asignados) | Media |
| `activo` | Baja lógica | Sí | Media |
| `createdAt` / `updatedAt` | BD | No | Baja |

## Relación Cargo-Dependencia

| Relación | FK | Nullable | onDelete |
|---|---|---|---|
| Cargo → Dependencia | `cargos.dependencia_id` | Sí | SetNull |

Efecto dependencia inactiva: el cargo conserva FK; **no** se asigna en altas nuevas.

## Relación Cargo-Usuario

| Relación | FK | Nullable | onDelete |
|---|---|---|---|
| User → Cargo | `users.cargo_id` | Sí | SetNull |

Histórico: desactivar cargo no nullifica usuarios.

## Roles

| Rol | Listar activos | Ver inactivos | Crear/Editar | Asignar a usuario |
|---|---|---|---|---|
| SUPERADMIN | Sí | Sí | Sí + WRITE | Sí (IAM) |
| ADMIN | Sí | Sí | Sí + WRITE | Sí (IAM) |
| USUARIO / REVISOR / AUDITOR / CONSULTA / EDITOR_DOC | Sí (catálogo) | No | No | No (propia vía IAM admin) |

## Permisos

| Permiso real | Uso |
|---|---|
| `CARGOS_WRITE` | POST y PATCH catálogo (+ `@Roles('ADMIN')`) |

## Endpoints

| Método | Endpoint | Acción | Rol | Permiso |
|---|---|---|---|---|
| GET | `/cargos` | Catálogo activos; inactivos solo ADMIN | JWT | — |
| GET | `/cargos/:id` | Detalle (inactivo → 404 no-admin) | JWT | — |
| POST | `/cargos` | Crear | ADMIN(+SA) | `CARGOS_WRITE` |
| PATCH | `/cargos/:id` | Editar / activar-desactivar | ADMIN(+SA) | `CARGOS_WRITE` |

Sin DELETE.

## Catálogo operativo

Selectores de usuario/documento usan `GET /cargos` (solo activos). `incluirInactivos` restringido.

## Crear / Editar

- Dependencia del cargo: debe existir y estar **activa** (o `null`).
- Código inmutable en PATCH.
- Cambio de `dependenciaId` **bloqueado** si `user.count(cargoId) > 0`.
- Auditoría: `CARGO_CREATED` / `_UPDATED` / `_ACTIVATED` / `_DEACTIVATED`.

## Cargo inactivo

| Caso | Resultado |
|---|---|
| Nueva asignación usuario | 400 |
| Histórico en usuario | Conserva FK |
| Selectores nuevas altas | Excluido |
| PATCH usuario con el mismo `cargoId` | No revalida (conserva histórico) |
| PATCH usuario con `cargoId` distinto | Exige cargo asignable |

## Dependencia inactiva (del cargo)

| Caso | Resultado |
|---|---|
| Nueva asignación usuario | 400 |
| Crear/editar cargo apuntando a dep. inactiva | 400 |
| Histórico | Conserva FK |

## Cambio de dependencia del cargo

Bloqueado si hay usuarios asignados. Evita que usuarios con `cargoId` cambien de área organizacional de forma silenciosa.

## Consistencia Usuario-Cargo-Dependencia

| user.dependencia | cargo.dependencia | Nueva asignación |
|---|---|---|
| X | X | Sí |
| X | null | Sí (cargo institucional) |
| X | Y | No (400) |
| null | X (activa) | Sí |
| null | null | Sí |

## IDOR/BOLA

USER: POST/PATCH/incluirInactivos → 403. Detalle inactivo → 404.

## Mass assignment

DTO whitelist + `forbidNonWhitelisted`.

## Auditoría

Actor JWT. Meta sin secretos (hardening `d4e9e9a`).

## Frontend

| Ruta | Protección |
|---|---|
| `/catalogos/cargos` | `RoleRoute(ADMIN\|SUPERADMIN)` |
| Nueva/Editar | `CARGOS_WRITE` |

## Matriz por rol

| Función | SUPERADMIN | ADMIN | USER | REVISOR | AUDITOR | CONSULTA | EDITOR_DOC |
|---|---|---|---|---|---|---|---|
| Listar activos | Sí | Sí | Sí | Sí | Sí | Sí | Sí |
| Ver inactivos | Sí | Sí | No | No | No | No | No |
| Crear/Editar/Activar | Sí* | Sí* | No | No | No | No | No |
| Eliminar | No | No | No | No | No | No | No |
| Asignar a usuario | Sí† | Sí† | No | No | No | No | No |
| Cambiar dep. del cargo | Sí*‡ | Sí*‡ | No | No | No | No | No |

\* Con `CARGOS_WRITE`. † Con permisos IAM. ‡ Solo sin usuarios asignados.

## QA

- Ruta admin: `/catalogos/cargos` (`RoleRoute` ADMIN|SUPERADMIN).
- USER/REVISOR: navegación → `/forbidden`; POST/PATCH API → 403.
- Selector IAM: solo cargos asignables; histórico se etiqueta en edición.
- Layout: scroll del shell en `<main>` (`100dvh` + `minHeight: 0` + `overflowY: auto`).

## Riesgos residuales

| Id | Severidad | Descripción |
|---|---|---|
| R-CARGO-01 | BAJO | Usuarios históricos pueden quedar con cargo/dep. inconsistentes previos al hardening |
| R-CARGO-02 | BAJO | Unicidad solo por `codigo` |
| R-CARGO-03 | MEDIO (aceptado) | Listado de activos abierto a JWT (selectores) |
