# ETAPA 10 — Hardening y cierre: evidencias MVP de tesis

**Proyecto:** SGD-GADPR-LM  
**Referencia roadmap:** `docs/00-roadmap-general.md` (fila **ETAPA 10 — Hardening y cierre**)  
**Guía de controles:** `docs/18-seguridad-y-hardening.md`, `docs/19-mapeo-iso27001-iso15489-owasp-asvs.md`  
**Fecha de cierre formal:** **2026-05-07**  
**Etapa anterior:** `docs/38-etapa-9-cierre-y-evidencias.md`

---

## Objetivo

Acreditar que el **MVP de tesis** cuenta con una **línea base de hardening** revisable (controles técnicos documentados, límites de abuso en autenticación, bitácora transversal en backend y **cadena documental 0–10**), sin confundir este cierre con una **certificación** ni con el **alcance institucional completo** (`28-listado-lo-que-deberia-tener-el-sistema.md`).

> **Alcance honesto:** mejoras como MFA, WAF, pentest formal, SIEM, políticas de retención operativas en producción y pantallas ADMIN para todos los informes quedan registradas como **backlog** en `21-riesgos-pendientes.md` y en los módulos funcionales.

---

## Checklist vs roadmap (`00-roadmap-general.md`)

| Entregable | Evidencia | Estado MVP tesis |
|------------|-----------|------------------|
| **Revisión seguridad (referencia)** | Controles resumidos en `18-seguridad-y-hardening.md`; mapeo ASVS/ISO en `19-mapeo-iso27001-iso15489-owasp-asvs.md` | Cumple (referencia verificable) |
| **Headers y superficie HTTP** | **Helmet** + desactivar `x-powered-by` donde aplica (`backend/src/main.ts`) | Cumple |
| **Validación de entrada** | `ValidationPipe` global (`whitelist`, `forbidNonWhitelisted`, `transform`) | Cumple |
| **Rate limiting global** | `ThrottlerModule` + `APP_GUARD` `ThrottlerGuard` — `ttl` 60s, `limit` 200 defecto (`app.module.ts`) | Cumple |
| **Rate limiting auth (ASVS/brute force)** | `@Throttle` en `login`, `refresh`, `session/restore`, `password-reset/*` (`auth.controller.ts`) | Cumple MVP |
| **Auditoría ante 429 por throttler** | `ThrottlerAuditFilter` → `AUTH_RATE_LIMITED` vía `AuditService` (`common/filters/throttler-audit.filter.ts`) | Cumple |
| **Bitácora transversal** | Tabla `audit_logs`; servicios integrados en flujos críticos (ver `15-modulo-auditoria.md`) | Cumple backend |
| **Consulta ADMIN de auditoría (API)** | `GET /api/v1/auditoria` paginado + filtros (`auditoria.controller.ts`, `AuditQueryDto`) | Cumple |
| **Limpieza y documentación de entrega** | Cierres `29`–`39`; índices `docs/README.md`, `README.md`, `EJECUTAR.txt`, manual `27` | Cumple MVP |

---

## Fuera de alcance ETAPA 10 (explicitado para no sobrevender el MVP)

- **UI dedicada** de consulta de `audit_logs` (la consulta existe por **API ADMIN**).
- Auditoría automática en **todas** las exportaciones de reportes (pendiente recomendado: `38`, `16`).
- **PermissionsGuard** granular, control por dependencia/confidencialidad del documento, backups operativos, AV en archivos — ver roadmap backlog (`00-roadmap-general.md`, sección backlog) y `21`.

---

## Cierre del roadmap de implementación MVP (0 → 10)

Las etapas **0 a 10** quedan con evidencia formal en **`docs/29-etapa-0-cierre-y-evidencias.md`** … **`docs/39-etapa-10-cierre-y-evidencias.md`** (este documento).

**Continuidad recomendada del proyecto:** priorizar filas **Alta** del backlog del `00-roadmap-general.md` y el documento **`28`** según política institucional.

---

*Fin del documento de cierre ETAPA 10.*
