# Entorno local (XAMPP) y ngrok — SGD-GADPR-LM

## Objetivo

Documentar el **entorno real de desarrollo** en Windows con XAMPP y el uso **opcional y temporal** de ngrok.

## Alcance

MySQL/MariaDB, phpMyAdmin, puertos, variables de entorno y riesgos de túnel HTTPS.

## Estado actual

- **MySQL/MariaDB:** esperado en `127.0.0.1:3306` (verificar en panel XAMPP).
- **phpMyAdmin:** `http://localhost/phpmyadmin` (puerto 80 del Apache de XAMPP).
- **Backend:** `http://localhost:3000` (NestJS).
- **Frontend:** `http://localhost:5173` (Vite) cuando exista `frontend/`.

## Decisiones técnicas

1. **Base de datos:** crear manualmente la base (p. ej. `gestion_documental_gadpr_lm`) antes de `prisma migrate`, cotejamiento `utf8mb4`.
2. **`DATABASE_URL`:** ver `backend/.env.example` y `02-stack-y-convenciones.md`.
3. **ngrok:** solo para demo, prueba en otro dispositivo o revisión puntual; **no** es entorno de producción.

## Flujo ngrok (referencia)

```bash
ngrok http 3000
# o, cuando exista el frontend:
ngrok http 5173
```

**Obligatorio al usar ngrok:**

1. Anotar en `22-changelog-tecnico.md`: comando, URL pública, propósito, fecha de cierre del túnel.
2. Ajustar **CORS** en NestJS para incluir el origen `https://….ngrok-free.app` (o dominio que entregue ngrok en esa sesión).
3. Si se usan cookies HttpOnly para refresh, validar `SameSite` y compatibilidad cross-site según el escenario.

## Flujo cloudflared (referencia)

Exposición temporal alternativa del **frontend** con HTTPS público (útil para pruebas rápidas en móvil o revisión remota).

```powershell
cloudflared tunnel --url http://localhost:5173
```

**Obligatorio al usar cloudflared:**

1. Anotar en `22-changelog-tecnico.md`: comando, URL pública, propósito, duración y cierre del túnel.
2. Usar **datos de prueba**; evitar exponer información real.
3. Si hay login/refresh con cookies/JWT, revisar compatibilidad de `SameSite/Secure` y CORS del backend.

Manual: `26-cloudflared-tunnel.md`.

## Riesgos

- Filtración de endpoints o datos de prueba por URL pública.
- Abuso de túnel abierto: limitar tiempo y usar credenciales fuertes.

## Problemas frecuentes

| Síntoma | Acción |
|---------|--------|
| CORS bloqueado desde URL ngrok | Añadir origen exacto en backend y reiniciar API |
| Cookie no enviada | Revisar dominio, SameSite, HTTPS |
| MySQL no conecta | Servicio detenido en XAMPP o puerto distinto en `DATABASE_URL` |

## Referencias

- Reglas Cursor: `.cursor/rules/prisma-xampp-mysql.mdc`, `.cursor/rules/ngrok-temporal-documentacion.mdc`
- Seguridad general: `18-seguridad-y-hardening.md`
