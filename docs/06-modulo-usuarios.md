# Módulo — Usuarios

## Objetivo

Administración de cuentas de usuario del sistema (alta, baja lógica, actualización).

## Alcance

Perfil, asignación a dependencia/cargo, estado activo/inactivo.

## Estado actual

**No implementado.**

## Decisiones técnicas

- Hash Argon2id; no exponer hash ni datos innecesarios en API.

## Estructura prevista

- Backend: `UsersModule`; DTOs con validación.
- Frontend: listado, formulario, detalle (según permisos).

## Endpoints (previstos)

- CRUD bajo permiso administrativo; `GET /me` para perfil actual.

## Pantallas

- Lista usuarios, crear/editar usuario, perfil propio.

## Tablas relacionadas

- Pendiente de modelo Prisma (`User`, relaciones a rol, dependencia, cargo).

## Permisos

- Típicamente solo administradores gestionan terceros; usuario edita perfil limitado.

## Dependencias

- Auth, roles, dependencias, cargos.
