# ETAPA 0 — Cierre al 100% (evidencias en repositorio)

**Proyecto:** SGD-GADPR-LM  
**Referencia roadmap:** `docs/00-roadmap-general.md` (fila **ETAPA 0 — Auditoría y saneamiento**)  
**Expediente:** `GADPR-LM-ETI-SGD-2026-001`  
**Fecha de cierre formal:** **2026-05-06**

---

> **Actualización documental (2026-05-06):** este documento conserva la evidencia de cierre del hito. Para el **estado vivo** del código y brechas institucionales: `docs/README.md` (snapshot), `docs/22-changelog-tecnico.md`, `docs/28-listado-lo-que-deberia-tener-el-sistema.md`.

## Objetivo

Declarar **cerrada la ETAPA 0** cuando los entregables del roadmap están **presentes en el monorepo** y la **deuda** queda registrada en los documentos oficiales de seguimiento, sin obligar a que cada máquina de desarrollo tenga MySQL configurado (eso es onboarding local, ETAPA 2 / operación).

---

## Checklist vs roadmap (`00-roadmap-general.md`)

| Entregable roadmap | Evidencia en repo | Estado |
|--------------------|-------------------|--------|
| `/docs` completo (índice + módulos + seguridad + entorno + manual + brechas) | `docs/README.md` enlaza `00`–`28`, `27-manual-usuario…`, `etapa-0-auditoria…`, **`29` (este archivo)** | Cumple |
| `.gitignore` (secretos y artefactos) | Raíz: `.gitignore` (`.env*`, `node_modules`, `dist`, `storage/*` con `!storage/.gitkeep`) | Cumple |
| `storage/` reservado | `storage/.gitkeep`; reglas documentadas en README y `13-modulo-archivos.md` | Cumple |
| `.env.example` (sin secretos) | `backend/.env.example`; `frontend/.env.example` | Cumple |
| `README.md` (onboarding + enlaces `docs/`) | `README.md` en raíz | Cumple |
| Deuda registrada | `docs/20-problemas-detectados.md`, `docs/21-riesgos-pendientes.md`, `docs/28-listado-lo-que-deberia-tener-el-sistema.md` | Cumple |

---

## Relación con el informe inicial de auditoría

El archivo **`etapa-0-auditoria-inicial-y-diagnostico.md`** es un **informe histórico** (snapshot **2026-04-19**). Las conclusiones de estado del repositorio en ese documente **no** describen el código actual.

- **Artefacto de diagnóstico:** se conserva sin reescribir el análisis original (trazabilidad académica).
- **Estado vigente del saneamiento:** este **`29-etapa-0-cierre-y-evidencias.md`** + `00-roadmap-general.md` (sección *Estado actual*).

---

## Validaciones mínimas recomendadas (no bloquean el cierre de ETAPA 0)

| Verificación | Responsable | Nota |
|--------------|--------------|------|
| Copiar `backend/.env.example` → `backend/.env` y crear BD MySQL | Cada desarrollador | Ya documentado en `README.md` y `04-modelo-base-de-datos.md` |
| `npx prisma migrate deploy` + `prisma generate` | Cada entorno | Fuera del “cierre documental”; ver reglas `.cursor/rules/prisma-xampp-mysql.mdc` |

---

## Próximo foco oficial

Según `docs/00-roadmap-general.md`, el trabajo de producto sigue en **ETAPA 10 — Hardening y cierre** y en el backlog de prioridades (`00`, sección inferior).

---

*Fin del documento de cierre ETAPA 0.*
