# Catálogo de Cargos — cómo funciona

**Pantalla:** Cargos  
**Ruta:** `/catalogos/cargos`  
**Menú:** **Catálogos → Cargos** (solo visible con rol **ADMIN**)  
**Migas de pan:** Inicio / Catálogos / Cargos  
**Código:** `frontend/src/pages/catalogos/CargosPage.tsx`

---

## 1. Para qué sirve

Los **cargos** son los **puestos o funciones** del personal (director/a, asistente, técnico, etc.). Es un catálogo maestro que **complementa** a las dependencias: un cargo puede existir **sin** dependencia fija o **vinculado** a una unidad organizativa.

| Uso en el sistema | Dónde se aplica |
|-------------------|-----------------|
| **Perfil del usuario** | En **Usuarios y roles**, al crear o editar una cuenta se puede asignar un cargo. |
| **Contexto institucional** | Reportes y directorio cuando el sistema muestra el puesto del servidor. |
| **Organización** | La columna **Dependencia** en la tabla indica a qué unidad pertenece el cargo (si se definió). |

**Recomendación:** cree primero **Dependencias** y después **Cargos**, para poder elegir dependencia en el desplegable.

---

## 2. Quién puede hacer qué

| Acción | Rol / permiso | Dónde |
|--------|---------------|--------|
| Ver menú **Catálogos → Cargos** | **ADMIN** | Menú lateral |
| Abrir `/catalogos/cargos` | **ADMIN** | Ruta protegida en frontend |
| Listar cargos (API) | Usuario **autenticado** | `GET /api/v1/cargos` (otras pantallas pueden consumir el listado) |
| **Nuevo cargo** / **Editar** | **ADMIN** (PATCH además exige `CARGOS_WRITE` en API) | Esta pantalla; `POST` / `PATCH` |

Usuarios sin rol **ADMIN** no deben acceder a esta pantalla por URL (redirección o **403**).

---

## 3. Elementos de la pantalla

### 3.1 Encabezado

- **Título:** Cargos  
- **Texto:** puestos opcionales a una dependencia; rol ADMIN; enlace a **Dependencias**.
- El listado usa icono de cargo (mismo del menú), no letra «C».

### 3.2 Controles superiores

| Control | Función |
|---------|---------|
| **Incluir inactivos** | Desmarcado: solo cargos **activos**. Marcado: también los desactivados (`activo = false`). Al cambiar, la tabla se recarga. |
| **Nuevo cargo** | Solo **ADMIN**. Abre el diálogo de alta. |

### 3.3 Tabla principal

| Columna | Contenido |
|---------|-----------|
| **Código** | Identificador corto y **único** (ej. `ASIST`, `DIR-GEN`), en chip. Se guarda en **mayúsculas** en el servidor. |
| **Nombre** | Denominación del puesto (ej. *Asistente administrativo (ejemplo)*), con icono. |
| **Dependencia** | Si el cargo tiene dependencia asociada: `CÓDIGO — Nombre` (ej. `GADPR-LM — Gobierno Autónomo…`). Si no: **—**. En pantallas estrechas la columna puede ocultarse. |
| **Descripción** | Texto opcional; si no hay valor, **—**. |
| **Estado** | Chip **Activo** / **Inactivo** (baja lógica). |
| **Acciones** | Solo **ADMIN**: **Editar** por fila. |

**Datos de ejemplo (seed de desarrollo):**

| Código | Nombre | Dependencia | Descripción | Activo |
|--------|--------|-------------|-------------|--------|
| ASIST | Asistente administrativo (ejemplo) | — | Cargo sin dependencia fija (ejemplo) | Sí |
| DIR-GEN | Director/a general (ejemplo) | GADPR-LM — Gobierno Autónomo Descentralizado Provincial de Los Ríos | Cargo de seed | Sí |

---

## 4. Alta de un cargo (Nuevo cargo)

1. Pulse **Nuevo cargo**.
2. Complete el formulario:

| Campo | Reglas |
|-------|--------|
| **Código** | Obligatorio, 2–32 caracteres, **único** en todo el catálogo. |
| **Nombre** | Obligatorio, 2–200 caracteres. |
| **Dependencia (opcional)** | Desplegable con dependencias cargadas desde `GET /dependencias`. Opción *Sin asignar* = cargo sin dependencia fija. |
| **Descripción** | Opcional, hasta 500 caracteres. |

3. Pulse **Guardar**.

**Resultado esperado**

- El diálogo se cierra y la fila aparece en la tabla.
- El código queda en mayúsculas en base de datos.
- Si eligió dependencia, la columna **Dependencia** muestra código y nombre.

**Errores frecuentes**

- *«Ya existe un cargo con ese código»*: use otro código.
- *«Dependencia no encontrada»*: la dependencia fue borrada o el ID no es válido; recargue la página o cree la dependencia en **Catálogos → Dependencias**.

---

## 5. Edición de un cargo

1. Pulse **Editar** en la fila deseada.
2. En el diálogo **Editar {código}**:

| Campo | Editable |
|-------|----------|
| **Código** | **No** (aparece en el título del diálogo). |
| **Nombre** | Sí |
| **Dependencia (opcional)** | Sí (*Sin asignar* quita la vinculación) |
| **Descripción** | Sí |
| **Activo** | Sí (checkbox) |

3. Pulse **Guardar**.

**Desactivar un cargo**

- Desmarque **Activo** y guarde. Deja de listarse en consultas que solo piden activos (asignación de usuarios, etc.).
- Usuarios que ya tenían ese cargo **conservan** la referencia histórica.

---

## 6. Relación con Dependencias y usuarios

```
Dependencias (opcional)
        ↓
    Cargos ←── Usuarios y roles (campo cargo del usuario)
```

| Escenario | Comportamiento |
|-----------|----------------|
| Cargo **con** dependencia | Refuerza el contexto organizativo (ej. director en GADPR-LM). |
| Cargo **sin** dependencia | Válido para puestos transversales o plantillas genéricas (ej. ASIST en seed). |
| Dependencia inactiva en catálogo | El desplegable al crear cargo lista lo que devuelve `GET /dependencias` (por defecto solo activas si el endpoint filtra así en otras pantallas; en esta página se cargan todas las devueltas por la API sin `incluirInactivos` en el efecto inicial — actually CargosPage loads `/dependencias` without params, so only active deps). |

> La pantalla de cargos carga dependencias con `GET /dependencias` **sin** `incluirInactivos`, por lo que el desplegable muestra **dependencias activas** para asociar al cargo.

---

## 7. API y seguridad (referencia)

| Método | Ruta | Quién | Notas |
|--------|------|-------|-------|
| `GET` | `/api/v1/cargos` | JWT | Query `incluirInactivos`; incluye objeto `dependencia` anidado |
| `GET` | `/api/v1/cargos/:id` | JWT | Detalle |
| `POST` | `/api/v1/cargos` | ADMIN | `codigo`, `nombre`, `descripcion?`, `dependenciaId?` |
| `PATCH` | `/api/v1/cargos/:id` | ADMIN + `CARGOS_WRITE` | `nombre?`, `descripcion?`, `activo?`, `dependenciaId?` (null = sin dependencia) |

Tabla: `cargos` con FK opcional `dependencia_id` → `dependencias`.

---

## 8. Prueba rápida (ADMIN)

1. Inicie sesión como **ADMIN**.  
2. Menú → **Catálogos → Cargos**.  
3. Verifique filas **ASIST** y **DIR-GEN** si ejecutó seed.  
4. **Nuevo cargo:** código `TEC-01`, nombre `Técnico documental`, dependencia **SGD** → guardar.  
5. **Editar** ese cargo: cambie nombre, quite dependencia (*Sin asignar*) o desactive **Activo**.  
6. Pruebe **Incluir inactivos** para ver cargos desactivados.

---

## 9. Fallos frecuentes

| Síntoma | Qué revisar |
|---------|-------------|
| No aparece menú **Catálogos** | Usuario sin rol **ADMIN**. |
| *«No se pudieron cargar los cargos»* | Backend, sesión o red. |
| Desplegable de dependencia vacío | Cree dependencias activas en **Catálogos → Dependencias**. |
| No veo **Nuevo cargo** | Sesión no es ADMIN. |
| Código duplicado | Elija otro código único. |

---

## 10. Documentos relacionados

| Documento | Contenido |
|-----------|-----------|
| [09-modulo-cargos.md](./09-modulo-cargos.md) | Ficha técnica del módulo |
| [47-catalogo-dependencias.md](./47-catalogo-dependencias.md) | Catálogo de dependencias (prerrequisito recomendado) |
| [27-manual-usuario-sgd-gadpr-lm.md](./27-manual-usuario-sgd-gadpr-lm.md) | § 6.2 — manual general |
| [44-guia-secciones-menu-navegacion.md](./44-guia-secciones-menu-navegacion.md) | § 4.2 — Cargos en el mapa del menú |

---

**Última actualización:** 2026-05-26 — revisado frente a `CargosPage.tsx` y `CargosController` / `CargosService`.
