# Catálogo de Tipos documentales — cómo funciona

**Pantalla:** Tipos documentales  
**Ruta:** `/catalogos/tipos-documentales`  
**Menú:** **Catálogos → Tipos documentales** (solo visible con rol **ADMIN**)  
**Migas de pan:** Inicio / Catálogos / Tipos documentales  
**Código:** `frontend/src/pages/catalogos/TiposDocumentalesPage.tsx`

---

## 1. Para qué sirve

Los **tipos documentales** definen la **tipología** del expediente: memorando, oficio, informe, acta, etc. Es un catálogo maestro que el sistema usa al **registrar** y **clasificar** documentos en metadatos.

| Uso en el sistema | Dónde se aplica |
|-------------------|-----------------|
| **Alta de documento** | Campo obligatorio en **Nuevo documento** (desplegable de tipo). |
| **Bandeja y detalle** | Columnas, filtros y ficha del expediente muestran el tipo. |
| **Búsqueda** | El texto libre puede coincidir con código o nombre del tipo. |
| **Reportes** | Exportaciones y gráficos «documentos por tipo» (ADMIN / reportes institucionales). |

Sin tipos activos, el formulario de registro documental puede quedar sin opciones válidas.

---

## 2. Quién puede hacer qué

| Acción | Rol / permiso | Dónde |
|--------|---------------|--------|
| Ver menú **Catálogos → Tipos documentales** | **ADMIN** | Menú lateral |
| Abrir `/catalogos/tipos-documentales` | **ADMIN** | Ruta protegida en frontend |
| Listar tipos (API) | Usuario **autenticado** | `GET /api/v1/tipos-documentales` (formularios y filtros en otras pantallas) |
| **Nuevo tipo** / **Editar** | **ADMIN** + permiso `TIPOS_DOCUMENTALES_WRITE` | Esta pantalla; `POST` / `PATCH` |

Usuarios sin **ADMIN** no acceden a esta pantalla por URL (redirección o **403**).

---

## 3. Elementos de la pantalla

### 3.1 Encabezado

- **Título:** Tipos documentales  
- **Texto:** *«Catálogo de tipologías documentales. Alta y edición requieren rol **ADMIN**.»*

### 3.2 Controles superiores

| Control | Función |
|---------|---------|
| **Incluir inactivos** | Desmarcado: solo tipos **activos**. Marcado: también los desactivados. Al cambiar, la tabla se recarga. |
| **Nuevo tipo** | Solo **ADMIN**. Abre el diálogo de alta. |

### 3.3 Tabla principal

| Columna | Contenido |
|---------|-----------|
| **Código** | Identificador corto y **único** (ej. `MEMO`, `OFICIO`). Se guarda en **mayúsculas** en el servidor. |
| **Nombre** | Denominación legible (ej. *Memorando*, *Oficio*). |
| **Descripción** | Texto opcional; si no hay valor, **—** (en móvil la columna puede ocultarse). |
| **Activo** | **Sí** / **No** (baja lógica). |
| **Acciones** | Solo **ADMIN**: **Editar** por fila. |

**Datos de ejemplo (seed de desarrollo):**

| Código | Nombre | Descripción | Activo |
|--------|--------|-------------|--------|
| MEMO | Memorando | Tipo documental de ejemplo (seed) | Sí |
| OFICIO | Oficio | Tipo documental de ejemplo (seed) | Sí |

---

## 4. Alta de un tipo (Nuevo tipo)

1. Pulse **Nuevo tipo**.
2. Complete el formulario del diálogo **Nuevo tipo documental**:

| Campo | Reglas |
|-------|--------|
| **Código** | Obligatorio, 2–32 caracteres, **único** en todo el catálogo. |
| **Nombre** | Obligatorio, 2–200 caracteres. |
| **Descripción** | Opcional, hasta 500 caracteres. |

3. Pulse **Guardar**.

**Resultado esperado**

- El diálogo se cierra y la nueva fila aparece en la tabla (si está activa y no filtra solo inactivos).
- El código queda en mayúsculas (ej. escribir `memo` → `MEMO`).

**Errores frecuentes**

- *«Ya existe un tipo documental con ese código»*: el código ya está registrado.
- Validación en rojo bajo el campo: longitud mínima/máxima no cumplida.

---

## 5. Edición de un tipo

1. Pulse **Editar** en la fila deseada.
2. En el diálogo **Editar {código}**:

| Campo | Editable |
|-------|----------|
| **Código** | **No** (solo en el título del diálogo). |
| **Nombre** | Sí |
| **Descripción** | Sí (vacío = sin descripción en BD) |
| **Activo** | Sí (checkbox) |

3. Pulse **Guardar**.

**Desactivar un tipo**

- Desmarque **Activo** y guarde. El tipo deja de aparecer en desplegables que solo cargan activos (**Nuevo documento**, filtros por defecto).
- Los **documentos ya registrados** con ese tipo **conservan** la referencia; no se borran expedientes.

---

## 6. Relación con el registro documental

```
Tipos documentales (catálogo)
        ↓
  Nuevo documento / Detalle  →  tipo_documental_id (obligatorio al crear)
        ↓
  Documentos (filtros, listado, exportaciones)
        ↓
  Reportes (agrupación por tipo)
```

**Orden recomendado en catálogos (junto con el resto):**

1. Dependencias y Cargos (organización).  
2. **Tipos documentales** (esta pantalla).  
3. Series y Subseries (clasificación archivística).  
4. Luego registrar usuarios y documentos.

Cada expediente enlaza **un** tipo documental; los códigos cortos (`MEMO`, `OFICIO`) facilitan lectura en tablas y archivos exportados.

---

## 7. API y seguridad (referencia)

| Método | Ruta | Quién | Notas |
|--------|------|-------|-------|
| `GET` | `/api/v1/tipos-documentales` | JWT | Query `incluirInactivos=true` \| `false` |
| `GET` | `/api/v1/tipos-documentales/:id` | JWT | Detalle por UUID |
| `POST` | `/api/v1/tipos-documentales` | ADMIN + `TIPOS_DOCUMENTALES_WRITE` | `codigo`, `nombre`, `descripcion?` |
| `PATCH` | `/api/v1/tipos-documentales/:id` | ADMIN + `TIPOS_DOCUMENTALES_WRITE` | `nombre?`, `descripcion?`, `activo?` |

Tabla en base de datos: `tipos_documentales` (ver `docs/04-modelo-base-de-datos.md`).

---

## 8. Prueba rápida (ADMIN)

1. Inicie sesión como **ADMIN**.  
2. Menú → **Catálogos → Tipos documentales**.  
3. Verifique **MEMO** y **OFICIO** si ejecutó `npx prisma db seed`.  
4. **Nuevo tipo:** código `INFORME`, nombre `Informe técnico`, descripción opcional → **Guardar**.  
5. Menú → **Nuevo documento** y confirme que el tipo aparece en el desplegable.  
6. **Editar** el tipo creado: desactive **Activo** y guarde; en **Nuevo documento** no debería listarse (salvo que otra pantalla incluya inactivos).  
7. Marque **Incluir inactivos** en esta pantalla para verlo de nuevo con **Activo = No**.

---

## 9. Fallos frecuentes

| Síntoma | Qué revisar |
|---------|-------------|
| No veo menú **Catálogos** | Usuario sin rol **ADMIN**. |
| *«No se pudieron cargar los tipos documentales»* | Backend, sesión o red. |
| Desplegable vacío al crear documento | No hay tipos **activos**; créelos aquí o reactive uno. |
| No aparece **Nuevo tipo** | Sesión no es ADMIN. |
| Código duplicado al crear | Use otro código único. |

---

## 10. Documentos relacionados

| Documento | Contenido |
|-----------|-----------|
| [10-modulo-tipos-documentales.md](./10-modulo-tipos-documentales.md) | Ficha técnica del módulo |
| [27-manual-usuario-sgd-gadpr-lm.md](./27-manual-usuario-sgd-gadpr-lm.md) | § 6.3 — manual general |
| [44-guia-secciones-menu-navegacion.md](./44-guia-secciones-menu-navegacion.md) | § 4.3 — Tipos documentales en el mapa del menú |
| [12-modulo-documentos.md](./12-modulo-documentos.md) | Uso del tipo en expedientes |

---

**Última actualización:** 2026-05-26 — revisado frente a `TiposDocumentalesPage.tsx` y `TiposDocumentalesController` / `TiposDocumentalesService`.
