# Matriz — Hardening operativo / configuración de producción

**Proyecto:** SGD-GADPR-LM (`Tesisproyec`)  
**Estándares:** ISO/IEC 27001:2022, OWASP ASVS V5/V7/V10/V14.

Complementa [18-seguridad-y-hardening.md](./18-seguridad-y-hardening.md) y [22-changelog-tecnico.md](./22-changelog-tecnico.md).

## Bootstrap

| Componente | Existe | Operativo | Ubicación |
|---|---:|---:|---|
| Backend bootstrap | Sí | Sí | `backend/src/main.ts` + `http-bootstrap.util.ts` |
| ConfigModule | Sí | Sí | `app.module.ts` (`envFilePath`: `.env.local`, `.env`) |
| Env validation | Parcial | Sí | `StartupConfigGuard` (JWT en production fail-fast) |
| CORS | Sí | Sí | Allowlist `CORS_ORIGIN`, `credentials: true` |
| Helmet | Sí | Sí | Helmet 8; HSTS **solo production** |
| Security headers | Sí | Sí | nosniff, frame SAMEORIGIN (default Helmet), sin X-Powered-By |
| Global ValidationPipe | Sí | Sí | whitelist + forbidNonWhitelisted + transform |
| Global exception filter | Sí | Sí | `SafeExceptionFilter` (no-HTTP) + filtros 403/429/multer |
| Throttler | Sí | Sí | Global 200/60s; `/auth` más estricto (fase Auth) |
| Cookie parser | Sí | Sí | `cookie-parser` |
| Trust proxy | NO EXISTE | — | `req.ip` = socket; no se añadió |
| Global API prefix | Sí | Sí | `api/v1` |
| Health endpoint | Sí | Sí | `GET /api/v1/health` |
| Swagger/OpenAPI | NO EXISTE | — | |
| Static serving | NO EXISTE | — | backups/storage no públicos |
| Docker | NO EXISTE | — | |
| Nginx | NO EXISTE | — | |
| Frontend env | Sí | Sí | `VITE_API_URL` opcional (pública) |
| Frontend source maps | No en prod | Sí | Vite default `sourcemap: false` |
| Logging | Sí | Sí | Nest Logger; sin request body logger |
| Request logging | NO EXISTE | — | |

## Entornos

| Control | Desarrollo | Producción |
|---|---|---|
| `NODE_ENV` | `development` (default implícito) | `production` |
| CORS | `CORS_ORIGIN` o `http://localhost:5173` | Allowlist exacta obligatoria en operación |
| Secure cookies | `secure: false` | `secure: true` (Auth cerrado) |
| Swagger | NO EXISTE | NO EXISTE |
| HSTS | **Off** | On (15552000 s) |
| JWT placeholder | warn, arranca | **fail-fast** |
| Health | Público mínimo | Igual |
| SMTP | Opcional | Opcional (flujo no falla) |
| Source maps frontend | Devtools Vite | No generados |
| TLS | HTTP local / túnel temporal | Responsabilidad de proxy/plataforma |
| Debug token reset | Solo no-prod + flag | Jamás |

**Fail-fast:** production no arranca con `JWT_ACCESS_SECRET` vacío/placeholder/corto. No se volvieron obligatorias variables opcionales (SMTP, backups).

## CORS

- Orígenes: lista coma-separada, **match exacto**, solo `http:`/`https:`.
- `*` se descarta (no hay wildcard + credentials).
- `Origin: null` denegado salvo que estuviera listado (no lo está).
- Sin `Origin` (curl/jobs): se permite (no es bypass de cookie de navegador).
- Preflight: origen permitido recibe ACAO.
- Credentials: `true` (refresh HttpOnly).

## Cookies

HttpOnly: **Sí**. Secure: production. SameSite: **lax**. Access JWT: Bearer en memoria. CSRF framework: **NO EXISTE** (no se inventó).

## Reverse proxy

`trust proxy` **no** está activo. `X-Forwarded-For` de un cliente directo **no** sustituye `req.ip` de Express. Rate-limit Auth usa esa IP. Si se despliega detrás de proxy, configurar trust de forma acotada en deployment (mejora futura; no se activó a ciegas).

## Headers

| Header | Desarrollo/test | Producción |
|---|---|---|
| X-Powered-By | ausente | ausente |
| X-Content-Type-Options | nosniff | nosniff |
| X-Frame-Options | SAMEORIGIN (Helmet) | SAMEORIGIN |
| Strict-Transport-Security | no | sí |
| CSP | default Helmet (API JSON) | igual; CSP HTML estricta = mejora futura |

## ValidationPipe

- `whitelist`: **true**
- `forbidNonWhitelisted`: **true**
- `transform`: **true**
- `enableImplicitConversion`: **true** (se mantiene global para query numbers / paginación; no se desactivó)
- Booleanos de DTO runtime (`activo`, lockout, step-up, `invitarPorCorreo`): `@ToSafeBoolean()` lee el valor **crudo** del body (implicit conversion aplica `Boolean("false")===true` antes del `@Transform`) e interpreta solo `true`/`false` y `"true"`/`"false"`.
- Prototype pollution: Node `JSON.parse` no materializa `__proto__`/`constructor`; `Object.prototype` intacto. Campo extra → 400.

## Request limits

JSON/urlencoded: default Express (~100 kb). Uploads: fase Archivos (50 MB, MIME PDF). No se cambió el parser.

## Errors

- `SafeExceptionFilter`: 500 genérico; sin stack, SQL, URL de BD ni password.
- Prisma/driver crudo no se reenvía.
- 403/429: filtros existentes (auditoría).
- Health DB fail: `database: "down"` sin mensaje de driver.

## Logging

No hay logger de body. `SafeExceptionFilter` no registra mensajes con password/URL. Auditoría ya redacta secretos. `console.log` de runtime de app: no (sí scripts/seed CLI).

## Health

Público (sin auth). HTTP **200** también si `database: "down"`. Cuerpo: `status`, `service`, `database` (`up`|`down`). `SELECT 1`. Sin env dump, host, SQL ni stack. `GET /api/v1/admin/ping` es JWT+ADMIN.

**Disclosure `database` up/down:** INTENCIONAL / residual aceptado (BAJO): disponibilidad operativa, no secreto. No se añadió auth.

## Swagger

NO EXISTE.

## Static files

NO EXISTE `ServeStaticModule`. `.env`, backups y `storage/` no se sirven por HTTP estático.

## Frontend env

`VITE_*` solo API URL / hosts Vite. **No** hay `VITE_JWT_*`, SMTP, DB, MFA. Access JWT en memoria (`accessToken.ts`).

## Docker / Nginx / TLS

NO EXISTEN en el repo. TLS termina en hosting/proxy institucional (no definido en código). phpMyAdmin: XAMPP local de desarrollo, no empaquetado aquí.

## Secrets

`.env` / `.env.production`: no tracked. `.env.example`: placeholders. Seed admin: fixture local (`SEED_ADMIN_*`), no runtime automático al `start`. No rotar usuarios reales.

## Tests

`http-bootstrap.util.spec.ts`, `http-bootstrap.security.spec.ts`, `strict-boolean.util.spec.ts`, health down sanitizado.

## Dependencias (npm audit --omit=dev)

Diagnóstico **sin** `audit fix` / `update`. Lockfile **sin cambios**.

| Severidad | Cantidad |
|---|---:|
| critical | 0 |
| high | 5 |
| moderate | 3 |
| low | 1 |

HIGH preexistentes (`@nestjs/platform-express`, `multer`, `nodemailer`, `tmp`, `brace-expansion`): **no invalidan este commit de configuración**. Fase futura: **DEPENDENCY HARDENING**. No afirmar “production ready” ni “sin vulnerabilidades” hasta esa fase.

## Deployment checklist (recomendaciones del repo; no aplicadas)

- `NODE_ENV=production`
- `JWT_ACCESS_SECRET` largo aleatorio (fail-fast si falta)
- `CORS_ORIGIN` con orígenes **exactos** del frontend
- HTTPS en proxy/plataforma; cookies `Secure`
- Secretos solo en env / secret manager
- Timezone del proceso si se usan crons (`NOTIFY_EXPIRY_CRON`, backups)
- No exponer `storage/` ni `backups/` como static root
- No activar `trust proxy` sin frontera de proxy de confianza
- HSTS lo pone Helmet en production; el proxy puede añadir la suya (evitar duplicados contradictorios)

## Riesgos residuales

- Sin `trust proxy`: IPs detrás de NAT/proxy salen como IP del proxy (aceptable hasta definir frontera).
- CSP HTML estricta no se impuso (rompería Vite/MUI).
- Body JSON default 100 kb (documentado).
- Health público revela up/down de BD (intencional, BAJO, sin secretos).
- HSTS de Helmet en production solo es efectivo si el cliente llega por HTTPS (TLS en proxy/plataforma).
- npm audit producción: 0 critical / 5 high / 3 moderate / 1 low (preexistente; fase DEPENDENCY HARDENING).
- Observabilidad externa / WAF / secret manager: no existen.
