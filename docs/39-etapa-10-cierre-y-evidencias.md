# ETAPA 10 — Hardening y cierre: evidencias MVP de tesis

**Proyecto:** SGD-GADPR-LM  
**Referencia roadmap:** `docs/00-roadmap-general.md` (fila **ETAPA 10 — Hardening y cierre**)  
**Guía de controles:** `docs/18-seguridad-y-hardening.md`, `docs/19-mapeo-iso27001-iso15489-owasp-asvs.md`  
**Fecha de cierre formal:** **2026-05-07**  
**Etapa anterior:** `docs/38-etapa-9-cierre-y-evidencias.md`

---

> **Actualización documental (2026-05-06):** la evidencia de **ETAPA 10** permanece válida como hito. Tras este cierre se incorporaron, entre otros: **UI `/admin/auditoria`**, exports de auditoría desde **reportes**, **lockout de cuenta**, estados/transiciones (**R‑27**) y flujo de revisión (**R‑28**) con notificaciones SMTP opcionales (**R‑44**). Consolidado en `docs/22-changelog-tecnico.md` y snapshot `docs/README.md`.

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
| **Consulta ADMIN de auditoría (UI)** | Pantalla **`/admin/auditoria`** listado/export (evidencia post-cierre; ver nota inicial de este doc) | Cumple (extensión documentada) |
| **Limpieza y documentación de entrega** | Cierres `29`–`39`; índices `docs/README.md`, `README.md`, `EJECUTAR.txt`, manual `27` | Cumple MVP |

---

## Fuera de alcance ETAPA 10 (explicitado para no sobrevender el MVP)

- **Consulta institucional avanzada** de `audit_logs` (paneles BI, KPIs, retención legal, correlación SIEM): la **consulta ADMIN** existe por **API** y **UI `/admin/auditoria`**; lo anterior sigue siendo backlog (`15`, `21`).
- Cobertura de **todas** las superficies sensibles no auditadas si el alcance crece (**PermissionsGuard**, ABAC extendido): ver `07`, `21`.
- Backups **operativos** automatizados, AV sobre binarios — ver `scripts/README-backups-mysql-xampp.md`, `21`.

---

## Cierre del roadmap de implementación MVP (0 → 10)

Las etapas **0 a 10** quedan con evidencia formal en **`docs/29-etapa-0-cierre-y-evidencias.md`** … **`docs/39-etapa-10-cierre-y-evidencias.md`** (este documento).

**Continuidad recomendada del proyecto:** priorizar filas **Alta** del backlog del `00-roadmap-general.md` y el documento **`28`** según política institucional.

---

*Fin del documento de cierre ETAPA 10.*
