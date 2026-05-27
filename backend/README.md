# SGD-GADPR-LM — backend (NestJS + Prisma + MySQL/XAMPP)

Este directorio contiene el **API** del sistema (NestJS) con prefijo global **`/api/v1`** y persistencia mediante **Prisma** contra **MySQL/MariaDB** (XAMPP).

> Para un onboarding completo y consistente del monorepo: ver `README.md` en la **raíz** del repositorio y `docs/README.md`.

## Requisitos

- Node.js LTS
- XAMPP con MySQL/MariaDB iniciado

## Configuración local

1) Copiar variables de entorno:

```bash
copy .env.example .env
```

2) Ajustar `DATABASE_URL` y secretos JWT en `.env` (ver `.env.example`).

3) Instalar dependencias:

```bash
npm install
```

4) Prisma (si hay BD creada y MySQL activo):

```bash
npx prisma migrate deploy
npx prisma generate
```

5) Ejecutar API:

```bash
npm run start:dev
```

## Endpoints base (referencia)

- Salud: `GET /api/v1/health`

## Scripts útiles

Ver `package.json`. Los principales:

- `npm run start:dev`
- `npm run lint`
- `npm run test` / `npm run test:e2e`
- `npm run prisma:migrate` / `npm run prisma:generate` / `npm run prisma:studio`

## Documentación técnica

- Stack: `docs/02-stack-y-convenciones.md`
- Modelo BD: `docs/04-modelo-base-de-datos.md`
- Auth/RBAC: `docs/05-modulo-auth.md`, `docs/07-modulo-roles-permisos.md`
