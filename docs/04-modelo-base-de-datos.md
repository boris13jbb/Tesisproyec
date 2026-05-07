# Modelo de base de datos — SGD-GADPR-LM

**Motor:** MySQL/MariaDB servido por **XAMPP**.  
**ORM:** Prisma (`provider = "mysql"`).  
**Referencia:** expediente técnico (modelo entidad-relación y diccionario de datos).

---

## Estado actual del repositorio (2026-05-06)

| Elemento | Situación |
|----------|-----------|
| `backend/prisma/schema.prisma` | **Existe** — `provider = "mysql"`. Prisma **5.22.0** fijado en `backend/package.json` (la línea base del proyecto no asume Prisma 7). |
| `backend/prisma/migrations/` | **18** migraciones ordenadas cronológicamente (ver tabla inferior). Aplicar con `npx prisma migrate deploy` o `migrate dev` desde `backend/` con MySQL activo. |
| `DATABASE_URL` | Definir en `backend/.env` (plantilla en `.env.example`). Crear la base vacía en phpMyAdmin antes de migrar. |
| Cliente generado | Tras cambios en el schema: `npm run prisma:generate` en `backend/` (o `npx prisma generate`). En Windows ante **EPERM**: `npm run prisma:generate:clean`. |
| Cierre ETAPA 2 | Evidencias formales en **`docs/31-etapa-2-cierre-y-evidencias.md`**. |

### Inventario ordenado de migraciones (cronológicas)

| # | Carpeta migración | Contenido principal |
|---|-------------------|----------------------|
| 1 | `20260420001500_init_rbac` | `users`, `roles`, `permissions`, `user_roles`, `role_permissions`. |
| 2 | `20260420103000_add_refresh_tokens` | Sesión prolongada: tabla `refresh_tokens` (hash, expiración, revocación). |
| 3 | `20260420120000_add_password_reset_tokens` | Recuperación de contraseña: `password_reset_tokens`. |
| 4 | `20260421120000_add_dependencias` | Catálogo `dependencias`. |
| 5 | `20260421140000_add_cargos` | Catálogo `cargos` (FK opcional a `dependencias`). |
| 6 | `20260421160000_add_tipos_documentales` | Catálogo `tipos_documentales`. |
| 7 | `20260421170000_add_series_subseries` | `series` + `subseries`. |
| 8 | `20260421180000_add_documentos_mvp` | `documentos` + FK catálogos + creador. |
| 9 | `20260421190000_add_documento_eventos` | Trazabilidad dominio documento (`documento_eventos`). |
| 10 | `20260421193000_add_documento_archivos` | Adjuntos (`documento_archivos`, `documento_archivo_eventos`). |
| 11 | `20260421194500_documento_archivos_versionado` | Columna/versionado incremental por archivo. |
| 12 | `20260505021000_add_user_dependencia_cargo` | Usuario institucional: `users.dependencia_id`, `users.cargo_id` (FK opcionales). |
| 13 | `20260505123600_add_audit_logs` | Bitácora transversal `audit_logs`. |
| 14 | `20260505125800_refresh_tokens_last_used_at` | `refresh_tokens.last_used_at` (inactividad / ASVS sesión). |
| 15 | `20260506143000_user_ultimo_login` | Usuario: `users.ultimo_login_at` (último login OK con credenciales). |
| 16 | `20260507153000_documento_dependencia_confidencialidad` | Documento: `dependencia_id` (propietaria) + `nivel_confidencialidad` (+ backfill desde creador). |
| 17 | `20260508120000_user_login_lockout` | Usuario: `failed_login_attempts`, `locked_until` (bloqueo temporal tras N fallos). |
| 18 | `20260509153000_normalize_documento_estados` | Normaliza `documentos.estado` a catálogo formal (R‑27). |

### Tablas resumen por dominio

**RBAC (núcleo usuarios)**

| Tabla | Propósito |
|-------|-----------|
| `users` | Cuentas (`password_hash` Argon2id); opcionalmente `dependencia_id`, `cargo_id`; contador de intentos fallidos y `locked_until` (R-9 MVP); `ultimo_login_at` (login exitoso con contraseña). |
| `roles` / `permissions` | Catálogo de roles y permisos granulares. |
| `user_roles` / `role_permissions` | N:M usuario↔rol y rol↔permiso. **Seed** (`prisma/seed.ts`): inserta/actualiza catálogo `permissions` y reemplaza enlaces por rol (idempotente). |

**Sesión y credenciales**

| Tabla | Migración inicial | Propósito |
|-------|-------------------|-----------|
| `refresh_tokens` | `20260420103000_*` (+ `20260505125800_*`) | Cookie refresh HttpOnly + rotación; control de uso/inactividad. |
| `password_reset_tokens` | `20260420120000_*` | Tokens opacos de restablecimiento (solo hash en BD). |

**Catálogos institucionales**

| Tabla | Migración | Propósito |
|-------|-----------|-----------|
| `dependencias` | `20260421120000_*` | Unidades organizativas. |
| `cargos` | `20260421140000_*` | Puestos; FK opcional a `dependencias`. |
| `tipos_documentales` | `20260421160000_*` | Tipologías. |
| `series` / `subseries` | `20260421170000_*` | Clasificación documental. |

**Gestión documental y archivos**

| Tabla | Migración | Propósito |
|-------|-----------|-----------|
| `documentos` | `20260421180000_*` + **`20260507153000_*`** | Registro documental; FK opcional a `dependencias` y nivel **PUBLICO / INTERNO / RESERVADO / CONFIDENCIAL** (control acceso en backend). |
| `documento_eventos` | `20260421190000_*` | Historial CREAR/EDITAR dominio documento. |
| `documento_archivos` / `documento_archivo_eventos` | `20260421193000_*`, `20260421194500_*` | Adjuntos versionados + eventos (p. ej. SUBIDO/DESCARGADO/ELIMINADO). |

**Auditoría transversal**

| Tabla | Migración | Propósito |
|-------|-----------|-----------|
| `audit_logs` | `20260505123600_*` | Eventos de seguridad/administración (acción/resultado, actor, recurso, IP/UA, `meta_json`). |

Nuevos cambios esquema → **nueva carpeta en `prisma/migrations/`** + actualización de **`schema.prisma`**, esta sección y `docs/22-changelog-tecnico.md`.

---

## 1. Conexión Prisma ↔ XAMPP

1. **Levantar MySQL** en el Panel de control de XAMPP (módulo MySQL o MariaDB).
2. Confirmar que el puerto **3306** (o el configurado en XAMPP) esté en escucha.
3. **Crear la base de datos** vacía con el nombre usado en `DATABASE_URL` (p. ej. `gestion_documental_gadpr_lm`).
4. Definir **`DATABASE_URL`** en el `.env` del backend (ver `02-stack-y-convenciones.md`).

Ejemplo (solo desarrollo local; ajustar usuario/clave):

```env
DATABASE_URL="mysql://root:@127.0.0.1:3306/gestion_documental_gadpr_lm"
```

---

## 2. Validar que la base existe

### Opción A — phpMyAdmin

1. Abrir `http://localhost/phpmyadmin`.
2. Iniciar sesión con el usuario de MySQL de XAMPP.
3. Comprobar que la base aparece en la lista izquierda; si no, crearla con **Crear base de datos** (cotejamiento recomendado: `utf8mb4`).

### Opción B — línea de comandos

Si `mysql` está en el PATH de XAMPP:

```bash
mysql -u root -p -e "SHOW DATABASES LIKE 'gestion_documental_gadpr_lm';"
```

---

## 3. Migraciones Prisma

Desde el directorio donde viva `schema.prisma` (típicamente `backend/`):

```bash
npx prisma migrate dev
npx prisma generate
```

- **`migrate dev`:** aplica migraciones pendientes en desarrollo y mantiene el historial en `prisma/migrations/`.
- **`generate`:** regenera el cliente Prisma para TypeScript.

Si la base ya existía con tablas creadas fuera de Prisma, usar con cuidado `prisma db pull` solo para **introspección** y alinear el `schema.prisma` con revisión manual (documentar decisiones).

**Compatibilidad:** no usar tipos ni índices exclusivos de PostgreSQL. Para MySQL/MariaDB usar anotaciones `@db.*` cuando sea necesario.

---

## 4. Validar tablas en phpMyAdmin

1. Tras migrar, en phpMyAdmin seleccionar la base del proyecto.
2. Pestaña **Estructura**: deben aparecer las tablas definidas por las migraciones (usuarios, documentos, etc., según el diseño del expediente).
3. Comparar nombres de tablas/columnas con `schema.prisma` y con el diccionario del expediente.

---

## 5. Tablas esperadas vs reales

| Acción | Responsable |
|--------|-------------|
| Tras cada migración aplicada | Anotar en `docs/22-changelog-tecnico.md` y refrescar esta sección §“Inventario ordenado…” |
| Desviaciones | Si hay diferencia entre diseño y BD, documentar causa (pull manual, hotfix SQL, etc.) |

**Registro ejemplo (añadir según entorno):**

| Fecha | Migración aplicada | Observación |
|-------|---------------------|---------------|
| 2026-05-06 | Hasta **`20260509153000_normalize_documento_estados`** incl. | Inventario cronológico en §“Inventario ordenado…”; cierre ETAPA 2: `docs/31-etapa-2-cierre-y-evidencias.md`. |

---

## 6. Respaldo de desarrollo

- Exportar desde phpMyAdmin (**Exportar**) o `mysqldump` para entregas de tesis o recuperación ante fallos del PC.
- Mantener copias de `storage/` si los archivos son parte de la demo.

---

## 7. Problemas frecuentes

| Síntoma | Causa probable | Acción |
|---------|----------------|--------|
| `Can't reach database server` | MySQL detenido en XAMPP | Iniciar MySQL en el panel |
| Error de acceso denegado | Usuario/clave incorrectos en `DATABASE_URL` | Ajustar credenciales de XAMPP |
| Puerto distinto de 3306 | Otro servicio o configuración XAMPP | Cambiar puerto en XAMPP y en `DATABASE_URL` de forma coherente |
