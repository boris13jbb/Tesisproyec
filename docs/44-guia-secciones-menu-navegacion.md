# Guía detallada — Secciones del menú lateral (SGD-GADPR-LM)

**Audiencia:** usuarios operativos, administradores (**ADMIN**), revisores (**REVISOR**) y evaluadores de la tesis.  
**Objetivo:** explicar **qué contiene cada entrada del menú**, **cómo funciona**, **quién puede usarla** y **cómo se relaciona con el resto del sistema.  
**Última revisión:** 2026-05-26 — alineada con `frontend/src/layouts/MainLayout.tsx` y rutas en `frontend/src/app/App.tsx`.

**Documentos relacionados:** [Manual de usuario](./27-manual-usuario-sgd-gadpr-lm.md) (pasos operativos) · [Glosario](./43-glosario-terminos.md) (definiciones) · [Módulo documentos](./12-modulo-documentos.md) · [Roles y permisos](./07-modulo-roles-permisos.md).

---

## 1. Visión general del menú

Tras iniciar sesión, el sistema muestra un **menú lateral fijo** (en pantallas pequeñas se abre con el icono ☰ de la barra superior). El menú está dividido en **tres bloques**:

| Bloque | Visible para | Propósito general |
|--------|----------------|-------------------|
| **Menú** | Todos los usuarios autenticados | Operación diaria: panel, expedientes, flujo, clasificación y alta de documentos. |
| **Administración** | Solo rol **ADMIN** | Gobierno del sistema: identidades, evidencia, respaldos, reportes y políticas. |
| **Catálogos** | Solo rol **ADMIN** | Datos maestros que alimentan el registro documental (dependencias, cargos, tipos, series). |

### 1.1 Mapa rápido: menú → ruta

| Entrada del menú | Ruta | Rol mínimo |
|------------------|------|------------|
| Inicio | `/` | Cualquier usuario autenticado |
| Documentos | `/documentos` | Autenticado (+ permiso efectivo `DOC_READ` en API) |
| Trámites | `/tramites` | Autenticado (misma visibilidad que documentos) |
| Clasificación | `/clasificacion` | Autenticado (solo lectura) |
| Nuevo documento | `/documentos/nuevo` | **ADMIN** o quien tenga `DOC_CREATE` |
| Usuarios y roles | `/admin/usuarios` | **ADMIN** |
| Auditoría | `/admin/auditoria` | **ADMIN** |
| Respaldos | `/admin/respaldos` | **ADMIN** |
| Reportes | `/admin/reportes` | **ADMIN** |
| Configuración | `/admin/configuracion` | **ADMIN** |
| Dependencias | `/catalogos/dependencias` | **ADMIN** |
| Cargos | `/catalogos/cargos` | **ADMIN** |
| Tipos documentales | `/catalogos/tipos-documentales` | **ADMIN** |
| Series | `/catalogos/series` | **ADMIN** |
| Subseries | `/catalogos/subseries` | **ADMIN** |

### 1.2 Qué no está en el menú pero es importante

- **Mi perfil** (`/perfil`): menú del **correo** en la barra superior → *Mi perfil*.
- **Cerrar sesión**: mismo menú superior.
- **Detalle de un documento** (`/documentos/:id`): se abre desde listados, trámites o clasificación; no tiene entrada propia en el menú.
- **Login / recuperar contraseña**: fuera del layout principal (`/login`, `/recuperar`, `/restablecer`).

### 1.3 Regla de seguridad (importante)

Ocultar una opción en el menú **no** autoriza por sí sola. El **backend** valida JWT, roles (`@Roles`) y permisos (`@Permissions`) en cada operación. Si un usuario escribe una URL manualmente sin permiso, verá **403** (página *Forbidden*) y puede quedar registro **`AUTHZ_FORBIDDEN`** en auditoría.

---

## 2. Bloque «Menú» (operación diaria)

Este bloque es el corazón del SGD para el personal que consulta, registra o hace seguimiento a expedientes.

---

### 2.1 Inicio

**Ruta:** `/`  
**Pantalla:** Panel principal (`DashboardPage`).

#### Qué hay en esta sección

Es el **tablero de bienvenida** después del login. Resume la actividad del sistema y ofrece accesos rápidos a documentos recientes.

| Elemento | Descripción | Quién lo ve |
|----------|-------------|-------------|
| Tarjetas de totales | Cantidad de **documentos** y **pendientes de revisión** (estado *En revisión*), actualizados desde el servidor. | Todos |
| Tarjetas **Usuarios** y **Alertas** | Conteos y avisos operativos (revisiones pendientes, 403 recientes, logins fallidos, respaldo sin verificar, salud API/BD). | Solo **ADMIN** |
| **Actualizar ahora** | Fuerza una nueva consulta al API sin esperar el intervalo automático. | Todos (datos según rol) |
| **Indicadores operativos de seguridad** | Barras con métricas de los últimos 30 días (definición operativa en subtítulo; **no** certificación ISO) + último respaldo verificado. | Solo **ADMIN** |
| **Estado del servicio** | Comprueba que API y base de datos respondan (`GET /health`). | Solo **ADMIN** |
| Tabla de **expedientes recientes** | Últimos documentos visibles para el usuario con enlace al detalle. | Todos (filtrado por visibilidad) |
| Enlace **Ver documentos** | Atajo al listado completo. | Todos |

#### Cómo funciona (técnicamente)

1. Al cargar la pantalla, el cliente llama **`GET /api/v1/dashboard/summary`** con el token de sesión.
2. Si el usuario es **ADMIN**, además puede ejecutarse sondeo de **`GET /health`** en segundo plano.
3. Los números **no son estáticos**: cambian al pulsar *Actualizar ahora* o al vencer el intervalo de refresco automático.
4. Opcionalmente el sistema registra métrica de rendimiento **LCP** del panel (`CLIENT_WEB_VITAL_LCP` en auditoría) para evidencia de usabilidad.

#### Flujo de uso típico

1. Ingresar al sistema → llegas a **Inicio**.
2. Revisar si hay pendientes de revisión (tarjeta o alertas si eres ADMIN).
3. Abrir un expediente desde la tabla reciente o ir a **Documentos**.

#### Fallos frecuentes

- Totales en cero con documentos existentes: tu usuario no tiene visibilidad (dependencia/confidencialidad) o no hay registros activos.
- «No se pudo conectar con la API»: backend apagado o proxy incorrecto (ver manual §2.2).

---

### 2.2 Documentos

**Ruta:** `/documentos`  
**Pantalla:** Listado y bandeja documental (`DocumentosPage`).

#### Qué hay en esta sección

Es la **consola principal de expedientes**: buscar, filtrar, paginar, exportar (según rol) y abrir el detalle de cada registro.

| Zona de la pantalla | Contenido |
|---------------------|-----------|
| **Filtros** | Texto libre (`q`), estado, tipo documental, serie/subserie, rango de fechas, criterios por adjunto (nombre, MIME, hash). |
| **Aplicar filtros** | Envía los criterios al servidor; la tabla se recarga paginada. |
| **Tabla** | Código, asunto, estado, clasificación (serie/subserie), responsable/dependencia, fechas, acciones (*Ver*). |
| **Paginación** | Anterior / siguiente, total de registros y rango visible. |
| **Exportar Excel / PDF** | Descarga el conjunto filtrado (hasta tope del servidor, p. ej. 5000 filas). | Solo **ADMIN** |
| **Pendientes revisión (Excel/PDF)** | Exporta solo documentos en **En revisión**. | **ADMIN** y **REVISOR** |
| **Nuevo documento** | Botón hacia el formulario de alta (si tienes permiso). | **ADMIN** o `DOC_CREATE` |
| **Registrar documento** (panel/cuadro) | Formulario rápido de alta en la misma pantalla (misma lógica que *Nuevo documento*). | Quien pueda crear |

#### Cómo funciona la visibilidad

El listado **no muestra todo el archivo institucional** a cualquier usuario. El servidor aplica, entre otras reglas:

- **Dependencia** del documento vs dependencia del usuario (salvo **ADMIN**).
- **Nivel de confidencialidad** (`PUBLICO`, `INTERNO`, `RESERVADO`, `CONFIDENCIAL` — este último muy restringido).
- **Política de acceso** del documento (`INHERIT` o `RESTRICTED` con listas ACL).

Por eso dos usuarios con el mismo rol pueden ver **listas distintas**.

#### Búsqueda (`q`)

El texto libre busca en paralelo en: código, asunto, descripción, dependencia, quien registró, tipo documental y clasificación (serie/subserie). Es la herramienta más usada para localizar un expediente sin conocer el ID interno.

#### Estados en el filtro

Coinciden con el catálogo formal del ciclo de vida:

`Borrador` · `Registrado` · `En revisión` · `Aprobado` · `Rechazado` · `Archivado`

Cada cambio de estado válido se valida en servidor (`documento-estado.util.ts`).

#### Relación con otras pantallas

- **Trámites:** misma población de documentos, vista Kanban por estado.
- **Clasificación:** agregados por serie/subserie de los documentos **que ya ves** aquí.
- **Detalle** (`/documentos/:id`): edición, adjuntos, revisión, historial.

#### Fallos frecuentes

- Lista vacía: filtros demasiado estrictos, sin permiso `DOC_READ`, o sin documentos en tu ámbito.
- Exportación denegada: usuario no ADMIN (salvo export de pendientes para REVISOR).
- Página lenta: muchos registros; acota fechas o estado antes de exportar.

---

### 2.3 Trámites

**Ruta:** `/tramites`  
**Pantalla:** Tablero Kanban de flujo (`FlujoTramitePage`).

#### Qué hay en esta sección

Vista **visual del pipeline** documental: cuatro columnas que representan etapas del trámite institucional.

| Columna | Estado en BD | Significado operativo |
|---------|--------------|------------------------|
| **Registrado** | `REGISTRADO` | Expediente formalizado, listo para iniciar revisión u otros trámites. |
| **En revisión** | `EN_REVISION` | Esperando decisión de **REVISOR** o **ADMIN**. |
| **Aprobado** | `APROBADO` | Revisión favorable; puede archivarse después. |
| **Archivado** | `ARCHIVADO` | Cierre de ciclo operativo (estado terminal en MVP). |

Cada **tarjeta** muestra: código del documento, tipo documental, asunto resumido y dependencia.

#### Cómo funciona

1. Al abrir la pantalla (o pulsar **Actualizar**), el cliente llama **`GET /api/v1/documentos/tablon-tramites`**.
2. El servidor devuelve hasta **150 documentos por columna** (tope de esta vista), ya filtrados por tu visibilidad.
3. **No es un tablero de arrastrar y soltar**: es **solo lectura** para posicionamiento; las transiciones de estado se hacen en el **detalle del documento** (botones *Enviar a revisión*, *Aprobar*, *Rechazar*, cambio de estado ADMIN, etc.).
4. Al hacer clic en una tarjeta, navegas a **`/documentos/:id`**.

#### Estados fuera del Kanban

**Borrador** y **Rechazado** no tienen columna propia. Si existen documentos visibles en esos estados, la pantalla puede mostrar un **aviso** con enlace a **Documentos** filtrando por ese estado.

#### Para quién sirve

- **REVISOR / ADMIN:** panorama rápido de la cola *En revisión*.
- **USUARIO / EDITOR_DOC:** seguimiento del estado de sus expedientes sin usar solo la tabla.
- **CONSULTA:** lectura del flujo en la medida de su visibilidad.

#### Fallos frecuentes

- Columna vacía con documentos en listado: revisar filtros de visibilidad o que el estado en BD no sea el esperado.
- Más de 150 ítems: el aviso indica usar **Documentos** con filtro por estado.

---

### 2.4 Clasificación

**Ruta:** `/clasificacion`  
**Pantalla:** Cuadro de clasificación documental (`ClasificacionDocumentalPage`).

#### Qué hay en esta sección

Herramienta de **consulta archivística** (ISO 15489): muestra la **estructura** serie → subserie y estadísticas **derivadas de expedientes reales**, sin modificar catálogos.

| Zona | Función |
|------|---------|
| **Árbol izquierdo — Estructura documental** | Series activas y sus subseries (mismo catálogo que en *Catálogos*). |
| **Ficha de clasificación** (al seleccionar nodo) | Código, nombre, descripción del catálogo + métricas de expedientes visibles para ti. |
| **Métricas derivadas** | Cantidad de expedientes activos bajo esa serie/subserie; dependencia predominante; nivel de confidencialidad más frecuente. |
| **Conservación (plazo / destino)** | Texto honesto si el modelo aún no tiene política de retención en BD (no inventa años). |
| **Tabla de retención** (abajo) | Una fila por serie activa con recuento de expedientes visibles; columnas retención/destino en *pendiente* hasta modelar datos. |
| **Enlaces ADMIN** | Accesos rápidos a mantenimiento de **Series** y **Subseries**. |

#### Cómo funciona

1. **Actualizar** recarga catálogo + **`GET .../clasificacion-agregados`**.
2. Los conteos usan las **mismas reglas de privacidad** que el listado de **Documentos** (no filtra “en UI” de forma distinta).
3. Es **solo lectura** para roles no administrativos: no crea series ni mueve documentos.

#### Diferencia con «Catálogos → Series/Subseries»

| Clasificación | Catálogos (Series/Subseries) |
|---------------|------------------------------|
| Consulta y métricas de uso | Alta, edición y baja lógica de nodos del árbol |
| Enfocada en expedientes existentes | Enfocada en definición institucional del árbol |
| Todos (lectura) | Solo **ADMIN** |

#### Fallos frecuentes

- Árbol vacío: no hay series/subseries **activas** (un ADMIN debe crearlas en Catálogos).
- Expedientes = 0 en ficha: normal si aún no hay documentos clasificados bajo ese nodo para tu cuenta.

---

### 2.5 Nuevo documento

**Ruta:** `/documentos/nuevo`  
**Pantalla:** Formulario de registro (`NuevoDocumentoPage`).

#### Quién la ve en el menú

Aparece bajo el bloque **Menú** si:

- Eres **ADMIN**, o
- Tu cuenta tiene el permiso **`DOC_CREATE`** (directo o por rol), según consulta a **`GET /rbac/me/permissions`**.

Si no cumples eso, la entrada **no se muestra** (pero la API también rechazaría un alta no autorizada).

#### Qué hay en el formulario

| Campo / bloque | Descripción |
|----------------|-------------|
| **Código** | El servidor puede **asignar correlativo automático** (`DOC-0001`, `DOC-2026-00001`, etc.). Solo ADMIN puede fijar código manual distinto. |
| **Asunto / descripción / fecha** | Metadatos obligatorios o recomendados del expediente. |
| **Tipo documental** | Lista desde catálogo (`tipos_documentales`). |
| **Serie y subserie** | Clasificación archivística obligatoria en MVP. |
| **Estado inicial** | **Registrado** o **Borrador** (únicos permitidos al crear). |
| **Dependencia propietaria** | Puede prellenarse desde la dependencia de tu usuario. |
| **Confidencialidad** | Por defecto *Interno*; define quién podrá ver el expediente después. |
| **Archivo adjunto** | PDF, imágenes u Office (DOCX/XLSX); límite ~50 MB; validación de extensión/MIME. |
| **Validaciones automáticas** | Panel que indica si extensión, nombre y metadatos cumplen reglas antes de guardar. |

#### Cómo funciona el guardado

1. El cliente envía **`POST /api/v1/documentos`** (y subida de archivo en flujo integrado o posterior según pantalla).
2. El servidor valida DTO, estado inicial, transiciones, permisos y unicidad de código.
3. Se crea fila en `documentos`, evento **`CREADO`** en `documento_eventos` y trazas en `audit_logs` cuando corresponda.
4. Tras guardar, normalmente redirige al listado o al detalle.

#### Prerrequisitos institucionales

Antes del primer alta útil, un **ADMIN** debe tener poblados **Catálogos** (tipos, series, subseries, y preferiblemente dependencias). Sin catálogo, los desplegables quedan vacíos.

#### Fallos frecuentes

- Código duplicado: elegir otro o dejar autoasignación.
- Catálogo vacío: completar **Tipos / Series / Subseries** en administración.
- 403 al guardar: sin permiso `DOC_CREATE` o sesión caducada.

---

## 3. Bloque «Administración» (solo ADMIN)

Visible únicamente si tu JWT incluye el rol **`ADMIN`**. Agrupa funciones de **gobierno, evidencia y cumplimiento** del SGD.

---

### 3.1 Usuarios y roles

**Ruta:** `/admin/usuarios`  
**Pantalla:** Administración de identidades (`UsuariosPage`).

#### Qué hay en esta sección

Dos grandes áreas en la misma página (diseño vertical a ancho completo):

**A) Directorio de usuarios institucionales**

| Función | Descripción |
|---------|-------------|
| Listado | Tabla con correo, nombre, dependencia, cargo, roles, estado (activo/suspendido), último ingreso. |
| **Crear usuario** | Alta con correo, contraseña temporal, roles, dependencia/cargo opcionales, permisos directos opcionales, invitación por correo si SMTP está configurado. |
| **Editar usuario** | Cambiar roles, dependencia, cargo, permisos directos. |
| **Activar / Desactivar** | Impide login sin borrar historial. |
| **Restablecer contraseña** | Define nueva contraseña administrativamente. |
| Chips **Activos / Total** | Resumen rápido del directorio. |

**B) Matriz rol ↔ permiso (base de datos)**

| Función | Descripción |
|---------|-------------|
| Selector de rol | `ADMIN`, `USUARIO`, `REVISOR`, `EDITOR_DOC`, `AUDITOR`, `CONSULTA`, etc. |
| Casillas por código de permiso | Marca qué puede hacer cada rol en el API (`DOC_READ`, `DOC_FILES_UPLOAD`, …). |
| **Guardar permisos del rol** | Persiste en `role_permissions`; audita **`ROLE_PERMISSIONS_UPDATED`**. |

También puede mostrarse una **matriz de referencia** (solo lectura) que compara roles vs módulos; no sustituye a la matriz persistida en BD.

#### Cómo funciona el modelo de permisos

Efecto real en API = **unión** de:

1. Permisos de **todos los roles** del usuario (`role_permissions`).
2. **Permisos directos** (`user_permissions`) — excepciones por persona.

Los **roles** siguen siendo obligatorios en la cuenta. Si un rol no tiene filas en BD, el usuario puede recibir **403** aunque el nombre del rol sea correcto en pantalla → ejecutar **seed** o guardar matriz.

Tras cambiar permisos directos o roles sensibles, conviene **cerrar sesión y volver a entrar** para refrescar el token.

#### Roles habituales del seed

| Rol | Uso típico |
|-----|------------|
| **ADMIN** | Control total; catálogos, usuarios, auditoría, respaldos. |
| **USUARIO** | Operación documental básica según matriz. |
| **EDITOR_DOC** | Complemento para editar metadatos y adjuntos sin ser ADMIN. |
| **REVISOR** | Resolver revisiones y exportar pendientes. |
| **AUDITOR / CONSULTA** | Consulta acotada según permisos asignados. |

#### Fallos frecuentes

- 403 en toda la administración: tu usuario perdió permisos de ADMIN en BD.
- Correo duplicado al crear: usar otro correo.
- Invitación no llega: revisar SMTP en `.env` del backend.

---

### 3.2 Auditoría

**Ruta:** `/admin/auditoria`  
**Pantalla:** Consulta de bitácora (`AuditoriaPage`).

#### Qué hay en esta sección

Visor de la tabla **`audit_logs`**: eventos de **seguridad y administración** del sistema (no sustituye el historial por documento en `documento_eventos`, pero se puede correlacionar).

| Control | Función |
|---------|---------|
| **Usuario** | Filtrar por actor (`actor_user_id`) o todos. |
| **Acción** | Código exacto (`AUTH_LOGIN_OK`, `DOC_STATE_CHANGED`, `REPORT_EXPORTED`, …). |
| **Desde / Hasta** | Rango de fechas. |
| **Consultar** | Aplica filtros y carga tabla paginada. |
| **Actualizar** | Repite consulta con mismos filtros. |
| **Exportar Excel / PDF** | Hasta 5000 registros con filtros aplicados; audita exportación. |

#### Columnas habituales de la tabla

- Fecha/hora · Usuario (nombre o correo) · Acción · Resultado (OK/FAIL) · Recurso · Documento/código expediente (si se puede resolver) · IP / detalles en metadatos.

#### Qué tipo de eventos incluye (ejemplos)

- Autenticación: login OK/FAIL, refresh, logout, reset password, cuenta bloqueada.
- Autorización: **`AUTHZ_FORBIDDEN`** (intentos de acceso denegado).
- Documentos: cambio de estado, envío/resolución de revisión, exportaciones.
- Usuarios: alta, edición, permisos directos, reset password.
- RBAC: **`ROLE_PERMISSIONS_UPDATED`**.
- Respaldos: **`BACKUP_VERIFIED`**, ejecución de backup.
- Política: **`SECURITY_POLICY_UPDATED`**.
- Rendimiento cliente: **`CLIENT_WEB_VITAL_LCP`** (métrica del panel).

#### Cómo se usa en la práctica

1. Investigar un incidente («¿quién descargó este expediente?») → filtrar acción relacionada y rango de fechas.
2. Evidencia de tesis → exportar PDF/Excel con filtros acotados.
3. Verificar bloqueos de login → `AUTH_LOGIN_FAIL` / eventos de cuenta bloqueada.

#### Fallos frecuentes

- Tabla vacía: filtros muy restrictivos o aún no hay eventos en el periodo.
- 403: no eres ADMIN.

---

### 3.3 Respaldos

**Ruta:** `/admin/respaldos`  
**Pantalla:** Respaldos y seguridad (`RespaldosSeguridadPage`).

#### Qué hay en esta sección

Centro de **continuidad y evidencia de copias** de la base de datos (y opcionalmente archivos en `storage/`).

| Elemento | Función |
|----------|---------|
| **Ejecutar mysqldump ahora (manual)** | Lanza backup inmediato vía API (`POST /backup/admin/run-now`); genera `.sql` en carpeta configurada (`BACKUP_OUTPUT_DIR`). |
| **ZIP de storage** (opcional) | Si `BACKUP_INCLUDE_STORAGE_ZIP=true`, empaqueta adjuntos junto al volcado SQL. |
| **Historial de verificaciones** | Lista verificaciones registradas (OK/FAIL), origen Manual/Automático, KPI 90 días (código de auditoría `BACKUP_VERIFIED` solo en export técnico). |
| **Registrar verificación manual** | Documenta que una copia fue probada o falló (FAIL exige notas/motivo). |
| **Programación / próximo respaldo** | Muestra hint textual y expresión cron si el backup automático está activo en el servidor. |
| **Ver procedimiento de restauración** / **Cómo probar un respaldo** | Diálogos orientativos; la restauración **no** se ejecuta desde el navegador. |

#### Cómo funciona el backup automático

- El proceso NestJS puede registrar un **cron** interno según variables `BACKUP_AUTOMATED_*` en `backend/.env`.
- Tras cambiar `.env`, hay que **reiniciar el backend**.
- Cada ejecución (manual o automática) debe dejar rastro auditable cuando se registra verificación.

#### Relación con Inicio

La tarjeta de **alertas** en el panel principal puede avisar si **no hay respaldo verificado** reciente; registrar verificación aquí limpia esa señal.

#### Fallos frecuentes

- mysqldump falla: ruta `BACKUP_MYSQLDUMP_PATH`, credenciales `DATABASE_URL`, permisos de carpeta.
- Tabla de historial vacía: aún no se registró ninguna verificación OK/FAIL.

---

### 3.4 Reportes

**Ruta:** `/admin/reportes`  
**Pantalla:** Reportes institucionales (`ReportesInstitucionalesPage`).

#### Qué hay en esta sección

Módulo de **análisis y exportación agregada** (distinto de los botones Excel/PDF dentro de *Documentos*).

| Elemento | Función |
|----------|---------|
| **Periodo (mes)** | Acota documentos y gráficos al mes elegido. |
| **Área (dependencia)** | Filtro opcional por dependencia propietaria. |
| **Tipo documental** | Filtro opcional. |
| **Formato preferido** | Limita botones PDF o XLSX visibles. |
| **Generar** | Aplica filtros y actualiza gráfico **Documentos por tipo** (hasta 6 tipos con más volumen). |
| **Inventario PDF / XLSX** | Exporta listado documental según filtros del periodo. |
| **Actividad por usuario** | PDF de auditoría en el rango de fechas del periodo. |
| **Trazabilidad por documento** | Enlace/guía hacia detalle del expediente. |
| **Verificaciones de respaldo** | Atajo a pantalla **Respaldos**. |

#### Cómo funciona

- Las exportaciones se generan **en el servidor** (ExcelJS / pdfkit), no en el navegador.
- Cada descarga deja evento **`REPORT_EXPORTED`** en auditoría con tipo (`documentos`, `auditoria`, etc.).
- Los datos respetan el rol **ADMIN** (visión amplia institucional en MVP).

#### Diferencia con exportes en «Documentos»

| En Documentos | En Reportes |
|---------------|-------------|
| Mismos filtros de la bandeja actual | Filtros por **mes**, área y tipo para inventario institucional |
| Enfoque operativo diario | Enfoque gerencial / evidencia periódica |
| Incluye «Pendientes revisión» para REVISOR | REVISOR no entra a esta pantalla de menú |

#### Fallos frecuentes

- Gráfico vacío: no hay documentos activos en el mes/ámbito seleccionado.
- 403: usuario no ADMIN.

---

### 3.5 Configuración

**Ruta:** `/admin/configuracion`  
**Pantalla:** Parámetros de seguridad (`ConfiguracionSeguridadPage`).

#### Qué hay en esta sección

Panel de **transparencia** de controles de seguridad **en uso** (no es configuración de catálogos ni de correo). Ver también [45-principio-ui-controles-reales.md](./45-principio-ui-controles-reales.md).

| Bloque | Contenido |
|--------|-----------|
| **Autenticación y acceso (solo lectura)** | Valores que el backend **aplica hoy** (`GET /auth/admin/security-summary`): longitud mínima, bloqueo de cuenta, sesión, límite de intentos en login. |
| **Registrar revisión** | Notas institucionales + `POST /auth/admin/security-policy` → auditoría **`SECURITY_POLICY_UPDATED`** con instantánea de valores verificados (no edita `.env`). |
| **Protecciones del sistema** | Lista de medidas activas en el despliegue (badge Activa / No activo); detalle ASVS/JWT en tooltip ℹ️. |

#### Cómo funciona (expectativas correctas)

- **No** hay formulario «política deseada» ni botón **Guardar política** que cambie el runtime.
- Ajustar bloqueo, JWT o backup automático sigue siendo responsabilidad de **configuración del servidor** (`.env`) y reinicio del backend cuando aplique.
- **No** se muestran MFA administrativo ni historial de contraseñas hasta que existan en código.

#### Qué no configura esta pantalla

- Catálogos documentales → **Catálogos** en el menú.
- SMTP / correo → variables de entorno del backend.
- Respaldos → pantalla **Respaldos**.

#### Fallos frecuentes

- «Registré revisión pero el login sigue igual»: es el comportamiento esperado; la revisión es **evidencia**, no cambio técnico inmediato.
- Cambiar lockout o duración de sesión: editar `.env` y reiniciar backend, no esta pantalla.

---

## 4. Bloque «Catálogos» (solo ADMIN)

Los catálogos son **datos maestros**: deben existir **antes** de registrar documentos coherentes. Todas las pantallas siguen un patrón similar:

- Tabla de registros activos/inactivos.
- **Crear** / **Editar** en diálogo o formulario.
- Campos típicos: **código** (único), **nombre**, **descripción** opcional, switch **activo**.
- API protegida con permisos de escritura (`DEPENDENCIAS_WRITE`, `SERIES_WRITE`, …).

---

### 4.1 Dependencias

**Ruta:** `/catalogos/dependencias`

#### Qué representa

Unidades organizativas del GADPR-LM (direcciones, áreas, parroquialización interna, etc.).

#### Para qué se usa en el SGD

- Asignar **dependencia** a usuarios (ámbito de visibilidad).
- Marcar **dependencia propietaria** de un documento.
- Filtrar reportes y agregados de clasificación («área responsable predominante»).

#### Cómo funciona

- CRUD vía API `/api/v1/dependencias` (solo ADMIN en UI).
- Desactivar una dependencia impide usarla en **nuevos** registros según reglas del formulario; documentos históricos conservan la referencia.

---

### 4.2 Cargos

**Ruta:** `/catalogos/cargos`

#### Qué representa

Puestos o funciones del servidor público (secretario, técnico, etc.).

#### Para qué se usa

- Completar el perfil institucional del usuario en **Usuarios y roles**.
- Mostrar contexto organizativo en directorio y reportes (cuando aplica).

#### Cómo funciona

- Opcionalmente vinculado a una **dependencia** (FK).
- Misma lógica de código único y estado activo.

---

### 4.3 Tipos documentales

**Ruta:** `/catalogos/tipos-documentales`

#### Qué representa

Tipologías del documento administrativo: memorando, oficio, informe, acta, etc.

#### Para qué se usa

- Campo obligatorio al **crear documento**.
- Filtros en **Documentos** y **Reportes**.
- Gráfico «documentos por tipo» en reportes institucionales.

#### Cómo funciona

- Cada documento enlaza exactamente un `tipo_documental_id`.
- Los códigos suelen ser cortos (`MEMO`, `OFICIO`) para reportes y exportaciones legibles.

---

### 4.4 Series

**Ruta:** `/catalogos/series`

#### Qué representa

Nivel superior del **cuadro de clasificación archivística** (fondos o series documentales).

#### Para qué se usa

- Estructura del árbol en **Clasificación**.
- Agrupación en tabla de retención (cuando existan políticas).
- Contexto organizativo del expediente (junto con subserie).

#### Cómo funciona

- Una serie tiene muchas **subseries** hijas.
- Solo registros **activos** aparecen en desplegables de alta documental.

---

### 4.5 Subseries

**Ruta:** `/catalogos/subseries`

#### Qué representa

Subdivisión concreta bajo una serie (la clasificación que realmente se asigna al documento en MVP).

#### Para qué se usa

- Campo de clasificación obligatorio en **Nuevo documento** / registro.
- Nodo seleccionable en árbol de **Clasificación**.
- Conteos de expedientes por subserie.

#### Cómo funciona

- Cada subserie pertenece a una **serie** (`serie_id`).
- Al crear documento se elige subserie (y por tanto serie implícita).
- Desactivar subserie afecta nuevos registros, no borra historial.

---

## 5. Pantallas transversales (fuera del menú lateral)

### 5.1 Detalle del documento (`/documentos/:id`)

No es entrada de menú, pero concentra la **operación fina** del expediente:

| Área | Funciones |
|------|-----------|
| Vista previa | PDF/imagen en navegador (límites de tamaño); lista de versiones de adjuntos. |
| Archivos digitales | Subir, descargar, historial, eliminar (según permisos `DOC_FILES_*`). |
| Metadatos | Ver/editar (`DOC_UPDATE`); confidencialidad; dependencia. |
| Flujo de revisión | Enviar a revisión · Aprobar · Rechazar (con motivo obligatorio). |
| ACL (ADMIN) | Política INHERIT vs RESTRICTED y listas de usuarios/roles autorizados. |
| Historial | Eventos `CREADO` / `ACTUALIZADO` y cambios JSON. |

### 5.2 Barra superior

- Título **SGD-GADPR-LM** y estado de sesión.
- Menú usuario: **Mi perfil**, **Cerrar sesión**.
- En móvil: botón para abrir el drawer del menú.

### 5.3 Migas de pan (breadcrumbs)

Debajo de la barra, muestra la ruta lógica (Inicio → Documentos → Detalle) para orientarse sin perder contexto.

---

## 6. Matriz resumida: «¿Quién puede qué en el menú?»

| Entrada | USUARIO | EDITOR_DOC | REVISOR | ADMIN |
|---------|---------|------------|---------|-------|
| Inicio | Sí | Sí | Sí | Sí (+ KPI admin) |
| Documentos | Si `DOC_READ` | Si `DOC_READ` | Si `DOC_READ` | Sí |
| Trámites | Sí* | Sí* | Sí* | Sí |
| Clasificación | Sí (lectura) | Sí | Sí | Sí (+ enlaces catálogo) |
| Nuevo documento | Si `DOC_CREATE` | Si `DOC_CREATE` | Según matriz | Sí |
| Administración (todas) | No | No | No | Sí |
| Catálogos (todos) | No | No | No | Sí |

\*Misma visibilidad de documentos que en el listado.

**Nota:** REVISOR puede exportar **Pendientes de revisión** desde **Documentos** aunque no vea el menú **Reportes**.

---

## 7. Orden recomendado de uso (primera puesta en marcha)

Para un entorno vacío, el flujo institucional lógico es:

1. **ADMIN** → Catálogos: Dependencias → Cargos → Tipos → Series → Subseries.  
2. **ADMIN** → Usuarios y roles: crear cuentas y ajustar matriz de permisos.  
3. **ADMIN** o editor → **Nuevo documento**: primer expediente de prueba.  
4. Cualquier rol → **Documentos** / **Trámites** / **Clasificación** para consulta.  
5. **REVISOR** → detalle → aprobar/rechazar; o exportar pendientes desde **Documentos**.  
6. **ADMIN** → **Auditoría** / **Respaldos** / **Reportes** para evidencia de tesis.  

---

## 8. Referencias API por módulo (para desarrolladores)

| Sección | Endpoints representativos |
|---------|---------------------------|
| Inicio | `GET /dashboard/summary`, `GET /health` |
| Documentos | `GET/POST/PATCH /documentos`, `GET /documentos/:id/eventos` |
| Trámites | `GET /documentos/tablon-tramites` |
| Clasificación | `GET /documentos/clasificacion-agregados` + catálogos series/subseries |
| Nuevo documento | `POST /documentos` + upload archivos |
| Usuarios | `GET/POST/PATCH /usuarios`, `GET/PUT /rbac/roles/:codigo/permissions` |
| Auditoría | `GET /auditoria`, `GET /reportes/auditoria.{xlsx,pdf}` |
| Respaldos | `POST /backup/admin/run-now`, `POST /dashboard/admin/backup-verification` |
| Reportes | `GET /reportes/documentos.{xlsx,pdf}`, gráficos dashboard |
| Configuración | `GET/POST /auth/admin/security-policy` |
| Catálogos | `GET/POST/PATCH /dependencias`, `/cargos`, `/tipos-documentales`, `/series`, `/subseries` |

Prefijo común: **`/api/v1`**.

---

*Si el menú del producto cambia (nuevas rutas o roles), actualizar este documento junto con `27-manual-usuario-sgd-gadpr-lm.md` y `43-glosario-terminos.md`.*
