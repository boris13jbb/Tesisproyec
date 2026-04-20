# Mapeo de controles — ISO/IEC 27001:2022, ISO 15489 y OWASP ASVS (MVP)

## Objetivo de este documento

Explicar **qué es** y **para qué sirve** cada referencia:

- **ISO/IEC 27001:2022** (gestión de seguridad de la información),
- **ISO 15489** (gestión de documentos/records management),
- **OWASP ASVS** (estándar de verificación de seguridad para apps web),

y mostrar **paso a paso**:

1) **qué control** se necesitó en el MVP,  
2) **por qué** se aplicó,  
3) **dónde** quedó implementado en el código (archivos/rutas/tablas),  
4) **qué hace** técnicamente,  
5) **cómo comprobarlo** (pasos de prueba).

> Importante: en este proyecto se usan ISO/IEC 27001:2022 e ISO 15489 como **referencia** (no certificación), y OWASP ASVS como guía práctica de controles técnicos verificables.

---

## 1) ¿Qué es cada estándar? (explicación corta y clara)

### 1.1 ISO/IEC 27001:2022 (visión de “gestión”)

**Qué es:** un estándar internacional para establecer y operar un **SGSI** (Sistema de Gestión de Seguridad de la Información).  
**Qué aporta al proyecto:** una forma “de arriba hacia abajo” de pensar seguridad: políticas, roles, riesgos, controles, evidencias.

**Cómo lo usamos aquí:** como marco para justificar decisiones como:
- autenticación robusta,
- control de acceso,
- trazabilidad,
- manejo seguro de archivos,
- hardening de API.

### 1.2 ISO 15489 (visión de “gestión documental”)

**Qué es:** un estándar internacional para la **gestión de documentos/records**: creación, clasificación, retención, integridad, trazabilidad y acceso.

**Cómo lo usamos aquí:** como guía para que un SGD no sea solo CRUD:
- **clasificación** (Series/Subseries),
- **metadatos** (Tipo documental, asunto, fecha),
- **trazabilidad** (historial de cambios),
- **control de acceso** (roles),
- **gestión de adjuntos** (almacenamiento controlado).

### 1.3 OWASP ASVS (visión “técnica/verificable”)

**Qué es:** un estándar de OWASP para **verificar** seguridad de aplicaciones web por requisitos (autenticación, sesión, acceso, validación, errores, etc.).

**Cómo lo usamos aquí:** para implementar controles técnicos concretos que se puedan **probar**:
- JWT + refresh seguro,
- cookies HttpOnly,
- validación server-side (DTO/ValidationPipe),
- RBAC por rol,
- subida/descarga de archivos con whitelist y límites,
- headers de seguridad con Helmet,
- no filtrar errores sensibles.

---

## 2) Mapeo “control → implementación” (paso a paso)

### 2.1 Autenticación y sesión (ISO 27001 + ASVS)

#### Paso 1 — Decisión: JWT access + refresh HttpOnly
- **Por qué**: reduce riesgo de robo de sesión por XSS (no guardamos refresh en `localStorage`) y permite sesiones “mantenidas” con refresh.
- **Qué hace**:  
  - el **access token** se usa en `Authorization: Bearer ...` (vida corta)  
  - el **refresh** va en cookie **HttpOnly** (renueva access sin exponer el refresh a JS)

**Dónde está implementado:**
- `backend/src/auth/auth.controller.ts`
  - `POST /api/v1/auth/login` → set cookie refresh
  - `POST /api/v1/auth/refresh`
  - `POST /api/v1/auth/logout` → clear cookie
- `backend/src/auth/auth.service.ts` (hash SHA-256 de refresh + persistencia)
- `backend/prisma/schema.prisma` → tabla `refresh_tokens`
- Frontend:
  - `frontend/src/api/client.ts` → interceptor: Bearer + reintento con refresh
  - `frontend/src/auth/*` → token access en memoria + manejo sesión perdida

**Cómo comprobarlo (prueba):**
1. Inicia sesión en `/login`.
2. En DevTools → Application → Cookies, verifica cookie `sgd_refresh` (o la configurada).
3. Expira el access (o fuerza 401) y observa que el frontend llama `/auth/refresh`.
4. Logout → cookie se limpia y se pierde sesión.

---

### 2.2 Autorización (RBAC por rol) (ISO 27001 + ASVS)

#### Paso 2 — Decisión: control por rol `ADMIN` en mutaciones y reportes
- **Por qué**: principio de mínimo privilegio (evita que cualquier usuario modifique catálogos/documentos/exporte).
- **Qué hace**: limita `POST/PATCH/DELETE` a rol `ADMIN`.

**Dónde está implementado:**
- Backend:
  - `backend/src/auth/decorators/roles.decorator.ts` (`@Roles(...)`)
  - `backend/src/auth/guards/roles.guard.ts`
  - Controladores (ej. documentos/catálogos/reportes) con `@Roles('ADMIN')`
- Frontend:
  - `frontend/src/routes/RoleRoute.tsx` (protege rutas de catálogos)
  - `frontend/src/layouts/MainLayout.tsx` (menú Catálogos solo ADMIN)

**Cómo comprobarlo (prueba):**
1. Inicia sesión con un usuario no ADMIN.
2. Intenta entrar a `/catalogos/dependencias` → debe ir a 403.
3. Intenta exportar reportes (botones no aparecen si no ADMIN).

---

### 2.3 Validación server-side (ASVS)

#### Paso 3 — Validación global con `ValidationPipe`
- **Por qué**: no confiar en el cliente; evita inyección de campos, tipos inválidos y datos basura.
- **Qué hace**:  
  - elimina campos extra (`whitelist`)  
  - falla si llegan campos no permitidos (`forbidNonWhitelisted`)  
  - transforma tipos (`transform`)

**Dónde está implementado:**
- `backend/src/main.ts` (ValidationPipe global)
- DTOs en módulos (`backend/src/**/dto/*.dto.ts`)

**Cómo comprobarlo (prueba):**
1. Envía un `POST` con un campo extra (por Postman/DevTools).
2. Debe devolver error por campo no permitido.

---

### 2.4 Seguridad de archivos (ISO 27001 + ISO 15489 + ASVS)

#### Paso 4 — Subida/descarga controlada + storage no público
- **Por qué (seguridad)**:
  - evitar servir archivos desde disco sin autorización,
  - evitar subir ejecutables/formatos peligrosos,
  - prevenir DoS por archivos enormes.
- **Por qué (gestión documental)**:
  - mantener evidencia y trazabilidad,
  - versiones,
  - metadatos del archivo (tipo/tamaño/hash).

**Qué hace técnicamente:**
- Guarda archivos en `storage/documentos/<documentoId>/...` (no se expone como carpeta pública).
- Limita a **10MB** y MIME permitido.
- Calcula **SHA-256**.
- Maneja **versionado** por `documentoId + originalName`.
- Permite **borrado lógico** (no elimina físicamente por defecto).
- Registra eventos de archivo: `SUBIDO / DESCARGADO / ELIMINADO`.

**Dónde está implementado:**
- BD:
  - `documento_archivos`, `documento_archivo_eventos` en `backend/prisma/schema.prisma`
  - migraciones `20260421193000_add_documento_archivos`, `20260421194500_documento_archivos_versionado`
- API (Documentos):
  - `GET /api/v1/documentos/:id/archivos`
  - `POST /api/v1/documentos/:id/archivos` (ADMIN)
  - `GET /api/v1/documentos/:id/archivos/:archivoId/download` (JWT)
  - `GET /api/v1/documentos/:id/archivos/:archivoId/eventos`
  - `DELETE /api/v1/documentos/:id/archivos/:archivoId` (ADMIN, lógico)
- Código:
  - `backend/src/documentos/documentos.controller.ts`
  - `backend/src/documentos/documentos.service.ts`
- UI:
  - `frontend/src/pages/documentos/DocumentoDetallePage.tsx`

**Cómo comprobarlo (prueba):**
1. Entra a `/documentos/:id`.
2. Sube un PDF (<10MB) → aparece v1.
3. Sube de nuevo mismo nombre → aparece v2.
4. Descarga → revisa historial del archivo.
5. Elimina (ADMIN) → desaparece del listado; historial registra `ELIMINADO`.

---

### 2.5 Trazabilidad (ISO 15489 + ISO 27001)

#### Paso 5 — Historial de documento y archivo
- **Por qué**: integridad, auditoría, y reconstrucción de cambios.
- **Qué hace**:
  - Documento: `CREADO/ACTUALIZADO` con snapshot/diff.
  - Archivo: `SUBIDO/DESCARGADO/ELIMINADO` con `metaJson` (incluye IP en descargas).

**Dónde está implementado:**
- `documento_eventos`, `documento_archivo_eventos` (Prisma + migraciones)
- `backend/src/documentos/documentos.service.ts` (creación automática de eventos)
- UI:
  - Historial documento: `/documentos/:id`
  - Historial archivo: diálogo en sección Archivos

---

### 2.6 Hardening de API (ASVS)

#### Paso 6 — Security headers con Helmet y reducción de fingerprinting
- **Por qué**: baseline de seguridad web (headers) y menor exposición de información del servidor.
- **Qué hace**:
  - agrega headers típicos de seguridad (Helmet),
  - deshabilita `x-powered-by`.

**Dónde está implementado:**
- `backend/src/main.ts`

**Cómo comprobarlo (prueba):**
1. Abre Network → request a `/api/v1/health`.
2. Verifica que no exista `x-powered-by` y que existan headers de Helmet.

---

## 3) Qué NO se implementa “al 100%” por ser fuera del MVP

Esto es importante para tu tesis: no significa “falta”, significa **fuera del alcance**.

- **Certificación** ISO/IEC 27001 o auditoría formal del SGSI (requiere procesos institucionales).
- **Retención y disposición documental** completa (ISO 15489) con reglas de archivo central, tiempos, expurgo, etc.
- **Permisos granulares** (más allá de roles) usando `Permission/role_permissions` como enforcement completo.
- **WAF/MFA/pentest formal**.

---

## 4) Checklist final de evidencia (para anexos)

- Capturas:
  - Login + cookie refresh HttpOnly
  - 403 en rutas sin permiso (no ADMIN)
  - Historial de documento (CREADO/ACTUALIZADO)
  - Historial de archivo (SUBIDO/DESCARGADO/ELIMINADO)
  - Exportación Excel/PDF
  - Headers de seguridad (Helmet) en respuesta de `/health`

