# Copias de seguridad — MySQL (XAMPP) + carpeta `storage/`

Este proyecto **no** programa backups automáticos en el servidor: el ítem **R-36 / R-37** del gap (`docs/28-listado-lo-que-deberia-tener-el-sistema.md`) se cubre aquí como **procedimiento operativo** que la institución debe ejecutar fuera del código.

## 1) Variables

- **`DATABASE_URL`**: en `backend/.env` aparece como `mysql://USER:PASSWORD@HOST:PORT/DATABASE`.
- **Directorio bin MySQL**: en XAMPP suele ser `C:\xampp\mysql\bin\` (ajustar ruta).

## 2) Volcado lógico (mysqldump)

Desde PowerShell (ajuste `usuario`, `nombre_bd` y ruta mysqldump):

```powershell
& "C:\xampp\mysql\bin\mysqldump.exe" -u usuario -p --single-transaction --routines nombre_bd `
  > ".\backup-bd-$(Get-Date -Format yyyyMMdd-HHmm).sql"
```

Guardar los `.sql` en medio externo (disco institucional, NAS, objeto S3-compatible, etc.).

## 3) Carpeta `storage/`

Copiar/recincronizar periódicamente la carpeta `storage/` del repositorio (binarios adjuntos):

```powershell
Compress-Archive -Path "..\storage\*" -DestinationPath ".\backup-storage-$(Get-Date -Format yyyyMMdd-HHmm).zip"
```

## 4) Restauración (resumen)

1. Crear BD vacía o truncar tras acuerdo.
2. Importar el `.sql`:

```powershell
& "C:\xampp\mysql\bin\mysql.exe" -u usuario -p nombre_bd < .\backup-bd-YYYYMMDD-HHmm.sql
```

3. Extraer `.zip` de `storage/` al mismo path relativo del despliegue.

## Evidencias

Registrar fecha, tamaño del respaldo y responsable en la bitácora institucional (no solo en chats).
