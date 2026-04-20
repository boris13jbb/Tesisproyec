# Estructura de carpetas — SGD-GADPR-LM

Este documento describe la **organización esperada** del repositorio alineada al expediente técnico (cap. 11). Cuando el código exista, debe actualizarse para reflejar la **estructura real**.

---

## 1. Principios

- **Separación** entre frontend (SPA), backend (API) y definición de datos (Prisma).
- **`storage/`** en la raíz del proyecto o junto al backend (según se implemente), **fuera** de carpetas servidas como estáticos públicos sin control.
- **`docs/`** para documentación de infraestructura, seguridad y modelo de datos.

---

## 2. Estructura real del repositorio (2026-04-20)

```
/
├── .cursor/rules/             # Reglas del IDE (Prisma/XAMPP, ngrok)
├── backend/                   # NestJS + Prisma
│   ├── prisma/
│   │   ├── schema.prisma
│   │   └── migrations/
│   └── src/
│       ├── main.ts
│       ├── app.module.ts
│       ├── app.controller.ts
│       ├── cargos/            # Catálogo cargos (ETAPA 5)
│       ├── common/            # Utilidades (p. ej. prisma-util)
│       ├── dependencias/      # Catálogo dependencias (ETAPA 5)
│       ├── auth/              # AuthModule, JWT, guards, @Roles
│       └── prisma/            # PrismaModule + PrismaService
├── frontend/                  # Vite + React 18 + TS + MUI
│   └── src/
│       ├── api/               # Cliente axios (apiClient)
│       ├── app/               # App + rutas React Router
│       ├── auth/              # AuthProvider, useAuth, token en memoria
│       ├── layouts/           # Shell (p. ej. MainLayout + Outlet)
│       ├── routes/            # ProtectedRoute y rutas compuestas
│       ├── pages/             # Pantallas (login, dashboard, 403, 404)
│       └── theme/             # Tema MUI
├── docs/                      # Documentación técnica (índice: README.md)
├── storage/                   # Archivos digitales (.gitkeep; contenido ignorado)
├── Nueva carpeta/             # Material del expediente / anexos
├── README.md
└── .gitignore
```

**Pendiente:** módulos de dominio NestJS bajo `src/modules/` (usuarios, catálogos, etc.) cuando crezca el API.

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
