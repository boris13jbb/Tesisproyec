# Matriz — Tooling / dev dependency hardening

**Proyecto:** SGD-GADPR-LM (`Tesisproyec`)  
**Estándares:** ISO/IEC 27001:2022, OWASP ASVS (cadena de suministro de build/test).  
**Baseline Git:** `c117d36`.

No afirma “0 vulnerabilidades”. Los conteos son de `npm audit` real.

## Baseline

| Dato | Valor |
|---|---|
| Node | v25.8.1 (no cambiado). Backend/runtime: ≥20. Frontend build Vite 8.0.16: `^20.19.0` o `>=22.12.0` (20.0–20.18 no basta para el build) |
| npm | 11.11.0 (no cambiado) |
| Registry | npm por defecto |
| `.npmrc` | NO EXISTE |
| `node_modules` tracked | No |
| Jest / ESLint / TypeScript majors | Sin migración |

## Node/npm

- **Backend / runtime (Nest, Nodemailer 10):** Node **≥20**.
- **Frontend build con Vite 8.0.16:** Node **`^20.19.0` o `>=22.12.0`**. Las versiones **20.0–20.18 no son suficientes** para `npm run build` del frontend.
- Local: v25.8.1 — compatible con ambos requisitos.
- CI: no existe (riesgo: no hay pin automático).
- “Node.js LTS” en READMEs de arranque **no** implica 20.0–20.18 para el build de Vite.

## Backend audit inicial

### Production (`--omit=dev`)

Critical: **0** · High: **0** · Moderate: **2** · Low: **1**

### Full

Critical: **0** · High: **5** · Moderate: **2** · Low: **2**

## Frontend audit inicial

### Production (`--omit=dev`)

Critical: **0** · High: **0** · Moderate: **1** · Low: **0**

### Full

Critical: **0** · High: **6** · Moderate: **1** · Low: **1**

## Tooling inventory

### Backend HIGH (antes)

| Package | Severity | Direct/Transitive | Installed | Parent | Fix available | SemVer |
|---|---|---|---|---|---|---|
| brace-expansion | high | Transitiva | 5.0.5 | `@nestjs/cli` / `typescript-eslint` → minimatch 10 | 5.0.9 mismo major | patch override `@5` |
| browserslist | high | Transitiva | 4.28.2 | webpack / `@babel` (cli, ts-jest, ts-loader) | 4.28.9 | patch override |
| fast-uri | high | Transitiva | 3.1.0 | ajv ← webpack / `@angular-devkit` | 3.1.7 | patch override |
| form-data | high | Transitiva | 4.0.5 | `supertest` / `@types/superagent` | 4.0.6 | patch override |
| js-yaml | high | Transitiva | 4.1.1 / 3.14.2 | eslint + nest cli / istanbul | 4.3.2 / 3.15.2 | patch/minor por major |

### Frontend HIGH (antes)

| Package | Severity | Direct/Transitive | Installed | Parent | Fix available | SemVer |
|---|---|---|---|---|---|---|
| vite | high | Directa | 8.0.8 | `frontend` | 8.0.16 (rango vulnerable ≤8.0.15) | patch directa |
| postcss | high | Transitiva | 8.5.10 | vite | 8.5.28 | patch override |
| nanoid | high | Transitiva | 3.3.11 | postcss | 3.3.18 | patch override |
| browserslist | high | Transitiva | 4.28.2 | `eslint-plugin-react-hooks` → babel | 4.28.9 | patch override |
| js-yaml | high | Transitiva | 4.1.1 | eslint → `@eslint/eslintrc` | 4.3.2 | minor override 4.x |
| brace-expansion | high | Transitiva | 1.1.14 / 5.0.5 | eslint minimatch / typescript-eslint | 1.1.18 / 5.0.9 | patch por major |

## Dependency trees

### Backend (después)

- `brace-expansion@1.1.18` / `@2.1.4` (runtime, sin cambio) + `@5.0.9` (tooling)
- `browserslist@4.28.9`
- `fast-uri@3.1.7` (ajv)
- `form-data@4.0.6` (solo árbol `supertest`; no runtime)
- `js-yaml@4.3.2` y `js-yaml@3.15.2`

### Frontend (después)

- `vite@8.0.16` → `postcss@8.5.28` → `nanoid@3.3.18`
- `browserslist@4.28.9`
- `js-yaml@4.3.2`
- `brace-expansion@1.1.18` / `@5.0.9`

## Parent packages

| Scope | Package | Declared | Installed | Direct/Transitive |
|---|---|---|---|---|
| BE | jest | ^30.0.0 | 30.3.0 | Directa (sin cambio) |
| BE | ts-jest | ^29.2.5 | 29.4.9 | Directa (sin cambio) |
| BE | supertest | ^7.0.0 | 7.2.2 | Directa (sin cambio; parent no trae form-data 4.0.6) |
| BE | eslint | ^9.18.0 | 9.39.4 | Directa (sin cambio) |
| BE | typescript | ^5.7.3 | 5.9.3 | Directa (sin cambio) |
| BE | @nestjs/testing | ^11.2.3 | 11.2.3 | Directa (sin cambio) |
| FE | vite | 8.0.16 (antes ^8.0.4) | 8.0.16 | Directa |
| FE | typescript | ~6.0.2 | 6.0.3 | Directa (sin cambio) |
| FE | eslint | ^9.39.4 | 9.39.4 | Directa (sin cambio) |
| FE | @vitejs/plugin-react | ^6.0.1 | 6.0.1 | Directa (peer vite ^8.0.0) |

## Fix strategy

1. Patch/minor del parent cuando existe (Vite 8.0.8 → **8.0.16**).
2. Override transitivo **por major** cuando el parent no publica fix (supertest 7.2.2 sigue en form-data ^4.0.5).
3. No forzar brace-expansion 5.x → 2.x; no tocar overrides runtime `@1`/`@2`.
4. No Jest→Vitest, no ESLint flat-config migration, no TypeScript bump, no Nest/runtime bump.
5. Prohibido: `npm audit fix --force`, `npm update` masivo, `--legacy-peer-deps`.

## SemVer

| Package | Before | After | SemVer | Motivo |
|---|---|---|---|---|
| vite | 8.0.8 | 8.0.16 | patch | HIGH NTLM/fs.deny Windows |
| postcss | 8.5.10 | 8.5.28 | patch override | sourceMappingURL |
| nanoid | 3.3.11 | 3.3.18 | patch override | loop/overflow |
| browserslist | 4.28.2 | 4.28.9 | patch override | OOM / prototype write |
| fast-uri | 3.1.0 | 3.1.7 | patch override | host confusion / SSRF |
| form-data | 4.0.5 | 4.0.6 | patch override | CRLF multipart (solo test) |
| js-yaml 4 | 4.1.1 | 4.3.2 | minor override | DoS merge-key / omap |
| js-yaml 3 | 3.14.2 | 3.15.2 | patch override | mismo advisory 3.x |
| brace-expansion 5 | 5.0.5 | 5.0.9 | patch override | DoS expansion |
| brace-expansion 1 (FE) | 1.1.14 | 1.1.18 | patch override | DoS 1.x |

## Overrides

### Backend (añadidos a los de runtime)

```json
"brace-expansion@5": "5.0.9",
"browserslist": "4.28.9",
"fast-uri": "3.1.7",
"form-data": "4.0.6",
"js-yaml@3": "3.15.2",
"js-yaml@4": "4.3.2"
```

Runtime `tmp` / `qs` / `brace-expansion@1` / `@2`: **intactos**.

### Frontend (nuevo)

```json
"postcss": "8.5.28",
"nanoid": "3.3.18",
"browserslist": "4.28.9",
"js-yaml": "4.3.2",
"brace-expansion@1": "1.1.18",
"brace-expansion@5": "5.0.9"
```

No override 1.x→2.x ni 5.x→2.x.

## Jest

30.3.0 + ts-jest 29.4.9. Sin cambio. Compatibilidad: **PASS**. 61 suites / 404 tests / 0 failed.

## ESLint

9.39.4. Flat config existente **sin migración**. Plugins sin peer conflict. Lint: **PASS**.

## Vite

- Before: 8.0.8  
- After: **8.0.16** (no 8.2.x; el caret `^8.0.16` resolvía 8.2.2 y se **fijó exacto** para limitar churn de Rolldown).  
- `vite.config.ts`: **sin cambios**.  
- `@vitejs/plugin-react@6`: peer `vite ^8.0.0`.  
- Build: **PASS** (`tsc -b && vite build`). Warning chunk >500k: no es fallo.

## TypeScript

Sin cambio (BE 5.9.3 / FE 6.0.3). Ningún advisory exigía bump.

## Lockfiles

Actualizados solo vía `npm install`. Sin edición manual de `resolved`/`integrity`. Registry npmjs. Sin Git deps.

## Runtime protection

Tras overrides + Vite:

| Ámbito | C | H | M | L |
|---|---|---|---|---|
| Backend `--omit=dev` | 0 | **0** | 2 | 1 |
| Frontend `--omit=dev` | 0 | **0** | 1 | 0 |

Runtime HIGH no empeoró.

## Audit final

### Backend full

Critical: **0** · High: **0** · Moderate: **2** · Low: **2**

### Frontend full

Critical: **0** · High: **0** · Moderate: **1** · Low: **1**

Tooling HIGH: **0** (antes BE 5 + FE 6). No afirmar “0 vulnerabilidades”.

## Regression gates

61 suites / 404 tests / 0 failed. Backend lint/build OK. Frontend lint/build/typecheck OK. `npm ls` exit 0 ambos. Sin invalid / peer conflict.

## Riesgos residuales

| Ítem | Clase | Nota |
|---|---|---|
| exceljs / uuid | MEDIO | Runtime; sin padre 4.x seguro |
| @xmldom/xmldom via mammoth | MEDIO | Preview DOCX |
| body-parser | BAJO | Express 5.2.1 |
| @babel/core ≤7.29.0 | BAJO | Tooling (ts-jest / eslint-plugin-react-hooks) |
| Vite 8.0.16 engines | BAJO | Build frontend exige `^20.19.0` o `>=22.12.0`; no confundir con runtime backend ≥20 |

## Upgrade futuro

- `@babel/core` >7.29.0 cuando el parent lo traiga.
- exceljs / mammoth (runtime moderate, no esta fase).
- Vite 8.2.x solo con QA de Rolldown (no necesario para el advisory).
