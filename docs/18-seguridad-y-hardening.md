# Seguridad y hardening — SGD-GADPR-LM

## Objetivo

Definir la línea base de **controles técnicos** alineados como referencia con ISO/IEC 27001:2022 (gestión de seguridad de la información), ISO 15489 (gestión documental) y OWASP ASVS, **sin** pretender certificación formal en el alcance de tesis.

## Alcance

Autenticación, autorización, datos, archivos, comunicaciones en desarrollo local y pruebas; exposición temporal con ngrok.

## Estado actual

**Implementación:** pendiente (backend sin JWT/Prisma aún). Este documento es la **especificación de referencia** para iteraciones futuras.

## Decisiones técnicas

| Área | Decisión |
|------|----------|
| Autenticación | JWT access token (vida corta); refresh en **cookie HttpOnly** |
| Contraseñas | **Argon2id** (costes acordados en código) |
| API | Validación servidor (class-validator / DTOs); no confiar solo en el cliente |
| Errores | Mensajes genéricos al cliente; no filtrar stack ni detalles internos |
| Archivos | Lista blanca MIME/extensión, tamaño máximo, nombres seguros; servir vía API con permiso |
| Auditoría | Eventos críticos (login, cambios sensibles, descarga) en modelo dedicado |
| HTTPS local | Opcional; **ngrok** aporta HTTPS en demos temporales |

## Estructura prevista (código)

- Backend: `AuthModule`, guards JWT y de permisos, `Audit` o equivalente.
- Frontend: rutas protegidas, no almacenar refresh en `localStorage`.

## Flujos

1. Login → access + Set-Cookie refresh → requests con `Authorization: Bearer`.
2. Refresh → nuevo access; rotación de refresh según diseño.
3. Logout → invalidar refresh en servidor (lista/bloqueo) cuando exista persistencia.

## Controles OWASP ASVS (resumen)

- Validación y sanitización de entradas.
- Sesiones y tokens con expiración.
- Protección de rutas y datos por rol.
- Subida de archivos acotada y trazada.

## ngrok (temporal)

Detalle operativo, CORS y cookies: `23-entorno-local-xampp-ngrok.md`. Cada sesión debe registrarse en `22-changelog-tecnico.md`.

## Problemas detectados

- Ninguno de implementación hasta existir módulos de auth y archivos.

## Riesgos pendientes

- Exponer API por ngrok sin restricción de IP o credenciales débiles → mitigar con tokens fuertes, tiempo de sesión corto y cierre del túnel al terminar.

## Mejoras futuras

WAF, MFA institucional, HSM, pentest formal — fuera del MVP de tesis.
