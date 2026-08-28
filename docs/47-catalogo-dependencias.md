# Catálogo de Dependencias — cómo funciona

**Pantalla:** Dependencias  
**Ruta:** `/catalogos/dependencias`  
**Menú:** **Catálogos → Dependencias** (solo visible con rol **ADMIN**)  
**Migas de pan:** Inicio / Catálogos / Dependencias  
**Código:** `frontend/src/pages/catalogos/DependenciasPage.tsx`

---

## 1. Para qué sirve

Las **dependencias** son las **unidades organizativas** del GADPR-LM (direcciones, áreas, unidades internas, etc.). Este catálogo es un **dato maestro**: alimenta el resto del SGD antes de registrar expedientes.

| Uso en el sistema | Dónde se aplica |
|-----------------|-----------------|
| **Ámbito del usuario** | En **Usuarios y roles**, cada cuenta puede tener una dependencia asignada (visibilidad documental). |
| **Dependencia del expediente** | Al crear o editar un documento se elige la **dependencia propietaria** del registro. |
| **Filtros y reportes** | Bandeja **Documentos**, **Reportes** y agregados de **Clasificación** (área responsable predominante). |
| **Cargos** | En **Catálogos → Cargos** un puesto puede vincularse opcionalmente a una dependencia. |

Sin dependencias activas, los desplegables de registro y filtrado pueden quedar vacíos o incompletos.

---

## 2. Quién puede hacer qué

| Acción | Rol / permiso | Dónde |
|--------|---------------|--------|
| Ver el menú **Catálogos → Dependencias** | **ADMIN** | Menú lateral |
| Abrir la pantalla `/catalogos/dependencias` | **ADMIN** | Ruta protegida en frontend |
| Listar dependencias (API) | Cualquier usuario **autenticado** | `GET /api/v1/dependencias` (otras pantallas usan el listado en desplegables) |
| **Nueva dependencia** / **Editar** | **ADMIN** + permiso `DEPENDENCIAS_WRITE` | Botones en esta pantalla; `POST` / `PATCH` en API |

Si un usuario sin rol ADMIN intenta entrar por URL directa a `/catalogos/dependencias`, el sistema lo redirige o bloquea según la protección de rutas (pantalla **403**).

---

## 3. Elementos de la pantalla

### 3.1 Encabezado

- **Título:** Dependencias  
- **Texto:** unidades organizativas; rol ADMIN; enlace a **Cargos**.
- El listado usa icono de dependencia (mismo del menú), no letra «D».

### 3.2 Controles superiores

| Control | Función |
|---------|---------|
| **Incluir inactivas** | Desmarcado (por defecto): la tabla solo muestra dependencias con **Activa = Sí**. Marcado: también aparecen las dadas de baja lógica (`activo = false`). Al cambiar el checkbox, la lista se **recarga** automáticamente. |
| **Nueva dependencia** | Solo **ADMIN**. Abre el diálogo de alta. |

### 3.3 Tabla principal

| Columna | Contenido |
|---------|-----------|
| **Código** | Identificador corto e **único** (ej. `GADPR-LM`, `SGD`), en chip. En el servidor se guarda en **mayúsculas**. |
| **Nombre** | Denominación completa de la unidad, con icono. |
| **Descripción** | Texto opcional (en pantallas anchas; en móvil puede ocultarse la columna). Si no hay valor, se muestra «—». |
| **Estado** | Chip **Activo** / **Inactivo** (baja lógica, no borrado físico). |
| **Acciones** | Solo **ADMIN**: enlace **Editar** por fila. |

**Datos de ejemplo (seed de desarrollo):**

| Código | Nombre | Descripción | Activa |
|--------|--------|-------------|--------|
| GADPR-LM | Gobierno Autónomo Descentralizado Provincial de Los Ríos | Dependencia de ejemplo (seed) | Sí |
| SGD | Sistema de Gestión Documental | Unidad de gestión documental (ejemplo) | Sí |

---

## 4. Alta de una dependencia (Nueva dependencia)

1. Pulse **Nueva dependencia**.
2. Complete el formulario del diálogo:

| Campo | Reglas |
|-------|--------|
| **Código** | Obligatorio, 2–32 caracteres. Debe ser **único** en todo el catálogo. |
| **Nombre** | Obligatorio, 2–200 caracteres. |
| **Descripción** | Opcional, hasta 500 caracteres. |

3. Pulse **Guardar**.

**Resultado esperado**

- El diálogo se cierra.
- La nueva fila aparece en la tabla (si está activa y no marcó «Incluir inactivas» solo verá activas).
- El código queda normalizado en mayúsculas en base de datos (ej. escribir `sgd` → guardar como `SGD`).

**Errores frecuentes**

- *«Ya existe una dependencia con ese código»*: el código ya está registrado; use otro.
- Mensajes de validación en rojo bajo el campo: longitud mínima/máxima no cumplida.

---

## 5. Edición de una dependencia

1. En la fila deseada, pulse **Editar**.
2. En el diálogo **Editar {código}**:

| Campo | Editable |
|-------|----------|
| **Código** | **No** (se muestra en el título del diálogo; no se puede cambiar para no romper referencias históricas). |
| **Nombre** | Sí |
| **Descripción** | Sí (vacío = sin descripción en BD) |
| **Activa** | Sí (checkbox) |

3. Pulse **Guardar**.

**Baja lógica (desactivar)**

- Desmarque **Activa** y guarde. La dependencia deja de listarse en consultas que solo piden activas (formularios de **nuevo documento**, filtros por defecto, etc.).
- Los **documentos y usuarios** que ya la referencian **conservan** el vínculo histórico; no se borran datos.

**Resultado esperado**

- La tabla refleja el nuevo nombre, descripción o estado Activa/No.

---

## 6. Relación con otros módulos

```
Dependencias (catálogo)
    ├── Usuarios y roles  → dependencia del usuario
    ├── Nuevo documento / Detalle documento  → dependencia propietaria
    ├── Documentos (filtros)  → filtrar por dependencia
    ├── Clasificación  → “área responsable predominante”
    ├── Cargos  → FK opcional a dependencia
    └── Reportes institucionales  → filtro por dependencia
```

**Orden recomendado al poner en marcha un entorno vacío**

1. Crear **Dependencias** (esta pantalla).  
2. Crear **Cargos**, **Tipos documentales**, **Series** y **Subseries**.  
3. Registrar **usuarios** con dependencia asignada.  
4. Registrar **documentos**.

---

## 7. API y seguridad (referencia)

| Método | Ruta | Quién | Notas |
|--------|------|-------|-------|
| `GET` | `/api/v1/dependencias` | JWT | Query `incluirInactivos=true` \| `false` |
| `GET` | `/api/v1/dependencias/:id` | JWT | Detalle por UUID |
| `POST` | `/api/v1/dependencias` | ADMIN + `DEPENDENCIAS_WRITE` | Cuerpo: `codigo`, `nombre`, `descripcion?` |
| `PATCH` | `/api/v1/dependencias/:id` | ADMIN + `DEPENDENCIAS_WRITE` | Cuerpo: `nombre?`, `descripcion?`, `activo?` |

Tabla en base de datos: `dependencias` (ver `docs/04-modelo-base-de-datos.md`).

---

## 8. Prueba rápida (ADMIN)

1. Inicie sesión como **ADMIN** (`admin@local.test` en desarrollo, si aplica seed).  
2. Menú → **Catálogos → Dependencias**.  
3. Verifique las filas **GADPR-LM** y **SGD** si ejecutó `npx prisma db seed`.  
4. Pulse **Nueva dependencia**, cree una prueba (`codigo`: `PRUEBA`, `nombre`: `Unidad de prueba`) y guarde.  
5. **Editar** esa fila: cambie el nombre y desactive **Activa**; guarde.  
6. Desmarque **Incluir inactivas**: la fila de prueba no debe aparecer.  
7. Marque **Incluir inactivas**: debe verse con **Activa = No**.

---

## 9. Fallos frecuentes

| Síntoma | Qué revisar |
|---------|-------------|
| No veo el menú **Catálogos** | Su usuario no tiene rol **ADMIN**. |
| *«No se pudieron cargar las dependencias»* | Backend apagado, sesión caducada o error de red. |
| No aparece **Nueva dependencia** | No es ADMIN en la sesión actual. |
| Desplegable vacío al registrar documento | No hay dependencias **activas**; créelas aquí o reactive una. |
| Código duplicado al crear | Elija otro código; la unicidad es global. |

---

## 10. Documentos relacionados

| Documento | Contenido |
|-----------|-----------|
| [08-modulo-dependencias.md](./08-modulo-dependencias.md) | Ficha técnica del módulo |
| [27-manual-usuario-sgd-gadpr-lm.md](./27-manual-usuario-sgd-gadpr-lm.md) | § 6.1 — pasos breves en manual general |
| [44-guia-secciones-menu-navegacion.md](./44-guia-secciones-menu-navegacion.md) | § 4.1 — Dependencias en el mapa del menú |
| [46-cuadro-clasificacion-documental.md](./46-cuadro-clasificacion-documental.md) | Uso de dependencias en métricas de clasificación |

---

**Última actualización:** 2026-05-26 — revisado frente a `DependenciasPage.tsx` y `DependenciasController` / `DependenciasService`.
