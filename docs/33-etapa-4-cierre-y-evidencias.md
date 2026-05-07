# ETAPA 4 — Navegación y shell UI: cierre al 100 % (evidencias MVP)

**Proyecto:** SGD-GADPR-LM  
**Referencia roadmap:** `docs/00-roadmap-general.md` (fila **ETAPA 4 — Navegación y shell UI**)  
**Frontend:** SPA bajo `frontend/src/`  
**Fecha de cierre formal:** **2026-05-06**

---

> **Actualización documental (2026-05-06):** este documento conserva la evidencia de cierre del hito. Para el **estado vivo** del código y brechas institucionales: `docs/README.md` (snapshot), `docs/22-changelog-tecnico.md`, `docs/28-listado-lo-que-deberia-tener-el-sistema.md`.

## Objetivo

Acreditar una **envoltura de aplicación coherente** (layout, rutas, estados HTTP accesibles, feedback de red/sesión) sobre la que se montan los módulos de negocio (catálogos, documentos, etc.).

---

## Checklist vs roadmap (`00-roadmap-general.md`)

| Entregable | Evidencia | Estado |
|------------|-----------|--------|
| **Layout / dashboard** | `MainLayout` (AppBar, drawer temporal/permanente responsive, zona principal); `/` → `DashboardPage` con chequeo opcional `/health` y tarjetas contextuales | Cumple |
| **Menú** | Ítems comunes (`/`, `/documentos`); secciones **Administración** + **Catálogos** solo si `user.roles` incluye `ADMIN` (`MainLayout.tsx`) | Cumple |
| **Rutas protegidas** | `ProtectedRoute` → redirección a `/login` con `state.from` si no hay usuario; loaders de sesión (`SessionGate` en `App`, `AuthProvider`) | Cumple |
| **403** | `/forbidden`; `RoleRoute` redirige aquí cuando el rol no califica (`RoleRoute.tsx`) | Cumple |
| **404** | Catch-all `<Route path="*">` → `NotFoundPage` (`App.tsx`) | Cumple |
| **Estados error / red** | `AppNotifications` + `notifyGlobalError` (sin respuesta del servidor → aviso backend caído; sesión perdida tras refresh fallido → mensaje explícito) (`AppNotifications.tsx`, `api/client.ts`) | Cumple |
| **Breadcrumbs** | `getBreadcrumbsForPath`, `LayoutBreadcrumbs`, etiqueta opcional desde `BreadcrumbDetailProvider` (detalle documento) | Cumple base |

---

## Rutas públicas vs protegidas (resumen)

| Ruta | Papel |
|------|-------|
| `/login`, `/recuperar`, `/restablecer` | Sin layout shell completo típico; autenticación / recuperación |
| `/forbidden` | Visible sin `MainLayout`; acceso tras denegación por rol |
| `/*` dentro de `ProtectedRoute` + `MainLayout` | Aplicación autenticada (inicio, documentos, admin/catálogo si ADMIN) |
| `*` | 404 |

---

## Fuera de alcance declarado de ETAPA 4

- **Temas institucionales avanzados** de UI (design system exhaustivo): ver `docs/25-ui-ux-diseno-sistema-institucional.md`.
- **Permisos por acción** más allá de rol + `RoleRoute`: ETAPA 3 backlog / `docs/07-modulo-roles-permisos.md`.

---

## Próximo hito oficial (roadmap)

**ETAPA 5 — Catálogos:** cierre formal en **`docs/34-etapa-5-cierre-y-evidencias.md`**; detalle modular en **`docs/08`**–**`11`**.

---

*Fin del documento de cierre ETAPA 4.*
