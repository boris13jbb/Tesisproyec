# Listado de lo que debería tener el sistema (Gap vs implementación actual)

**Proyecto:** SGD-GADPR-LM  
**Fecha de última revisión:** 2026-05-06  
**Propósito:** comparar los requisitos (1–45) propuestos vs el sistema implementado y listar lo que falta para un cierre institucional alineado con **ISO/IEC 27001**, **ISO 15489** y **OWASP ASVS**.

> Leyenda de estado:
> - **Implementado**: existe en backend y/o frontend y es usable.
> - **Parcial**: existe parcialmente (MVP) o falta robustecer (p. ej. auditoría transversal, rate limit, retención).
> - **Pendiente**: no existe o no se evidencia en el sistema actual.

---

## 0) Avance (código vs gobierno institucional)

Constatación explícita: **no** se puede “cerrar” el listado 1–45 solo con software de tesis; varios ítems son **política**, **infraestructura** o **proceso**. El repositorio incorpora (entre otras iteraciones):

| Brecha (doc) | Qué se hizo en MVP |
|--------------|-------------------|
| **R-6 / R-38** | Columnas `dependencia_id` y `nivel_confidencialidad` en `documentos`; filtro de visibilidad en listado/detalle/descarga/export (no‑ADMIN). |
| **R-30 / R-31 / R-40 (base)** | UI **ADMIN** `/admin/auditoria` + export `GET /api/v1/reportes/auditoria.{xlsx,pdf}`; bitácora `audit_logs` con eventos de auth; **`AUTHZ_FORBIDDEN`** al responder **403** con usuario JWT. |
| **R-9 (base ASVS)** | Throttling global y por ruta `auth` + **`AUTH_LOCKOUT_*`**: bloqueo **por cuenta** tras N contraseñas incorrectas (`users.failed_login_attempts` / `locked_until`); se limpia en login OK o restablecimiento de contraseña. |
| **R-4 (parcial)** | Roles **REVISOR**, **AUDITOR**, **CONSULTA** en seed y UI; **REVISOR** ejecuta **resolver revisión** (`POST .../resolver-revision`); **AUDITOR**/**CONSULTA** siguen como **USUARIO** en alcance hasta flujos propios. |
| **R-36 / R-37** | Procedimiento documentado: `scripts/README-backups-mysql-xampp.md` (backup/restauración **manual**). |
| **R-27 / R-34 (MVP)** | Catálogo **`BORRADOR`…`ARCHIVADO`**, transiciones controladas en servidor, migración SQL de normalización; **`ARCHIVADO`** bloquea subir/eliminar adjuntos y cambios de metadatos (salvo `activo`); **`DOC_STATE_CHANGED`** en `audit_logs`. |
| **R-28 / R-29 (MVP)** | **`POST /api/v1/documentos/:id/enviar-revision`** (REGISTRADO→EN_REVISION, creador o ADMIN); **`POST .../resolver-revision`** (EN_REVISION→APROBADO/RECHAZADO, **ADMIN** o **REVISOR**); **rechazo** con **`motivo` obligatorio** (3–2000 caracteres) registrado en **`audit_logs.meta.motivoRechazo`**; eventos **`DOC_SUBMITTED_FOR_REVIEW`** y **`DOC_REVIEW_RESOLVED`**; bandeja mínima = filtro listado estado **En revisión**. |

Queda **pendiente de gobierno / producto** (entre otros): bandeja dedicada / SLA, **notificaciones por vencimiento** (depende de retención R-32–35), retención/legal hold operativos (R-32–35), HTTPS productivo (R-19), MFA/WAF (backlog), permisos granulares `Permission` (R-5), políticas jurídicas firmadas (R-43). **R-44 (correo)** para revisión ya está en MVP best-effort vía SMTP.

---

## 1) Matriz de requisitos (1–45) — estado y brecha

### 1. Seguridad, identidades y acceso

1. **Inicio de sesión seguro** — **Implementado**  
   - **Evidencia**: JWT access + refresh HttpOnly, Argon2id, `/auth/login|refresh|logout|me`.  
   - **Docs**: `05-modulo-auth.md`, `18-seguridad-y-hardening.md`.

2. **Gestión de usuarios (crear/editar/activar/desactivar)** — **Implementado**  
   - **Evidencia**: `/admin/usuarios` + endpoints `/usuarios` (ADMIN).  
   - **Docs**: `06-modulo-usuarios.md`.

3. **Gestión de identidades (cuenta única)** — **Implementado**  
   - **Evidencia**: `users.email` único.

4. **Roles y perfiles (admin, usuario, revisor, auditor, consulta)** — **Parcial**  
   - **Hoy**: `ADMIN`, `USUARIO`, **REVISOR**, **AUDITOR**, **CONSULTA**; **REVISOR** resuelve revisión documental vía API/UI (R-28 MVP).  
   - **Falta**: flujos para **AUDITOR** / **CONSULTA** y matriz de permisos fina.

5. **Permisos por rol (ver/subir/editar/eliminar/descargar)** — **Parcial (mejorado MVP)**  
   - **Hoy**: mutaciones sensibles con `ADMIN`; lectura con JWT; **filtrado por dependencia + confidencialidad** en consulta/descarga/export documentos (no‑ADMIN); **`permissions` / `role_permissions`** con `@Permissions` + `PermissionsGuard` en rutas clave + UI matriz BD + `/rbac/...`; seed RBAC (`prisma db seed`).  
   - **Falta**: permisos ABAC por registro/documento más allá de dependencia/confidencialidad ya modelados; segregación institucional avanzada (§3 en `07`).  
   - **Docs**: `07-modulo-roles-permisos.md`.

6. **Control de acceso por documento (área/tipo/confidencialidad)** — **Parcial (MVP código)**  
   - **Hoy**: `documentos.dependencia_id`, `nivel_confidencialidad` y reglas en servicio (listado/detalle/eventos/archivos/export).  
   - **Falta**: reglas de negocio institucionales más finas (ej. mezcla de roles no‑ADMIN, clasificación por serie, elevación controlada).

7. **Contraseñas cifradas (hash)** — **Implementado**  
   - **Evidencia**: Argon2id (`password_hash`).

8. **Recuperación segura de contraseña (token temporal)** — **Implementado (MVP)**  
   - **Evidencia**: `password_reset_tokens` + endpoints request/confirm + invalidación de sesiones.
   - **Falta**: envío de token por correo institucional (en MVP puede existir `debugToken` en dev).

9. **Bloqueo por intentos fallidos** — **Parcial (MVP+)**  
   - **Hoy**: `@Throttle` en login/refresh/restore/reset + throttler global + `AUTH_RATE_LIMITED`; lockout por **cuenta** (`AUTH_LOCKOUT_MAX_ATTEMPTS` / `AUTH_LOCKOUT_MINUTES`, ver `.env.example`) con auditoría `BAD_PASSWORD` / `ACCOUNT_LOCKED`.  
   - **Falta**: backoff/adjuste fino institucional, aviso explícito al usuario (se mantiene mensaje genérico), integración con mesa de ayuda / desbloqueo ADMIN en UI si se requiere.

10. **Control de sesiones (inactividad/expiración/cierre)** — **Parcial**  
   - **Hoy**: expiración de access + refresh; logout revoca refresh.  
   - **Falta**: control explícito por inactividad (server-side), lista de sesiones, cierre global.

11. **Validación de entradas (formularios)** — **Implementado (base)**  
   - **Evidencia**: DTOs + `ValidationPipe` global.
   - **Falta**: reglas de negocio extra (p. ej. políticas fuertes de contraseña, normalizaciones, límites específicos por campo en todos los módulos).

12. **Validación de archivos (formatos autorizados)** — **Implementado (base)**  
   - **Evidencia**: whitelist MIME, nombres seguros, no servir storage público.
   - **Docs**: `13-modulo-archivos.md`, `18-seguridad-y-hardening.md`.

13. **Límite de tamaño de archivos** — **Implementado**  
   - **Evidencia**: 10MB en interceptor Multer.

14. **Protección contra inyección SQL (ORM/parametrización)** — **Implementado**  
   - **Evidencia**: Prisma ORM (query parametrizada).

15. **Protección contra XSS** — **Parcial**  
   - **Hoy**: React reduce XSS reflejado por default; no almacenar refresh en localStorage.  
   - **Falta**: política explícita de sanitización/escape para campos con HTML, CSP (Helmet avanzado), revisión de renderizado de textos.

16. **Protección CSRF** — **Parcial**  
   - **Hoy**: `sameSite=lax` en cookie refresh reduce superficie.  
   - **Falta**: anti‑CSRF token si aumentan endpoints sensibles basados en cookie; evaluación ASVS.

17. **Manejo seguro de errores** — **Implementado (base)**  
   - **Evidencia**: mensajes genéricos; no stack al cliente.
   - **Falta**: estrategia consistente de códigos/errores y logging estructurado con correlación.

18. **CORS controlado** — **Implementado**  
   - **Evidencia**: `CORS_ORIGIN` configurable, `credentials: true`.

19. **HTTPS obligatorio** — **Parcial**  
   - **Hoy**: en demos se usa túnel (HTTPS externo), local puede ser HTTP.  
   - **Falta**: despliegue institucional con TLS terminación (reverse proxy) y política “HTTPS only”.

### 2. Gestión documental (ISO 15489)

20. **Registro de documentos** — **Implementado**  
   - **Evidencia**: CRUD documento (ADMIN) + consulta (JWT).

21. **Código único de documento** — **Implementado**  
   - **Evidencia**: `documentos.codigo` único.

22. **Metadatos documentales (título/tipo/área/autor/estado/versión/clasificación)** — **Parcial**  
   - **Hoy**: tipo, subserie/serie (clasificación), fechas, estado, creador, dependencia propietaria (`dependencia_id`), nivel de confidencialidad.  
   - **Falta**: metadatos adicionales por tipo formalizados y “versión” del documento como entidad (diferente a versión de archivo).

23. **Clasificación documental (serie/subserie)** — **Implementado**  
   - **Evidencia**: catálogos series/subseries y FK en documento.

24. **Organización por carpetas o estructura lógica** — **Parcial**  
   - **Hoy**: clasificación por series/subseries; storage físico por `documentoId`.  
   - **Falta**: “repositorio” lógico por dependencia/proceso/año visible en UI si se requiere.

25. **Búsqueda de documentos** — **Implementado (MVP)**  
   - **Evidencia**: filtros por metadatos y por adjuntos (nombre/mime/sha256).

26. **Control de versiones** — **Parcial**  
   - **Hoy**: versionado de archivos + historial de documento (eventos).  
   - **Falta**: versión del “documento” como estado formal (p. ej. v1/v2 con snapshot) si la institución lo exige.

27. **Estados del documento (borrador/enviado/revisado/aprobado/…/archivado)** — **Parcial (MVP código)**  
   - **Hoy**: catálogo fijo y transiciones validadas en **`DocumentosService`** (`documento-estado.util.ts`); alta **BORRADOR**/**REGISTRADO**; **ADMIN** puede seguir ajustando estado por **PATCH**; acciones de flujo **enviar / resolver revisión** con reglas por actor.  
   - **Falta**: catálogo parametrizable institucional; transiciones **solo** vía workflow (sin bypass ADMIN) si la política lo exige.

28. **Flujo de aprobación** — **Parcial (MVP código)**  
   - **Hoy**: envío a revisión (**REGISTRADO**→**EN_REVISION**) por **creador o ADMIN**; resolución (**APROBADO**/**RECHAZADO**) por **ADMIN** o **REVISOR**; **rechazo con motivo obligatorio** persistido en auditoría (`motivoRechazo`); filtro de listado para “En revisión”.  
   - **Falta**: bandeja propia, notificaciones, SLA, múltiples niveles de aprobación, firma electrónica institucional.

29. **Trazabilidad documental (quién creó/modificó/revisó/aprobó/descargó/eliminó)** — **Parcial**  
   - **Hoy**: eventos de documento/archivo; **`DOC_STATE_CHANGED`**, **`DOC_SUBMITTED_FOR_REVIEW`**, **`DOC_REVIEW_RESOLVED`** en `audit_logs` cuando aplica el flujo.  
   - **Falta**: informes de cohorte institucional, cobertura exhaustiva por operación y retención de bitácora acordada.

30. **Bitácora de auditoría (acciones del sistema con IP)** — **Implementado (MVP+)**  
   - **Hoy**: tabla `audit_logs` + API `GET /api/v1/auditoria` (ADMIN) + UI `/admin/auditoria` + export Excel/PDF desde reportes; **`AUTHZ_FORBIDDEN`** ante **403** autenticado.  
   - **Falta**: más eventos denegados (p. ej. 404 táctico si se audita sin filtración), retención institucional y firma/checksum de bitácora.

31. **Historial de accesos (quién ingresó y cuándo)** — **Parcial**  
   - **Hoy**: eventos `AUTH_LOGIN_OK` / `AUTH_LOGIN_FAIL` (y relacionados) en `audit_logs`; consulta y export desde módulo auditoría.  
   - **Falta**: dashboard operativo y KPIs de seguridad para mesa de ayuda.

32. **Conservación documental (tiempo por tipo)** — **Pendiente**

33. **Políticas de retención** — **Pendiente**

34. **Archivo digital (estado archivado sin perder)** — **Parcial (MVP)**  
   - **Hoy**: estado **ARCHIVADO** con bloqueo de carga/eliminación de adjuntos y de edición de metadatos (solo `activo` en catálogo).  
   - **Falta**: política de conservación, ubicación lógica “fondo archivístico” y disposición institucional.

35. **Eliminación controlada (sin autorización/registro)** — **Parcial**  
   - **Hoy**: documentos/archivos se restringen por ADMIN y los archivos usan borrado lógico.  
   - **Falta**: reglas de eliminación por política/estado + bitácora central y aprobación (si aplica).

### 3. Continuidad, reportes y cumplimiento

36. **Copias de seguridad automáticas (BD y archivos)** — **Parcial (procedimiento)**  
   - **Guía manual:** `scripts/README-backups-mysql-xampp.md`.  
   - **Falta**: automatización institucional (cron, destino certificado, pruebas de restauración registradas).

37. **Restauración de información** — **Parcial (procedimiento)**  
   - Ver `scripts/README-backups-mysql-xampp.md` (import `mysql` + `storage/`).

38. **Protección de documentos sensibles (público/interno/reservado/confidencial)** — **Parcial (MVP código)**  
   - **Hoy**: niveles en metadato + enforcement en API (ver R-6).  
   - **Falta**: gobierno institucional del catálogo de niveles y excepciones auditadas.

39. **Reportes administrativos** — **Implementado (parcial)**  
   - **Hoy**: reportes de documentos a Excel/PDF con filtros; plantilla dedicada **pendientes de revisión** (`/reportes/pendientes-revision.{xlsx,pdf}`) para **ADMIN/REVISOR**; filtro por **estado** incluye revisión/aprobación vía datos.  
   - **Falta**: export combinado de eventos `DOC_SUBMITTED_FOR_REVIEW` y `DOC_REVIEW_RESOLVED` si lo exige archivo.

40. **Reportes de seguridad (accesos, intentos fallidos, acciones)** — **Parcial (MVP)**  
   - **Hoy**: export filtrable de `audit_logs` (Excel/PDF) + consulta en pantalla ADMIN.  
   - **Falta**: plantillas institucionales, envío programado, segregación de datos en reportes.

41. **Panel de administración (usuarios/roles/permisos/documentos/auditoría)** — **Parcial**  
   - **Hoy**: usuarios + catálogos + documentos + auditoría + exportes (ADMIN).  
   - **Falta**: pantalla de permisos granulares y parámetros generales (`17`).

42. **Manual de usuario** — **Implementado**  
   - **Evidencia**: `27-manual-usuario-sgd-gadpr-lm.md` + regla de actualización.

43. **Políticas internas del sistema** — **Parcial**  
   - **Hoy**: lineamientos en docs + reglas `.cursor/rules`.  
   - **Falta**: documento formal de políticas institucionales (acceso/retención/seguridad) y su aterrizaje en configuración.

44. **Notificaciones (pendiente/aprobado/rechazado/vencimiento)** — **Parcial (MVP)**

- **Hoy**: notificación por **email** (best-effort, depende de SMTP):
  - al **enviar a revisión**: se notifica a usuarios **ADMIN/REVISOR** activos;
  - al **resolver revisión**: se notifica al **creador** del documento (incluye motivo si fue rechazado).
- **Falta**: notificaciones por vencimiento (retención), bandeja/cola dedicada con SLA, plantillas institucionales, canal alterno (in-app) y configuración de destinatarios por política.

45. **Integridad del documento (evitar alteraciones y registrar cambios)** — **Parcial**  
   - **Hoy**: trazabilidad de cambios (eventos) + hash de archivos + RBAC.  
   - **Falta**: controles avanzados (firma digital, WORM, sellado de tiempo) si el alcance lo exige.

---

## 2) Módulos mínimos recomendados — estado actual

1) **Autenticación** — **Implementado (MVP+)**  
   - Login, logout, refresh, recuperación, `/me`; lockout por cuenta (env) + throttling.  
   - Falta: MFA; sesión por inactividad avanzada más allá del refresh.

2) **Usuarios** — **Implementado (MVP)**  
   - Crear/editar/activar/desactivar/reset pass; roles **ADMIN**, **USUARIO**, **REVISOR**, **AUDITOR**, **CONSULTA**.  
   - **REVISOR:** resolución de revisión documental (además del alcance de lectura JWT como **USUARIO**).  
   - Falta: permisos granulares (`Permission`) y flujos para **AUDITOR**/**CONSULTA**.

3) **Documentos** — **Implementado (MVP+)**  
   - Registro, metadatos base, clasificación, búsqueda, detalle; **estados**, **workflow enviar/resolver revisión** en UI y API.

4) **Trazabilidad** — **Parcial**  
   - Eventos por documento/archivo; `audit_logs` (estado + envío/resolución de revisión) + UI/export seguridad.  
   - Falta: retención legal e integridad avanzada de bitácora.

5) **Conservación** — **Pendiente (gobierno)**  
   - Retención, archivo formal, disposición/eliminación por política; evidencia restauración fuera del código.

6) **Seguridad** — **Parcial**  
   - Validación, headers, CORS, ORM, subida acotada, **throttling**, **filtro por documento**, **lockout por cuenta**, **403 auditados**.  
   - Falta: MFA, CSP/CSRF según alcance ampliado, TLS productivo y monitoreo centralizado.

7) **Reportes** — **Parcial**  
   - Documentos + **auditoría** Excel/PDF (ADMIN).  
   - Falta: reportes de cumplimiento documental (retención/aprobación) y envío programado.

---

## 3) Lista priorizada de “lo que falta” (recomendación)

### Prioridad Alta (cierra brechas de seguridad y evidencia)
- **R-30/R-31/R-40**: profundizar cobertura (denegaciones 404 tácticas si aplica, exportaciones ya auditadas); dashboard operativo.
- **R-9**: MFA y políticas de backoff; lockout por cuenta **iniciado** (env `AUTH_LOCKOUT_*`).
- **R-6/R-38**: endurecer reglas de negocio (excepciones, elevación auditada).
- **R-36/R-37**: automatizar backups y **pruebas de restauración** con bitácora.

### Prioridad Media (mejora ISO 15489 “completo”)
- **R-27/R-28**: profundizar (bandeja, notificaciones, transiciones solo por workflow, aprobaciones multinivel).
- **R-32/R-33**: retención y conservación.
- **R-44**: notificaciones (pendientes/vencimientos).

### Prioridad Baja / Futuro (institucionalización avanzada)
- Firma digital, sellado de tiempo, WORM, SIEM/WAF/MFA corporativo.

