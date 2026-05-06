# Manual de Usuario — SGD-GADPR-LM (uso de principio a fin)

**Versión del manual:** 2026-05-08  
**Audiencia:** personal institucional (usuario final), administradores (ADMIN) y evaluadores (pruebas).  

---

## 0. Propósito del manual

Este manual describe **paso a paso y con detalle** cómo usar el sistema SGD-GADPR-LM desde el primer ingreso hasta el registro, consulta, adjuntos y trazabilidad de documentos.

> Importante: varias acciones están restringidas por rol. En este MVP, el rol clave es `ADMIN`.

---

## 1. Requisitos previos (antes de usar)

### 1.1 Acceso

- Tener un usuario activo en el sistema.
- Tener credenciales válidas (correo y contraseña).

### 1.2 Navegador recomendado

- Chrome / Edge actualizado (modo normal, sin extensiones que bloqueen cookies).

### 1.3 URL del sistema

- En local: `http://localhost:5173/`
- El backend debe estar disponible en `http://localhost:3000/api/v1`

---

## 2. Ingreso al sistema (Inicio de sesión)

### 2.1 Abrir la pantalla de login

1. Abre el navegador.
2. Ingresa a `http://localhost:5173/login`.

### 2.2 Iniciar sesión

1. En **Correo**, escribe tu correo institucional.
2. En **Contraseña**, escribe tu contraseña.
3. Presiona **Entrar**.

**Resultado esperado**
- El sistema te redirige al **Panel principal**.
- En la barra superior verás tu correo y la indicación de **sesión activa**.

**Posibles fallos**
- **“Credenciales inválidas…”**: correo/contraseña incorrectos, usuario inactivo o **cuenta temporalmente bloqueada** tras repetidos errores de contraseña (el mismo mensaje se usa a propósito; el administrador puede revisar **`AUTH_LOGIN_FAIL`** / **`ACCOUNT_LOCKED`** en Auditoría). Tras restablecer contraseña el bloqueo se limpia.
- **Límite de intentos por red**: demasiadas peticiones en poco tiempo (mensaje tipo “Demasiados intentos”); espera unos minutos.
- **“No se pudo conectar con la API…”**: backend no levantado o URL mal configurada.

**Siguiente paso**
- Verifica tu rol y navega a Documentos.

---

## 3. Recuperación de credenciales (si olvidaste tu contraseña)

### 3.1 Solicitar restablecimiento

1. En `/login`, presiona **¿Olvidaste tu contraseña?**
2. En la pantalla **Recuperación de credenciales**, ingresa tu correo.
3. Presiona **Solicitar restablecimiento**.

**Resultado esperado**
- El sistema muestra un mensaje genérico: “Si el correo está registrado…”.

### 3.2 Restablecer contraseña

Cuando el administrador tiene configurado el **servidor SMTP** en el backend, suele llegar un **correo** con un enlace tipo  
`/restablecer?token=...`. Al hacer clic, el navegador abre esa pantalla y el campo **token** puede venir ya relleno.

Sin correo institucional (entorno de desarrollo típico), el sistema puede mostrar después de solicitar recuperación un **token de desarrollo** en pantalla únicamente para pruebas; en producción con SMTP eso **no debe aparecer**.

1. Si no usaste el enlace del correo, abre la pantalla **`/restablecer`** desde el mismo sitio donde usas la aplicación.
2. Ingresa el **token** (si la URL ya lo incluye, verifica que el campo coincida) y la **nueva contraseña** (mínimo 8 caracteres).
3. Presiona **Restablecer**.

**Resultado esperado**
- Mensaje de éxito y posibilidad de volver a iniciar sesión.

---

## 4. Panel principal (Inicio)

### 4.1 Qué verás

- **Accesos rápidos**: atajos hacia Documentos y Catálogos.
- **Estado del servicio**: confirmación de API y base de datos.
- **Comprobación de rol administrador** (si aplica): indicador de acceso ADMIN.

### 4.2 Menú lateral (navegación)

- **Inicio**
- **Documentos**
- **Administración → Usuarios** (solo `ADMIN`)
- **Catálogos** (solo `ADMIN`):
  - Dependencias
  - Cargos
  - Tipos documentales
  - Series
  - Subseries

---

## 5. Administración (solo ADMIN)

### 5.1 Gestión de usuarios (crear/editar/desactivar/reset)

1. En el menú lateral, entra a **Administración → Usuarios**.
2. Para crear un usuario:
   - Presiona **Crear usuario**
   - Completa **Correo**, **Contraseña temporal** (respaldo hasta que el usuario defina la suya), (opcional) **Nombres/Apellidos**, (opcional) **Dependencia/Cargo**, **Roles** (lista: `ADMIN`, `USUARIO`, `REVISOR`, `AUDITOR`, `CONSULTA`; en esta versión, salvo **ADMIN**, el acceso efectivo es el de usuario con JWT; los códigos adicionales sirven para preparar flujos futuros).
   - Deja marcada la opción recomendada **“Enviar al correo un enlace…”** para que llegue un mensaje con el enlace a **definir contraseña** (página de restablecer). Si no marcas la casilla, el usuario solo puede entrar con la contraseña temporal.
   - Presiona **Crear**
   - Si aparece un aviso de que no se envió el correo, el administrador debe revisar la configuración SMTP del servidor o repetir más tarde el flujo de recuperación de contraseña para ese usuario.
3. Para editar:
   - En el usuario, presiona **Editar**
   - Ajusta roles/dependencia/cargo y presiona **Guardar**
4. Para activar/desactivar:
   - Presiona **Activar** o **Desactivar**
5. Para restablecer contraseña:
   - Presiona **Reset pass**
   - Ingresa nueva contraseña y confirma

**Resultado esperado**
- El listado se actualiza con los cambios.

**Fallos a revisar**
- `403`: tu usuario no tiene rol `ADMIN`.
- Error de validación: correo duplicado o contraseña corta.

---

## 6. Catálogos (solo ADMIN)

Los catálogos son requisitos para registrar documentos correctamente.

### 6.1 Dependencias

1. Menú → **Catálogos → Dependencias**
2. Crea/edita una dependencia (código único y nombre).

### 6.2 Cargos

1. Menú → **Catálogos → Cargos**
2. Crea/edita un cargo y (opcionalmente) asígnalo a una dependencia.

### 6.3 Tipos documentales

1. Menú → **Catálogos → Tipos documentales**
2. Crea/edita tipos (ej. MEMO, OFICIO).

### 6.4 Series y Subseries

1. Menú → **Catálogos → Series**
2. Crea series.
3. Menú → **Catálogos → Subseries**
4. Crea subseries y vincúlalas a una serie.

**Resultado esperado**
- Los catálogos quedan disponibles para el registro documental.

---

## 7. Registro documental (Documentos)

> **Confidencialidad y dependencia:** cada documento tiene **nivel** (Público, Interno, Reservado, Confidencial) y **dependencia propietaria**. Quien no es **ADMIN** solo ve lo que corresponda a su dependencia (y niveles permitidos). **Confidencial** queda reservado a **ADMIN**.

### 7.1 Abrir el módulo Documentos

1. Menú → **Documentos**.

### 7.2 Buscar documentos (simple y avanzada)

En la barra de filtros puedes usar:
- Texto libre (`q`) por código/asunto/descr.
- Estado
- Tipo documental
- Serie/Subserie
- Rango de fechas
- Filtros por adjuntos (nombre, MIME, sha256)

**Acción**
1. Ajusta filtros.
2. Presiona **Aplicar**.

**Resultado esperado**
- Lista paginada con resultados.

### 7.3 Exportar a Excel o PDF (solo ADMIN)

Los reportes usan los **mismos filtros** aplicados arriba (no exportan solo la página visible: el servidor arma el conjunto filtrado completo dentro de un tope configurado).

**Acción**

1. Ajusta filtros y pulsa **Aplicar** (recomendado para acotar el resultado).
2. En el bloque de filtros, pulsa **Exportar Excel** o **Exportar PDF**.
3. Acepta la descarga en el navegador.

**Resultado esperado**

- Se obtiene un archivo `.xlsx` o `.pdf` con el listado filtrado.
- Rol distinto de **ADMIN**: la API responderá sin autorización si se intentara exportar desde herramientas externas.

**Posibles fallos**

- Sesión caducada: vuelve a iniciar sesión.
- Mensaje tipo “No se pudo exportar”: revisa que el backend esté en marcha y que tu usuario sea **ADMIN**.
- Lista muy grande: el servidor puede **limitar la cantidad de filas** exportadas por rendimiento.

### 7.4 Crear documento (solo ADMIN)

1. En **Documentos**, presiona **Registrar documento**.
2. Completa:
   - Código (único)
   - Asunto
   - Descripción (opcional)
   - Fecha
   - Tipo documental
   - Subserie (clasificación)
   - **Dependencia propietaria** (opcional; si no eliges, puede usarse la dependencia del usuario ADMIN si existe)
   - **Confidencialidad** (por defecto Interno; nivel **Confidencial** solo visible para ADMIN)
3. Presiona **Guardar**.

**Resultado esperado**
- El documento aparece en el listado y se puede abrir el detalle.

---

## 8. Detalle del documento (donde se adjuntan archivos)

### 8.1 Abrir el detalle

1. En el listado de Documentos, haz clic sobre un registro.
2. El sistema navega a `/documentos/:id`.

En el mismo detalle puedes revisar **dependencia propietaria** y **nivel de confidencialidad**. Si eres **ADMIN**, presiona **Editar**, ajusta los campos y **Guardar** en el diálogo cuando la pantalla lo muestre.

### 8.2 Sección “Archivos” (adjuntos)

> Esta sección está dentro del **detalle** del documento. No aparece en Inicio.

#### 8.2.1 Subir archivo (solo ADMIN)

1. Dentro del detalle del documento, ubica la tarjeta **Archivos**.
2. Presiona **Subir archivo**.
3. Selecciona un archivo permitido (máx 10MB).

**Resultado esperado**
- El archivo aparece como `v1` (o `v2`, `v3` si ya existía el mismo nombre).

#### 8.2.2 Descargar archivo (JWT)

1. En el archivo listado, presiona **Descargar**.

**Resultado esperado**
- Se descarga el binario y se registra un evento `DESCARGADO`.

#### 8.2.3 Ver historial del archivo (JWT)

1. Presiona **Historial**.

**Resultado esperado**
- Se muestran eventos `SUBIDO/DESCARGADO/ELIMINADO` con fecha y usuario.

#### 8.2.4 Eliminar archivo (borrado lógico, solo ADMIN)

1. Presiona **Eliminar**.
2. Confirma.

**Resultado esperado**
- El archivo se marca inactivo (no se borra físicamente por defecto) y aparece un evento `ELIMINADO`.

---

## 9. Historial del documento (trazabilidad)

En el detalle del documento existe una tarjeta **Historial**:
- Muestra eventos de creación y actualización del documento.
- Sirve como evidencia de trazabilidad (ISO 15489).

---

## 10. Auditoría del sistema (solo ADMIN)

1. Menú lateral → **Administración** → **Auditoría** (ruta `/admin/auditoria`).
2. Opcional: filtra por **acción**, **email del actor** o rango **desde / hasta**.
3. Usa **Exportar Excel** o **Exportar PDF** para descargar hasta **5000** registros recientes que cumplan el filtro.

**Resultado esperado**

- Lista paginada de eventos (`audit_logs`).
- Cada exportación deja constancia en auditoría (`REPORT_EXPORTED`).

**Posibles fallos**

- **403 / vacío:** el usuario no es ADMIN o el token expiró (vuelve a iniciar sesión).

---

## 11. Cierre de sesión

1. En la barra superior, abre el menú del usuario.
2. Presiona **Cerrar sesión**.

**Resultado esperado**
- Se limpia la sesión y vuelves a `/login`.

---

## 12. Checklist de uso “de principio a fin” (resumen rápido)

1. Login
2. (ADMIN) Crear catálogos: dependencias/cargos/tipos/series/subseries
3. (ADMIN) Crear documento (dependencia y confidencialidad si aplica)
4. Abrir detalle del documento
5. (ADMIN) Subir archivo y generar versión
6. Descargar y revisar historial
7. (ADMIN) Revisar o exportar **Auditoría** si necesitas evidencia sistémica
8. Logout

