#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Añade variables de respaldo automático a backend\.env si aún no existen BACKUP_MYSQLDUMP_PATH.
.DESCRIPTION
    Idempotente. Revise BACKUP_MYSQLDUMP_PATH tras XAMPP/MySQL instalado en otra ruta.
#>
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$RepoRoot = Split-Path -Parent $PSScriptRoot
$EnvFile = Join-Path $RepoRoot 'backend\.env'
if (-not (Test-Path $EnvFile)) {
    Write-Error "No existe $EnvFile. Copie antes backend\.env.example a backend\.env"
    exit 1
}
$content = Get-Content -LiteralPath $EnvFile -Raw
if ($content -match '(?m)^BACKUP_MYSQLDUMP_PATH\s*=') {
    Write-Host 'Variables BACKUP_* ya definidas — no se modificó el archivo.'
    exit 0
}
$append = @"


# --- Respaldo automático MySQL (scripts/configure-local-backups.ps1) ---
BACKUP_MYSQLDUMP_PATH=C:\xampp\mysql\bin\mysqldump.exe
BACKUP_AUTOMATED_ENABLED=true
BACKUP_AUTOMATED_CRON=0 3 * * *
BACKUP_INCLUDE_STORAGE_ZIP=false
BACKUP_KEEP_COUNT=14
"@
Add-Content -LiteralPath $EnvFile -Value $append
Write-Host "Añadido bloque BACKUP_* a $EnvFile. Reinicie el backend (npm run start:dev en backend)."
exit 0
