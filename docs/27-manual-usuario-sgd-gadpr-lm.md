# Manual de Usuario — SGD-GADPR-LM (uso de principio a fin)

**Versión del manual:** 2026-08-28 (UI honesta: solo controles verificables; ver `docs/45-principio-ui-controles-reales.md`)  
**Audiencia:** personal institucional (usuario final), administradores (**ADMIN**), revisores (**REVISOR**) y evaluadores (pruebas).  

---

## 0. Propósito del manual

Este manual describe **paso a paso y con detalle** cómo usar el sistema SGD-GADPR-LM desde el primer ingreso hasta el registro, consulta, adjuntos y trazabilidad de documentos.

> Importante: varias acciones están restringidas por rol. Los flujos administrativos y de catálogo recaen sobre **`ADMIN`**. La **revisión/aprobación** documental (**R‑28**) la ejecutan **`ADMIN`** o **`REVISOR`**.

### 0.1 Qué muestra la interfaz (controles reales)

La pantalla del SGD prioriza **lo que el sistema aplica y puede verificar** (acceso, auditoría, respaldos registrados, validaciones). No aparecen opciones “de política futura” que el servidor aún no ejecuta. Los porcentajes del panel principal son **indicadores operativos** calculados desde datos del sistema; **no** equivalen a una certificación ISO ni a una auditoría externa. El detalle técnico para soporte suele estar en secciones colapsables o en documentación del proyecto.

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

### 1.4 Carga inicial por módulo

- La **primera vez** que abres una ruta después de iniciar sesión puede mostrarse brevemente **Cargando pantalla** mientras el navegador descarga el bloque correspondiente del frontend. Las visitas siguientes al mismo módulo suelen ser más rápidas si el caché conserva esos archivos.

### 1.5 Precarga en segundo plano y métrica LCP (panel principal)

- Con sesión iniciada el sistema puede, cuando el navegador está menos ocupado, **precargar** en segundo plano el código y datos más usados (panel **`/`**, lista **`/documentos`** por defecto, **`/perfil`**). Es normal observar peticiones paralelas sin haber pulsado esos menús todavía; no cambia permisos ni datos visibles hasta que abras cada pantalla.
- Al cargar el **panel principal**, el sistema puede registrar en auditoría una medición de rendimiento de la pantalla (visible para **ADMIN** en **Auditoría** como evento técnico de carga).

---

## 2. Ingreso al sistema (Inicio de sesión)

### 2.1 Abrir la pantalla de login

1. Abre el navegador.
2. Ingresa a `http://localhost:5173/login` (o al puerto que indique el frontend). La portada pública (`/`) y el login usan la **paleta institucional del tema** (azul marino + teal); el formulario no cambia respecto a credenciales, MFA ni recuperación.

### 2.2 Iniciar sesión

1. En **Correo o usuario**, escribe tu correo institucional.
2. En **Contraseña**, escribe tu contraseña.
3. Si olvidó la contraseña, use **¿Olvidó su contraseña?** para el flujo de recuperación.
4. Presiona **Ingresar al sistema**.

**Verificación en dos pasos (MFA/TOTP)**

Si su rol administrativo exige MFA y aún no tiene TOTP enrolado, tras credenciales válidas verá **Configurar verificación en dos pasos**:

1. **Paso 1 — Escanee el código QR** con Google Authenticator, Microsoft Authenticator u otra app compatible. El emisor aparece como **SGD-GADPR-LM** (o el nombre institucional configurado) y la cuenta es su correo.
2. Si no puede escanear, use **¿No puede escanearlo? Usar clave manual** para ver/copiar la clave de respaldo (oculta por defecto).
3. **Paso 2 — Ingrese el código de 6 dígitos** generado por la app y presione **Finalizar configuración**.

En accesos posteriores, tras usuario y contraseña, solo verá **Verificación en dos pasos** con el campo de código (sin QR).

Si la sesión de configuración expira (~5 min), el sistema mostrará **La sesión de configuración expiró** y deberá volver a iniciar sesión.

**Resultado esperado**
- El sistema te redirige al **Panel principal**.
- En la barra superior verás tu **avatar** (iniciales), correo, la chip **Sesión activa** y el botón de **tema claro/oscuro**.
- En el menú lateral verás la marca **SGD** y la sección **Principal** con la ruta activa resaltada. En escritorio puedes **ocultar el menú** (solo iconos) con el botón inferior; al pasar el cursor sobre un icono verás el nombre de la sección.

**Posibles fallos**
- **“Credenciales inválidas…”**: correo/contraseña incorrectos, usuario inactivo o **cuenta temporalmente bloqueada** tras repetidos errores de contraseña (el mismo mensaje se usa a propósito; el administrador puede revisar **`AUTH_LOGIN_FAIL`** / **`ACCOUNT_LOCKED`** en Auditoría). Tras restablecer contraseña el bloqueo se limpia.
- **Límite de intentos por red**: demasiadas peticiones en poco tiempo (mensaje tipo “Demasiados intentos”); espera unos minutos.
- **“No se pudo conectar con la API…”**: suele indicar backend apagado, proxy incompleto o **URL incorrecta**. Si la interfaz está en **`http://IP-LAN:5173`**, mantén **`VITE_API_URL` sin definir** (recomendado) para usar el mismo origen y el proxy de Vite hacia `127.0.0.1:3000`; no configures `localhost` en `VITE_API_URL` cuando entres desde **otro equipo** (ese `localhost` sería el equipo del navegador, no el servidor). Si el mensaje aparecía aun cargando bien la página en LAN, tras actualización del cliente esa alerta ya **no debe mostrarse** por cancelaciones internas benignas de peticiones.

**Siguiente paso**
- Verifica tu rol y navega a Documentos.

### 2.3 Perfil de usuario (datos y actividad)

1. Tras iniciar sesión, en la barra superior presiona tu **avatar / correo** para abrir el menú de cuenta.
2. Elige **Mi perfil**. También puedes abrir directamente la ruta **`/perfil`**.
3. Revisa **Información personal** (icono de persona; correo, rol principal, área/dependencia si está asignada, chip de **estado** y **último ingreso** preferentemente desde el campo **`ultimoLoginAt`**, con respaldo por último **`AUTH_LOGIN_OK`** en auditoría cuando el campo sea nulo).
4. En **Actividad reciente** (bloque de esta página **Mi perfil**, no el del Panel principal) verás las últimas acciones en lenguaje claro (por ejemplo «Inició sesión correctamente», «Cargó documento EXP-…»). No se muestran códigos técnicos ni métricas internas del sistema.
5. Los mensajes de error en formularios y pantallas usan texto entendible (sin códigos como `DOC_ACCESS_MANAGE` o `HTTP 403`). En **Auditoría** (solo ADMIN) las acciones tienen nombre legible; el código técnico aparece solo al pasar el cursor para soporte.
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

Bloques del Panel principal (**Inicio**), en orden aproximado de la pantalla. Todos los roles consumen **`GET /dashboard/summary`**; la verificación **`GET /health`** y el sondeo automático solo aplican cuando el usuario es **`ADMIN`**. Hay **actualización automática** y etiqueta **«Actualizado: …»**; use **Actualizar ahora** en la cabecera para forzar una recarga. La cabecera muestra saludo **«Bienvenido de nuevo, …»**, chip de rol, dependencia (si aplica) y **campana de notificaciones in-app** (eventos de revisión, resolución y vencimientos).

1. **Indicadores (KPI)**: tarjetas con totales en tiempo real; colores del tema (primary, warning, success, error). **Documentos** y **Pendientes** ven todos los roles; **Usuarios** y **Alertas** solo **`ADMIN`**.
2. **Gestión documental (por estado)**: totales por **estado del ciclo de vida** (Registrado, Borrador, En revisión, Aprobado, Rechazado). No debe confundirse con el tipo documental.
3. **Distribución por tipo de documento**: gráfico circular (donut) con la composición por tipo documental del catálogo (p. ej. Memorando, Oficio). Cantidad, porcentaje y total en el centro. Si hay muchos tipos, el resto se agrupa en **Otros**.
4. **Documentos registrados por mes**: barras de los **últimos 12 meses** (volumen total mensual). Es el único gráfico de total por mes en el dashboard.
5. **Tipo documental por mes**: barras apiladas con la composición por tipo en cada mes (no solo el total).
6. **Actividad del mes**: comparación del mes actual frente al anterior.
7. **Actividad documental por usuario** (solo **`ADMIN`** / superadministrador): tarjetas para hasta **5** usuarios con mayor actividad documental en el período seleccionado (**3** visibles inicialmente; **Mostrar más** para el resto). Incluye **selector de período** con opciones **Histórico** (predeterminado), **Este mes**, **Últimos 3 meses** y **Este año**; al cambiar el período se recarga **`GET /dashboard/summary?actividadPeriodo=…`**. Cada tarjeta muestra **avatar**, **nombre**, **correo** (si aplica), **rol**, **Documentos subidos** (registrados en el período) y métricas del **estado actual** de esos documentos (**En revisión**, **Aprobados**, **Rechazados**; **Borradores** solo si aplica), más una **lista compacta por tipo documental** (top 3 + **Otros**). Enlace **Ver usuarios** hacia Usuarios y roles. Los estados reflejan el ciclo de vida **actual** del documento creado por el usuario, no las acciones del revisor. Si nadie registró documentos en el período: *Sin actividad documental en este período.*
8. **Mi actividad** (usuarios **sin** rol administrador): mismas métricas de estado y el mismo **selector de período** que la sección administrativa, aplicadas solo a sus documentos. Además muestra **Documentos visibles (histórico)** en su ámbito. **No** muestra ranking ni actividad de otros usuarios (el backend no envía `actividadPorUsuario` a estos perfiles). Empty state: *Sin actividad documental en este período.*
9. **Pendientes de revisión** y **Alertas**: **Requieren atención** lista documentos en revisión (todos los roles con visibilidad). La tarjeta **Alertas** y el bloque **Ocultar alertas revisadas** (**Marcar como revisada**) son solo **`ADMIN`** (señales operativas: revisión pendiente, 403, login fallido, respaldo, salud API/BD). Ocultar una alerta no borra auditoría; la acción queda como **`DASHBOARD_ALERT_ACK`** hasta que haya actividad nueva.
10. **Acciones rápidas**: accesos directos según permisos (nuevo documento, pendientes, documentos, usuarios, auditoría, reportes, perfil).
11. **Actividad reciente** (Panel principal): lista de acciones relevantes del sistema en lenguaje claro. **`ADMIN`**: bloque dedicado **debajo** de Actividad documental por usuario; **Ver todos** → Auditoría. **Resto de roles**: en la zona de pendientes/alertas; **Ver todos** → Mi perfil.

Bloques adicionales (sin duplicar lo anterior):

- **Escala de Likert (semáforo documental)**: **Dashboard de Auditoría y Evaluación** con tarjetas y gráficos (donut, barras, proporción):
  - **Nivel 5 Óptimo (verde):** activos actualizados en los últimos 60 días.
  - **Nivel 3 Moderado (amarillo):** activos con más de 60 días sin actualización.
  - **Nivel 1 Crítico (rojo):** inactivos, rechazados o en revisión con SLA vencido.
  Pulse una tarjeta o barra para abrir **Documentos** con filtro `likert`. Los conteos respetan el ámbito visible (anti‑IDOR).
- **Usuarios**, **Actividad del sistema (auditoría)** y **Señales recientes** (solo **`ADMIN`**): resumen de cuentas, registros de hoy y último respaldo verificado / última línea auditada.
- **Indicadores operativos** (solo **`ADMIN`**): barras de métricas de los últimos 30 días (no son certificación ISO).
- **Estado del servicio** (solo **`ADMIN`**): API y base de datos; enlace **Ir a documentos** dentro del bloque.
- **Comprobación de rol administrador** (si aplica): indicador de acceso ADMIN.

### 4.2 Menú lateral (navegación)

Guía ampliada (contenido, rutas, permisos y funcionamiento de cada entrada): **`docs/44-guia-secciones-menu-navegacion.md`**.

- **Menú:** Inicio · Documentos · **Bandeja trámites** · Trámites · Nuevo documento (si `DOC_CREATE` + `DOC_FILES_UPLOAD`, o ADMIN)
- **Reportes** (solo `ADMIN`): **Reportes institucionales** (ruta `/reportes`; `/admin/reportes` redirige al mismo módulo)
- **Administración** (solo `ADMIN`): Usuarios y roles · Auditoría · Respaldos · Configuración
- **Catálogos** (solo `ADMIN`): Dependencias · Cargos · Tipos documentales · **Contrapartes** · **Beneficiarios**
- **Cuenta** (menú lateral, cuando está expandido): Mi perfil. También está en el menú del avatar.
- En escritorio, use **Ocultar menú** al pie del lateral para dejar solo iconos (la preferencia se guarda en el navegador). En la barra superior, el icono de sol/luna cambia entre tema claro y oscuro (solo dentro de la sesión; el login permanece claro). Los hover de tablas, estados vacíos y menú lateral usan la misma paleta **secondary** del tema en ambos modos.

---

## 5. Administración (solo ADMIN)

### 5.1 Gestión de usuarios (crear/editar/desactivar/reset)

La pantalla **Administración de identidades** se organiza en **tres pestañas**: **Usuarios** (directorio principal), **Roles y permisos** (configuración por rol, solo ADMIN) y **Matriz de acceso** (comparación visual por rol). Los textos visibles usan **nombres comprensibles** (p. ej. «Crear documentos», «Subir archivos»); los códigos técnicos (`DOC_CREATE`, etc.) aparecen solo como información secundaria. Los detalles de API y normativa están en **Información técnica** (acordeón al final de la página, cerrado por defecto).

La tabla de usuarios reproduce `GET /usuarios`; la matriz de referencia `GET /usuarios/matriz-acceso-referencia` (lectura; no persiste cambios).

La **capacidad efectiva** combina **todos los roles activos** del usuario + **permisos adicionales** (`user_permissions`). Cada permiso heredado indica de qué rol proviene; los adicionales se gestionan aparte. En **Roles y permisos** active o desactive capacidades por rol con **interruptores (switches)**; cada cambio se guarda al instante (API `PUT /rbac/roles/:codigo/permissions`; auditoría **`ROLE_PERMISSIONS_UPDATED`**).

**Los usuarios** admiten **varios roles simultáneos** (p. ej. Usuario + Revisor). Use **Gestionar acceso** para activar/desactivar roles con un clic. Solo el **Super Administrador** puede asignar o revocar el rol **Administrador** (confirmación obligatoria). Los permisos heredados del rol **no** pueden revocarse individualmente por usuario; para retirarlos quite el rol o modifique el rol en la pestaña **Roles y permisos**. Cambios quedan en auditoría (**`ROLE_ASSIGNED`**, **`ROLE_REVOKED`**, **`USER_DIRECT_PERMISSIONS_UPDATED`**). Tras cambios sensibles (roles, permisos, desactivación o reset de contraseña), el usuario afectado debe **volver a iniciar sesión** (se revocan refresh tokens en el servidor).

**Botones según permiso (además del rol ADMIN):** **Crear usuario** requiere `USERS_CREATE`; **Editar / Gestionar acceso** requiere `USERS_UPDATE`; **Activar/Desactivar** requiere también `USERS_DISABLE`; **Restablecer contraseña** requiere `USERS_RESET_PASSWORD`. La cuenta **Super Administrador** no puede desactivarse ni editarse desde un ADMIN operativo. Detalle técnico: **`MATRIZ_VISIBILIDAD_USUARIOS_RBAC.md`**.

**Los roles** siguen siendo obligatorios (al menos uno): si un rol no tiene permisos en BD, la API puede responder `403` aun con el mismo código de rol en la cuenta.

1. En el menú lateral, entra a **Administración → Usuarios y roles**.
2. Pestaña **Usuarios**: usa **Buscar usuario**, filtros **Estado** y **Rol**. Revisa la tabla (todos los roles activos en chips, permisos adicionales si aplica).
3. Menú **⋮ Acciones** → **Gestionar acceso**:
   - **Roles asignados:** interruptores para Usuario, Revisor, Auditor, Consulta, Editor documental y (solo SUPERADMIN) Administrador.
   - **Acceso efectivo:** resumen y panel expandible con origen de cada permiso.
   - **Permisos adicionales:** interruptores solo para excepciones (heredados aparecen bloqueados).
4. **Editar datos:** correo, nombres, dependencia y cargo (sin roles; use **Gestionar acceso** para roles).
5. **Crear usuario:** datos + rol inicial + permisos adicionales opcionales.
6. Pestaña **Roles y permisos:** elija rol, active/desactive permisos con switches (guardado inmediato).
7. Pestaña **Matriz de acceso:** comparación visual de referencia.

**Resultado esperado**
- El listado de usuarios refleja altas/edición; la matriz de referencia muestra vista comparativa por rol.
- Si guardaste la matriz en BD: mensaje de éxito y registro **`ROLE_PERMISSIONS_UPDATED`** en **Auditoría** (filtro opcional por acción).

**Fallos a revisar**
- `403`: su cuenta no tiene rol `ADMIN` o el rol ADMIN **perdió permisos** en BD (recover: DB o ejecutar **`npx prisma db seed`** en `backend/` con precaución en producción).
- Catálogo de permisos vacío en pantalla: no se ejecutó seed RBAC después de migrar código.
- Error de validación: correo duplicado o contraseña corta.

---

## 6. Catálogos (solo ADMIN)

Los catálogos son requisitos para registrar documentos correctamente. En todas estas pantallas el alta está en la **cabecera** (botón teal), los filtros en una **tarjeta de filtros**, y el estado se muestra como chip **Activo** / **Inactivo**.

### 6.1 Dependencias

Guía detallada: [47-catalogo-dependencias.md](./47-catalogo-dependencias.md). Matriz de seguridad: [MATRIZ_VISIBILIDAD_DEPENDENCIAS_ORGANIZACION.md](./MATRIZ_VISIBILIDAD_DEPENDENCIAS_ORGANIZACION.md).

1. Menú → **Catálogos → Dependencias** (solo **ADMIN** / **SUPERADMIN**).
2. Alta y edición requieren además el permiso **`DEPENDENCIAS_WRITE`**.
3. Opcional: en **Filtros**, marque **Incluir inactivas** (solo administración) para ver dependencias dadas de baja lógica. Los selectores de asignación (usuarios/documentos nuevos) siguen mostrando solo **activas**.
4. El listado muestra el mismo icono del menú, **código** en chip y estado **Activo/Inactivo**. Enlace a **Cargos**.
5. En la cabecera, **Nueva dependencia:** código (único, 2–32 caracteres), nombre y descripción opcional → **Guardar**.
6. **Editar:** cambie nombre, descripción o desmarque **Activa** para desactivar (el código no se modifica). Desactivar **no** borra usuarios ni documentos históricos asociados.

### 6.2 Cargos

Guía detallada: [48-catalogo-cargos.md](./48-catalogo-cargos.md). Matriz de seguridad: [MATRIZ_VISIBILIDAD_CARGOS_ORGANIZACION.md](./MATRIZ_VISIBILIDAD_CARGOS_ORGANIZACION.md).

1. Menú → **Catálogos → Cargos** (administración: permiso `CARGOS_WRITE`; típicamente `ADMIN` / `SUPERADMIN`).
2. Opcional: en **Filtros**, **Incluir inactivos** para ver cargos desactivados (requiere permiso de escritura del catálogo).
3. El listado muestra icono de cargo, código en chip, **dependencia** asociada y estado. Enlace a **Dependencias**.
4. En la cabecera, **Nuevo cargo** (solo quien tenga `CARGOS_WRITE`): código (único), nombre, **dependencia opcional y activa** (*Sin asignar* si no aplica), descripción → **Guardar**. No se puede crear un cargo bajo una dependencia inactiva.
5. **Editar:** nombre, dependencia (si ningún usuario lo tiene asignado), descripción y **Activo** (el código no se modifica). Desactivar un cargo no borra usuarios ni quita el cargo histórico; solo bloquea nuevas asignaciones.
6. Al crear/editar **usuarios**, el selector de cargo solo ofrece cargos **asignables** (activo y, si tiene dependencia, esa dependencia activa y coherente con la dependencia del usuario).

### 6.3 Tipos documentales

Guía detallada: [49-catalogo-tipos-documentales.md](./49-catalogo-tipos-documentales.md). Matriz de seguridad: [MATRIZ_VISIBILIDAD_TIPOS_DOCUMENTALES.md](./MATRIZ_VISIBILIDAD_TIPOS_DOCUMENTALES.md).

1. Menú → **Catálogos → Tipos documentales**
2. Opcional: en **Filtros**, **Incluir inactivos** para ver tipos desactivados.
3. El listado muestra icono de tipo, código en chip y estado. Enlace a **Documentos**.
4. En la cabecera, **Nuevo tipo:** código (único, ej. `MEMO`), nombre (ej. Memorando) y descripción opcional → **Guardar**.
5. **Editar:** nombre, descripción y **Activo** (el código no se modifica).

### 6.4 Contrapartes

1. Menú → **Catálogos → Contrapartes** (`/catalogos/contrapartes`).
2. Revise el listado (tipo, identificación, nombre o razón social, estado).
3. **Nueva contraparte** (solo ADMIN): elija **Persona natural** (cédula ecuatoriana + nombres/apellidos) o **Persona jurídica** (RUC + razón social). El servidor valida formato y duplicados.
4. Use estas personas en **Nuevo documento** o **Editar** en el detalle del expediente.

### 6.5 Beneficiarios

1. Menú → **Catálogos → Beneficiarios** (`/catalogos/beneficiarios`).
2. Misma estructura y validaciones que **Contrapartes** (cédula/RUC ecuatoriano).
3. **Nuevo beneficiario** (solo ADMIN) y asociación opcional al registrar o editar un documento.

**Resultado esperado**
- Los catálogos quedan disponibles para el registro documental.

---

## 7. Registro documental (Documentos)

> **Confidencialidad y dependencia:** cada documento tiene **nivel** (Público, Interno, Reservado, Confidencial) y **dependencia propietaria**. Quien no es **ADMIN** solo ve lo que corresponda a su dependencia (y niveles permitidos). **Confidencial** queda reservado a **ADMIN**.

### 7.1 Abrir el módulo Documentos

1. Menú → **Documentos**.

### 7.2 Buscar documentos (simple y avanzada)

Los filtros se organizan en **tarjeta de filtros** unificada y se **adaptan al ancho de pantalla** (en móviles los campos se apilan; en escritorio pueden mostrarse en varias columnas). Las acciones principales (**Nuevo documento**, exportar Excel/PDF si aplica) aparecen en la **cabecera** de la página.

El listado se muestra por defecto en **tarjetas** (código, asunto, estado, tipo, responsable/dependencia y fecha). En el encabezado del listado puede cambiar a **tabla** (mismas columnas, con orden al pulsar Código / Estado / Fecha). La preferencia se guarda en el navegador. En vista tabla, en pantallas estrechas hay **scroll horizontal**.

En la barra de filtros puedes usar:
- Texto libre (`q`): coincide con **código**, **asunto**, **descripción**, **dependencia** del documento (nombre o código), **usuario que registró** (correo, nombres o apellidos) y **tipo documental**.
- **Estado** (lista desplegable con catálogo formal: Borrador, Registrado, En revisión, etc.; «(Todos)» para no filtrar)
- Tipo documental
- Rango de fechas
- Filtros por adjuntos (nombre, MIME, sha256)

**Acción**
1. Ajusta filtros.
2. Presiona **Aplicar filtros**.

**Resultado esperado**
- Lista **paginada** con registros **reales** del servidor (según tus permisos y filtros). Abajo del listado verás **número de página**, el **intervalo de registros** visibles respecto del total y botones **Anterior** / **Siguiente**.
- En cada tarjeta o fila, **Tipo** muestra el tipo documental y **Responsable / Dependencia** prioriza la **dependencia aplicada al documento** y, si no hay, muestra nombre o correo de quien lo registró. Pulse la tarjeta, la fila o **Ver** para abrir el detalle.

### 7.2.0 Bandeja de trámites (cola en revisión + SLA)

1. Menú → **Bandeja trámites** (ruta `/bandeja-tramites`).
2. Revise los chips de resumen: total en revisión, **SLA vencido**, **por vencer** (24 h) y **en plazo**.
3. Filtre por texto, **dependencia**, **tipo documental** y **estado SLA**; pulse **Filtrar**.
4. La tabla muestra ingreso a revisión, **fecha límite SLA** (plazo institucional configurable en servidor, por defecto 5 días) y días en revisión.
5. Pulse **Abrir** para resolver el trámite en el detalle del documento (aprobar/rechazar según permisos).

**Resultado esperado**
- Solo documentos en estado **En revisión** visibles para su usuario; semáforo SLA coherente con fechas del servidor.

**Notificaciones (correo + in-app)**
- Al enviar a revisión: notificación a ADMIN/REVISOR (correo si SMTP configurado + campana in-app).
- Al resolver: notificación al creador.
- Vencimientos próximos: cron diario (si está activo en servidor) notifica al creador por correo e in-app.
- SLA vencido (documento en revisión más allá de la fecha límite): aviso a ADMIN/REVISOR (mismo cron).
- En la **campana** de la cabecera verá solo **sus** avisos. Pulse un ítem para marcarlo leído; si el aviso es de un documento, abre el detalle. **Marcar todas leídas** afecta únicamente las suyas. Un usuario no ve ni marca avisos de otra cuenta.

### 7.2.1 Trámites — tablero de flujo (Kanban)

1. Menú → **Trámites** (ruta `/tramites`).
2. Revisa cuatro columnas: **Registrado**, **En revisión**, **Aprobado** y **Archivado** — los ítems son **documentos vivos del servidor**, filtrados por tu **permiso de lectura**, no datos de demostración.
3. Cada columna tiene el **mismo chip de estado** que la bandeja y el detalle (colores del tema claro/oscuro) y un **contador** de expedientes. Cada tarjeta muestra **icono**, **código**, **asunto**, **tipo documental** y **dependencia aplicada al expediente** (o aviso si no hay dependencia).

**Interactividad**

- **Actualizar** (icono de recarga junto al título) vuelve a pedir todo el tablero al servidor en una sola operación; la cabecera indica fecha/hora de la última carga donde aplique.
- Pulsa una tarjeta (o también el contenido dentro de ella): abre el **detalle** del documento. Las **transiciones de estado** siguen aplicándose solo desde el detalle según tus permisos; el tablero es **solo lectura** (no hay arrastrar y soltar).
- Cada expediente aparece solo en una columna: corresponde a su **único estado actual** en la base de datos (no pueden repetirse el mismo ID en dos columnas).
- Si hay muchos registros por columna (más del tope cargado por el servidor, hoy hasta ciento cincuenta por columna en esta vista), el tablero avisa revisar la **bandeja Documentos** filtrando por estado.
- Estados **Borrador** y **Rechazado** no están en las cuatro columnas principales; si existen registros visibles para tu usuario, la pantalla puede mostrar un aviso con enlaces a la bandeja.

**Resultado esperado**

- Visión rápida del pipeline documental coherente con tus permisos de visibilidad y con los mismos registros que la bandeja de documentos.

### 7.3 Exportar a Excel o PDF (solo ADMIN)

Los reportes usan los **mismos filtros** aplicados arriba (no exportan solo la página visible: el servidor arma el conjunto filtrado completo dentro de un tope configurado).

**Acción**

1. Ajusta filtros y pulsa **Aplicar filtros** (recomendado para acotar el resultado).
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

### 7.4 Crear documento (`DOC_CREATE` + `DOC_FILES_UPLOAD`, o ADMIN)

1. Menú → **Nuevo documento** (ruta `/documentos/nuevo`) o, desde **Documentos**, el botón **Nuevo documento** en la cabecera (ambos abren el **mismo** asistente).
2. Se requieren permisos de **crear** y de **cargar archivos**. Si falta la carga de archivos, el sistema muestra un aviso y no inicia el registro incompleto.
3. **Paso 1 — Archivo:** seleccione un **PDF** (máx. 50 MB). Sin archivo válido no puede continuar. Puede cambiar o eliminar la selección.
4. **Paso 2 — Información:** complete metadatos (código/correlativo, asunto, **tipo documental**, dependencia propietaria, contraparte, beneficiario, responsable institucional, confidencialidad, estado inicial, fechas y descripción). Los desplegables provienen del catálogo. El **código** lo asigna el servidor si no lo edita (**Correlativo servidor**). No se solicita Serie ni Subserie. La **dependencia propietaria** solo es seleccionable por **ADMIN** / **SUPERADMIN**; el resto de usuarios ven su dependencia de cuenta en solo lectura (o «sin dependencia» si no tiene área asignada). El servidor rechaza cualquier intento de asignar un área ajena.
5. Pulse **Registrar documento**. El sistema:
   - crea el registro (`POST /documentos`);
   - sube automáticamente el PDF (`POST /documentos/:id/archivos`);
   - muestra confirmación y abre el **detalle** con el archivo ya en **Archivos digitales** (no hace falta «Subir archivo» otra vez).
6. Si el documento se crea pero falla la carga del archivo: verá **Reintentar carga** (solo el upload, sin duplicar el registro) e **Ir al documento**.

**Resultado esperado**
- El detalle muestra `v1` del PDF adjunto y la vista previa puede usar ese archivo.

**Nota:** En el detalle sigue existiendo **Subir archivo** para versiones posteriores. **Aprobar** / **Rechazar** solo en el detalle. Un documento **Archivado** no admite subir ni eliminar adjuntos.

---

## 8. Detalle del documento

> El archivo inicial ya se adjunta en el asistente de **Nuevo documento**. En el detalle puede subir **nuevas versiones** o gestionar adjuntos existentes.

### 8.1 Abrir el detalle

1. En el listado de Documentos, haz clic sobre un registro (o usa **Ver**).
2. El sistema navega a `/documentos/:id`.

La pantalla se organiza en dos columnas (en escritorio), con el mismo estilo de **tarjetas** que el panel y la bandeja:

- **Cabecera de flujo:** asunto, fecha, quien registró y, si aplica, **Enviar a revisión** (requiere permiso `DOC_REVISION_SEND` y ser el registrador o un administrador) / **Aprobar** / **Rechazar** (rol **REVISOR**, **ADMIN** o **SUPERADMIN** y permiso **`DOC_REVISION_RESOLVE`**). Si el documento está **Aprobado**, un **ADMIN** / **SUPERADMIN** con **`DOC_UPDATE`** verá **Archivar documento** (confirmación sencilla; no pide motivo de desbloqueo).
- **Izquierda — Vista previa:** muestra **el contenido real** del archivo activo de **mayor versión** cuando es **PDF**, descargado de forma segura con tu sesión (requiere **`DOC_FILES_DOWNLOAD`**). Si el archivo pesa más de **20 MB**, el sistema solo muestra un aviso informativo (para no saturar la memoria del navegador) y debe usarse **Descargar** para verlo completo (la descarga permite hasta ~50 MiB, coherente con el límite de subida). **Solo se permiten subidas nuevas en PDF**; archivos históricos de otros tipos (si existieran) pueden verse con **Descargar**. Si no hay adjuntos o falla la carga, verá mensajes aclaratorios en pantalla; debajo, **fecha** y **descripción** del registro. Más abajo, **Archivos digitales** (cada versión en una tarjeta): **Subir archivo** aparece si tienes **`DOC_FILES_UPLOAD`**; **Eliminar** una versión solo para **ADMIN** / **SUPERADMIN**; **Descargar** requiere **`DOC_FILES_DOWNLOAD`**; **Historial** del archivo requiere **`DOC_FILES_READ`**. En estados **En revisión**, **Aprobado** o **Archivado**, subir/eliminar quedan bloqueados hasta desbloqueo formal.
- **Derecha — Metadatos:** tipo documental; confidencialidad; **dependencia responsable**; **contraparte**; **beneficiario**; **responsable institucional**; **fecha de emisión**; **fecha de vencimiento** (si aplica); **fecha de registro** automática del sistema. Botones **Descargar** (si tiene **`DOC_FILES_DOWNLOAD`**, última versión activa), **Editar** (solo **ADMIN** / **SUPERADMIN** con `DOC_UPDATE` y documento **no** congelado — en **Aprobado** / **En revisión** / **Archivado** no aparece) y **Ver historial** (desplaza a la tarjeta inferior).
- **Derecha — Historial y trazabilidad:** línea de tiempo con los eventos del documento (fechas y usuario).

Si tu usuario es **ADMIN**, dentro de la tarjeta **Vista previa** verás además el bloque **Acceso al documento (ACL)**:

- **INHERIT**: usa las reglas habituales del sistema (dependencia + confidencialidad + propiedad) para determinar visibilidad.
- **RESTRICTED**: el documento queda visible solo para **ADMIN** y para los **usuarios/roles** que selecciones en la lista. Útil para evitar exposición accidental (prevención de **IDOR**) cuando un expediente debe compartirse con un grupo reducido.
- **Guardar acceso**: aplica el cambio de inmediato; si eliges **RESTRICTED** y no seleccionas nadie, el documento deja de aparecer para usuarios no administradores.
- **Aclaración (roles):** los **roles** del ACL solo cruzan con los roles que cada usuario **ya tiene** en su cuenta en el servidor. Aquí **no** se otorga el rol global **Administrador**. Para hacer administrador del sistema a alguien, use **Administración → Usuarios y roles**, **Editar** y cambie roles (solo un usuario que ya sea **ADMIN**).

En el mismo detalle puedes revisar **dependencia propietaria** y **nivel de confidencialidad**. Si eres **ADMIN** o **SUPERADMIN**, presiona **Editar** en **Metadatos**, ajusta los campos y **Guardar** en el diálogo cuando la pantalla lo muestre.

### 8.1.1 Envío y resolución de revisión (flujo MVP)

Cuando el documento está en estado **Registrado** (o **Rechazado**, para reenviar):

1. Quien lo **registró** o un usuario con acceso administrativo (**ADMIN** / **SUPERADMIN**) puede pulsar **Enviar a revisión** / **Reenviar a revisión** si además tiene el permiso **`DOC_REVISION_SEND`**. El estado pasa a **En revisión**. Detalle técnico: [MATRIZ_WORKFLOW_ESTADOS_DOCUMENTALES.md](./MATRIZ_WORKFLOW_ESTADOS_DOCUMENTALES.md).

Cuando está **En revisión**:

1. Un usuario con rol **REVISOR**, **ADMIN** o **SUPERADMIN** y permiso **`DOC_REVISION_RESOLVE`** puede pulsar **Aprobar** o **Rechazar**. No se puede cambiar a esos estados (ni a **En revisión**) editando el documento (PATCH).
2. Si pulsas **Rechazar**, se abre un diálogo donde debes escribir el **motivo del rechazo** (obligatorio, mínimo 3 caracteres, máximo 2000); el texto queda registrado en **Auditoría** junto con la decisión.

### 8.1.2 Desbloqueo para corrección (estados protegidos)

Cuando el documento está **En revisión**, **Aprobado** o **Archivado**, el contenido (metadatos y archivos) queda **congelado**. No se edita ni se suben/eliminan archivos hasta desbloquear.

1. Un **SUPERADMIN**, o un **ADMIN** al que el SUPERADMIN haya otorgado el permiso **`DOC_UNLOCK`**, verá el botón **Desbloquear para corrección**.
2. Confirme en el diálogo (advertencia + **motivo obligatorio**) → el estado pasa a **Registrado**. La aprobación anterior, si existía, **permanece en el historial/auditoría** pero deja de ser el estado vigente.
3. Tras desbloquear, la edición y los archivos vuelven a exigir los permisos normales (`DOC_UPDATE`, subida de archivos, etc.). Debe **enviar de nuevo a revisión** antes de una nueva aprobación.
4. Detalle técnico: [MATRIZ_DESBLOQUEO_DOCUMENTAL.md](./MATRIZ_DESBLOQUEO_DOCUMENTAL.md).

### 8.1.3 Archivar un documento aprobado

**Archivar** no es lo mismo que **desbloquear**.

1. Con el documento en estado **Aprobado**, un **ADMIN** / **SUPERADMIN** con permiso **`DOC_UPDATE`** pulsa **Archivar documento**.
2. Confirma en el diálogo (**Cancelar** / **Archivar**). No se pide motivo de desbloqueo.
3. El sistema envía solo el cambio de estado a **Archivado**. El documento queda en solo lectura; para corregirlo después use **Desbloquear para corrección** (`DOC_UNLOCK`).

**Consulta rápida de pendientes**

- En **Documentos**, filtra **Estado → En revisión**. Si tienes rol **REVISOR**, el listado muestra una nota de ayuda con este mismo consejo.

**Resultado esperado**

- Estados y trazas coherentes en el **Historial** del documento y en **Auditoría** (acciones como envío/resolución de revisión y **desbloqueo** cuando el administrador revise la bitácora).

**Fallos típicos**

- **403** al resolver: tu usuario no es **REVISOR**, **ADMIN** ni **SUPERADMIN**, o no tiene **`DOC_REVISION_RESOLVE`**.
- **403** al enviar: falta **`DOC_REVISION_SEND`**, o no eres quien registró el documento (salvo ADMIN/SUPERADMIN).
- **403** al desbloquear: falta **`DOC_UNLOCK`** (ADMIN sin delegación) o rol no autorizado.
- Estado incorrecto (p. ej. ya archivado o no está en «Registrado»): el backend rechaza la operación con un mensaje de validación.
- Rechazo **sin motivo** o motivo demasiado corto: validación del servidor (**400**) o mensaje en el propio diálogo antes de confirmar.
- Intentar editar un documento congelado sin desbloquear: **400** del servidor.

### 8.2 Sección “Archivos digitales” (adjuntos)

> Esta sección está en la tarjeta **Vista previa** del detalle del documento. No aparece en Inicio.

#### 8.2.1 Subir archivo (`DOC_FILES_UPLOAD`)

1. Dentro del detalle del documento, en **Vista previa**, ubica **Archivos digitales**.
2. Presiona **Subir archivo** (disponible en **Borrador**, **Registrado** o **Rechazado**; no en **En revisión**, **Aprobado** ni **Archivado**).
3. Selecciona un **PDF** (`.pdf`, máx 50 MB). Si el archivo es demasiado grande, verá un mensaje claro (no un error técnico 413).

**Resultado esperado**
- El archivo aparece como `v1` (o `v2`, `v3` si ya existía el mismo nombre).

#### 8.2.2 Descargar archivo (JWT)

1. En el archivo listado, presiona **Descargar**.

**Resultado esperado**
- Se descarga el binario y se registra un evento `DESCARGADO`.

#### 8.2.3 Ver historial del archivo (JWT)

1. Presiona **Historial**.

**Resultado esperado**
- Se abre el diálogo **Historial del archivo** con una tarjeta por evento.
- Etiquetas legibles: **Archivo subido**, **Archivo descargado**, **Archivo eliminado** (no códigos crudos ni bloques JSON).
- Fecha/hora en formato local (p. ej. `30 ago 2026 · 15:10`), usuario, y según el evento: nombre de archivo, versión, tipo (PDF/Word/…), tamaño (MB/KB) u origen/IP normalizado (p. ej. **Equipo local · 127.0.0.1**).
- El hash SHA-256, si existe, queda en **Información técnica** (colapsada) con opción **Copiar**.

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
3. Pulse **Consultar** para aplicar filtros y cargar la tabla (antes de consultar, los cambios en los campos no actualizan el listado). El listado muestra **10 registros por página** por defecto. Arriba puede verse el bloque **Estadísticas por usuario** (semáforo verde/ámbar/rojo según actividad reciente). En cada fila, **Ver detalle** abre un diálogo con fecha, usuario, acción, resultado, recurso, origen (IP normalizada) y **Detalle adicional** en etiquetas legibles (decisión, motivo, transición de estado, etc.); **no** se muestra JSON crudo. El listado usa el **icono de auditoría** del menú (no una letra «A») y chips de resultado **Correcto** / **No completado** según el tema. Opcional: icono **Actualizar** en la cabecera para repetir la consulta con los mismos filtros y página actual.
4. Opcional: **Exportar Excel** o **Exportar PDF** (requieren permiso **`AUDIT_EXPORT`** además de rol ADMIN) descargan hasta **5000** registros recientes que cumplan **los filtros ya aplicados**.

**Resultado esperado**

- Lista paginada de eventos (`audit_logs`).
- Si **Desde** es posterior a **Hasta**, o las fechas no son válidas, el servidor responde **400** y no carga resultados.
- Columna **Usuario** muestra nombre preferente cuando el actor está enlazado a un usuario del sistema (si no, el correo registrado en el evento o guion).
- **Documento / recurso** muestra el **código institucional del expediente** (p. ej. <code>SIS-2026-…</code>) cuando el backend puede resolverlo desde el documento o desde <code>documentoId</code> en metadatos; si no aplica, puede mostrarse “—” o una referencia técnica abreviada al UUID.
- Cada exportación deja constancia en auditoría (`REPORT_EXPORTED`).

**Posibles fallos**

- **403 / vacío:** el usuario no es ADMIN, no tiene permiso de consulta de auditoría o el token expiró (vuelve a iniciar sesión).
- **400 en consulta/export:** revise que **Desde** no sea posterior a **Hasta** y que las fechas sean válidas.

---

## 11. Respaldos y seguridad (solo ADMIN)

1. Menú lateral → **Administración** → **Respaldos** (ruta `/admin/respaldos`).
2. El **servidor puede programar mysqldump** (cron dentro del proceso API) usando variables en `backend/.env` (`BACKUP_AUTOMATED_*`, `BACKUP_MYSQLDUMP_PATH`, etc. — véase **`backend/.env.example`**, checklist en **`scripts/README-backups-mysql-xampp.md`** y, para añadir el bloque automáticamente en una copia nueva del repo, **`scripts/configure-local-backups.ps1`**). Tras cambiar `.env`, **reinicie el proceso del backend** para que el cron quede registrado.
3. **Copia desde la UI:** puede pulsar **Ejecutar mysqldump ahora (manual)**; llama `POST /api/v1/backup/admin/run-now` y escribe artefactos en disco (`BACKUP_OUTPUT_DIR`). Opcionalmente el job incluye un **ZIP de `storage/`** si `BACKUP_INCLUDE_STORAGE_ZIP=true`. Requiere permiso `BACKUP_RUN` (además de rol ADMIN/SUPERADMIN).
4. **Restauración** no se ejecuta desde el navegador: sigue siendo procedimiento institucional (MySQL CLI + recuperación de `storage/`).
5. **Datos en pantalla:** `GET /api/v1/dashboard/admin/backup-overview` (solo ADMIN): historial hasta 50 filas de **`BACKUP_VERIFIED`** (OK o FAIL), columna **Origen** (Manual vs Automático según `meta.source`), KPIs 90 días y señal de cron activo. Los bloques usan **iconos de sección** (mismo estilo que Auditoría) y chips **Verificado** / **Fallido** según el tema claro/oscuro. El evento **OK del job automático** significa que `mysqldump` terminó bien y el archivo tiene tamaño mayor a cero; **no** es un hash SHA-256 ni una prueba de restauración. El registro manual es una declaración del administrador.
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
3. Pulse **Generar** para aplicar los filtros al gráfico **Documentos por tipo** (máx. 6 tipos con más volumen en el mes; barras con colores del tema) y para las exportaciones de inventario.
4. En **Reporte de documentos por usuario** (sección principal):
   - Elija **Periodo**, **Usuario** (todos o persona: «Nombres Apellidos — correo»), **Área**, **Tipo**, **Estado** (Borrador / Registrado / En revisión / Aprobado / Rechazado / Archivado) y **Formato**.
   - Pulse **Generar reporte**.
   - Revise las tarjetas KPI (total, aprobados, rechazados, en revisión, registrados) calculadas en el servidor.
   - Si eligió **Todos los usuarios**, verá además **Resumen por usuario**.
   - En **Detalle de documentos** aparecen código, asunto, tipo, dependencia, creador, estado (chip), revisor, fecha de revisión y motivo de rechazo (solo si el estado es Rechazado; proviene de la auditoría `DOC_REVIEW_RESOLVED`).
   - Use **Ver** para abrir el expediente existente (`/documentos/:id`).
   - Exporte el mismo resultado filtrado a **PDF** o **Excel** (el Excel incluye hoja «Resumen por usuario»).
5. En **Reportes disponibles** puede:
   - Descargar inventario en **PDF / XLSX** (respeta filtros aplicados).
   - Descargar **auditoría** en PDF/XLSX (rango del periodo).
   - **Pendientes de revisión** (PDF/XLSX).
   - **Documentos por área (agregado)** — totales por dependencia (XLSX).
   - **Documentos por estado** — resumen del ciclo de vida (XLSX).
   - **Usuarios y roles activos** (XLSX).
   - **Actividad de revisión documental** — envíos y resoluciones (XLSX).
   - **Próximos vencimientos** — documentos que vencen en 30 días (XLSX).
   - **Verificaciones de respaldo:** atajo con filtro `BACKUP_VERIFIED` o pantalla **Respaldos**.
   - **Trazabilidad por documento:** use el detalle del expediente.

**Posibles fallos**

- **403:** el usuario no es ADMIN para indicadores o exports administrativos.
- Gráfico vacío: no hay documentos activos en el periodo para el ámbito del administrador.
- Reporte por usuario vacío: no hay documentos activos que cumplan periodo/usuario/área/tipo/estado; el mensaje indica «No existen documentos para los filtros seleccionados.»
- Motivo de rechazo en «—»: el documento no está rechazado o no hay evento `DOC_REVIEW_RESOLVED` con `motivoRechazo` en auditoría.

---

## 13. Configuración de seguridad (solo ADMIN)

1. Menú lateral → **Administración** → **Configuración** (ruta `/admin/configuracion`).
2. La pantalla tiene dos columnas:
   - **Autenticación y acceso:** solo muestra valores **que el servidor aplica hoy** (longitud mínima de contraseña, bloqueo de cuenta, sesión, límite de intentos en login). **No** permite cambiar esos valores desde la web; el ajuste técnico corresponde a la configuración del servidor.
   - **Protecciones del sistema:** medidas activas (chips **Activa** / **No activo** del tema; detalle ASVS/JWT en tooltip ℹ️).
3. Para dejar constancia de una **revisión institucional** (ISO 15489), escriba notas al final de la columna izquierda y pulse **Registrar revisión**.
4. Debe aparecer el mensaje *Revisión registrada. La constancia quedó en auditoría junto con el estado verificado del servidor.*

**Importante**

- Sí aparecen los controles operativos:
  - **Historial de contraseñas** (reuso según política).
  - **MFA para administradores (TOTP)** (requerimiento de segundo factor).
  La pantalla usa **Registrar revisión** para evidencia institucional; no promete cambios futuros en el servidor desde la web.
- El límite de intentos en la pantalla de ingreso es **distinto** del bloqueo de cuenta; ambos se listan en la columna izquierda.
- El mínimo de contraseña suele ser **8 caracteres** al crear usuarios o restablecer clave.

---

## 14. Cierre de sesión

1. En la barra superior, abre el menú del usuario.
2. Presiona **Cerrar sesión**.

**Resultado esperado**
- Se limpia la sesión y vuelves a `/login`.

---

## 15. Checklist de uso “de principio a fin” (resumen rápido)

1. Login
2. (ADMIN) Crear catálogos: dependencias/cargos/tipos documentales
3. (ADMIN) Crear documento (tipo documental, dependencia y confidencialidad si aplica)
4. Opcional: **Trámites** (Kanban)
5. Abrir detalle del documento
6. (ADMIN) Subir archivo y generar versión
7. Descargar y revisar historial
8. (ADMIN) Revisar o exportar **Auditoría** si necesitas evidencia sistémica
9. (ADMIN) Opcional: **Respaldos** para recordatorio de procedimiento (copias reales fuera del SGD web)
10. (ADMIN) Opcional: **Reportes** (gráficos e inventario/auditoría exportables)
11. (ADMIN) Opcional: **Configuración** (transparencia de políticas técnicas)
12. Logout

