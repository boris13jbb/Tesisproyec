# Guía de prueba por módulos (formato obligatorio de cierre)

Este documento consolida una **guía de prueba** usando el **formato obligatorio** del proyecto (ver `.cursor/rules/aviso-finalizacion-y-guia-de-prueba.mdc`).

> Fuente: planes existentes en `docs/05-modulo-auth.md`, `docs/13-modulo-archivos.md` y criterios en `docs/19-pruebas-y-validaciones.md`.

---

## Estado
Listo para probar.

## Módulo afectado
Pruebas transversales (Login/Roles/Documentos/Reportes/Respaldos).

## Qué se terminó
Guías de prueba paso a paso (manual) para validar módulos críticos y dejar evidencia (auditoría/exportaciones).

## Estándar o lineamiento aplicado
ISO/IEC 27001:2022, ISO 15489, OWASP ASVS.

## Prerrequisitos para probar
1. Iniciar MySQL (XAMPP).
2. Backend levantado en `http://localhost:3000` con prefijo `/api/v1`.
3. Frontend levantado en `http://localhost:5173`.
4. Base de datos migrada y seed ejecutado si aplica (ver `README.md` y `docs/04-modelo-base-de-datos.md`).

## Qué debe probar el usuario

### 1) Login / sesión / recuperación
1. Abrir `http://localhost:5173/login`.
2. Iniciar sesión con un usuario válido.
3. Verificar que el refresh funciona (dejar expirar el access token o forzar `401` y observar que el cliente renueva).
4. Cerrar sesión desde el menú.
5. Recuperación: probar solicitud con correo existente y no existente, y confirmar que el mensaje visible no permite enumeración.

### 2) Roles / acceso real (backend, no solo UI)
1. Con un usuario **sin** rol `ADMIN`, intentar abrir pantallas administrativas desde el menú.
2. Intentar ejecutar acciones administrativas (crear documento, subir archivo, exportar reportes, respaldos).
3. Confirmar que el backend responde `403` en operaciones protegidas y que la UI muestra un mensaje controlado.

### 3) Documentos (flujo básico + revisión)
1. Como `ADMIN`, crear un documento.
2. Subir un adjunto permitido y confirmar que aparece listado (versión/evento).
3. Descargar un adjunto y confirmar que registra evento.
4. Enviar a revisión el documento.
5. Resolver revisión como `REVISOR` (o `ADMIN`) si aplica.

### 4) Reportes (Excel/PDF)
1. Como `ADMIN`, exportar Documentos a Excel y PDF.
2. Como `REVISOR`, exportar Pendientes de revisión a Excel y PDF (si el rol está configurado).
3. Confirmar que cada export genera evidencia en auditoría.

### 5) Respaldos (verificación + ejecución manual si aplica)
1. Como `ADMIN`, abrir `/admin/respaldos`.
2. Registrar una verificación OK/FAIL.
3. (Opcional) Ejecutar “run now” si está habilitado.
4. Confirmar que el dashboard refleja el último OK y el historial.

### 6) Rendimiento post-login (prefetch + LCP panel)
Referencias: `docs/40-rendimiento-post-login-web-vitals.md`, manual § 1.5.

1. Con sesión iniciada, esperar ~2–3 s sin navegar lejos (precarga en idle).
2. En pestaña Red del navegador, observar solicitudes paralelas esperables (chunks de página y `GET` frecuentes; ver doc 40) sin errores repetidos ni `429` masivos por LCP (`POST .../client-perf/web-vitals` está rate-limited).
3. Abrir el **panel principal** `/` y cargar hasta estabilizar.
4. Como `ADMIN`: **Auditoría** → filtrar por acción **`CLIENT_WEB_VITAL_LCP`** → confirmar al menos una fila con `meta_json` que incluye `valueMs`, `rating` (sin contenido sensible de negocio).
5. Navegar a **Documentos** y **Mi perfil** y comprobar que la primera visita después del idle suele percibirse fluida (caché de red; no equivalencia garantizada en todos los navegadores).

## Resultado esperado
- Login crea sesión y el refresh se rota/renueva sin exponer el refresh token al JS.
- Acciones sin permisos fallan con `403` (defensa en profundidad).
- Se generan registros de auditoría para eventos críticos (authz 403, rate limit 429, exportaciones, respaldos).
- Reportes descargan archivos válidos y consistentes con los filtros.

## Qué revisar si falla
- Backend apagado o proxy Vite apuntando a `:3000` sin servidor (ver `docs/19-pruebas-y-validaciones.md`).
- CORS (`CORS_ORIGIN`) o cookies no viajan (credenciales) en refresh.
- Migraciones/seed pendientes (errores 500 en auth o módulos).
- Roles mal asignados en BD/seed (403 inesperados o permisos excesivos).

## Evidencia que debe quedar
- Filas en `audit_logs` (acciones como `AUTHZ_FORBIDDEN`, `AUTH_RATE_LIMITED`, `REPORT_EXPORTED`, `BACKUP_VERIFIED`, `CLIENT_WEB_VITAL_LCP` y eventos de auth).
- Exportes `*.xlsx`/`*.pdf` descargados.
- Si se usan respaldos automatizados: artefactos en `backups/automated/` con permisos adecuados (y **no** versionados).

## Siguiente paso recomendado
Estandarizar el cierre de cambios por iteración: cada PR debe incluir esta guía (o su subconjunto) y dejar evidencia mínima (capturas + auditoría).

