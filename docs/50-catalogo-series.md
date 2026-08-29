# Catálogo de Series — cómo funciona

**Pantalla:** Series  
**Ruta:** `/catalogos/series`  
**Menú:** **Catálogos → Series** (solo visible con rol **ADMIN**)  
**Migas de pan:** Inicio / Catálogos / Series  
**Código:** `frontend/src/pages/catalogos/SeriesPage.tsx`

---

## 1. Para qué sirve

Las **series** son el **nivel superior** del cuadro de clasificación archivística (ISO 15489): agrupan documentos por función o área institucional (administración, secretaría, etc.). Cada serie puede tener **subseries** hijas; el expediente, en el MVP, se clasifica en una **subserie**, pero la serie define la rama del árbol.

**Decisión 2026-08-29:** la serie **no se infiere automáticamente** desde usuario, dependencia ni contraparte (no hay regla institucional inequívoca). La selección sigue siendo **Serie → Subserie**; si el catálogo tiene una sola serie o una sola subserie aplicable, el formulario puede preseleccionarla. Estado: **aceptado funcionalmente**.

| Uso en el sistema | Dónde se aplica |
|-------------------|-----------------|
| **Cuadro de clasificación** | Árbol izquierdo en **Clasificación** (`/clasificacion`) — nodos de primer nivel bajo el fondo. |
| **Tabla de retención** | Una fila por serie activa en la pantalla de clasificación. |
| **Alta documental** | Contexto indirecto: el usuario elige **subserie**, que pertenece a una serie. |
| **Búsqueda y listados** | Columnas y filtros muestran serie/subserie del expediente. |

Sin series activas, el árbol de clasificación y el mantenimiento de subseries quedan incompletos.

---

## 2. Quién puede hacer qué

| Acción | Rol / permiso | Dónde |
|--------|---------------|--------|
| Ver menú **Catálogos → Series** | **ADMIN** | Menú lateral |
| Abrir `/catalogos/series` | **ADMIN** | Ruta protegida en frontend |
| Listar series (API) | Usuario **autenticado** | `GET /api/v1/series` (Clasificación, subseries, formularios) |
| **Nueva serie** / **Editar** | **ADMIN** + permiso `SERIES_WRITE` | Esta pantalla; `POST` / `PATCH` |

Usuarios sin **ADMIN** no acceden a esta pantalla por URL (redirección o **403**).

---

## 3. Elementos de la pantalla

### 3.1 Encabezado

- **Título:** Series  
- **Texto:** catálogo del cuadro de clasificación; rol ADMIN; enlaces a **Subseries** y **Clasificación**.
- El listado usa el mismo panel que Documentos (icono de carpeta, no letra «S»).

### 3.2 Controles superiores

| Control | Función |
|---------|---------|
| **Incluir inactivas** | Desmarcado: solo series **activas**. Marcado: también las desactivadas. Al cambiar, la tabla se recarga. |
| **Nueva serie** | Solo **ADMIN**. Abre el diálogo de alta. |

### 3.3 Tabla principal

| Columna | Contenido |
|---------|-----------|
| **Código** | Identificador corto y **único** (ej. `ADM`, `SEC`), en chip. Se guarda en **mayúsculas** en el servidor. |
| **Nombre** | Denominación de la serie (ej. *Administración*, *Secretaría*), con icono de carpeta. |
| **Descripción** | Texto opcional; puede ser largo (política archivística de la serie). Si no hay valor, **—**. |
| **Estado** | Chip **Activo** / **Inactivo** (baja lógica). |
| **Acciones** | Solo **ADMIN**: **Editar** por fila. |

**Ejemplos típicos (seed o entorno de prueba):**

| Código | Nombre | Descripción (ejemplo) | Activa |
|--------|--------|------------------------|--------|
| ADM | Administración | Serie de ejemplo (seed) | Sí |
| SEC | Secretaría | Agrupa documentos de comunicación oficial y gestión administrativa… | Sí |

> Tras el seed mínimo suele existir al menos **ADM**; **SEC** u otras series se crean desde **Nueva serie** según la política del GADPR-LM.

---

## 4. Alta de una serie (Nueva serie)

1. Pulse **Nueva serie**.
2. Complete el formulario del diálogo:

| Campo | Reglas |
|-------|--------|
| **Código** | Obligatorio, 2–32 caracteres, **único** en todo el catálogo. |
| **Nombre** | Obligatorio, 2–200 caracteres. |
| **Descripción** | Opcional, hasta 500 caracteres (recomendable para documentar el alcance archivístico). |

3. Pulse **Guardar**.

**Resultado esperado**

- La serie aparece en la tabla y, si está activa, en el árbol de **Clasificación** (tras recargar esa pantalla).
- El código queda en mayúsculas (ej. `adm` → `ADM`).

**Siguiente paso habitual:** crear **subseries** bajo esa serie en **Catálogos → Subseries**.

**Errores frecuentes**

- *«Ya existe una serie con ese código»*: use otro código.
- Validación de longitud en campos obligatorios.

---

## 5. Edición de una serie

1. Pulse **Editar** en la fila deseada.
2. En el diálogo **Editar {código}**:

| Campo | Editable |
|-------|----------|
| **Código** | **No** (solo en el título del diálogo). |
| **Nombre** | Sí |
| **Descripción** | Sí |
| **Activa** | Sí (checkbox) |

3. Pulse **Guardar**.

**Desactivar una serie**

- Desmarque **Activa** y guarde. La serie deja de listarse en consultas que solo piden activas (árbol de clasificación con catálogo activo, etc.).
- Las **subseries** y **documentos** ya vinculados **no se borran**; revise si conviene desactivar también subseries hijas.

---

## 6. Relación con Subseries y Clasificación

```
Series (esta pantalla — nivel superior)
    └── Subseries (Catálogos → Subseries — obligatorio en cada documento)
            └── Documentos (subserie_id)
                    └── Clasificación (árbol + métricas)
```

| Pantalla | Rol de la serie |
|----------|-----------------|
| **Clasificación** | Nodo expandible bajo *Fondo documental GADPR-LM*; al seleccionar serie (sin subserie) la ficha agrega expedientes de todas sus subseries. |
| **Subseries** | Cada subserie debe elegir una **serie padre** al crearse. |
| **Nuevo documento** | El usuario elige subserie; la serie se infiere de esa subserie. |

**Orden recomendado:** cree primero las **series**, luego las **subseries**, después registre documentos.

---

## 7. Diferencia con «Clasificación»

| Series (catálogo) | Clasificación (`/clasificacion`) |
|-------------------|----------------------------------|
| **Editar** estructura (ADMIN) | **Consultar** estructura + conteos de expedientes |
| Define códigos y nombres institucionales | Muestra árbol de solo lectura y ficha con métricas |
| Tabla CRUD | Árbol + ficha + tabla de retención |

En **Clasificación**, un ADMIN ve enlaces a **Series** y **Subseries** para mantenimiento; el resto de roles solo consulta.

---

## 8. API y seguridad (referencia)

| Método | Ruta | Quién | Notas |
|--------|------|-------|-------|
| `GET` | `/api/v1/series` | JWT | Query `incluirInactivos` |
| `GET` | `/api/v1/series/:id` | JWT | Detalle |
| `POST` | `/api/v1/series` | ADMIN + `SERIES_WRITE` | `codigo`, `nombre`, `descripcion?` |
| `PATCH` | `/api/v1/series/:id` | ADMIN + `SERIES_WRITE` | `nombre?`, `descripcion?`, `activo?` |

Tabla: `series` (ver `docs/04-modelo-base-de-datos.md`, `docs/11-modulo-series-subseries.md`).

---

## 9. Prueba rápida (ADMIN)

1. Inicie sesión como **ADMIN**.  
2. Menú → **Catálogos → Series**.  
3. Verifique **ADM** (y otras filas) según su seed o datos.  
4. **Nueva serie:** código `FIN`, nombre `Finanzas`, descripción breve → **Guardar**.  
5. Menú → **Catálogos → Subseries** → cree una subserie vinculada a `FIN`.  
6. Menú → **Clasificación** → pulse **Actualizar** y confirme que la serie aparece en el árbol.  
7. **Editar** una serie de prueba: desactive **Activa** y use **Incluir inactivas** para verificar el estado.

---

## 10. Fallos frecuentes

| Síntoma | Qué revisar |
|---------|-------------|
| No veo menú **Catálogos** | Usuario sin rol **ADMIN**. |
| *«No se pudieron cargar las series»* | Backend, sesión o red. |
| Árbol de clasificación vacío | No hay series/subseries **activas**. |
| No puedo registrar documentos | Faltan **subseries** bajo las series, no solo series. |
| Código duplicado | Elija otro código único. |

---

## 11. Documentos relacionados

| Documento | Contenido |
|-----------|-----------|
| [11-modulo-series-subseries.md](./11-modulo-series-subseries.md) | Ficha técnica serie + subserie |
| [46-cuadro-clasificacion-documental.md](./46-cuadro-clasificacion-documental.md) | Consulta del cuadro (árbol) |
| [27-manual-usuario-sgd-gadpr-lm.md](./27-manual-usuario-sgd-gadpr-lm.md) | § 6.4 — manual general |
| [44-guia-secciones-menu-navegacion.md](./44-guia-secciones-menu-navegacion.md) | § 4.4 — Series en el mapa del menú |

---

**Última actualización:** 2026-05-26 — revisado frente a `SeriesPage.tsx` y `SeriesController` / `SeriesService`.
