# Carpeta `backups/automated`

Aquí escribe el backend los archivos generados por **`mysqldump`** (y opcionalmente el ZIP de `storage/`).

## Seguridad (obligatorio en operación real)

1. **Permisos NTFS/Linux:** solo la cuenta del servicio Node y administradores del sistema; nadie más con lectura (contiene datos personales y metadatos institucionales).
2. **No servir por HTTP/S:** no mapear esta ruta en Nginx/IIS ni en Vite; los backups no son públicos.
3. **Copias externas:** mueva periódicamente los `.sql`/`.zip` a medio institucional (NAS, cifrado en reposo).
4. Los patrones `*.sql` y `*.zip` están en **`.gitignore`** del repositorio para no commitearlos por error.

Variables: `backend/.env` — `BACKUP_OUTPUT_DIR` si desea otra ruta absoluta.
