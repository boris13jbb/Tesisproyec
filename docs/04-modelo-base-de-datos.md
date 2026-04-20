# Modelo de base de datos — SGD-GADPR-LM

**Motor:** MySQL/MariaDB servido por **XAMPP**.  
**ORM:** Prisma (`provider = "mysql"`).  
**Referencia:** expediente técnico (modelo entidad-relación y diccionario de datos).

---

## Estado actual del repositorio (2026-04-20)

| Elemento | Situación |
|----------|-----------|
| `backend/prisma/schema.prisma` | **Existe** — Prisma **5.22.0** (fijado; Prisma 7 cambia la forma del `datasource` y no es la línea base del proyecto). |
| `backend/prisma/migrations/` | Migración inicial `20260420001500_init_rbac` (tablas RBAC). Aplicar con `npx prisma migrate dev` desde `backend/` con MySQL activo. |
| `DATABASE_URL` | Definir en `backend/.env` (plantilla en `.env.example`). Crear la base vacía en phpMyAdmin antes de migrar. |
| Cliente generado | Tras cambios en el schema: `npm run prisma:generate` en `backend/` (o `npx prisma generate`). Antes del build si el IDE no generó el cliente. |

### Tablas (migración inicial `init_rbac`)

| Tabla | Propósito |
|-------|-----------|
| `users` | Usuarios de aplicación (`password_hash` para Argon2id en ETAPA 3). |
| `roles` | Roles RBAC (`codigo` único). |
| `permissions` | Permisos granulares (`codigo` único). |
| `user_roles` | N:M usuario ↔ rol. |
| `role_permissions` | N:M rol ↔ permiso. |

### Catálogos (ETAPA 5 en curso)

| Tabla | Migración | Propósito |
|-------|-----------|-----------|
| `dependencias` | `20260421120000_add_dependencias` | Unidades organizativas (`codigo` único, `nombre`, `activo`). |
| `cargos` | `20260421140000_add_cargos` | Cargos/puestos; `dependencia_id` opcional (FK a `dependencias`, `ON DELETE SET NULL`). |
| `tipos_documentales` | `20260421160000_add_tipos_documentales` | Tipologías documentales (`codigo` único, `nombre`, `activo`). |
| `series` | `20260421170000_add_series_subseries` | Series documentales (`codigo` único, `nombre`, `activo`). |
| `subseries` | `20260421170000_add_series_subseries` | Subseries documentales (FK `serie_id` a `series`, `codigo` único). |
| `documentos` | `20260421180000_add_documentos_mvp` | Registro documental MVP (FK a `tipos_documentales`, `subseries`, `users`). |
| `documento_eventos` | `20260421190000_add_documento_eventos` | Historial/trazabilidad de documentos (eventos `CREADO` / `ACTUALIZADO`). |
| `documento_archivos` | `20260421193000_add_documento_archivos` | Adjuntos de documentos (MIME, tamaño, sha256, ruta relativa en `storage/`). |
| `documento_archivo_eventos` | `20260421193000_add_documento_archivos` | Trazabilidad de archivos (eventos `SUBIDO` / `DESCARGADO`). |
| `documento_archivos.version` | `20260421194500_documento_archivos_versionado` | Versionado incremental por documento + nombre (`unique(documento_id, original_name, version)`). |

Otros catálogos (vínculos con documentos, etc.) se añadirán en migraciones posteriores alineadas al expediente.

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
| Tras cada migración aplicada | Anotar en bitácora o changelog qué migración se ejecutó y la fecha |
| Desviaciones | Si hay diferencia entre diseño y BD, documentar causa (pull manual, hotfix SQL, etc.) |

**Registro sugerido (ejemplo):**

| Fecha | Migración | Observación |
|-------|-----------|-------------|
| *(rellenar)* | `20260101120000_init` | Esquema inicial |

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
