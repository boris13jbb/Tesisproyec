# Copias de seguridad — MySQL (XAMPP) + carpeta `storage/`



Este proyecto permite **copia lógica automática** mediante el **backend NestJS** (`mysqldump` por cron configurado por variables de entorno) **y/o** ejecución **manual** con las mismas herramientas. La **restauración** debe seguir siendo un **procedimiento controlado fuera del SGD web**.



## Automático en el servidor (API)



Variables en `backend/.env` — detalle completo en `backend/.env.example`:



| Variable | Uso |

|----------|-----|

| `BACKUP_AUTOMATED_ENABLED` | `true` para registrar un cron dentro del proceso NestJS |

| `BACKUP_AUTOMATED_CRON` | Expresión cron (p. ej. `0 3 * * *` = 03:00 diaria, hora servidor) |

| `BACKUP_MYSQLDUMP_PATH` | Ruta absoluta a `mysqldump` (Windows: típico `C:\xampp\mysql\bin\mysqldump.exe`) |

| `BACKUP_OUTPUT_DIR` | Dónde escribir `backup-auto-<timestamp>.sql` (opcional; por defecto `repo/backups/automated`) |

| `BACKUP_KEEP_COUNT` | Rotación — cuántos archivos recientes conservar |

| `BACKUP_INCLUDE_STORAGE_ZIP` | `true` para añadir un ZIP paralelo del árbol `storage/` |

| `BACKUP_STORAGE_ROOT` | Si `storage/` no está en `repo/storage` |

| `BACKUP_EXPECTED_SCHEDULE_HINT` | Texto institucional en la UI `/admin/respaldos` |



Los eventos se registran en **auditoría** (`audit_logs`) con acción **`BACKUP_VERIFIED`**, resultado **OK/FAIL**, `meta.source=scheduled_mysqldump`. El administrador también puede lanzar **`POST /api/v1/backup/admin/run-now`** o el botón **Ejecutar mysqldump ahora** en pantalla Respaldos.



**Riesgos:** el `.sql` y el ZIP contienen datos completos — proteja el disco de destino, permisos de carpeta y no exponga ese directorio vía HTTP. No commitee respaldos al repositorio.



## Variables (manual)



- **`DATABASE_URL`**: `mysql://USER:PASSWORD@HOST:PORT/DATABASE` consumida también por Prisma.



## Volcado lógico manual (PowerShell)



```powershell

& "C:\xampp\mysql\bin\mysqldump.exe" -u usuario -p --single-transaction --routines nombre_bd `

  > ".\backup-bd-$(Get-Date -Format yyyyMMdd-HHmm).sql"

```



## Carpeta `storage/` (manual)



```powershell

Compress-Archive -Path "..\storage\*" -DestinationPath ".\backup-storage-$(Get-Date -Format yyyyMMdd-HHmm).zip"

```



## Restauración (resumen)



1. Acuerdo institucional y ventana.

2. Importar `.sql` con cliente MySQL.

3. Restaurar `storage/` desde copia paralela.



## Evidencias

Registrar en auditoría (automático/manual) **y** bitácora operativa institucional.

## Checklist rápido (activación local)

1. Confirmar **`BACKUP_MYSQLDUMP_PATH`** apunta al `mysqldump` real (PowerShell: `Test-Path 'C:\xampp\mysql\bin\mysqldump.exe'`).
2. En `backend\.env`: `BACKUP_AUTOMATED_ENABLED=true` y opcional cron `BACKUP_AUTOMATED_CRON`.
3. Reiniciar el API Node para registrar el cron.
4. Opcional inmediato: **Respaldos** → **Ejecutar mysqldump ahora**, o `POST /api/v1/backup/admin/run-now`.
5. Revisar archivos en `backups/automated/` (permisos: solo servidor/admin).
6. En otro equipo o copia nueva del repo: `powershell -ExecutionPolicy Bypass -File scripts/configure-local-backups.ps1` (solo añade el bloque si falta `BACKUP_MYSQLDUMP_PATH`).

