# Manual de Usuario — SGD-GADPR-LM (uso de principio a fin)

**Versión del manual:** 2026-05-07 (alineado a snapshot en `docs/README.md`)  
**Audiencia:** personal institucional (usuario final), administradores (**ADMIN**), revisores (**REVISOR**) y evaluadores (pruebas).  

---

## 0. Propósito del manual

Este manual describe **paso a paso y con detalle** cómo usar el sistema SGD-GADPR-LM desde el primer ingreso hasta el registro, consulta, adjuntos y trazabilidad de documentos.

> Importante: varias acciones están restringidas por rol. Los flujos administrativos y de catálogo recaen sobre **`ADMIN`**. La **revisión/aprobación** documental (**R‑28**) la ejecutan **`ADMIN`** o **`REVISOR`**.

---

## 1. Requisitos previos (antes de usar)

### 1.1 Acceso

- Tener un usuario activo en el sistema.
- Tener credenciales válidas (correo y contraseña).

### 1.2 Navegador recomendado

- Chrome / Edge actualizado (modo normal, sin extensiones que bloqueen cookies).

### 1.3 URL del sistema

- En local (frontend Vite): `http://localhost:5173/` (si el puerto cambia, revisa la consola donde se levantó el frontend).
- El backend debe estar disponible en `http://localhost:3000/api/v1`

---

## 2. Ingreso al sistema (Inicio de sesión)

### 2.1 Abrir la pantalla de login

1. Abre el navegador.
2. Ingresa a `http://localhost:5173/login` (o al puerto que indique el frontend).

### 2.2 Iniciar sesión

1. En **Correo o usuario**, escribe tu correo institucional.
2. En **Contraseña**, escribe tu contraseña.
3. (Opcional) Marca **Mantener sesión en este equipo** si estás en un equipo confiable.
4. Presiona **Ingresar al sistema**.

**Resultado esperado**
- El sistema te redirige al **Panel principal**.
- En la barra superior verás tu correo y la indicación de **sesión activa**.

**Posibles fallos**
- **“Credenciales inválidas…”**: correo/contraseña incorrectos, usuario inactivo o **cuenta temporalmente bloqueada** tras repetidos errores de contraseña (el mismo mensaje se usa a propósito; el administrador puede revisar **`AUTH_LOGIN_FAIL`** / **`ACCOUNT_LOCKED`** en Auditoría). Tras restablecer contraseña el bloqueo se limpia.
- **Límite de intentos por red**: demasiadas peticiones en poco tiempo (mensaje tipo “Demasiados intentos”); espera unos minutos.
- **“No se pudo conectar con la API…”**: suele indicar backend apagado, proxy incompleto o **URL incorrecta**. Si la interfaz está en **`http://IP-LAN:5173`**, mantén **`VITE_API_URL` sin definir** (recomendado) para usar el mismo origen y el proxy de Vite hacia `127.0.0.1:3000`; no configures `localhost` en `VITE_API_URL` cuando entres desde **otro equipo** (ese `localhost` sería el equipo del navegador, no el servidor). Si el mensaje aparecía aun cargando bien la página en LAN, tras actualización del cliente esa alerta ya **no debe mostrarse** por cancelaciones internas benignas de peticiones.

**Siguiente paso**
- Verifica tu rol y navega a Documentos.

### 2.3 Perfil de usuario (datos y actividad)

1. Tras iniciar sesión, en la barra superior presiona tu **correo** para abrir el menú de cuenta.
2. Elige **Mi perfil**. También puedes abrir directamente la ruta **`/perfil`**.
3. Revisa **Información personal** (correo, rol principal, área/dependencia si está asignada, estado y **último ingreso** preferentemente desde el campo **`ultimoLoginAt`**, con respaldo por último **`AUTH_LOGIN_OK`** en auditoría cuando el campo sea nulo).
4. En **Actividad reciente** verás las últimas acciones auditadas asociadas a tu cuenta (por ejemplo inicio de sesión, cargas o consultas documentales cuando existan registros).
5. Para iniciar el **cambio de contraseña** vía recuperación, presiona **Cambiar contraseña** (lleva a **`/recuperar`**; es el mismo flujo que “olvidé mi contraseña”).
6. Para salir, usa **Cerrar sesión de forma segura** o la opción **Cerrar sesión** del mismo menú superior.

**Resultado esperado**

- Se muestran tus datos de cuenta y una línea de tiempo breve de actividad (puede estar vacía si aún no hay eventos auditados recientes).
- **Último ingreso** muestra fecha si hay **`ultimoLoginAt`** o, en su defecto, el último **`AUTH_LOGIN_OK`** en auditoría; si ninguno existe aún para tu cuenta se verá como no disponible.

**Posibles fallos**

- Mensaje de error al cargar el perfil: el backend no está disponible o hubo un fallo puntual; revisa la consola de red y que la API responda en `/api/v1/auth/profile`.
- Actividad incompleta frente a todo lo que hizo en pantalla: solo se listan acciones que generan filas en **`audit_logs`** y se filtran eventos de sistema ruidosos (p. ej. renovación de sesión).

**Siguiente paso**

- Si necesitas nueva contraseña, completa el flujo en **§ 3** (recuperación).

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

- **Indicadores**: totales **reales** desde la API (`GET /dashboard/summary`): documentos, pendientes de revisión, usuarios activos (visible para `ADMIN`), **documentos nuevos este mes** y tabla de expedientes ordenada por **última actualización**.
- **Alertas (tarjeta roja)**: el número es la cantidad de **señales activas** que el sistema detecta; debajo de la tarjeta se listan en texto claro. Pueden combinarse, por ejemplo: documentos en **En revisión**, accesos **403** recientes en auditoría, **intentos fallidos de login** (30 días), **falta de registro de respaldo verificado** (solo `ADMIN`, hasta que se use Respaldos → registrar), o problemas de **salud del API/base de datos** detectados en el navegador.
- **Cumplimiento**: barras calculadas con métricas de los últimos 30 días (no son valores ficticios).
- **Último respaldo verificado**: solo aparece fecha real si un `ADMIN` registró una verificación en **Respaldos** (auditoría `BACKUP_VERIFIED`); si no hay registro, el panel indica cómo obtenerlo.
- **Estado del servicio**: confirmación de API y base de datos.
- **Comprobación de rol administrador** (si aplica): indicador de acceso ADMIN.

### 4.2 Menú lateral (navegación)

- **Inicio**
- **Documentos**
- **Administración → Usuarios y roles** (solo `ADMIN`)
- **Catálogos** (solo `ADMIN`):
  - Dependencias
  - Cargos
  - Tipos documentales
  - Series
  - Subseries

---

## 5. Administración (solo ADMIN)

### 5.1 Gestión de usuarios (crear/editar/desactivar/reset)

La pantalla **Administración de identidades** integra una **tabla de usuarios** (`GET /usuarios`: nombres, correo, dependencia/cargo del catálogo, roles RBAC, estado) y una **matriz de referencia** servida por el servidor (`GET /usuarios/matriz-acceso-referencia`) con el mismo criterio que las rutas NestJS (`@Roles`). La matriz es **solo lectura**: no guarda cambios; la asignación efectiva de capacidades se hace con **Editar** (roles del usuario). Use **Actualizar** (icono de recarga en la cabecera) para volver a cargar listado y matriz.

1. En el menú lateral, entra a **Administración → Usuarios y roles**.
2. La tabla muestra usuario (nombre preferente o correo), **cargo y dependencia** cuando están asignados en el catálogo, roles, estado (**Activo** / **Suspendido** si la cuenta está deshabilitada) y **Último ingreso** a partir del campo **`ultimoLoginAt`** (se actualiza en cada inicio de sesión **exitoso con credenciales**; no refleja solo renovaciones silenciosas de sesión). Cuentas antiguas pueden mostrar «sin acceso» hasta el próximo login tras el despliegue del campo.
3. Para crear un usuario:
   - Presiona **Crear usuario**
   - Completa **Correo**, **Contraseña temporal** (respaldo hasta que el usuario defina la suya), (opcional) **Nombres/Apellidos**, (opcional) **Dependencia/Cargo**, **Roles** (lista: `ADMIN`, `USUARIO`, `REVISOR`, `AUDITOR`, `CONSULTA`; en esta versión, salvo **ADMIN**, el acceso efectivo es el de usuario con JWT; los códigos adicionales sirven para preparar flujos futuros).
   - Deja marcada la opción recomendada **“Enviar al correo un enlace…”** para que llegue un mensaje con el enlace a **definir contraseña** (página de restablecer). Si no marcas la casilla, el usuario solo puede entrar con la contraseña temporal.
   - Presiona **Crear**
   - Si aparece un aviso de que no se envió el correo, el administrador debe revisar la configuración SMTP del servidor o repetir más tarde el flujo de recuperación de contraseña para ese usuario.
4. Para editar:
   - En el usuario, usa **Editar** en **Acciones**
   - Ajusta roles/dependencia/cargo y presiona **Guardar**
5. Para activar/desactivar:
   - Pulsa **Desactivar** o **Activar** en **Acciones**
6. Para restablecer contraseña:
   - Pulsa **Reset pass**
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
- Texto libre (`q`): coincide con **código**, **asunto**, **descripción**, **dependencia** del documento (nombre o código), **usuario que registró** (correo, nombres o apellidos), **tipo documental** y **clasificación** (subserie o serie).
- **Estado** (lista desplegable con catálogo formal: Borrador, Registrado, En revisión, etc.; «(Todos)» para no filtrar)
- Tipo documental
- Serie/Subserie
- Rango de fechas
- Filtros por adjuntos (nombre, MIME, sha256)

**Acción**
1. Ajusta filtros.
2. Presiona **Filtrar**.

**Resultado esperado**
- Lista **paginada** con registros **reales** del servidor (según tus permisos y filtros).
- En la tabla, **Clasificación** muestra serie y subserie; **Responsable** prioriza la **dependencia aplicada al documento** y, si no hay, muestra nombre o correo de quien lo registró (pasa el ratón sobre la celda para ver detalle cuando aplique).

### 7.2.1 Trámites — tablero de flujo (Kanban)

1. Menú → **Trámites** (ruta `/tramites`).
2. Revisa cuatro columnas: **Registrado**, **En revisión**, **Aprobado** y **Archivado** — los ítems son **documentos vivos del servidor**, filtrados por tu **permiso de lectura**, no datos de demostración.
3. Cada tarjeta muestra **código**, **tipo documental** (nombre del catálogo), línea compacta del **asunto** y **dependencia aplicada al expediente** (o aviso si no hay dependencia).

**Interactividad**

- **Actualizar** (icono de recarga junto al título) vuelve a pedir todo el tablero al servidor en una sola operación; la cabecera indica fecha/hora de la última carga donde aplique.
- Pulsa una tarjeta (o también el contenido dentro de ella): abre el **detalle** del documento. Las **transiciones de estado** siguen aplicándose solo desde el detalle según tus permisos; el tablero es **solo lectura** (no hay arrastrar y soltar).
- Cada expediente aparece solo en una columna: corresponde a su **único estado actual** en la base de datos (no pueden repetirse el mismo ID en dos columnas).
- Si hay muchos registros por columna (más del tope cargado por el servidor, hoy hasta ciento cincuenta por columna en esta vista), el tablero avisa revisar la **bandeja Documentos** filtrando por estado.
- Estados **Borrador** y **Rechazado** no están en las cuatro columnas principales; si existen registros visibles para tu usuario, la pantalla puede mostrar un aviso con enlaces a la bandeja.

**Resultado esperado**

- Visión rápida del pipeline documental coherente con tus permisos de visibilidad y con los mismos registros que la bandeja de documentos.

### 7.2.2 Clasificación — cuadro documental (solo lectura)

1. Menú → **Clasificación** (ruta `/clasificacion`).
2. **Actualizar** (icono de recarga junto al título): vuelve a cargar catálogo y agregados del servidor (`GET …/clasificacion-agregados` junto con series/subseries activas).
3. **Izquierda — Estructura documental:** árbol con el fondo institucional y, debajo, cada **serie** y sus **subseries** (**solo catálogo activo** — mismos datos que en **Catálogos**).
4. Pulsa una **serie** o **subserie**. La **Ficha de clasificación** muestra **código** y **nombre** del catálogo; **descripción** si existe; además (**datos derivados de expedientes**):
   - **Expedientes visibles**: cuántos documentos vigentes (**activo**) coinciden con tu **misma visibilidad** que en la bandeja **Documentos**, agregados a la serie o subserie elegida (por subserie asignada al expediente; en serie se suman todas las subseries bajo ese padre que aplica al recuento del servidor).
   - **Área responsable predominante**: dependencia más frecuente entre esos expedientes visibles en esa clasificación; si **cero** expedientes encajan, texto claro tipo “sin expedientes…”; puede no coincidir con un campo “único” si tu organización distribuye cargas entre varias dependencias.
   - **Nivel de acceso predominante**: confidencialidad más frecuente entre expedientes visibles (p. ej. interno/reservado), en etiqueta legible según valores del modelo.
   - **Conservación (plazo / destino)** el sistema declara honestamente si **no** hay campos de retención o disposición final en base de datos: no muestra años inventados; cuando el proyecto modele esa política en catálogo, la pantalla podrá enlazarlos.
5. **Tabla de retención** (abajo derecha): una fila por **serie activa** con código y nombre del catálogo; columna **Expedientes visibles** (**recuento real** igual criterio que arriba). Columnas **Retención** y **Destino final** muestran **marcador de pendiente**, no valores ficticios, hasta que existan datos modelados.

**ADMIN:** enlaces a mantenimiento **Series** / **Subseries**. Otros roles: solo lectura.

**Resultado esperado**

- Vista alineada al catálogo real y métricas de expedientes con las mismas reglas de privacidad/visibilidad que el resto del módulo documental.

**Posibles fallos**

- Lista vacía: no hay series/subseries activas (un **ADMIN** las crea en **Catálogos**).
- Ficha con expedientes **0**: normal si no hay documentos clasificados bajo ese nodo para tu cuenta o filtros implícitos de visibilidad; la bandeja **Documentos** debe reflejar el mismo comportamiento por rol.

### 7.3 Exportar a Excel o PDF (solo ADMIN)

Los reportes usan los **mismos filtros** aplicados arriba (no exportan solo la página visible: el servidor arma el conjunto filtrado completo dentro de un tope configurado).

**Acción**

1. Ajusta filtros y pulsa **Filtrar** (recomendado para acotar el resultado).
2. En el bloque de filtros, pulsa **Excel** o **PDF**.
3. Acepta la descarga en el navegador.

**Resultado esperado**

- Se obtiene un archivo `.xlsx` o `.pdf` con el listado filtrado.
- Rol distinto de **ADMIN**: la API responderá sin autorización si se intentara exportar desde herramientas externas.

**Posibles fallos**

- Sesión caducada: vuelve a iniciar sesión.
- Mensaje tipo “No se pudo exportar”: revisa que el backend esté en marcha y que tu usuario sea **ADMIN**.
- Lista muy grande: el servidor puede **limitar la cantidad de filas** exportadas por rendimiento.

### 7.3.1 Exportar “Pendientes de revisión” (REVISOR o ADMIN)

Este reporte descarga exclusivamente documentos en estado **En revisión** (cola operativa) y se expone también a rol **REVISOR**.

**Acción**

1. En **Documentos**, en el bloque de filtros, pulsa **Pendientes revisión (Excel)** o **Pendientes revisión (PDF)**.
2. Acepta la descarga en el navegador.

**Resultado esperado**

- Se obtiene un archivo `.xlsx` o `.pdf` con la lista de documentos **En revisión**.

**Posibles fallos**

- No aparecen botones: tu usuario no tiene rol **REVISOR** ni **ADMIN**.
- “No se pudo exportar…”: backend apagado o sesión caducada.

### 7.4 Crear documento (solo ADMIN)

1. Menú → **Nuevo documento** (ruta `/documentos/nuevo`) o, desde **Documentos**, botón **Nuevo documento** si está visible.
2. Los desplegables (**tipo**, **serie**, **clasificación**, **dependencia**) muestran el **catálogo real del servidor**. El sistema puede **prellenar su dependencia** si su usuario tiene dependencia en perfil y ésta existe en catálogo. Si hay un solo tipo documental o una sola serie o una sola subserie aplicable en el árbol, puede seleccionarse automáticamente al cargarse el catálogo.
3. Completa:
   - **Código (único)**: suele cargarse solo un correlativo institucional `PREFIJO-AÑO-SECUENCIAL` desde el servidor (según el año del campo fecha); puede solicitar otro con **Correlativo servidor** o sobreescribirlo a mano. El prefijo se configura con `DOCUMENTO_CODIGO_PREFIX` en el backend (`DOC` por defecto).
   - Asunto
   - Descripción (opcional)
   - Fecha
   - Tipo documental
   - Serie y clasificación (subserie)
   - **Estado inicial** (**Registrado** o **Borrador**)
   - **Dependencia propietaria** (opcional; puede venir desde su perfil)
   - **Confidencialidad** (por defecto Interno)
4. Selecciona un **archivo** permitido (PDF, imagen JPG/PNG/WEBP u Office DOCX/XLSX) (máx 50 MB).
5. Verifica que el panel **Validaciones automáticas** marque “Correcto” para extensión/nombre/metadatos/clasificación (las reglas siguen vigentes hasta que selecciones archivo y completes campos válidos).
6. Presiona **Guardar documento**.

**Resultado esperado**
- El documento aparece en el listado y se puede abrir el detalle.

**Nota sobre el ciclo de vida:** en el **detalle**, un ADMIN puede avanzar el **estado** solo por **transiciones válidas** (por ejemplo **Registrado → En revisión → Aprobado/Rechazado → Archivado**). Si eliges una transición incorrecta, el sistema mostrará un error. En estado **Archivado** no se pueden subir ni eliminar archivos adjuntos.

---

## 8. Detalle del documento (donde se adjuntan archivos)

### 8.1 Abrir el detalle

1. En el listado de Documentos, haz clic sobre un registro (o usa **Ver**).
2. El sistema navega a `/documentos/:id`.

La pantalla se organiza en dos columnas (en escritorio):

- **Izquierda — Vista previa:** muestra **el contenido real** del archivo activo de **mayor versión** cuando es **PDF** o **imagen** (JPG, PNG o WebP), descargado de forma segura con tu sesión. Si el archivo pesa más de **20 MB**, el sistema solo muestra un aviso informativo (para no saturar la memoria del navegador) y debe usarse **Descargar** para verlo completo (la descarga permite hasta ~50 MiB, coherente con el límite de subida). Para **DOCX**, **XLSX** u otros tipos debe usarse **Descargar** (el navegador no integra vista previa de Office aquí). Si no hay adjuntos o falla la carga, verá mensajes aclaratorios en pantalla; debajo, **fecha** y **descripción** del registro. Más abajo, **Archivos digitales** (subir, listar, descargar, historial por versión), según permisos.
- **Derecha — Metadatos:** tipo, serie, subserie y códigos del **catálogo**; confidencialidad; dependencia; **Conservación** si no está parametrizada en datos (valor «—») y texto explicativo. Botones **Descargar** (última **versión** numérica disponible entre activos), **Editar** (solo **ADMIN**) y **Ver historial** (desplaza a la tarjeta inferior).
- **Derecha — Historial y trazabilidad:** línea de tiempo con los eventos del documento (fechas y usuario).

En el mismo detalle puedes revisar **dependencia propietaria** y **nivel de confidencialidad**. Si eres **ADMIN**, presiona **Editar** en **Metadatos**, ajusta los campos y **Guardar** en el diálogo cuando la pantalla lo muestre.

### 8.1.1 Envío y resolución de revisión (flujo MVP)

Cuando el documento está en estado **Registrado**:

1. Quien lo **registró** en el sistema o un **ADMIN** puede pulsar **Enviar a revisión**. El estado pasa a **En revisión**.

Cuando está **En revisión**:

1. Un usuario con rol **REVISOR** o **ADMIN** puede pulsar **Aprobar** o **Rechazar**.
2. Si pulsas **Rechazar**, se abre un diálogo donde debes escribir el **motivo del rechazo** (obligatorio, mínimo 3 caracteres, máximo 2000); el texto queda registrado en **Auditoría** junto con la decisión.

**Consulta rápida de pendientes**

- En **Documentos**, filtra **Estado → En revisión**. Si tienes rol **REVISOR**, el listado muestra una nota de ayuda con este mismo consejo.

**Resultado esperado**

- Estados y trazas coherentes en el **Historial** del documento y en **Auditoría** (acciones como envío/resolución de revisión cuando el administrador revise la bitácora).

**Fallos típicos**

- **403** al resolver: tu usuario no es **REVISOR** ni **ADMIN**.
- **403** al enviar: solo el usuario que creó el registro documental (o **ADMIN**) puede enviar ese documento a revisión.
- Estado incorrecto (p. ej. ya archivado o no está en «Registrado»): el backend rechaza la operación con un mensaje de validación.
- Rechazo **sin motivo** o motivo demasiado corto: validación del servidor (**400**) o mensaje en el propio diálogo antes de confirmar.

### 8.2 Sección “Archivos digitales” (adjuntos)

> Esta sección está en la tarjeta **Vista previa** del detalle del documento. No aparece en Inicio.

#### 8.2.1 Subir archivo (solo ADMIN)

1. Dentro del detalle del documento, en **Vista previa**, ubica **Archivos digitales**.
2. Presiona **Subir archivo**.
3. Selecciona un archivo permitido (máx 50MB).

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

En el detalle del documento existe la tarjeta **Historial y trazabilidad** (también alcanzable con **Ver historial** desde **Metadatos**):
- Muestra eventos de creación y actualización del documento.
- Sirve como evidencia de trazabilidad (ISO 15489).

---

## 10. Auditoría del sistema (solo ADMIN)

1. Menú lateral → **Administración** → **Auditoría** (ruta `/admin/auditoria`).
2. En **Criterios de consulta** elija **Usuario** (**Todos** o un usuario del listado — el servidor filtra por <code>actor_user_id</code>), **Acción** (**Todas** o una acción concreta, coincidencia exacta con el código en base de datos) y las fechas **Desde / Hasta**.
3. Pulse **Consultar** para aplicar filtros y cargar la tabla (antes de consultar, los cambios en los campos no actualizan el listado). Opcional: icono **Actualizar** en la cabecera para repetir la consulta con los mismos filtros y página actual.
4. Opcional: **Exportar Excel** o **Exportar PDF** descargan hasta **5000** registros recientes que cumplan **los filtros ya aplicados**.

**Resultado esperado**

- Lista paginada de eventos (`audit_logs`).
- Columna **Usuario** muestra nombre preferente cuando el actor está enlazado a un usuario del sistema (si no, el correo registrado en el evento o guion).
- **Documento / recurso** muestra el **código institucional del expediente** (p. ej. <code>SIS-2026-…</code>) cuando el backend puede resolverlo desde el documento o desde <code>documentoId</code> en metadatos; si no aplica, puede mostrarse “—” o una referencia técnica abreviada al UUID.
- Cada exportación deja constancia en auditoría (`REPORT_EXPORTED`).

**Posibles fallos**

- **403 / vacío:** el usuario no es ADMIN o el token expiró (vuelve a iniciar sesión).

---

## 11. Respaldos y seguridad (solo ADMIN)

1. Menú lateral → **Administración** → **Respaldos** (ruta `/admin/respaldos`).
2. El **servidor puede programar mysqldump** (cron dentro del proceso API) usando variables en `backend/.env` (`BACKUP_AUTOMATED_*`, `BACKUP_MYSQLDUMP_PATH`, etc. — véase **`backend/.env.example`**, checklist en **`scripts/README-backups-mysql-xampp.md`** y, para añadir el bloque automáticamente en una copia nueva del repo, **`scripts/configure-local-backups.ps1`**). Tras cambiar `.env`, **reinicie el proceso del backend** para que el cron quede registrado.
3. **Copia desde la UI:** puede pulsar **Ejecutar mysqldump ahora (manual)**; llama `POST /api/v1/backup/admin/run-now` y escribe artefactos en disco (`BACKUP_OUTPUT_DIR`). Opcionalmente el job incluye un **ZIP de `storage/`** si `BACKUP_INCLUDE_STORAGE_ZIP=true`.
4. **Restauración** no se ejecuta desde el navegador: sigue siendo procedimiento institucional (MySQL CLI + recuperación de `storage/`).
5. **Datos en pantalla:** `GET /api/v1/dashboard/admin/backup-overview` (solo ADMIN): historial hasta 50 filas de **`BACKUP_VERIFIED`** (OK o FAIL), columna **Origen** (Manual vs Automático según `meta.source`), KPIs 90 días y señal de cron activo.
6. **Registrar verificación manual:** elija **Resultado** OK o **FAIL**; si elige **FAIL**, **Notas** es obligatorio (motivo). Opcional: tipo, tamaño. Genera el mismo tipo de evento de auditoría que el job automático.
7. **“Próximo respaldo / programación”:** combina `BACKUP_EXPECTED_SCHEDULE_HINT` (texto) y, si el cron automático está activo, la expresión cron configurada.
8. Diálogos **Restaurar copia** y **Probar respaldo** siguen siendo solo orientación.

**Resultado esperado**

- El administrador distingue eventos automáticos y manuales, puede documentar fallos (FAIL) y conoce dónde quedan los `.sql`/`.zip` en el servidor.

**Posibles fallos**

- **403:** usuario no ADMIN o sesión caducada.
- **Ejecutar mysqldump ahora falla:** comprobar `BACKUP_MYSQLDUMP_PATH`, `DATABASE_URL`, permisos de carpeta de salida y logs del proceso Node.
- **Tabla vacía:** aún no hubo registros OK/FAIL ni en automático ni en manual.

---

## 12. Reportes institucionales (solo ADMIN)

1. Menú lateral → **Administración** → **Reportes** (ruta `/admin/reportes`).
2. Elija **Periodo** (mes), **Área** (dependencia, opcional), **Tipo documental** (opcional) y el **formato preferido** para limitar botones PDF/XLSX.
3. Pulse **Generar** para aplicar los filtros al gráfico **Documentos por tipo** (máx. 6 tipos con más volumen en el mes) y para las exportaciones de inventario.
4. En **Reportes disponibles** puede:
   - Descargar inventario en **PDF / XLSX** (respeta filtros aplicados; el XLSX permite acotar también por **Área** mediante `dependenciaId` en servidor).
   - Descargar **Actividad por usuario** como PDF de **auditoría** (solo rango de fechas del periodo, sin filtro de tipo/área).
   - **Trazabilidad por documento:** use el detalle del expediente (**Cómo consultar** explica la ruta dentro del sistema).
   - **Cumplimiento de respaldos:** botón **Abrir** lleva a la pantalla de respaldos (procedimiento documentado fuera del SGD).

**Posibles fallos**

- **403:** el usuario no es ADMIN para indicadores o exports administrativos.
- Gráfico vacío: no hay documentos activos en el periodo para el ámbito del administrador.

---

## 13. Configuración de seguridad (solo ADMIN)

1. Menú lateral → **Administración** → **Configuración** (ruta `/admin/configuracion`).
2. La pantalla muestra:
   - **Estado efectivo** (lo que el backend aplica hoy) leído desde `GET /auth/admin/security-summary`.
   - **Política institucional** (valores deseados) persistida como registro en base de datos con `GET /auth/admin/security-policy`.
3. Ajuste los valores deseados (p. ej. longitud mínima, bloqueo por intentos, caducidad JWT deseada) y presione **Guardar política**.
4. Al guardar, el sistema registra auditoría `SECURITY_POLICY_UPDATED` y conserva el contexto (actor, fecha/hora, IP si aplica).

**Importante**

- Guardar la política institucional **no cambia automáticamente** el runtime si el control no está implementado (ej. historial de contraseñas o step-up ADMIN). La pantalla muestra **Efectivo vs Deseado** para evitar falsas expectativas.
- El mínimo de contraseña efectivo hoy está alineado a **8 caracteres** (DTO servidor), aunque la política deseada pueda definirse distinta.

---

## 14. Cierre de sesión

1. En la barra superior, abre el menú del usuario.
2. Presiona **Cerrar sesión**.

**Resultado esperado**
- Se limpia la sesión y vuelves a `/login`.

---

## 15. Checklist de uso “de principio a fin” (resumen rápido)

1. Login
2. (ADMIN) Crear catálogos: dependencias/cargos/tipos/series/subseries
3. (ADMIN) Crear documento (dependencia y confidencialidad si aplica)
4. Opcional: **Trámites** (Kanban) o **Clasificación** (cuadro ISO)
5. Abrir detalle del documento
6. (ADMIN) Subir archivo y generar versión
7. Descargar y revisar historial
8. (ADMIN) Revisar o exportar **Auditoría** si necesitas evidencia sistémica
9. (ADMIN) Opcional: **Respaldos** para recordatorio de procedimiento (copias reales fuera del SGD web)
10. (ADMIN) Opcional: **Reportes** (gráficos e inventario/auditoría exportables)
11. (ADMIN) Opcional: **Configuración** (transparencia de políticas técnicas)
12. Logout

