# Estructura de carpetas — SGD-GADPR-LM

Este documento describe la **organización esperada** del repositorio alineada al expediente técnico (cap. 11). Cuando el código exista, debe actualizarse para reflejar la **estructura real**.

---

## 1. Principios

- **Separación** entre frontend (SPA), backend (API) y definición de datos (Prisma).
- **`storage/`** en la raíz del proyecto o junto al backend (según se implemente), **fuera** de carpetas servidas como estáticos públicos sin control.
- **`docs/`** para documentación de infraestructura, seguridad y modelo de datos.

---

## 2. Estructura real del repositorio (2026-05-06)

```
/
├── .cursor/rules/             # Reglas del IDE (Prisma/XAMPP, ngrok, seguridad)
├── backend/                   # NestJS + Prisma
│   ├── prisma/
│   │   ├── schema.prisma
│   │   └── migrations/
│   └── src/
│       ├── main.ts            # ValidationPipe, /api/v1, CORS, helmet, cookies
│       ├── app.module.ts
│       ├── app.controller.ts
│       ├── auth/              # JWT, refresh cookie, reset password
│       ├── auditoria/         # Bitácora transversal (ADMIN)
│       ├── cargos/
│       ├── common/            # Filtros, utilidades (p. ej. prisma-util)
│       ├── dependencias/
│       ├── documentos/
│       ├── mail/
│       ├── prisma/
│       ├── reportes/
│       ├── series/
│       ├── subseries/
│       ├── tipos-documentales/
│       └── usuarios/
├── frontend/                  # Vite + React 18 + TS + MUI
│   └── src/
│       ├── api/               # Cliente axios (apiClient)
│       ├── app/               # App + rutas React Router
│       ├── auth/
│       ├── layouts/
│       ├── nav/
│       ├── routes/
│       ├── pages/             # dashboard, documentos, catálogos, admin, login…
│       └── theme/
├── docs/                      # Documentación (índice: README.md; cierres ETAPA `29`,`30`)
├── storage/                   # Archivos digitales (.gitkeep; contenido ignorado)
├── Nueva carpeta/             # Material del expediente / anexos
├── README.md
├── EJECUTAR.txt
├── iniciar-desarrollo.cmd
└── .gitignore
```

Los módulos de dominio NestJS viven **directamente** bajo `backend/src/<dominio>/` (convención del repo), no es obligatorio el prefijo `src/modules/`.

---

## 3. Estructura objetivo (monorepo o carpeta única)

```
/
├── docs/                      # Documentación (este conjunto de archivos)
├── backend/                   # NestJS + Prisma (nombre puede variar: server/, api/)
│   ├── prisma/
│   │   ├── schema.prisma
│   │   └── migrations/
│   ├── src/
│   └── .env                   # No commitear secretos; usar .env.example
├── frontend/                  # React + Vite (nombre puede variar: client/, web/)
│   ├── src/
│   └── .env / .env.local
├── storage/                   # Archivos digitales (gitignore recomendado salvo ejemplos)
└── README.md
```

Si el repositorio usa **otra disposición** (por ejemplo `apps/web` y `apps/api`), mantener el mismo **espíritu** de separación y documentar aquí las rutas reales.

---

## 4. Ubicaciones clave

| Elemento | Ubicación típica | Notas |
|----------|------------------|--------|
| Esquema Prisma | `backend/prisma/schema.prisma` | `provider = "mysql"` |
| Migraciones | `backend/prisma/migrations/` | Versionadas en Git |
| Código NestJS | `backend/src/` | Módulos por dominio |
| SPA React | `frontend/src/` | Features, componentes, rutas |
| Binarios documentales | `storage/` | Permisos de escritura solo para el proceso Node |

---

## 5. Archivos que no deben versionarse con datos sensibles

- `.env` con `DATABASE_URL`, secretos JWT, etc.
- Contenido real de `storage/` en entornos con datos personales o institucionales.

Usar **`.env.example`** con placeholders y valores de ejemplo seguros.

---

## 6. phpMyAdmin

phpMyAdmin **no** es una carpeta del proyecto: viene con XAMPP y sirve para **inspección** de la base en `http://localhost/phpmyadmin`. La fuente de verdad del esquema aplicado al código es **Prisma** (`schema.prisma` + migraciones).
