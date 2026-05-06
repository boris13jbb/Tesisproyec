# ETAPA 2 — BD + Prisma + XAMPP: cierre al 100 % (evidencias)

**Proyecto:** SGD-GADPR-LM  
**Referencia roadmap:** `docs/00-roadmap-general.md` (fila **ETAPA 2 — BD + Prisma + XAMPP**)  
**Referencia modelo:** `docs/04-modelo-base-de-datos.md`  
**Fecha de cierre formal:** **2026-05-06**

---

## Objetivo

Acreditar que la **capa de datos** declarada para el proyecto (MySQL/MariaDB vía **XAMPP**, **Prisma** como ORM único, migraciones versionadas) está **definida en el repositorio** y documentada para aplicación local.

> **Ámbito:** el cierre ETAPA 2 cubre **artefactos en Git** (`schema.prisma`, `migrations/`, `.env.example`, procedimiento `04`). Crear la BD vacía, definir `.env` y ejecutar `migrate deploy`/`generate` en cada PC es **onboarding por entorno** (no déficit del cierre ETAPA 2).

---

## Checklist vs roadmap (`00-roadmap-general.md`)

| Entregable | Evidencia | Estado |
|------------|-----------|--------|
| `schema.prisma` alineado a MySQL (`provider = "mysql"`) | `backend/prisma/schema.prisma` | Cumple |
| Migraciones versionadas en `prisma/migrations/` | Carpeta presente — **14** migraciones ordenadas cronológicamente (ver tabla en `docs/04-modelo-base-de-datos.md`) | Cumple |
| BD esperada para desarrollo (`DATABASE_URL`) documentada sin secretos | `backend/.env.example` + §1–3 de `04-modelo-base-de-datos.md` | Cumple |
| Validación en phpMyAdmin / SQL | Pasos §2 y §4 de `04-modelo-base-de-datos.md` | Cumple |
| Versión Prisma fijada (proyecto) | `@prisma/client` y `prisma` **5.22.0** en `backend/package.json` | Cumple |

---

## Comandos mínimos (desde `backend/`)

```bash
npx prisma migrate deploy
npx prisma generate
```

En desarrollo con iteración local: equivalente habitual `npm run prisma:migrate` (alias de `migrate dev`). Ver también `docs/24-prisma-comandos-cli.md`.

---

## Nota sobre etapas posteriores

Tablas nuevas ligadas a **auth avanzado**, **usuarios institucionales** o **auditoría** pueden añadirse en migraciones sucesivas tras ETAPA 2; el modelo consolidado debe reflejarse siempre en `04-modelo-base-de-datos.md` y en este archivo si se redefine el “cierre” de la etapa.

---

## Próximo hito oficial (roadmap)

**ETAPA 3 — Seguridad y auth:** cierre formal en **`docs/32-etapa-3-cierre-y-evidencias.md`**; detalle en **`docs/05-modulo-auth.md`**.

---

*Fin del documento de cierre ETAPA 2.*
