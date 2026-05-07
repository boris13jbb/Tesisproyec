# Rendimiento — prefetch post-login + LCP del panel principal

## Objetivo

Documentar la mejora **solo de rendimiento** (rama **`perf/post-login-prefetch-web-vitals`**) que:

1. Identifica rutas típicamente más usadas: **panel principal (`/`)**, **documentos (`/documentos`)** y **perfil (`/perfil`)**.
2. Aplica **prefetch diferido**: chunks de esas pantallas + peticiones HTTP alineadas con lo que esas pantallas consumen al entrar.
3. Mide **LCP** en el panel y lo **registra** en `audit_logs` (`CLIENT_WEB_VITAL_LCP`) vía `POST /api/v1/client-perf/web-vitals` (JWT + throttling).

No introduce flujos de negocio nuevos.

---

## Antes vs después (impacto esperado)

| Aspecto | **Antes** | **Después** |
|---------|-----------|------------|
| Carga inicial | Code-split por ruta ya activo (`lazyPages.tsx`); primer acceso a `/documentos` o `/perfil` descarga el chunk en el momento del clic. | Tras tener sesión válida, `requestIdleCallback` (fallback `setTimeout`) dispara prefetch de **`DashboardPage`**, **`DocumentosPage`** y **`PerfilUsuarioPage`**, así el navegador suele tener el JS ya en caché al navegar. |
| APIs frecuentes | Sin precalentamiento: al abrir cada pantalla los `GET` arrancan desde cero tras el clic. | En ralentí se precalientan **`/health`**, **`/dashboard/summary`**, **`/auth/profile`**, lista **`/documentos`** con la misma query por defecto que la bandeja (fecha desc, página 1, 20 ítems) y los catálogos que usa **`/documentos`** (`tipos-documentales`, `subseries`, `dependencias`). **ADMIN**: también **`/admin/ping`**. |
| LCP panel | Solo medición manual posible (Lighthouse, pane Performance). | **`web-vitals`** `onLCP` en `DashboardPage` + envío auditado (`valueMs`, `rating`, `navigationType`, `metricId`; sin contenido sensible en `meta`). |
| Riesgo deduplicación | N/A | Las vistas siguen lanzando sus propios `GET`; el servidor puede ejecutar trabajo duplicado a cambio de mejor latencia percibida. Se documenta así a propósito. |
| Auditoría volumen | N/A | Una fila `CLIENT_WEB_VITAL_LCP` por instancia LCP nueva (los reintentos con el mismo `metricId` pueden reducirse en cliente con deduplicación básica). |

### Cómo repetir una medición “antes/después” (metodología)

1. Chrome o Edge, DevTools → **Performance** / **Lighthouse** (solo “Performance”) o campo RUM backend.
2. **Antes**: checkout a `main` (sin prefetch/LCP registrado).
3. **Después**: checkout a la rama de rendimiento (o fusionar PR).
4. Escenario reproducible: mismo usuario, mismo rol, mismo host (`localhost` o LAN), ventana privada nueva; login → esperar ≥3 s ociosos (prefetch idle) → medir segunda navegación a `/documentos` y `/perfil` (Tiempo hasta respuesta/API y ausencia/presencia esperada de trabajo en paralelo previo).
5. LCP posterior: cargar **`/`** después de login; en **ADMIN** revisar Auditoría por acción **`CLIENT_WEB_VITAL_LCP`** (`meta_json` con `valueMs`, `rating`).

---

## Código relacionado

| Capa | Archivo |
|------|---------|
| Prefetch rutas/API | `frontend/src/perf/postLoginPrefetch.ts` |
| Activación tras sesión | `frontend/src/app/PostLoginPerfScheduler.tsx` (+ montaje en `App.tsx`) |
| LCP panel | `frontend/src/perf/useDashboardLcpReporting.ts` (+ `DashboardPage.tsx`) |
| API RUM | `backend/src/client-perf/*` |

---

## Seguridad (ASVS / ISO 27001)

- **AuthN**: `POST /client-perf/web-vitals` exige JWT (mismo patrón que el resto de API autenticada).
- **Throttling**: límite dedicado en el endpoint (por encima del default global) para evitar abuso de escritura en `audit_logs`.
- **Datos**: no se envía DOM ni URL de recursos LCP; solo métricas agregadas y contexto de navegación.
- **Fail secure**: fallo al registrar LCP no afecta la UI (error silenciado en cliente).

---

## PR

Abrir **Pull Request** desde la rama **`perf/post-login-prefetch-web-vitals`** hacia `main` (no mezclar con otras features).
