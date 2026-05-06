# Riesgos pendientes — SGD-GADPR-LM

## Objetivo

Registrar **riesgos técnicos y operativos** con mitigación y seguimiento.

## Alcance

Desarrollo local, demo con ngrok, datos de prueba y extensión futura.

## Estado actual

Actualizado **2026-05-06**. *ETAPA 0* documental cerrada (`docs/29-etapa-0-cierre-y-evidencias.md`). Riesgos operativos siguen en la tabla inferior.

---

## Registro

| ID | Descripción | Impacto | Probabilidad | Prioridad | Mitigación | Estado | Decisión / notas |
|----|-------------|---------|--------------|-----------|------------|--------|------------------|
| R-001 | Retraso por mezclar UI y backend sin orden de fases | Alto | Media | Alta | Seguir `00-roadmap-general.md`; no crear pantallas antes de ETAPA 1–2 acordadas | Abierto | — |
| R-002 | Documentación desincronizada del código | Medio | Media | Media | Actualizar docs tocados en cada PR/iteración | Abierto | — |
| R-003 | Secretos filtrados por error en Git | Alto | Baja | Alta | `.gitignore`; no commitear `.env`; revisar historial si hubo commit accidental | Abierto | — |
| R-004 | Exposición ngrok de API sin controles | Alto | Media | Media | Documentar sesión; CORS estricto; cerrar túnel; no usar en datos reales | Abierto | Ver `23-entorno-local-xampp-ngrok.md` |
| R-005 | Root MySQL sin contraseña solo en dev | Medio | Alta (en XAMPP default) | Media | Contraseña en MySQL para equipos compartidos; documentar en entorno | Abierto | Solo laboratorio aislado |
| R-006 | Enumeración de cuentas en recuperación de credenciales (revelar si el correo existe) | Alto | Media | Alta | Respuesta constante `202 { ok: true }`; no revelar existencia; registrar en `audit_logs` | Mitigado | API + registro `AUTH_PASSWORD_RESET_REQUEST` (y variantes) en `audit_logs` |
| R-007 | Abuso de endpoint de recuperación (fuerza bruta / spam) | Medio | Media | Media | Rate limit (por IP y por email), backoff; CAPTCHA institucional si aplica; monitoreo de picos | Abierto | Recomendado integrar `@nestjs/throttler` o equivalente |
| R-008 | Token de restablecimiento expuesto en canales inseguros (debug/dev) | Alto | Media | Alta | En producción **no** devolver `debugToken`; enviar token por correo institucional; rotación/revocación de tokens previos no usados | Abierto | En dev se devuelve `debugToken` solo para pruebas; documentar como “no productivo” |
| R-009 | Persistencia de sesiones tras restablecer contraseña | Alto | Media | Alta | Revocar `refresh_tokens` activos del usuario al confirmar reset; forzar re-login | Mitigado | Implementado en transacción del reset |
| R-010 | IDOR (acceso a recursos por UUID sin validar permisos/propiedad) | Alto | Media | Alta | Validar autorización por recurso en cada endpoint; no confiar en IDs del cliente; pruebas negativas | Abierto | Actualmente hay RBAC por rol; falta diseño por dependencia/ownership si el alcance lo exige |
| R-011 | Controles incompletos de auditoría transversal (eventos de seguridad/administración) | Alto | Media | Alta | Completar cobertura por módulo; correlación; retención; exportación ADMIN; integridad básica | Mitigado (parcial) | `audit_logs` + `AuditService` en operación; falta UI consulta, política de retención y cobertura total de 403/denegaciones |
| R-012 | Subida de archivos maliciosos (MIME falso / polyglot / DoS por tamaño) | Alto | Media | Alta | Validación MIME real, tamaño, extensión, nombres seguros; antivirus institucional si existe; quotas; streaming controlado | Mitigado (parcial) | Implementada whitelist y tamaño; AV/quota no implementado |
| R-013 | Exposición de archivos por servir storage como carpeta pública | Alto | Baja | Alta | Storage fuera del directorio público; descarga solo vía API con JWT/permiso; registrar descargas | Mitigado | Implementado: storage no público + descarga controlada + evento `DESCARGADO` |
| R-014 | Pérdida de integridad o no-repudio de archivos (sin hash/verificación) | Medio | Media | Media | Calcular SHA-256; almacenar en BD; verificar opcional en descarga; registrar versiones | Mitigado (parcial) | SHA-256 almacenado; verificación en descarga es mejora futura |
| R-015 | Falta de retención/disposición documental (ISO 15489) | Medio | Media | Media | Definir política por tipo/serie; estados de archivo/transferencia; plazos; evidencias (reportes) | Abierto | Fuera del MVP “duro”, pero recomendado para tesis si se exige ISO 15489 completa |
| R-016 | Falta de respaldos operativos y pruebas de restauración | Alto | Media | Alta | Backups BD + storage + logs; pruebas de restore; RPO/RTO; registro de ejecuciones | Abierto | Documentar y automatizar en ETAPA 10 (hardening y cierre) |
| R-017 | CORS/cookies mal configurados en exposición temporal (ngrok/cloudflared) | Alto | Media | Media | `CORS_ORIGIN` estricto; `sameSite`; `secure` en prod; no usar datos reales; cerrar túnel | Abierto | Riesgo recurrente en demos |
| R-018 | Falta de segregación de funciones (ADMIN único con todo) | Medio | Media | Media | Separar roles: Admin seguridad, Admin catálogos, Operador, Auditor; mínimo privilegio | Abierto | Actualmente se usa `ADMIN` vs `USUARIO` (MVP) |
| R-019 | Gestión de usuarios incompleta (sin desactivación, sin rotación de roles, sin historial central) | Medio | Media | Media | Endpoint y UI para activar/inactivar; auditoría de cambios; rotación de roles con evidencia | Abierto | Implementado: listado/crear/editar (API). UI: creación básica |
| R-020 | Exposición de PII en logs o respuestas | Medio | Media | Media | Sanitizar respuestas; evitar log de cuerpos/headers sensibles; mascar datos; política de logging | Abierto | Aún no existe política central de logs/auditoría |
| R-021 | Dependencias/bibliotecas con vulnerabilidades (supply chain) | Alto | Media | Alta | `npm audit` periódico; actualización controlada; lockfile; revisión CVEs | Abierto | Recomendado en ETAPA 10 |
| R-022 | Controles CSRF en presencia de cookies (refresh HttpOnly) | Medio | Baja | Media | `sameSite=lax`; endpoints sensibles por POST; considerar token anti-CSRF si se amplía el uso de cookies | Mitigado (parcial) | Diseño actual reduce superficie, pero no es CSRF “cero” si crece el sistema |

## Relación con problemas

Los problemas operativos concretos se enlazan desde `20-problemas-detectados.md`.
