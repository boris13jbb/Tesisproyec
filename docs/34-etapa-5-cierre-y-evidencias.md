# ETAPA 5 — Catálogos: cierre al 100 % (evidencias MVP)

**Proyecto:** SGD-GADPR-LM  
**Referencia roadmap:** `docs/00-roadmap-general.md` (fila **ETAPA 5 — Catálogos**)  
**Modelo BD:** tablas `dependencias`, `cargos`, `tipos_documentales`, `series`, `subseries` — `docs/04-modelo-base-de-datos.md`  
**Fecha de cierre formal:** **2026-05-06**

---

> **Actualización documental (2026-05-06):** este documento conserva la evidencia de cierre del hito. Para el **estado vivo** del código y brechas institucionales: `docs/README.md` (snapshot), `docs/22-changelog-tecnico.md`, `docs/28-listado-lo-que-deberia-tener-el-sistema.md`.

## Objetivo

Acreditar los **catálogos base** que alimentan el registro documental (dependencias institucionales, cargos, tipología, serie/subserie) con persistencia Prisma y UI de administración bajo rol **ADMIN**.

> **Ámbito MVP:** lectura/anotación usable por **JWT** en varios endpoints de listado; **creación y actualización** restringidas a **ADMIN** en backend (`@Roles('ADMIN')` + `RolesGuard` en mutaciones).  
> **Roadmap extendido (“estados”, “configuración” parametrizada global):** parcialmente cubierto en otros documentos (`17-modulo-configuracion.md`) — no bloquean el cierre de **catálogos nucleares** descritos aquí.

---

## Checklist vs roadmap (`00-roadmap-general.md`)

| Catálogo | Backend (NestJS) | API base (`/api/v1`) | Frontend (solo ADMIN shell) | Docs funcional |
|----------|-------------------|----------------------|----------------------------|----------------|
| Dependencias | `dependencias/` | `GET /dependencias`, `POST|PATCH` ADMIN | `/catalogos/dependencias` | `08-modulo-dependencias.md` |
| Cargos | `cargos/` | `GET /cargos`, mutaciones ADMIN | `/catalogos/cargos` | `09-modulo-cargos.md` |
| Tipos documentales | `tipos-documentales/` | `GET /tipos-documentales`, mutaciones ADMIN | `/catalogos/tipos-documentales` | `10-modulo-tipos-documentales.md` |
| Series | `series/` | `GET /series`, mutaciones ADMIN | `/catalogos/series` | `11-modulo-series-subseries.md` |
| Subseries | `subseries/` | `GET /subseries`, mutaciones ADMIN | `/catalogos/subseries` | `11-modulo-series-subseries.md` |

**Transversal:** todas las páginas de catálogo viven tras `RoleRoute roles={['ADMIN']}` (`frontend/src/app/App.tsx`); mismo patrón de layout/breadcrumbs (`MainLayout`).

---

## Comportamiento de seguridad verificable

- **JwtAuthGuard** en controladores de catálogo para cualquier método.
- **RolesGuard + @Roles('ADMIN')** en `POST` / `PATCH` (y equivalentes) según cada controlador — los **LIST/GET** suelen estar disponibles para personal autenticado (p. ej. formularios de documento y usuarios).

---

## Fuera de alcance MVP ETAPA 5 (backlog expediente)

- Catálogo formal de **estados de ciclo vital** del documento (máquina de estados — ver `12-modulo-documentos.md` y backlog ISO 15489).
- Pantalla única de **“configuración del sistema”** con todos los parámetros (`17`).

---

## Próximo hito oficial (roadmap)

**ETAPA 6 — Gestión documental:** cierre formal en **`docs/35-etapa-6-cierre-y-evidencias.md`** + **`docs/12-modulo-documentos.md`**.

---

*Fin del documento de cierre ETAPA 5.*
