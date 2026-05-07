# Prisma CLI — comandos de referencia (SGD-GADPR-LM)

## Contexto

- **ORM:** Prisma 5.x con **MySQL/MariaDB** (XAMPP).
- **Esquema:** `backend/prisma/schema.prisma`.
- **Migraciones:** `backend/prisma/migrations/` (**17** carpetas versionadas al 2026-05-06; inventario en `docs/04-modelo-base-de-datos.md`).
- Ejecutar los comandos desde la carpeta **`backend/`** (donde está el `schema.prisma`), usando:

```bash
npx prisma <comando>
```

o los scripts npm definidos en `backend/package.json` (ver sección final).

---

## Comandos esenciales

| Comando | Uso |
|--------|-----|
| `prisma generate` | Regenera el **cliente** Prisma (`node_modules/.prisma/client`) según `schema.prisma`. Necesario tras cambiar modelos para que TypeScript y el runtime reflejen el esquema. |
| `prisma migrate dev` | **Desarrollo:** detecta cambios en el esquema, **crea** un archivo de migración SQL, **lo aplica** a la BD y suele ejecutar `generate`. Solicita un nombre descriptivo para la migración. |
| `prisma migrate deploy` | **Producción / CI / otro equipo:** **solo aplica** migraciones pendientes ya versionadas en `prisma/migrations/`. No crea migraciones nuevas. |
| `prisma db seed` | Ejecuta el script de **seed** configurado en `package.json` → `prisma.seed` (en este proyecto: `prisma/seed.ts`). Datos iniciales (roles, usuario admin, etc.). |
| `prisma studio` | Abre una **interfaz web** para inspeccionar y editar filas en las tablas. |

---

## Base de datos y esquema

| Comando | Uso |
|--------|-----|
| `prisma db push` | Sincroniza el esquema con la BD **sin** generar archivos de migración. Útil en prototipos; para historial versionado preferir **`migrate dev`**. |
| `prisma db pull` | **Introspección:** actualiza `schema.prisma` a partir de una base de datos ya existente. |
| `prisma migrate reset` | **Destructivo en desarrollo:** recrea/aplica migraciones desde cero y ejecuta **seed**. Borra datos; usar con cuidado. |
| `prisma migrate resolve` | Marca migraciones como aplicadas o revertidas cuando hubo intervención manual en conflictos (casos excepcionales). |
| `prisma migrate diff` | Compara dos fuentes (esquema, BD, carpeta de migraciones) y muestra SQL de diferencias sin aplicarlas. |

---

## Validación y formato

| Comando | Uso |
|--------|-----|
| `prisma validate` | Comprueba que `schema.prisma` sea sintácticamente válido. |
| `prisma format` | Formatea `schema.prisma`. |

---

## Proyecto e información

| Comando | Uso |
|--------|-----|
| `prisma init` | Inicializa Prisma en un repo nuevo (`schema.prisma`, `.env`). Este proyecto ya está inicializado. |
| `prisma version` / `prisma -v` | Muestra versiones del CLI y del motor. |

---

## Flujo habitual en este monorepo

1. Cambias **`schema.prisma`** → `npx prisma migrate dev` (recomendado) o, solo en pruebas rápidas, `npx prisma db push`.
2. Traes cambios del repositorio con migraciones nuevas → `npx prisma migrate deploy` y `npx prisma generate`.
3. Actualizas datos de seed (p. ej. `SEED_ADMIN_*` en `.env`) → `npx prisma db seed`.
4. Inspeccionas datos → `npx prisma studio`.

**Nota (Windows):** si `prisma generate` falla con **EPERM** al renombrar el motor, usar en `backend/`:

```bash
npm run prisma:generate:clean
```

---

## Scripts en `backend/package.json`

| Script | Comando real |
|--------|----------------|
| `npm run prisma:generate` | `prisma generate` |
| `npm run prisma:generate:clean` | Limpia `node_modules/.prisma` y ejecuta `generate` |
| `npm run prisma:migrate` | `prisma migrate dev` |
| `npm run prisma:studio` | `prisma studio` |

---

## Referencias

- Documentación oficial: [Prisma CLI reference](https://www.prisma.io/docs/orm/reference/prisma-cli-reference).
- Entorno local (XAMPP, `DATABASE_URL`): `docs/04-modelo-base-de-datos.md`, `docs/23-entorno-local-xampp-ngrok.md`.
