# SGD-GADPR-LM — Sistema de gestión documental (prototipo de tesis)

Aplicación web para gestión documental institucional digitalizada (caso de estudio GADPR-LM), con stack definido en `docs/02-stack-y-convenciones.md`.

## Estado del repositorio (desarrollo)

| Componente | Estado |
|------------|--------|
| Backend (`backend/`) | NestJS — plantilla base |
| Frontend | **Pendiente** (no existe carpeta `frontend/`) |
| Prisma / MySQL | **Pendiente** (sin `schema.prisma` aún) |
| `storage/` | Carpeta reservada para archivos (ver `.gitignore`) |

Documentación viva: carpeta **`docs/`** (índice en `docs/README.md`).

## Requisitos

- Node.js LTS
- XAMPP con MySQL/MariaDB en marcha (puerto típico 3306)
- (Opcional) ngrok para exposición temporal documentada en `docs/23-entorno-local-xampp-ngrok.md`

## Backend (API)

```bash
cd backend
cp .env.example .env
# Editar .env (DATABASE_URL cuando exista Prisma)
npm install
npm run start:dev
```

Por defecto la API escucha en **http://localhost:3000** (ver `PORT` en `.env`).

### Scripts útiles

| Script | Descripción |
|--------|-------------|
| `npm run build` | Compilación NestJS |
| `npm run start:dev` | Desarrollo con recarga |
| `npm run lint` | ESLint |
| `npm run test` | Pruebas unitarias |
| `npm run format` | Prettier |

## Frontend

Se creará con Vite + React + TypeScript en `frontend/` como parte de la **ETAPA 1** (base técnica). Hasta entonces no hay `npm run dev` en la raíz.

## Documentación

- Roadmap y fases: `docs/00-roadmap-general.md`
- Arquitectura: `docs/01-arquitectura-general.md`
- Problemas y riesgos: `docs/20-problemas-detectados.md`, `docs/21-riesgos-pendientes.md`
- Changelog técnico: `docs/22-changelog-tecnico.md`

## Licencia

Privado / tesis — ver metadatos del proyecto.
