# Arquitectura general — SGD-GADPR-LM

**Documento:** línea base de arquitectura para el prototipo (tesis).  
**Referencia:** expediente técnico `GADPR-LM-ETI-SGD-2026-001` (cap. 11).

---

## 1. Propósito y alcance

Este documento describe la **arquitectura lógica y física de referencia** del sistema: cliente SPA, API REST, persistencia relacional, almacenamiento de archivos y entornos de ejecución. No sustituye el expediente completo; profundiza en **cómo se conectan los componentes en el entorno real del desarrollador**.

---

## 2. Visión de capas

| Capa | Rol | Tecnología de referencia |
|------|-----|---------------------------|
| Presentación | SPA, formularios, navegación | React 18 + TypeScript + Vite |
| Aplicación / API | REST, autenticación, reglas de negocio | NestJS + TypeScript |
| Datos | Modelo relacional, transacciones | Prisma → MySQL/MariaDB (XAMPP) |
| Archivos | Binarios fuera del webroot | Carpeta local `storage/` |

Flujo típico: **navegador** → **axios** → **NestJS (Controllers → Guards → Services)** → **Prisma** → **MySQL/MariaDB**; las operaciones con archivo pasan por un servicio de almacenamiento sobre disco.

---

## 3. Entornos: local, prueba y futuro

| Entorno | Qué es | Infraestructura de referencia |
|---------|--------|--------------------------------|
| **Local (desarrollo)** | Máquina del desarrollador | XAMPP (MySQL/MariaDB), NestJS y Vite en `localhost`, sin exposición pública obligatoria |
| **Prueba / demo remota** | Acceso temporal desde otra red o dispositivo | Mismo stack local + **ngrok** como túnel HTTPS hacia el puerto del backend y/o frontend |
| **Futuro (no es base del proyecto)** | Intranet institucional o despliegue formal | Proxy TLS, políticas de red, backups operativos — **fuera del alcance mínimo de tesis** |

**Importante:** no se asume **Docker** ni **cloud** como mecanismo principal de desarrollo. Si en el futuro se adoptan, se documentarán como evolución explícita.

---

## 4. Arquitectura física en el PC de desarrollo (Windows + XAMPP)

```
┌─────────────────────────────────────────────────────────────┐
│  PC del desarrollador (Windows)                              │
│  ┌──────────────┐   ┌──────────────┐   ┌─────────────────┐  │
│  │ Vite :5173   │   │ NestJS :3000 │   │ XAMPP MySQL     │  │
│  │ (React SPA)  │──▶│ (API REST)   │──▶│ 127.0.0.1:3306  │  │
│  └──────────────┘   └──────┬───────┘   └─────────────────┘  │
│                            │                                  │
│                     ┌──────▼───────┐                         │
│                     │ storage/     │                         │
│                     │ (archivos)   │                         │
│                     └──────────────┘                         │
└─────────────────────────────────────────────────────────────┘
         Opcional (demo): ngrok HTTPS → puerto 3000 y/o 5173
```

- **Proxy inverso (Nginx):** no forma parte de la línea base; solo si se solicita explícitamente para un escenario concreto.
- **Base de datos:** siempre **MySQL/MariaDB** servido por XAMPP; **Prisma** se conecta mediante `DATABASE_URL` (ver `02-stack-y-convenciones.md` y `04-modelo-base-de-datos.md`).

---

## 5. Contrato de interfaz (resumen)

- **Estilo:** REST, JSON, recursos versionados (p. ej. `/api/v1/...`).
- **Autenticación:** JWT en cabecera; refresh en cookie HttpOnly según diseño del backend.
- **CORS:** en desarrollo, origen del Vite (`http://localhost:5173`); si se usa ngrok, añadir el origen HTTPS que entregue ngrok para esa sesión.

---

## 6. Relación con otros documentos

| Documento | Contenido relacionado |
|-----------|------------------------|
| `02-stack-y-convenciones.md` | Puertos, variables de entorno, comandos |
| `03-estructura-de-carpetas.md` | Organización del repositorio |
| `04-modelo-base-de-datos.md` | Prisma, migraciones, XAMPP, phpMyAdmin |
| `18-seguridad-y-hardening.md` | ngrok, CORS, cookies, riesgos |

---

## 7. Estado actual del código (referencia rápida — 2026-05-06)

SPA **React/Vite** → API **NestJS** (`/api/v1`) → **MySQL/MariaDB** vía Prisma y carpeta **`storage/`** para binarios; autenticación JWT + cookie de refresh HttpOnly.

Extensiones pertinentes para arquitectura de confianza: **throttling** y **lockout por cuenta**, **auditoría transversal** con consulta ADMIN + UI, **reportes servidor** con permisos por rol (**ADMIN**; **ADMIN+REVISOR** en “pendientes de revisión”), y **filtrado de visibilidad** de documentos/archivos/reportes por **dependencia del JWT** + **confidencialidad**.

Índice y snapshot consolidado: `docs/README.md` y `docs/28-listado-lo-que-deberia-tener-el-sistema.md`.

---

## 8. Limitaciones conscientes (tesis)

- Dimensionamiento para **producción** no es objetivo; el hardware local acota rendimiento y concurrencia.
- **Certificación ISO** u **ASVS** no se pretenden; el diseño se alinea como referencia académica.
