# Listado de lo que debería tener el sistema (Gap vs implementación actual)

**Proyecto:** SGD-GADPR-LM  
**Fecha:** 2026-05-05  
**Propósito:** comparar los requisitos (1–45) propuestos vs el sistema implementado y listar lo que falta para un cierre institucional alineado con **ISO/IEC 27001**, **ISO 15489** y **OWASP ASVS**.

> Leyenda de estado:
> - **Implementado**: existe en backend y/o frontend y es usable.
> - **Parcial**: existe parcialmente (MVP) o falta robustecer (p. ej. auditoría transversal, rate limit, retención).
> - **Pendiente**: no existe o no se evidencia en el sistema actual.

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
   - **Hoy**: `ADMIN` y `USUARIO`.  
   - **Falta**: definir y sembrar roles institucionales adicionales (REVISOR/AUDITOR/CONSULTA) + responsabilidades.

5. **Permisos por rol (ver/subir/editar/eliminar/descargar)** — **Parcial**  
   - **Hoy**: enforcement principalmente por rol `ADMIN` en mutaciones; lectura por JWT.  
   - **Falta**: permisos granulares en guard (usar `Permission`/`role_permissions`) y matriz “acción→permiso”.
   - **Docs**: `07-modulo-roles-permisos.md` (marca pendiente permisos granulares).

6. **Control de acceso por documento (área/tipo/confidencialidad)** — **Pendiente**  
   - **Falta**: atributos de control (p. ej. `nivel_confidencialidad`, `dependenciaId` propietaria) + reglas de acceso por recurso (anti‑IDOR real).

7. **Contraseñas cifradas (hash)** — **Implementado**  
   - **Evidencia**: Argon2id (`password_hash`).

8. **Recuperación segura de contraseña (token temporal)** — **Implementado (MVP)**  
   - **Evidencia**: `password_reset_tokens` + endpoints request/confirm + invalidación de sesiones.
   - **Falta**: envío de token por correo institucional (en MVP puede existir `debugToken` en dev).

9. **Bloqueo por intentos fallidos** — **Pendiente**  
   - **Falta**: rate limiting/lockout/backoff en login y recuperación (ASVS V2).

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
   - **Hoy**: tipo, subserie/serie (clasificación), fechas, estado, creador.  
   - **Falta**: “área” propietaria, nivel confidencialidad, metadatos adicionales por tipo, “versión” del documento como entidad (diferente a versión de archivo).

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

27. **Estados del documento (borrador/enviado/revisado/aprobado/…/archivado)** — **Parcial**  
   - **Hoy**: estado como string (ej. `REGISTRADO`), sin catálogo formal ni transición controlada.  
   - **Falta**: máquina de estados y restricciones de transición.

28. **Flujo de aprobación** — **Pendiente**  
   - **Falta**: roles revisor/aprobador, bandeja de pendientes, transiciones y evidencias.

29. **Trazabilidad documental (quién creó/modificó/revisó/aprobó/descargó/eliminó)** — **Parcial**  
   - **Hoy**: eventos de documento (CREADO/ACTUALIZADO) y eventos de archivo (SUBIDO/DESCARGADO/ELIMINADO).  
   - **Falta**: trazabilidad del flujo (revisión/aprobación) y auditoría transversal.

30. **Bitácora de auditoría (acciones del sistema con IP)** — **Pendiente (auditoría transversal)**  
   - **Hoy**: eventos por dominio existen; falta `audit_logs` central para auth/admin/denegaciones/exportaciones, con IP/UA/correlación.

31. **Historial de accesos (quién ingresó y cuándo)** — **Pendiente (auditoría transversal)**  
   - **Falta**: registrar `AUTH_LOGIN_OK/FAIL` en tabla central; reportes de accesos.

32. **Conservación documental (tiempo por tipo)** — **Pendiente**

33. **Políticas de retención** — **Pendiente**

34. **Archivo digital (estado archivado sin perder)** — **Parcial**  
   - **Hoy**: `activo` + `estado` (string) permiten simular, pero sin política ni restricciones.

35. **Eliminación controlada (sin autorización/registro)** — **Parcial**  
   - **Hoy**: documentos/archivos se restringen por ADMIN y los archivos usan borrado lógico.  
   - **Falta**: reglas de eliminación por política/estado + bitácora central y aprobación (si aplica).

### 3. Continuidad, reportes y cumplimiento

36. **Copias de seguridad automáticas (BD y archivos)** — **Pendiente**

37. **Restauración de información** — **Pendiente**

38. **Protección de documentos sensibles (público/interno/reservado/confidencial)** — **Pendiente**  
   - **Falta**: clasificación de confidencialidad + enforcement por rol/dependencia y auditoría.

39. **Reportes administrativos** — **Implementado (parcial)**  
   - **Hoy**: reportes de documentos a Excel/PDF con filtros.  
   - **Falta**: reportes de aprobación, archivado/eliminado, pendientes.

40. **Reportes de seguridad (accesos, intentos fallidos, acciones)** — **Pendiente**  
   - Depende de `audit_logs` + rate limiting.

41. **Panel de administración (usuarios/roles/permisos/documentos/auditoría)** — **Parcial**  
   - **Hoy**: usuarios + catálogos + reportes por rol ADMIN.  
   - **Falta**: roles/permisos granulares, auditoría central, configuración general.

42. **Manual de usuario** — **Implementado**  
   - **Evidencia**: `27-manual-usuario-sgd-gadpr-lm.md` + regla de actualización.

43. **Políticas internas del sistema** — **Parcial**  
   - **Hoy**: lineamientos en docs + reglas `.cursor/rules`.  
   - **Falta**: documento formal de políticas institucionales (acceso/retención/seguridad) y su aterrizaje en configuración.

44. **Notificaciones (pendiente/aprobado/rechazado/vencimiento)** — **Pendiente**

45. **Integridad del documento (evitar alteraciones y registrar cambios)** — **Parcial**  
   - **Hoy**: trazabilidad de cambios (eventos) + hash de archivos + RBAC.  
   - **Falta**: controles avanzados (firma digital, WORM, sellado de tiempo) si el alcance lo exige.

---

## 2) Módulos mínimos recomendados — estado actual

1) **Autenticación** — **Implementado (MVP)**  
   - Login, logout, refresh, recuperación, `/me`.  
   - Falta: rate limit/lockout, sesión por inactividad, auditoría central.

2) **Usuarios** — **Implementado (MVP)**  
   - Crear/editar/activar/desactivar/reset pass, roles básicos.  
   - Falta: roles institucionales adicionales y permisos granulares.

3) **Documentos** — **Implementado (MVP)**  
   - Registro, metadatos base, clasificación, búsqueda, detalle.

4) **Trazabilidad** — **Parcial**  
   - Eventos por documento/archivo implementados.  
   - Falta: bitácora transversal (`audit_logs`) + historial de accesos.

5) **Conservación** — **Pendiente**  
   - Retención, archivo formal, disposición/eliminación por política, restauración.

6) **Seguridad** — **Parcial**  
   - Validación, headers, CORS, ORM, subida de archivos controlada.  
   - Falta: lockout, CSP/CSRF según crecimiento, TLS institucional, hardening final y monitoreo.

7) **Reportes** — **Parcial**  
   - Documentos Excel/PDF implementado.  
   - Falta: reportes de auditoría/seguridad y cumplimiento documental (retención/aprobación).

---

## 3) Lista priorizada de “lo que falta” (recomendación)

### Prioridad Alta (cierra brechas de seguridad y evidencia)
- **R-30/R-31/R-40**: `audit_logs` (bitácora transversal) + historial de accesos + reportes de seguridad.
- **R-9**: rate limit / lockout en login y recuperación.
- **R-6/R-38**: control de acceso por documento (dependencia/confidencialidad) para evitar exposición indebida.
- **R-36/R-37**: backups + restauración con evidencia.

### Prioridad Media (mejora ISO 15489 “completo”)
- **R-27/R-28**: estados con máquina de transiciones + flujo de aprobación.
- **R-32/R-33**: retención y conservación.
- **R-44**: notificaciones (pendientes/vencimientos).

### Prioridad Baja / Futuro (institucionalización avanzada)
- Firma digital, sellado de tiempo, WORM, SIEM/WAF/MFA corporativo.

