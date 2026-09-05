# Matriz — Dependency hardening / npm audit

**Proyecto:** SGD-GADPR-LM (`Tesisproyec`)  
**Estándares:** ISO/IEC 27001:2022, OWASP ASVS (cadena de suministro / dependencias).  
**Baseline Git:** `08e2508`.

No afirma “0 vulnerabilidades”. Los conteos son de `npm audit` real.

## Baseline

| Dato | Valor |
|---|---|
| Node | v25.8.1 (no cambiado) |
| npm | 11.11.0 (no cambiado) |
| Registry | npm por defecto |
| `.npmrc` | NO EXISTE |
| `node_modules` tracked | No (`gitignore`) |

## Package files

| Scope | package.json | package-lock | Package manager |
|---|---|---|---|
| `backend/` | Sí | Sí | npm |
| `frontend/` | Sí | Sí | npm |
| root | scripts only | lock vacío | conveniencia |

## Audit inicial production (backend `--omit=dev`)

Critical: **0** · High: **5** · Moderate: **3** · Low: **1**

## Audit inicial full (backend)

Critical: **0** · High: **9** · Moderate: **3** · Low: **2**

## Audit inicial frontend production

Critical: **0** · High: **4** · Moderate: **2** · Low: **0**

(axios, form-data, react-router, react-router-dom + moderate DOMPurify / xmldom)

## Dependencias afectadas

| Package | Direct/Transitive | Installed before | Patched / after | Via | Runtime use |
|---|---|---|---|---|---|
| `@nestjs/platform-express` | Directa | 11.1.19 | 11.2.3 | multer | HTTP |
| `multer` | Transitiva | 2.1.1 | 2.2.0 | platform-express | uploads |
| `nodemailer` | Directa | 8.0.7 | 10.0.0 | — | SMTP |
| `tmp` | Transitiva | 0.2.5 | 0.2.7 override | exceljs | XLSX temp |
| `brace-expansion` | Transitiva | 2.1.0 / 1.1.14 | 2.1.4 / 1.1.18 overrides | archiver / exceljs | ZIP |
| `qs` | Transitiva | 6.15.1 | 6.16.0 override | express | query |
| `axios` | Directa FE | 1.15.1 | 1.20.0 | — | API client |
| `form-data` | Transitiva FE | 4.0.5 | 4.0.6 | axios | HTTP multipart |
| `react-router-dom` | Directa FE | 7.14.1 | 7.18.3 | — | rutas |
| `dompurify` | Directa FE | 3.4.x | 3.4.14 | — | HTML sanitizado |

## Árbol (runtime)

- `@nestjs/platform-express@11.2.3` → `multer@2.2.0`
- `exceljs@4.4.0` → `tmp@0.2.7` (override)
- `archiver@6.0.2` → `brace-expansion@2.1.4` (override)
- `exceljs` → `archiver@5` → `brace-expansion@1.1.18` (override)
- `express@5.2.1` → `qs@6.16.0` (override)

## Estrategia

1. Patch/minor Nest **mismo major 11** (no Nest 12).
2. Parent `platform-express` eleva multer (no override multer).
3. Nodemailer **major 10** único fix HIGH; API usada (`createTransport` SMTP + `sendMail`) sigue; no OAuth2 / jsonTransport / `raw`.
4. Overrides **versionados por major de brace-expansion** (no forzar v2 sobre v1/v5 de tooling).
5. Frontend: mismo major de axios (1.x) y react-router (7.x).
6. **Prohibido:** `npm audit fix --force`, update masivo, Nest 12.

## SemVer aplicado

| Package | Before | After | SemVer | Motivo |
|---|---|---|---|---|
| `@nestjs/common` | 11.1.19 | 11.2.3 | minor | coordinar Nest 11 |
| `@nestjs/core` | 11.1.19 | 11.2.3 | minor | coordinar Nest 11 |
| `@nestjs/platform-express` | 11.1.19 | 11.2.3 | minor | multer 2.2.0 |
| `@nestjs/testing` | 11.1.19 | 11.2.3 | minor | peers |
| `nodemailer` | 8.0.7 | 10.0.0 | **major** | único fix HIGH |
| `tmp` | 0.2.5 | 0.2.7 | patch override | exceljs sin padre seguro |
| `brace-expansion` | 2.1.0 / 1.1.14 | 2.1.4 / 1.1.18 | patch override | archiver/exceljs |
| `qs` | 6.15.1 | 6.16.0 | minor override | express |
| `axios` | 1.15.1 | 1.20.0 | minor | HIGH + form-data |
| `react-router-dom` | 7.14.1 | 7.18.3 | minor | HIGH |
| `dompurify` | 3.4.2 range | 3.4.14 | patch | moderate XSS lib |

## Compatibility

- Nest majors: **11** common / core / platform-express / testing. **Sí** compatibles.
- Multer API (`FileInterceptor`, `memoryStorage`): sin cambio de código.
- Archiver 6.x sin major 7.
- ExcelJS 4.4.0 sin downgrade (el “fix” audit a 3.4.0 es inaceptable).
- Código: adaptador de tipos SMTP en `mail.service.ts` (exports de Nodemailer 10 sin `types` para nodenext). Se retiró `@types/nodemailer@8`.

## npm audit final

### Backend production (`--omit=dev`)

Critical: **0** · High: **0** · Moderate: **2** · Low: **1**

- moderate: `exceljs` / `uuid` (padre no ofrece uuid 11; no downgrade).
- low: `body-parser` (Express 5.2.1).

### Backend full

Critical: **0** · High: **5** (dev-only: brace-expansion 5.x tooling, browserslist, fast-uri, form-data/supertest, js-yaml) · Moderate: **2** · Low: **2**

### Frontend production

Critical: **0** · High: **0** · Moderate: **1** (`@xmldom/xmldom` via mammoth)

### Frontend full

Critical: **0** · High: **6** (dev: vite, postcss, nanoid, browserslist, js-yaml, brace-expansion) · Moderate: **1** · Low: **1**

## Riesgos residuales / aceptados

| Ítem | Clase | Nota |
|---|---|---|
| exceljs + uuid 8.x | MEDIO | Sin padre 4.x que parchee uuid; no override uuid@11 |
| body-parser low | BAJO | Express 5.2.1 |
| @xmldom via mammoth | MEDIO | Preview DOCX; no major mammoth |
| HIGH dev-only | BAJO | eslint/jest/vite; no runtime API |
| Nest 12 / archiver 7 | deuda | upgrade futuro, no este commit |

## Upgrade futuro

- Nest 12 coordinado (common+core+platform+testing) cuando exista ventana de QA.
- ExcelJS cuando publique uuid/tmp seguros.
- mammoth / @xmldom.
- Tooling (vite, jest) en fase aparte.

## Tests

61 suites / 404 tests / 0 failed. Frontend lint/build OK. No SMTP real, no backup real.
