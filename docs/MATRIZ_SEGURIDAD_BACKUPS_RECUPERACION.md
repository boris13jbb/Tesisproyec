# Matriz — Seguridad de backups / copias de seguridad / recuperación

**Proyecto:** SGD-GADPR-LM (`Tesisproyec`)  
**Estándares:** ISO/IEC 27001:2022 (copias, confidencialidad), ISO 15489 (recuperabilidad de registros), OWASP ASVS V4/V5/V7/V10.

Complementa [scripts/README-backups-mysql-xampp.md](../scripts/README-backups-mysql-xampp.md), [18-seguridad-y-hardening.md](./18-seguridad-y-hardening.md) y `backups/automated/README.md`.

## Arquitectura

Existe **backup operativo real** (no es un placeholder). No existe **restore en el SGD web**.

| Componente | Existe | Operativo | Descripción |
|---|---:|---:|---|
| Servicio backend | Sí | Sí | `MysqlDumpBackupService`: `spawn(mysqldump)` sin shell + ZIP opcional de `storage/` |
| Controller | Sí | Sí | `POST /backup/admin/run-now` |
| Endpoint crear backup | Sí | Sí | Mismo flujo que el cron |
| Endpoint listar archivos | NO EXISTE | — | El overview lista **eventos de auditoría**, no el disco |
| Endpoint descargar | NO EXISTE | — | Los `.sql`/`.zip` no se sirven por HTTP |
| Endpoint verificar checksum | NO EXISTE | — | No hay SHA-256 de backup |
| Endpoint eliminar | NO EXISTE | — | Rotación local por `BACKUP_KEEP_COUNT` en disco |
| Endpoint restaurar | NO EXISTE | — | Procedimiento CLI institucional |
| Scripts CLI | Sí | Sí | Guía PowerShell + `scripts/configure-local-backups.ps1` (solo escribe variables `.env`) |
| Scheduler | Sí | Condicional | Cron NestJS si `BACKUP_AUTOMATED_ENABLED=true` |
| Frontend | Sí | Sí | `/admin/respaldos` (RoleRoute ADMIN/SUPERADMIN) |
| Auditoría | Sí | Sí | Único evento `BACKUP_VERIFIED` (OK/FAIL) |
| Filesystem | Sí | Sí | Root lógico `BACKUP_OUTPUT_DIR` o `repo/backups/automated` |
| DB metadata de backups | NO EXISTE | — | No hay tabla de catálogo de dumps |

### Formato y contenido

| Campo | Valor real |
|---|---|
| Formato | `.sql` (mysqldump) + opcional `-storage.zip` (archiver, creación; **no hay extract** en app) |
| Contenido | Base **completa** del `DATABASE_URL` (incluye hashes de contraseña, secretos MFA cifrados, tokens hasheados, PII, auditoría, metadatos documentales) |
| Ubicación | Filesystem local (no S3/MinIO/Drive) |
| Naming | `backup-auto-<ISO>-<8 hex>.sql` generado en servidor |
| Root | `path.resolve(BACKUP_OUTPUT_DIR)` o `path.resolve(cwd, '..', 'backups', 'automated')` |
| Persistencia metadata | Solo `audit_logs` + archivos en disco |

El ZIP de storage **no se extrae** en la aplicación: zip-slip **no aplica** al flujo actual.

## Operaciones reales

| Operación | Endpoint/Script | Auth | Permission | Riesgo residual |
|---|---|---|---|---|
| CREATE | `POST /backup/admin/run-now` + cron | JWT | Rol ADMIN/SUPERADMIN + `BACKUP_RUN` | DoS disco/CPU (sin rate limit extra; single-flight) |
| LIST archivos | NO EXISTE | — | — | Overview: `GET /dashboard/admin/backup-overview` + `DASHBOARD_ADMIN_READ` |
| VERIFY (checksum) | NO EXISTE | — | — | Job: exit 0 + size > 0. UI: registro manual |
| DOWNLOAD | NO EXISTE | — | — | No hay descarga HTTP de dumps |
| DELETE | NO EXISTE (API) | — | — | Prune local anclado al root |
| RESTORE | NO EXISTE (API) | — | — | Solo procedimiento fuera del SGD |

Registro manual de evidencia: `POST /dashboard/admin/backup-verification` (`BACKUP_VERIFICATION_RECORD` + ADMIN). **No ejecuta dump.**

## RBAC

| Código | Uso |
|---|---|
| `BACKUP_RUN` | Ejecutar dump bajo demanda. **No** asignable como permiso directo por ADMIN (`rbac-policy.util` / UI) |
| `BACKUP_VERIFICATION_RECORD` | Registrar OK/FAIL manual en auditoría |
| `DASHBOARD_ADMIN_READ` | Overview / KPIs de `BACKUP_VERIFIED` |
| Rol `ADMIN` / `SUPERADMIN` | `@Roles('ADMIN')` incluye SUPERADMIN |

USER / REVISOR / AUDITOR sin esos permisos: **403**. Conocer un nombre de archivo no habilita API de descarga (no existe).

## Creación

El cliente **no** envía: output path, filename, comando, host DB, nombre de base, usuario, password, path del binario.

Esos valores salen de `DATABASE_URL` y `BACKUP_*` en el servidor.

- Escritura **atómica**: `.sql.tmp` → validar exit 0 y size > 0 → `rename` al `.sql` final. Igual para ZIP. **Prune solo después** del backup válido.
- Dump de **0 bytes** → FAIL `DUMP_EMPTY`; no queda `.sql` válido.
- Single-flight **in-process**: `this.running` con `try/finally`. Protege **una instancia** del backend (multi-instancia = mejora futura).
- Naming único: timestamp ISO + 8 hex del `correlationId`.
- `.cnf` temporal: `try/finally` cubre writeFile fallido, dump, rename y excepciones; no queda password en disco de forma controlada.

## Command execution

| Control | Valor |
|---|---|
| Shell | **No** (`shell: true` no se usa) |
| API | `spawn(dumpExe, args)` |
| Args controlados por HTTP | **No** |
| Credenciales en argv | **No** (archivo `.cnf` temporal en `os.tmpdir()`, `mode: 0o600` donde el OS lo honre) |
| Nombre de base | Validado (`isSafeMysqlDatabaseName`); no se aceptan flags tipo `--help` |
| Command injection | **PASS** en el flujo Nest (sin shell + args separados + validación de DB name) |

Scripts de documentación usan `mysqldump -u ... -p` (prompt). No se ejecutan desde la API.

## Credenciales

| Canal | Password DB |
|---|---|
| Hardcoded en repo | No |
| Logs / auditoría / response | No (stderr y mensajes sanitizados) |
| Process list | No va en argv; sí existe breve archivo `.cnf` que se borra en `finally` |

## Path security

No hay endpoint `:filename`. Prune y join usan `safeJoinUnderRoot` (basename, rechazo de `..`, absolutos, UNC).

Uploads documentales van a `storage/`, no al root de backups.

## Exposición estática

No hay `ServeStaticModule` / `express.static` sobre `/backups`. Los dumps **no** son carpeta pública de la app.

## BACKUP_VERIFIED — qué verifica exactamente

| Tipo | Crea dump | Verifica archivo | Actor | `meta.source` |
|---|---:|---:|---|---|
| Cron scheduler | Sí | exit 0 + size > 0 (+ ZIP > 0 si aplica) | `system-scheduled-backup` | `scheduled_mysqldump` |
| `POST .../run-now` | Sí | igual que el cron | JWT actual | `scheduled_mysqldump` + `trigger=manual` |
| Formulario UI (`manual_registry`) | **No** | **No** (ni checksum) | JWT actual | `manual_registry` |

`manual_registry` **NO ejecuta mysqldump y NO verifica checksum**: es una declaración/evidencia del administrador.

**OK del job** no significa SHA-256, restore-test ni integridad criptográfica.

Windows: `mode: 0o600` del `.cnf` **no** equivale a ACL NTFS; es limitación de despliegue.

## Restore

**NO IMPLEMENTADO** en API/UI ejecutable. Diálogos de la pantalla Respaldos son orientación. Quién restaura, desde qué archivo y con qué SQL lo define el procedimiento institucional (`scripts/README-backups-mysql-xampp.md`).

No hay upload de `.sql` para restaurar.

## Scheduler

| Variable | Rol |
|---|---|
| `BACKUP_AUTOMATED_ENABLED` | Activa el cron |
| `BACKUP_AUTOMATED_CRON` | Default `0 3 * * *` (no se cambia en esta fase) |
| `BACKUP_KEEP_COUNT` | Rotación (default 14, máx. 500) — **no** es política de retención institucional formal |
| Actor cron | `actorUserId: null`, `actorEmail: system-scheduled-backup` |

## Auditoría

| Evento real | Cuándo |
|---|---|
| `BACKUP_VERIFIED` OK | Dump válido o registro manual OK |
| `BACKUP_VERIFIED` FAIL | Error de dump/config/ZIP o registro manual FAIL |

**No existen** (no inventados): `BACKUP_CREATED`, `BACKUP_DOWNLOADED`, `BACKUP_DELETED`, `BACKUP_RESTORED`.

Meta permitida: `source`, `trigger`, `tipoRespaldo`, `tamanoBytes`, `dumpFile` (basename), `zipFile` (basename), `notes` sanitizado.

Meta prohibida en diseño: path absoluto, comando, `DATABASE_URL`, password, stderr crudo.

## Confidencialidad

Un dump es **dato altamente sensible**. Cifrado at-rest del archivo: **NO IMPLEMENTADO** (mejora de despliegue; el cifrado MFA no cubre el `.sql`).

Permisos NTFS/Linux del directorio: responsabilidad de operación (documentado en `backups/automated/README.md`).

## Git safety

- `.gitignore`: `/backups/**/*.sql`, `*.zip`, `*.dump`, `*.bak`, `*.tmp`
- No ignora `backend/prisma/migrations/**/*.sql` (legítimos)
- `.env` no se versiona; `.env.example` solo placeholders

## Retención

**NO DEFINIDA** como política institucional. Solo rotación local `BACKUP_KEEP_COUNT`. No se implementó borrado extra en esta fase.

## Tests

Autorización USER/ADMIN, traversal helpers, DB name anti-flag, dump vacío, lock, actor JWT, notas sin password, prune basename.

Restore: **no hay tests de restore real** (no hay API; no se toca la BD operativa).

## Riesgos residuales

| Nivel | Ítem |
|---|---|
| MEJORA FUTURA | Cifrado at-rest; retención institucional; off-site; restore-test automático; monitoreo de disco; cleanup de `.tmp` tras kill; lock distribuido si >1 instancia; ACL NTFS explícita |
| MEDIO / operativo | Agotar disco si el cron corre sin espacio; leftover `*.tmp` si el proceso se mata a mitad |
| BAJO | `mode: 0o600` del `.cnf` puede no aplicarse igual en Windows |
| N/A | Download headers / zip-slip extract / IDOR de backupId (no hay esos endpoints) |
