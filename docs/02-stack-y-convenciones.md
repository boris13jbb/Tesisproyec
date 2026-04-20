# Stack y convenciones — SGD-GADPR-LM

**Referencia:** expediente técnico §11.2 (stack cerrado).

---

## 1. Stack tecnológico (línea base)

| Área | Tecnología |
|------|------------|
| Frontend | React 18, TypeScript, Vite (`frontend/`; lock en `package.json`) |
| UI | Material UI (MUI), React Router |
| Formularios | React Hook Form + Zod |
| HTTP cliente | axios |
| Backend | NestJS, TypeScript |
| Validación API | class-validator / class-transformer |
| ORM | **Prisma 5.x** (`@prisma/client` en backend; único ORM oficial) |
| Base de datos | **MySQL/MariaDB** vía **XAMPP** (no PostgreSQL) |
| Hash de contraseñas | Argon2id |
| Reportes | ExcelJS (Excel), pdfkit (PDF) |

**Qué no se asume por defecto:** Docker como runtime principal, servicios cloud, Redis/RabbitMQ, microservicios.

---

## 2. Puertos de referencia (ajustar si el proyecto define otros)

| Servicio | URL / host | Puerto típico |
|----------|------------|---------------|
| Frontend Vite | `http://localhost:5173` | 5173 |
| Backend NestJS | `http://localhost:3000` | 3000 |
| MySQL/MariaDB (XAMPP) | `127.0.0.1` | 3306 |
| phpMyAdmin (XAMPP) | `http://localhost/phpmyadmin` | 80 (Apache del XAMPP) |

Si `vite.config` o `main.ts` usan otros puertos, **documentar el valor real** en este archivo y en `.env.example`.

---

## 3. Variables de entorno (referencia)

### Backend (NestJS)

Definir en `.env` en la raíz del backend (o según estructura del repo):

| Variable | Propósito |
|----------|-----------|
| `DATABASE_URL` | Cadena Prisma hacia MySQL/MariaDB de XAMPP |
| `JWT_SECRET` / claves relacionadas | Firma de tokens (valores fuertes; no commitear secretos reales) |
| `PORT` | Puerto del API (p. ej. 3000) |
| Orígenes CORS | Lista que incluya `http://localhost:5173` y, **solo cuando se use ngrok**, el origen `https://xxxx.ngrok-free.app` de esa sesión |

### Frontend (Vite)

| Variable | Propósito |
|----------|-----------|
| `VITE_API_URL` | Base URL del API (p. ej. `http://localhost:3000/api/v1`) |

Los prefijos `VITE_` son expuestos al cliente; **no** poner secretos de servidor en variables `VITE_*`.

### Ejemplo de `DATABASE_URL` (desarrollo local)

```env
DATABASE_URL="mysql://root:@127.0.0.1:3306/gestion_documental_gadpr_lm"
```

- Usuario/contraseña deben coincidir con el usuario MySQL configurado en XAMPP (p. ej. `root` sin contraseña solo en desarrollo aislado).
- Preferir `127.0.0.1` en lugar de `localhost` si se evitan ambigüedades con resolución a socket en algunos entornos.

---

## 4. Flujo de conexión local (Prisma ↔ XAMPP)

1. Iniciar **MySQL** (o **MariaDB**) desde el **Panel de control de XAMPP**.
2. Crear la base de datos (nombre coherente con `DATABASE_URL`), vía **phpMyAdmin** o cliente SQL.
3. Colocar `DATABASE_URL` en `.env`.
4. Desde la carpeta del backend: `npx prisma migrate dev` (o flujo acordado) y `npx prisma generate`.
5. Levantar NestJS y Vite según scripts del `package.json`.

Detalle de validación en tablas: `04-modelo-base-de-datos.md`.

---

## 5. Convenciones de código (resumen)

- **API:** recursos en plural, códigos HTTP semánticos, errores sin filtrar stack traces al cliente.
- **Datos:** migraciones versionadas con Prisma; no introducir otro ORM sin acuerdo explícito.
- **Archivos:** rutas físicas no confiables; metadatos en BD; almacenamiento bajo `storage/` (ver expediente §11.7).

---

## 6. ngrok (solo temporal)

Uso, riesgos y registro obligatorio: `18-seguridad-y-hardening.md` y `22-changelog-tecnico.md`.

**Comandos de referencia:**

```bash
ngrok http 3000
ngrok http 5173
```

Adaptar al puerto real del servicio expuesto.
