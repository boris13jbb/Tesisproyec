> **Retirado el 2026-08-30.** La ruta `/clasificacion` y el cuadro Serie → Subserie ya no existen en el sistema vigente. La clasificación operativa es **Tipo documental** + **Dependencia**.

# Cuadro de clasificación documental — cómo funciona

**Pantalla:** Cuadro de clasificación documental  
**Ruta en la aplicación:** `/clasificacion`  
**Menú:** **Clasificación** (bloque *Menú*, visible para cualquier usuario autenticado)  
**Código:** `frontend/src/pages/clasificacion/ClasificacionDocumentalPage.tsx`

---

## 1. Para qué sirve

Esta sección es una **vista de consulta archivística** (alineada a ISO 15489): permite ver la **estructura institucional** de la documentación (serie → subserie) y, al mismo tiempo, **cuántos expedientes reales** existen bajo cada rama, con indicadores derivados de los documentos que **usted puede ver** según su rol y permisos.

**No sirve para:**

- Crear o editar series/subseries (eso es en **Catálogos**, solo **ADMIN**).
- Registrar documentos nuevos (eso es **Nuevo documento**).
- Cambiar estados del flujo (eso es en el **detalle del expediente** o **Trámites**).

**Sí sirve para:**

- Entender el **árbol de clasificación** activo del GADPR-LM.
- Ver **conteos y tendencias** (dependencia predominante, nivel de confidencialidad más frecuente) por serie o subserie.
- Revisar un **borrador de tabla de retención** por serie (con plazos/destino pendientes de modelar en BD).

---

## 2. Cómo llegar y actualizar datos

### 2.1 Acceso

1. Inicie sesión en el SGD.
2. En el menú lateral, pulse **Clasificación**.
3. La ruta directa es: `http://localhost:5173/clasificacion` (ajuste el puerto si su Vite usa otro).

### 2.2 Botón Actualizar

Junto al título hay un icono de **recarga** (*Actualizar clasificación documental*). Al pulsarlo, el sistema vuelve a pedir al servidor:

| Origen | Qué trae |
|--------|----------|
| `GET /api/v1/series?incluirInactivos=false` | Series **activas** del catálogo |
| `GET /api/v1/subseries?incluirInactivos=false` | Subseries **activas** del catálogo |
| `GET /api/v1/documentos/clasificacion-agregados` | Conteos y métricas por serie/subserie (solo expedientes visibles para usted) |

Al entrar por primera vez a la pantalla ocurre la misma carga automática.

---

## 3. Las tres zonas de la pantalla

La interfaz se divide en **tres bloques** (como en la captura de referencia):

```
┌─────────────────────────┬──────────────────────────────────┐
│  C — Estructura         │  D — Ficha de clasificación      │
│     documental          │     (nodo seleccionado)          │
│     (árbol)             ├──────────────────────────────────┤
│                         │  R — Tabla de retención          │
│                         │     (una fila por serie)         │
└─────────────────────────┴──────────────────────────────────┘
```

### 3.1 C — Estructura documental (panel izquierdo)

**Qué muestra**

- Nodo raíz fijo: **Fondo documental GADPR-LM** (puede contraerse/expandirse).
- Debajo, cada **serie** activa (icono de carpeta + nombre + código entre paréntesis, p. ej. `Administración (ADM)`).
- Al expandir una serie, sus **subseries** (icono de tema + nombre + código, p. ej. `Correspondencia (ADM-CORR)`).

**Qué puede hacer el usuario**

| Acción | Efecto |
|--------|--------|
| Clic en **flecha** de una serie | Mostrar u ocultar sus subseries |
| Clic en el **nombre de una serie** | Selecciona la serie → actualiza la **Ficha** y resalta la fila en la **Tabla de retención** |
| Clic en una **subserie** | Selecciona la subserie → la ficha muestra datos de esa subserie |
| Clic en flecha del **fondo** | Contrae o expande todo el bloque de series |

**Origen de los datos:** catálogo institucional (tablas `series` / `subseries`), **solo registros activos**. Es el mismo catálogo que mantiene un ADMIN en **Catálogos → Series / Subseries**.

**Nota al pie del panel**

- Texto: *«Catálogo de solo lectura»*.
- Si su rol es **ADMIN**, aparecen enlaces a **Series** y **Subseries** para dar de alta o editar nodos.
- Otros roles ven que solo un ADMIN puede actualizar el catálogo desde administración.

---

### 3.2 D — Ficha de clasificación (panel superior derecho)

Aparece cuando hay un nodo seleccionado en el árbol (serie o subserie). Los campos combinan **datos del catálogo** y **métricas calculadas** a partir de expedientes.

| Campo en pantalla | Origen | Significado |
|-------------------|--------|-------------|
| **Código** | Catálogo + regla de presentación | Para subserie: `CODIGO_SERIE-CODIGO_SUBSERIE` (ej. `ADM-ADM-CORR`). Para serie: solo código de serie. |
| **Nombre** | Catálogo | Nombre de la serie o subserie seleccionada. |
| **Expedientes visibles** | Calculado (API agregados) | Cantidad de documentos **activos** (`activo = true`) clasificados bajo esa serie o subserie que usted **puede ver** con las mismas reglas que en **Documentos**. |
| **Área responsable (predominante en expedientes)** | Calculado | Entre los expedientes visibles, la **dependencia** que más se repite. Si no hay expedientes: mensaje *«Sin expedientes que coincidan con su visibilidad…»*. |
| **Nivel de acceso predominante** | Calculado | Entre los expedientes visibles, el **nivel de confidencialidad** más frecuente (etiqueta legible: Interno, Reservado, etc.). |
| **Conservación (plazo / destino)** | Informativo (sin BD) | Indica que **plazos y disposición final no están registrados** en el catálogo del sistema; no se inventan años ni destinos. |
| **Descripción (catálogo)** | Catálogo | Solo si la serie/subserie tiene descripción en catálogo (ej. texto de seed *«Subserie de ejemplo»*). |

**Ejemplo interpretando la captura**

- Selección: subserie **Correspondencia** bajo **Administración**.
- **Expedientes visibles: 5** → hay cinco expedientes activos visibles para su usuario bajo esa subserie.
- **Área responsable:** *Sistema de Gestión Documental* → entre esos cinco, esa dependencia es la más frecuente.
- **Nivel de acceso predominante:** *Interno* → es el nivel de confidencialidad más repetido.
- **Conservación:** texto de pendiente → aún no hay campos de retención/disposición en base de datos.

**Al seleccionar una serie (no subserie)**

- El conteo de expedientes **suma** todos los documentos visibles cuyas subseries pertenecen a esa serie (agregación en servidor).
- La ficha usa métricas de nivel **serie**, no de una subserie concreta.

---

### 3.3 R — Tabla de retención (panel inferior derecho)

**Qué muestra**

- Una **fila por cada serie activa** del catálogo (no una fila por subserie).
- Columnas:

| Columna | Contenido |
|---------|-----------|
| **Serie** | Nombre y código (ej. Administración / ADM). |
| **Expedientes visibles** | Total de expedientes activos visibles para usted bajo **todas** las subseries de esa serie. |
| **Retención** | Hoy: *«Sin registrar en el sistema»* — no hay campo de plazo en BD. |
| **Destino final** | Hoy: *«—»* — no hay campo de disposición final en BD. |

**Resaltado:** la fila de la serie del nodo actualmente seleccionado en el árbol se marca con fondo suave (aunque haya seleccionado una subserie, se resalta la serie padre).

**Propósito:** ofrecer una vista tabular tipo **tabla de retención documental** a nivel de serie, honesta sobre lo que el sistema **aún no modela** (plazos y destino), sin mostrar cifras ficticias.

---

## 4. Flujo de uso recomendado (paso a paso)

1. Abra **Clasificación** y espere a que termine la carga (spinner central si tarda).
2. En el árbol, expanda la serie de interés (ej. **Administración**).
3. Pulse una **subserie** (ej. **Correspondencia**) y lea la **Ficha de clasificación**.
4. Compare el número de **Expedientes visibles** con lo que ve en **Documentos** filtrando por esa clasificación (debe ser coherente con su rol).
5. Revise la **Tabla de retención** para un panorama por todas las series.
6. Si acaba de registrar documentos o cambiar catálogo, pulse **Actualizar** (icono de recarga).

---

## 5. Roles y permisos

| Rol | Clasificación |
|-----|----------------|
| Cualquier usuario autenticado | Puede **consultar** árbol, ficha y tabla. Los conteos respetan **visibilidad** (no ve expedientes ajenos si su rol no lo permite). |
| **ADMIN** | Igual consulta + enlaces en el pie del árbol a **Catálogos → Series / Subseries** para mantenimiento. |
| **ADMIN** en Catálogos | Alta/edición/baja lógica de series y subseries; los cambios se reflejan aquí tras **Actualizar**. |

No hay botones de borrar, mover expedientes ni editar códigos en esta pantalla.

---

## 6. Diferencia con «Catálogos → Series / Subseries»

| Aspecto | Clasificación (`/clasificacion`) | Catálogos (`/catalogos/series`, `/catalogos/subseries`) |
|---------|----------------------------------|--------------------------------------------------------|
| Objetivo | Consultar estructura + **uso real** (expedientes) | **Definir** la estructura institucional |
| Datos de expedientes | Sí (conteos, predominantes) | No |
| Edición | No (solo lectura) | Sí (**ADMIN**) |
| Quién la usa | Todos | Principalmente **ADMIN** |

Al **registrar un documento** (**Nuevo documento**), debe elegir una **subserie**; esa elección es la que luego alimenta los agregados de esta pantalla.

---

## 7. Comportamiento técnico (referencia breve)

- **Visibilidad:** el endpoint `clasificacion-agregados` aplica `documentoVisibilityWhere(viewer)` — la misma lógica que el listado de documentos. Un **REVISOR** o **ADMIN** puede ver más expedientes que un usuario con alcance restringido; por eso dos personas pueden ver cifras distintas en la misma subserie.
- **Solo expedientes activos:** no cuenta borrados lógicos (`activo: false`).
- **Predominante:** dependencia y confidencialidad se eligen por **mayoría** entre expedientes visibles en ese nodo (desempate estable por orden de código).
- **Retención/destino:** la UI muestra marcadores fijos hasta que el proyecto modele esos campos en catálogo o políticas; ver `docs/28-listado-lo-que-deberia-tener-el-sistema.md` para brechas.

Documentación relacionada del módulo catálogo: `docs/11-modulo-series-subseries.md`, `docs/12-modulo-documentos.md`.

---

## 8. Resultados esperados y fallos frecuentes

### Resultado esperado

- Árbol con al menos una serie activa y, normalmente, subseries debajo.
- Al seleccionar un nodo, la ficha muestra código/nombre del catálogo y cifras coherentes con **Documentos**.
- La tabla de retención lista todas las series activas con conteos ≥ 0.

### Si algo falla

| Síntoma | Qué revisar |
|---------|-------------|
| *«Sin series en catálogo»* | No hay series activas. Un **ADMIN** debe crearlas en **Catálogos**. |
| *«No se pudo cargar la clasificación documental»* | Backend apagado, sesión caducada o error de red; consola del navegador y `GET /api/v1/health`. |
| **Expedientes visibles = 0** en una subserie con documentos en listado | Normal si esos documentos **no son visibles** para su rol; o si están inactivos; o si la subserie del expediente no coincide. |
| Cifras desactualizadas | Pulse **Actualizar** tras altas en catálogo o nuevos registros documentales. |
| Retención siempre *«Sin registrar»* | Comportamiento actual: no es error; faltan datos de política en BD. |

---

## 9. Prueba rápida (manual)

1. Inicie sesión como **ADMIN** (`admin@local.test` en desarrollo, si aplica seed).
2. Vaya a **Clasificación**.
3. Seleccione **Administración → Correspondencia** (o la subserie que tenga expedientes en su entorno).
4. Verifique que **Expedientes visibles** sea un número ≥ 0 y que la fila **Administración** en la tabla muestre un total coherente (suma de subseries visibles bajo esa serie).
5. Pulse **Actualizar** y confirme que los números no cambian salvo que haya modificado documentos en otra pestaña.

---

## 10. Documentos relacionados

| Documento | Contenido |
|-----------|-----------|
| [27-manual-usuario-sgd-gadpr-lm.md](./27-manual-usuario-sgd-gadpr-lm.md) | § 7.2.2 — pasos de usuario en el manual general |
| [44-guia-secciones-menu-navegacion.md](./44-guia-secciones-menu-navegacion.md) | § 2.4 — Clasificación en el mapa del menú |
| [11-modulo-series-subseries.md](./11-modulo-series-subseries.md) | Mantenimiento del catálogo |
| [12-modulo-documentos.md](./12-modulo-documentos.md) | Registro y visibilidad de expedientes |

---

**Última actualización:** 2026-05-26 — revisado frente a `ClasificacionDocumentalPage.tsx` y `getClasificacionAgregados` en backend.
