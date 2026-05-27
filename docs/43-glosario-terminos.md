# Glosario de términos — SGD-GADPR-LM

**Proyecto:** Sistema de Gestión Documental (SGD) para el **Gobierno Autónomo Descentralizado Parroquial Rural de La Merced** (GADPR-LM).  
**Uso:** referencia única de siglas, conceptos de negocio, seguridad, base de datos y stack técnico del repositorio.  
**Última revisión:** 2026-05-27 — alineado con código y documentación en `docs/` (UI honesta: `45-principio-ui-controles-reales.md`).

---

## Cómo leer este glosario

| Columna | Significado |
|---------|-------------|
| **Término** | Palabra, sigla o código usado en el sistema o en la documentación. |
| **Definición** | Qué significa en el contexto de este proyecto (no necesariamente definición académica universal). |

Los términos están agrupados por tema. Dentro de cada grupo van en orden alfabético (salvo acrónimos del proyecto al inicio).

---

## 1. Proyecto e institución

| Término | Definición |
|---------|------------|
| **Expediente técnico** | Documento formal de la tesis que describe alcance, requisitos, modelo de datos y arquitectura del SGD (referencia: `GADPR-LM-ETI-SGD-2026-001`). |
| **GADPR-LM** | Gobierno Autónomo Descentralizado Parroquial Rural de **La Merced** (Ecuador). Entidad usuaria del sistema. |
| **Gestión documental** | Conjunto de prácticas para crear, clasificar, conservar, consultar y controlar documentos/registros institucionales de forma ordenada y trazable (véase también **ISO 15489**). |
| **MVP** | *Minimum Viable Product* — versión mínima funcional del sistema, acotada al alcance de la tesis; no incluye todas las capacidades de un SGD institucional maduro. |
| **Registro documental** | Entrada digital en el sistema que representa un documento administrativo con metadatos, estado, clasificación y, opcionalmente, archivos adjuntos (tabla `documentos`). |
| **SGD** | **Sistema de Gestión Documental** — aplicación web de este repositorio para digitalizar y administrar documentos del GADPR-LM. |
| **SGD-GADPR-LM** | Nombre completo del producto en código y documentación (`SGD` + institución). |
| **Tesis / prototipo** | Implementación académica con stack local (XAMPP, NestJS, React); no se asume certificación ISO ni despliegue productivo completo. |

---

## 2. Estándares, normas y marcos de referencia

| Término | Definición |
|---------|------------|
| **ASVS** | *Application Security Verification Standard* de OWASP. Lista verificable de requisitos de seguridad para aplicaciones web; en este proyecto se toma **Nivel 2** como referencia práctica. |
| **Controles (ISO 27001)** | Medidas del Anexo A / temas del SGSI aplicadas de forma concreta (p. ej. control de acceso, registro de eventos). En el repo se documentan en `19-mapeo-iso27001-iso15489-owasp-asvs.md`. |
| **Fail secure** | Principio de diseño: ante error o duda, el sistema **deniega** el acceso y registra el hecho, en lugar de permitir por defecto. |
| **ISO 15489** | Norma internacional de **gestión de documentos/registros**: autenticidad, integridad, usabilidad, retención y trazabilidad. Guía la clasificación, metadatos e historial del SGD. |
| **ISO/IEC 27001:2022** | Norma de **gestión de seguridad de la información** (SGSI). En el proyecto se usa como marco de referencia, no como certificación obtenida. |
| **Mínimo privilegio** | Principio: cada usuario/rol solo recibe los permisos estrictamente necesarios para su función. |
| **OWASP** | *Open Web Application Security Project* — comunidad y guías de seguridad web; fuente del ASVS. |
| **Records / registros** | En ISO 15489, información creada o recibida en el ejercicio de actividades y conservada como evidencia (equivalente a documentos institucionales gestionados). |
| **SGSI** | *Sistema de Gestión de Seguridad de la Información* — marco organizacional de ISO 27001 (políticas, riesgos, controles, mejora continua). |
| **Trazabilidad** | Capacidad de reconstruir **quién** hizo **qué**, **cuándo** y sobre **qué recurso**, mediante eventos de dominio y `audit_logs`. |

---

## 3. Arquitectura y capas del sistema

| Término | Definición |
|---------|------------|
| **API REST** | Interfaz HTTP con recursos JSON versionados (p. ej. `/api/v1/documentos`). El backend NestJS expone los endpoints. |
| **Backend** | Capa servidor en `backend/` — NestJS, reglas de negocio, seguridad, Prisma y acceso a MySQL y `storage/`. |
| **Capa de aplicación** | Lógica de negocio, validación, autorización y orquestación (servicios y controladores NestJS). |
| **Capa de datos** | Persistencia relacional vía **Prisma** sobre **MySQL/MariaDB** (XAMPP). |
| **Capa de presentación** | Interfaz de usuario SPA en `frontend/` (React + Vite). |
| **Cliente HTTP** | Librería **axios** en el frontend; envía JWT en cabecera y cookies en peticiones con credenciales. |
| **Contrato API** | Convenciones de rutas, métodos, códigos HTTP y formato JSON acordados entre frontend y backend (`/api/v1/...`). |
| **Frontend** | Aplicación React 18 + TypeScript compilada con **Vite**; corre típicamente en `http://localhost:5173`. |
| **Monorepo** | Un solo repositorio con carpetas `frontend/`, `backend/`, `docs/`, `storage/`, etc. |
| **Proxy (Vite)** | En desarrollo, Vite reenvía peticiones `/api` al backend en `:3000` para evitar problemas de CORS en el mismo origen. |
| **SPA** | *Single Page Application* — la UI carga una vez y navega sin recargar página completa (React Router). |
| **Storage (`storage/`)** | Carpeta en disco para **binarios** de documentos; **no** es carpeta pública del servidor web; el acceso pasa por la API autenticada. |

---

## 4. Stack tecnológico

| Término | Definición |
|---------|------------|
| **Argon2id** | Algoritmo moderno de hash para contraseñas (`password_hash` en `users`); resistente a fuerza bruta y ataques con GPU. |
| **axios** | Cliente HTTP del frontend para llamar a la API. |
| **class-validator / class-transformer** | Librerías usadas en DTOs del backend para validar y transformar entradas HTTP. |
| **DTO** | *Data Transfer Object* — clase que define forma y reglas de los datos de entrada/salida de un endpoint (p. ej. `CreateDocumentoDto`). |
| **ExcelJS** | Librería para generar exportaciones **Excel** (`.xlsx`) en reportes. |
| **Helmet** | Middleware de seguridad HTTP en NestJS (cabeceras como CSP, HSTS según configuración). |
| **Material UI (MUI)** | Biblioteca de componentes React para la interfaz institucional. |
| **MySQL / MariaDB** | Motor relacional bajo XAMPP; único motor soportado por el schema Prisma del proyecto. |
| **NestJS** | Framework Node.js para el backend (módulos, controladores, guards, inyección de dependencias). |
| **Node.js** | Entorno de ejecución del backend y herramientas npm. |
| **pdfkit** | Librería para generar reportes en **PDF**. |
| **Prisma** | ORM oficial del proyecto: `schema.prisma`, migraciones y cliente TypeScript generado. |
| **React 18** | Librería de UI del frontend. |
| **React Hook Form** | Gestión de formularios en el frontend, combinada con validación **Zod**. |
| **React Router** | Enrutamiento del SPA (`/login`, `/documentos`, rutas protegidas, etc.). |
| **TypeScript** | Lenguaje tipado usado en frontend y backend. |
| **ValidationPipe** | Pipe global de NestJS que valida DTOs (`whitelist`, `forbidNonWhitelisted`, `transform`). |
| **Vite** | Herramienta de build y servidor de desarrollo del frontend (HMR, puerto 5173). |
| **Zod** | Esquemas de validación en el cliente (formularios). |

---

## 5. Base de datos, Prisma y XAMPP

| Término | Definición |
|---------|------------|
| **`DATABASE_URL`** | Variable de entorno con la cadena de conexión Prisma a MySQL (usuario, host, puerto, nombre de BD). |
| **Cliente Prisma** | Código generado (`@prisma/client`) para consultar la BD con tipos TypeScript. |
| **Cotejamiento utf8mb4** | Conjunto de caracteres recomendado en MySQL para soportar texto completo (incl. acentos y emojis). |
| **FK (clave foránea)** | Relación entre tablas que garantiza integridad referencial (p. ej. `documentos.subserie_id` → `subseries.id`). |
| **Migración (Prisma)** | Carpeta SQL versionada en `prisma/migrations/` que evoluciona el esquema de forma reproducible. |
| **`migrate deploy`** | Comando para aplicar migraciones pendientes en un entorno (sin crear migración nueva). |
| **`migrate dev`** | Comando de desarrollo: aplica migraciones y puede generar una nueva a partir de cambios en el schema. |
| **`npx prisma generate`** | Regenera el cliente Prisma tras cambios en `schema.prisma`. |
| **phpMyAdmin** | Interfaz web de XAMPP para administrar bases y tablas (`http://localhost/phpmyadmin`). |
| **Seed (`db seed`)** | Script `prisma/seed.ts` que inserta datos iniciales: roles, permisos, usuario admin, catálogos y documento de ejemplo. |
| **UUID** | Identificador único de 128 bits usado como `id` en la mayoría de tablas (`@default(uuid())`). |
| **XAMPP** | Paquete local (Apache + MySQL/MariaDB + phpMyAdmin) usado en desarrollo en Windows; MySQL en puerto **3306** por defecto. |

---

## 6. Autenticación, sesión y credenciales

| Término | Definición |
|---------|------------|
| **Access token (JWT)** | Token de corta vida enviado en `Authorization: Bearer ...` para autenticar cada petición API. |
| **Bearer** | Esquema HTTP donde el cliente envía el JWT en la cabecera `Authorization`. |
| **Bloqueo de cuenta (lockout)** | Tras N intentos fallidos de login, la cuenta queda temporalmente bloqueada (`failed_login_attempts`, `locked_until`). Variables: `AUTH_LOCKOUT_MAX_ATTEMPTS`, `AUTH_LOCKOUT_MINUTES`. |
| **Cookie HttpOnly** | Cookie que el navegador envía al servidor pero **no** es legible por JavaScript; usada para el refresh token (mitiga robo por XSS). |
| **CORS** | *Cross-Origin Resource Sharing* — reglas que permiten al frontend en un origen (p. ej. `:5173`) llamar al API en otro (`:3000` o dominio ngrok). |
| **Inactividad de sesión** | Si no se usa el refresh dentro de `SESSION_INACTIVITY_MINUTES`, la sesión deja de poder renovarse (`last_used_at` en `refresh_tokens`). |
| **JWT** | *JSON Web Token* — token firmado que transporta identidad y roles; el access token es stateless; el refresh es opaco en BD. |
| **Login / Logout** | Inicio y cierre de sesión (`POST /auth/login`, `POST /auth/logout`); logout revoca refresh en BD y borra cookie. |
| **`/auth/me`** | Endpoint que devuelve el usuario autenticado y sus roles (requiere access token válido). |
| **Recuperación de contraseña** | Flujo “olvidé mi contraseña”: token opaco de un solo uso (`password_reset_tokens`), respuesta genérica que no revela si el email existe. |
| **Refresh token** | Token de larga vida en cookie; al renovar se **rota** (el anterior se invalida). Hash SHA-256 guardado en `refresh_tokens`. |
| **Rotación de refresh** | Cada `POST /auth/refresh` invalida el refresh usado y emite uno nuevo (ASVS sesión). |
| **`session/restore`** | Endpoint que intenta restaurar sesión al cargar la app sin forzar 401 visible si no hay cookie válida. |
| **Throttling / rate limit** | Límite de peticiones por IP o ruta (p. ej. login) para mitigar fuerza bruta; integrado con auditoría en 429. |

---

## 7. Autorización: RBAC, roles y permisos

| Término | Definición |
|---------|------------|
| **ABAC** | *Attribute-Based Access Control* — control por atributos (p. ej. dependencia, confidencialidad); complemento futuro al RBAC en documentos. |
| **ACL (por documento)** | Lista de acceso explícita por usuario o rol (`documento_user_access`, `documento_role_access`) cuando `access_policy = RESTRICTED`. |
| **`access_policy`** | Campo del documento: **`INHERIT`** (reglas por dependencia/confidencialidad/rol) o **`RESTRICTED`** (solo ACL + creador + ADMIN). |
| **ADMIN** | Rol con todos los permisos del catálogo; gestión de catálogos, usuarios, auditoría y operaciones administrativas. |
| **AUDITOR** | Rol orientado a consulta de evidencias; en MVP comparte acceso a UI de auditoría con ADMIN según configuración. |
| **CONSULTA** | Rol de solo lectura acotada (consulta documental sin mutaciones administrativas). |
| **Control de acceso** | Conjunto de mecanismos (roles, permisos, filtros por dependencia) que deciden si un usuario puede leer o modificar un recurso. |
| **EDITOR_DOC** | Rol complementario para editar/subir documentos sin ser ADMIN; se combina con USUARIO vía multi-rol. |
| **Enforcement** | Aplicación real de reglas en el **servidor** (guards), no solo ocultar botones en la UI. |
| **Guard** | Componente NestJS que intercepta una ruta antes del controlador (`JwtAuthGuard`, `RolesGuard`, `PermissionsGuard`). |
| **IDOR** | *Insecure Direct Object Reference* — riesgo de acceder a un recurso cambiando el ID en la URL sin verificar pertenencia; mitigado con filtros de visibilidad en backend. |
| **Matriz rol ↔ permiso** | Tabla de qué permisos tiene cada rol (`role_permissions`); editable en UI por ADMIN vía API `/rbac/...`. |
| **Permiso (código)** | Cadena estable (p. ej. `DOC_READ`, `USERS_CREATE`) en tabla `permissions`; se exige con `@Permissions(...)`. |
| **`PermissionsGuard`** | Guard que exige que el usuario tenga **todos** los códigos de permiso indicados en el decorador. |
| **Permiso directo por usuario** | Excepción individual en `user_permissions` (unión con permisos del rol para el efecto en API). |
| **RBAC** | *Role-Based Access Control* — autorización basada en roles (`ADMIN`, `USUARIO`, etc.) y permisos granulares. |
| **REVISOR** | Rol que puede resolver revisiones documentales (`DOC_REVISION_RESOLVE`) y exportar pendientes de revisión. |
| **`@Roles(...)`** | Decorador que limita una ruta a uno o más códigos de rol. |
| **`RolesGuard`** | Guard que valida los roles del JWT frente a `@Roles`. |
| **USUARIO** | Rol operativo estándar: consulta y operaciones documentales según permisos asignados en seed/matriz. |

### Códigos de permiso (resumen)

| Código | Definición breve |
|--------|------------------|
| `USERS_READ` | Listar y ver usuarios. |
| `USERS_CREATE` | Crear usuarios. |
| `USERS_UPDATE` | Editar usuarios, roles y estado. |
| `USERS_DISABLE` | Activar/desactivar cuentas. |
| `USERS_RESET_PASSWORD` | Restablecer contraseña de otro usuario. |
| `DEPENDENCIAS_WRITE` | Crear/editar dependencias. |
| `CARGOS_WRITE` | Crear/editar cargos. |
| `TIPOS_DOCUMENTALES_WRITE` | Crear/editar tipos documentales. |
| `SERIES_WRITE` | Crear/editar series. |
| `SUBSERIES_WRITE` | Crear/editar subseries. |
| `DOC_READ` | Consultar documentos (listado, detalle, tablón). |
| `DOC_CREATE` | Registrar nuevos documentos. |
| `DOC_UPDATE` | Editar metadatos de documentos. |
| `DOC_ACCESS_MANAGE` | Gestionar ACL por documento. |
| `DOC_REVISION_SEND` | Enviar documento a revisión. |
| `DOC_REVISION_RESOLVE` | Aprobar o rechazar revisión. |
| `DOC_FILES_READ` | Listar adjuntos y eventos de archivo. |
| `DOC_FILES_UPLOAD` | Subir adjuntos. |
| `DOC_FILES_DOWNLOAD` | Descargar adjuntos. |
| `DOC_FILES_DELETE` | Eliminar adjuntos (borrado lógico). |
| `REPORTS_EXPORT` | Exportar reportes de documentos y auditoría. |
| `REPORTS_PENDIENTES` | Exportar listado de pendientes de revisión. |
| `AUDIT_READ` | Consultar bitácora de auditoría. |
| `AUDIT_EXPORT` | Exportar auditoría (Excel/PDF). |
| `DASHBOARD_SUMMARY` | Ver resumen del panel principal. |
| `DASHBOARD_ADMIN_READ` | KPI administrativos (respaldos, etc.). |
| `BACKUP_VERIFICATION_RECORD` | Registrar verificación manual de respaldo. |
| `BACKUP_RUN` | Ejecutar respaldo MySQL bajo demanda. |
| `SECURITY_POLICY_READ` | Leer política de seguridad (sin secretos). |
| `SECURITY_POLICY_WRITE` | Actualizar política de seguridad. |

---

## 8. Catálogos institucionales

| Término | Definición |
|---------|------------|
| **Cargo** | Puesto o función institucional de un servidor; catálogo `cargos`, opcionalmente ligado a una dependencia. |
| **Catálogo** | Tabla maestra de referencia (dependencias, cargos, tipos, series, subseries) mantenida por ADMIN. |
| **Dependencia** | Unidad organizativa del GADPR-LM (dirección, área, etc.); usada para clasificar usuarios y documentos (`dependencias`). |
| **Serie documental** | Nivel superior de clasificación archivística (`series`). |
| **Subserie** | Subdivisión de una serie (`subseries`); todo documento MVP enlaza a una subserie. |
| **Tipo documental** | Tipología del documento (oficio, informe, acta, etc.) en `tipos_documentales`. |
| **Código (catálogo)** | Identificador corto único legible (p. ej. `DEP-RRHH`) además del UUID interno. |

---

## 9. Documentos: metadatos, estados y flujos

| Término | Definición |
|---------|------------|
| **Asunto** | Título o resumen breve del documento (campo obligatorio). |
| **Bandeja de revisión** | Conjunto de documentos en estado **EN_REVISION**; en MVP se consulta filtrando el listado o exportando pendientes. |
| **BORRADOR** | Estado inicial opcional: documento en captura, aún no formalizado como registrado. |
| **Ciclo de vida documental** | Secuencia de estados desde creación hasta archivo, con transiciones controladas en servidor. |
| **`codigo` (documento)** | Identificador único legible del expediente (p. ej. `DOC-0001`). |
| **Confidencialidad** | Nivel de restricción de acceso: `PUBLICO`, `INTERNO`, `RESERVADO`, `CONFIDENCIAL` (`nivel_confidencialidad`). |
| **Documento evento** | Registro en `documento_eventos` (CREADO, ACTUALIZADO) con autor y cambios en JSON. |
| **Enviar a revisión** | Transición **REGISTRADO → EN_REVISION** (`POST .../enviar-revision`); audita `DOC_SUBMITTED_FOR_REVIEW`. |
| **EN_REVISION** | Documento pendiente de decisión por REVISOR o ADMIN. |
| **Estado documental** | Valor del ciclo de vida: ver tabla de estados abajo. |
| **Metadatos** | Datos descriptivos del documento (asunto, fechas, tipo, serie, palabras clave, etc.), distintos del archivo binario. |
| **Máquina de estados** | Reglas que definen qué cambios de `estado` están permitidos (`documento-estado.util.ts`). |
| **REGISTRADO** | Documento formalizado, listo para flujos posteriores (p. ej. envío a revisión). |
| **APROBADO / RECHAZADO** | Resultado de la revisión desde **EN_REVISION**; rechazo exige **motivo** en auditoría. |
| **ARCHIVADO** | Estado terminal: conservación; restricciones de edición y adjuntos según reglas MVP. |
| **Resolver revisión** | Aprobar o rechazar desde **EN_REVISION** (`POST .../resolver-revision`); audita `DOC_REVIEW_RESOLVED`. |
| **Transición de estado** | Cambio válido entre dos estados según la tabla de transiciones (validado en backend). |

### Estados del documento

| Estado | Definición |
|--------|------------|
| **BORRADOR** | Captura en curso; puede pasar a REGISTRADO o ARCHIVADO. |
| **REGISTRADO** | Registro formal; puede ir a EN_REVISION o ARCHIVADO. |
| **EN_REVISION** | En evaluación; puede pasar a APROBADO o RECHAZADO. |
| **APROBADO** | Revisión favorable; puede archivarse. |
| **RECHAZADO** | Revisión desfavorable; puede reenviarse a revisión o archivarse. |
| **ARCHIVADO** | Cerrado para operación normal; sin transiciones salientes en MVP. |

---

## 10. Archivos adjuntos y almacenamiento

| Término | Definición |
|---------|------------|
| **Adjunto / archivo documental** | Binario asociado a un documento (`documento_archivos`). |
| **Borrado lógico** | Marcar archivo como inactivo sin borrar físicamente de inmediato (según implementación y política). |
| **Descarga controlada** | El archivo solo se entrega tras validar JWT, permisos y visibilidad del documento. |
| **Evento de archivo** | Registro SUBIDO / DESCARGADO / ELIMINADO en `documento_archivo_eventos`. |
| **Hash SHA-256** | Huella criptográfica del contenido para integridad y detección de duplicados/cambios. |
| **MIME type** | Tipo de contenido del archivo (p. ej. `application/pdf`); usado en lista blanca de formatos permitidos. |
| **Subida (upload)** | Carga de archivo vía API multipart con límite de tamaño (p. ej. 10 MB) y tipos permitidos. |
| **Versión (archivo)** | Numeración incremental cuando se sube una nueva versión del mismo adjunto lógico. |
| **Whitelist de formatos** | Lista explícita de extensiones/MIME aceptados; rechaza ejecutables y tipos peligrosos. |

---

## 11. Auditoría, reportes y respaldos

| Término | Definición |
|---------|------------|
| **`audit_logs`** | Tabla transversal de eventos de seguridad y administración (actor, acción, resultado, recurso, IP, UA, `meta_json`). |
| **Acción de auditoría (`action`)** | Código estable del evento (p. ej. `AUTH_LOGIN_OK`, `DOC_STATE_CHANGED`, `ROLE_PERMISSIONS_UPDATED`). |
| **Actor** | Usuario (o contexto anónimo) que originó el evento (`actor_user_id`, `actor_email`). |
| **`AUTHZ_FORBIDDEN`** | Evento registrado cuando un usuario autenticado recibe HTTP 403 por falta de permiso. |
| **Bitácora** | Registro cronológico de eventos; en el proyecto: `audit_logs` + eventos de dominio. |
| **Correlación (`correlation_id`)** | Identificador para enlazar varios eventos de la misma operación o petición. |
| **`meta_json`** | Detalle adicional del evento en JSON (sin contraseñas ni secretos). |
| **Exportación (reporte)** | Generación de Excel o PDF desde el servidor; audita `REPORT_EXPORTED` cuando aplica. |
| **KPI (dashboard)** | Indicadores en panel administrativo (logins, documentos, respaldos verificados, etc.). |
| **mysqldump** | Utilidad para volcar la base MySQL; base del respaldo bajo demanda (`BACKUP_RUN`). |
| **Pendientes de revisión** | Reporte de documentos en **EN_REVISION** (ADMIN y REVISOR). |
| **Política de seguridad** | Registro singleton en `security_policy` con parámetros institucionales visibles (sin secretos en lectura). |
| **Respaldo / backup** | Copia de BD (y opcionalmente ZIP de `storage/`); verificación manual registrada como `BACKUP_VERIFIED`. |
| **Resultado (`OK` / `FAIL`)** | Si la acción auditada terminó con éxito o fallo. |
| **Retención (pendiente)** | Política futura de cuánto tiempo conservar logs y documentos antes de archivo o eliminación segura. |
| **RUM / Web Vitals** | Métricas de rendimiento del navegador (LCP, etc.) reportadas opcionalmente al backend (`client-perf`). |

---

## 12. Entorno, red y herramientas de desarrollo

| Término | Definición |
|---------|------------|
| **cloudflared** | Túnel alternativo a ngrok para exponer temporalmente el frontend Vite (documentado en `26-cloudflared-tunnel.md`). |
| **Desarrollo local** | Ejecución en PC del desarrollador: XAMPP + `npm run start:dev` + `npm run dev`. |
| **EPERM (Prisma generate)** | Error en Windows al regenerar cliente; mitigación: `npm run prisma:generate:clean` y cerrar procesos que bloqueen DLL. |
| **EADDRINUSE** | Puerto ocupado (p. ej. 3000); script `start:dev:free` libera el puerto. |
| **Entorno de prueba / demo** | Acceso remoto temporal vía túnel (ngrok/cloudflared), no producción. |
| **ngrok** | Herramienta que publica un puerto local con URL HTTPS pública; uso **temporal** y documentado en seguridad. |
| **Puerto 3000** | Puerto por defecto del API NestJS. |
| **Puerto 3306** | Puerto por defecto de MySQL en XAMPP. |
| **Puerto 5173** | Puerto por defecto del dev server Vite. |
| **SMTP** | Protocolo de correo; opcional para notificaciones de revisión y invitaciones de usuario. |
| **TLS** | Cifrado en tránsito; obligatorio en producción; en local puede no aplicarse salvo túnel HTTPS. |
| **`VITE_API_URL`** | URL base del API en builds; en dev con proxy suele omitirse (rutas relativas `/api/v1`). |

---

## 13. Interfaz de usuario y experiencia

| Término | Definición |
|---------|------------|
| **403 / Forbidden** | Página o respuesta cuando el usuario autenticado no tiene permiso para la ruta o acción. |
| **404 / Not found** | Recurso o ruta inexistente. |
| **Design system** | Conjunto de tokens, componentes y patrones visuales institucionales (`25-ui-ux-diseno-sistema-institucional.md`). |
| **Layout principal** | Marco de navegación post-login (menú lateral, cabecera). |
| **Menú por rol** | Entradas de navegación visibles según rol del usuario (UX; no sustituye guards en API). |
| **Ruta protegida** | Pantalla que exige sesión válida (`ProtectedRoute`, JWT). |
| **`RoleRoute`** | Componente que restringe rutas a roles específicos en el frontend. |
| **Responsive** | Diseño adaptable a distintos anchos de pantalla (móvil, tablet, escritorio). |
| **SafeArea / teclado** | Ajustes de UI para notch y teclado virtual en formularios (buenas prácticas móvil). |
| **Tablón / panel** | Vista resumen o dashboard tras login (`DASHBOARD_SUMMARY`). |
| **Indicadores operativos de seguridad** | Barras del panel ADMIN calculadas con datos reales (p. ej. últimos 30 días); cada una declara qué mide. **No** son certificación ISO ni auditoría externa. |
| **Registrar revisión** | Acción en `/admin/configuracion` que guarda notas institucionales y una instantánea de controles verificados (`SECURITY_POLICY_UPDATED`); no cambia `.env` ni runtime por sí sola. |
| **Control verificable (UI)** | Elemento visible solo si el servidor lo aplica, mide o registra con evidencia; ver principio en doc `45`. |

---

## 14. Seguridad aplicada (términos técnicos frecuentes)

| Término | Definición |
|---------|------------|
| **Defensa en profundidad** | Varias capas de control (UI, API, BD, reglas de negocio) para el mismo riesgo. |
| **Enumeración de usuarios** | Ataque que deduce si un email existe; mitigado con mensajes genéricos en login y reset. |
| **Helmet** | Ver stack — cabeceras HTTP de endurecimiento. |
| **PII** | *Personally Identifiable Information* — datos personales; minimizar en logs y auditoría. |
| **Sanitización** | Limpiar o validar entradas/salidas para evitar inyección (SQL, HTML, CSV, logs). |
| **Secreto / `.env`** | Variables sensibles fuera del repositorio; nunca commitear `.env` real. |
| **Validación en el borde** | Comprobar datos en la API (DTO) antes de llegar a la lógica de negocio. |
| **XSS** | *Cross-Site Scripting* — inyección de script en el navegador; mitigado con HttpOnly, no guardar tokens en `localStorage`. |

---

## 15. Documentación y gestión del proyecto

| Término | Definición |
|---------|------------|
| **Changelog técnico** | `docs/22-changelog-tecnico.md` — registro cronológico de cambios y sesiones de túnel. |
| **ETAPA (0–10)** | Fases del roadmap de construcción del MVP; cada una con documento de cierre y evidencias (`29`–`39`). |
| **Gap / brecha** | Funcionalidad documentada como deseable pero aún no implementada (`28-listado-lo-que-deberia-tener-el-sistema.md`). |
| **Guía de prueba** | Pasos para validar un cambio (`99-guia-de-prueba-por-modulos.md` y regla de cierre del proyecto). |
| **Manual de usuario** | `docs/27-manual-usuario-sgd-gadpr-lm.md` — instrucciones para operadores del sistema. |
| **Roadmap** | Plan ordenado de módulos y etapas (`00-roadmap-general.md`). |

---

## 16. Siglas y eventos de auditoría (referencia rápida)

| Sigla / prefijo | Ámbito |
|-----------------|--------|
| `AUTH_*` | Autenticación (login, refresh, logout, reset). |
| `AUTHZ_*` | Autorización denegada. |
| `DOC_*` | Operaciones sobre documentos (estado, revisión, etc.). |
| `USER_*` | Administración de usuarios e invitaciones. |
| `ROLE_*` | Cambios en permisos de roles. |
| `REPORT_*` | Exportaciones de reportes. |
| `BACKUP_*` | Respaldos y verificaciones. |

---

## Documentos relacionados

| Documento | Contenido |
|-----------|-----------|
| [README.md](./README.md) | Índice general de `docs/` |
| [01-arquitectura-general.md](./01-arquitectura-general.md) | Capas y entornos |
| [04-modelo-base-de-datos.md](./04-modelo-base-de-datos.md) | Tablas y migraciones |
| [05-modulo-auth.md](./05-modulo-auth.md) | Autenticación y sesión |
| [07-modulo-roles-permisos.md](./07-modulo-roles-permisos.md) | RBAC |
| [12-modulo-documentos.md](./12-modulo-documentos.md) | Ciclo de vida documental |
| [15-modulo-auditoria.md](./15-modulo-auditoria.md) | Auditoría |
| [19-mapeo-iso27001-iso15489-owasp-asvs.md](./19-mapeo-iso27001-iso15489-owasp-asvs.md) | Estándares → código |
| [27-manual-usuario-sgd-gadpr-lm.md](./27-manual-usuario-sgd-gadpr-lm.md) | Uso operativo |
| [44-guia-secciones-menu-navegacion.md](./44-guia-secciones-menu-navegacion.md) | Detalle de cada entrada del menú lateral |

---

*Si agregas nuevos permisos, estados, roles o módulos al código, actualiza este glosario en la misma iteración.*
