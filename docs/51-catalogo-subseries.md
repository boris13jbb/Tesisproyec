# Catálogo de Subseries — cómo funciona

**Pantalla:** Subseries  
**Ruta:** `/catalogos/subseries`  
**Menú:** **Catálogos → Subseries** (solo visible con rol **ADMIN**)  
**Migas de pan:** Inicio / Catálogos / Subseries  
**Código:** `frontend/src/pages/catalogos/SubseriesPage.tsx`

---

## 1. Para qué sirve

Las **subseries** son la **subdivisión concreta** bajo una **serie** en el cuadro de clasificación. En el MVP del SGD, **cada expediente se clasifica en una subserie** (no solo en la serie). Es el eslabón obligatorio entre el catálogo archivístico y el registro documental.

| Uso en el sistema | Dónde se aplica |
|-------------------|-----------------|
| **Nuevo documento** | Campo obligatorio de clasificación (desplegable de subserie). |
| **Clasificación** | Nodos hijos bajo cada serie en el árbol; ficha y conteos por subserie. |
| **Listados y búsqueda** | Columnas y filtros serie/subserie en **Documentos**. |
| **Reportes y exportaciones** | Texto de clasificación (ej. `ADM/ADM-CORR — Correspondencia`). |

**Prerrequisito:** debe existir al menos una **serie** activa en **Catálogos → Series** antes de crear subseries.

---

## 2. Quién puede hacer qué

| Acción | Rol / permiso | Dónde |
|--------|---------------|--------|
| Ver menú **Catálogos → Subseries** | **ADMIN** | Menú lateral |
| Abrir `/catalogos/subseries` | **ADMIN** | Ruta protegida en frontend |
| Listar subseries (API) | Usuario **autenticado** | `GET /api/v1/subseries` (formularios, clasificación, filtros) |
| **Nueva subserie** / **Editar** | **ADMIN** + permiso `SUBSERIES_WRITE` | Esta pantalla; `POST` / `PATCH` |

Usuarios sin **ADMIN** no acceden a esta pantalla por URL (redirección o **403**).

---

## 3. Elementos de la pantalla

### 3.1 Encabezado

- **Título:** Subseries  
- **Texto:** catálogo jerárquico bajo series; rol ADMIN; enlaces a **Series** y **Clasificación**.
- El listado usa icono de subserie (no letras «SS»).

### 3.2 Controles superiores

| Control | Función |
|---------|---------|
| **Incluir inactivas** | Desmarcado: solo subseries **activas**. Marcado: también las desactivadas. Recarga la tabla al cambiar. |
| **Serie** (desplegable) | Filtro de listado: **Todas** o una serie concreta (`ADM — Administración`, etc.). Envía `serieId` al API. |
| **Nueva subserie** | Solo **ADMIN**. Abre el diálogo de alta. |

### 3.3 Tabla principal

| Columna | Contenido |
|---------|-----------|
| **Serie** | Serie padre: `CÓDIGO — Nombre` (ej. `ADM — Administración`). |
| **Código** | Código de la subserie, **único** en todo el catálogo (ej. `ADM-CORR`), en chip. Mayúsculas en servidor. |
| **Nombre** | Denominación (ej. *Correspondencia*), con icono de subserie. |
| **Descripción** | Opcional; si no hay valor, **—**. |
| **Estado** | Chip **Activo** / **Inactivo** (baja lógica). |
| **Acciones** | Solo **ADMIN**: **Editar**. |

**Ejemplo seed (desarrollo):**

| Serie | Código | Nombre | Descripción | Activa |
|-------|--------|--------|-------------|--------|
| ADM — Administración | ADM-CORR | Correspondencia | Subserie de ejemplo (seed) | Sí |

En **Clasificación**, el código compuesto mostrado en ficha puede verse como `ADM-ADM-CORR` (serie + subserie); en esta tabla el código de subserie es `ADM-CORR`.

---

## 4. Alta de una subserie (Nueva subserie)

1. Pulse **Nueva subserie**.
2. Complete el formulario:

| Campo | Reglas |
|-------|--------|
| **Serie** | Obligatorio. Elija la serie padre en el desplegable. |
| **Código** | Obligatorio, 2–32 caracteres, **único** globalmente (no solo dentro de la serie). |
| **Nombre** | Obligatorio, 2–200 caracteres. |
| **Descripción** | Opcional, hasta 500 caracteres. |

3. Pulse **Guardar**.

**Resultado esperado**

- La fila aparece en la tabla con la serie indicada.
- La subserie queda disponible en **Nuevo documento** y en el árbol de **Clasificación** (si está activa).

**Errores frecuentes**

- *«Ya existe una subserie con ese código»*: otro registro ya usa ese código.
- *«Serie no encontrada»*: la serie padre no existe; cree series primero.
- Desplegable **Serie** vacío al crear: no hay series; vaya a **Catálogos → Series**.

---

## 5. Edición de una subserie

1. Pulse **Editar** en la fila.
2. En el diálogo **Editar {código}**:

| Campo | Editable |
|-------|----------|
| **Código** | **No** (solo en el título). |
| **Serie** | **Sí** — puede reasignar la subserie a otra serie padre. |
| **Nombre** | Sí |
| **Descripción** | Sí |
| **Activa** | Sí (checkbox) |

3. Pulse **Guardar**.

**Desactivar**

- Desmarque **Activa**: deja de ofrecerse en altas nuevas; los documentos ya clasificados **mantienen** la referencia.

**Mover de serie**

- Al cambiar **Serie** en edición, los expedientes existentes conservan el mismo `subserie_id`; revise impacto archivístico antes de reasignar en producción.

---

## 6. Filtros y relación con Series / Clasificación

```
Series (padre)
    └── Subseries (esta pantalla)
            └── Documento.subserie_id (obligatorio al registrar)
                    └── Clasificación (árbol, ficha, agregados)
```

| Acción del usuario | Efecto |
|--------------------|--------|
| Filtro **Serie = ADM** | Solo subseries cuya `serieId` es Administración. |
| **Incluir inactivas** + **Todas** | Ve subseries inactivas de cualquier serie. |
| Tras crear subserie | Compruebe en **Clasificación** (icono Actualizar) que aparece bajo la serie. |

Guía del cuadro de consulta: [46-cuadro-clasificacion-documental.md](./46-cuadro-clasificacion-documental.md).  
Guía de series padre: [50-catalogo-series.md](./50-catalogo-series.md).

---

## 7. API y seguridad (referencia)

| Método | Ruta | Quién | Notas |
|--------|------|-------|-------|
| `GET` | `/api/v1/subseries` | JWT | Query `incluirInactivos`, `serieId` (opcional) |
| `GET` | `/api/v1/subseries/:id` | JWT | Incluye objeto `serie` anidado |
| `POST` | `/api/v1/subseries` | ADMIN + `SUBSERIES_WRITE` | `serieId`, `codigo`, `nombre`, `descripcion?` |
| `PATCH` | `/api/v1/subseries/:id` | ADMIN + `SUBSERIES_WRITE` | `serieId?`, `nombre?`, `descripcion?`, `activo?` |

Tabla: `subseries` con FK `serie_id` → `series`.

---

## 8. Prueba rápida (ADMIN)

1. Inicie sesión como **ADMIN**.  
2. Confirme que existe la serie **ADM** en **Catálogos → Series**.  
3. Menú → **Catálogos → Subseries**.  
4. Filtro **Serie:** *Todas* — verifique **ADM-CORR** si hay seed.  
5. **Nueva subserie:** serie ADM, código `ADM-ACTAS`, nombre `Actas`, descripción opcional → **Guardar**.  
6. **Nuevo documento:** confirme que la subserie aparece en el desplegable.  
7. **Clasificación:** expanda ADM y seleccione la subserie; revise **Expedientes visibles**.  
8. **Editar:** desactive **Activa** y filtre sin **Incluir inactivas** — no debe listarse.

---

## 9. Fallos frecuentes

| Síntoma | Qué revisar |
|---------|-------------|
| Tabla vacía con filtro de serie | Esa serie no tiene subseries o están inactivas. |
| No puedo crear documento (sin subserie) | Cree subseries activas bajo una serie. |
| Código duplicado | El código es único en **todo** el catálogo, no por serie. |
| *«No se pudieron cargar las subseries»* | Backend, sesión o red. |
| Árbol de clasificación sin hijos | Faltan subseries activas bajo las series. |

---

## 10. Documentos relacionados

| Documento | Contenido |
|-----------|-----------|
| [11-modulo-series-subseries.md](./11-modulo-series-subseries.md) | Ficha técnica |
| [50-catalogo-series.md](./50-catalogo-series.md) | Catálogo de series (padre) |
| [46-cuadro-clasificacion-documental.md](./46-cuadro-clasificacion-documental.md) | Consulta del cuadro |
| [27-manual-usuario-sgd-gadpr-lm.md](./27-manual-usuario-sgd-gadpr-lm.md) | § 6.4 — manual general |
| [44-guia-secciones-menu-navegacion.md](./44-guia-secciones-menu-navegacion.md) | § 4.5 — Subseries en el menú |

---

**Última actualización:** 2026-05-26 — revisado frente a `SubseriesPage.tsx` y `SubseriesController` / `SubseriesService`.
