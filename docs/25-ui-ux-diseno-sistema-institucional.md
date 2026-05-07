# Diseño UI/UX — Sistema web institucional de gestión documental (SGD-GADPR-LM)

**Versión:** 1.0 (**coherencia con implementación revisada:** 2026-05-06; detalle funcional en `27`, `28`, snapshot `docs/README.md`)  
**Ámbito:** Interfaz y experiencia de usuario alineadas con **ISO/IEC 27001:2022**, **ISO 15489** y **OWASP ASVS**.  
**Uso:** Referencia para implementación en frontend (MUI + React), pruebas con usuarios y sustento de tesis.

---

## 1. Enfoque integral de diseño

### Cómo debe verse

- Estética **sobria y corporativa**: fondos claros, rejilla ordenada, sombras suaves, sin exceso de gradientes o estilo “consumer”.
- **Densidad legible** en escritorio: tablas y formularios escaneables; etiquetas claras y agrupación lógica de campos.
- **Patrones repetibles**: misma posición para acciones primarias, mismos iconos para la misma acción en todo el sistema.

### Cómo debe sentirse

- **Confianza**: mensajes claros, estados del sistema explícitos (guardado, solo lectura, pendiente).
- **Control**: ubicación clara (breadcrumbs, título), permisos comprensibles (acción deshabilitada + motivo).
- **Eficiencia**: atajos para usuarios frecuentes sin perjudicar a usuarios ocasionales.
- **Seguridad percibida**: sesión visible, confirmaciones en acciones críticas, mensajes de error no reveladores.

---

## 2. Propuesta visual general

### Estilo

Shell tipo aplicación profesional: **barra superior** + **navegación lateral** (colapsable en vista reducida). Acento de color institucional en CTAs y navegación activa.

### Paleta recomendada (tokens de referencia)

| Rol | Hex (referencia) | Uso |
|-----|------------------|-----|
| Primario | `#1E3A5F` | Botón principal, app bar, foco |
| Primario hover | `#2A5082` | Hover |
| Fondo app | `#F5F7FA` | Fondo detrás del contenido |
| Superficie | `#FFFFFF` | Tarjetas, drawer |
| Borde | `#E2E8F0` | Divisores, bordes de card |
| Texto principal | `#0F172A` | Títulos y cuerpo |
| Texto secundario | `#475569` | Subtítulos, hints |
| Éxito | `#0F766E` | Estados positivos |
| Advertencia | `#B45309` | Revisión, caducidad próxima |
| Error | `#B91C1C` | Fallos, bloqueos |
| Info | `#1D4ED8` | Ayuda contextual |

Sustituir el primario por **color de marca** si la institución lo define; mantener la **semántica** de éxito/advertencia/error.

### Tipografía

- Familia sugerida: **Inter** (o Source Sans 3 / IBM Plex Sans).
- Base **16px**; títulos de página **20–24px**; peso 600–700 en encabezados.
- En tablas con cifras, preferir cifras tabulares si está disponible en CSS.

### Iconografía

- Estilo **outline**, tamaños coherentes (24px navegación, 20px acciones).
- Una acción = un icono estable en todo el producto.

### Espaciado (escala 4px)

8, 12, 16, 24, 32, 48. Padding horizontal de página en escritorio: **24–32px**.

### Jerarquía

1. Título de página + acción primaria a la derecha.  
2. Filtros en franja secundaria.  
3. Contenido principal (tabla, detalle, asistente).  
4. Metadatos / ayuda en lateral o pestañas.

### Responsivo (prioridad escritorio)

- **Desktop:** sidebar fijo, tablas amplias, detalle en dos columnas si aplica.  
- **Tablet:** drawer overlay; tablas con scroll horizontal con indicación visual.  
- **Móvil:** flujos por pasos; evitar tablas densas sin alternativa.

---

## 3. Arquitectura de información

### Menú principal (lateral)

1. **Inicio** (dashboard)  
2. **Documentos** (listado y registro según permisos)  
3. **Catálogos** (solo roles autorizados)  
   - Dependencias, Cargos, Tipos documentales, Series, Subseries  
4. *(Futuro)* Búsqueda avanzada, Reportes, Auditoría, Configuración — según roadmap del backend

### Navegación superior

Logo / nombre del sistema, **usuario** y **cerrar sesión** (o menú de cuenta). Opcional: búsqueda global cuando exista endpoint.

### Breadcrumbs

En rutas profundas: `Inicio > Documentos > Detalle`. Deben reflejar la jerarquía real del dominio documental (series, expedientes) cuando el modelo de datos lo incorpore.

### Plantillas de pantalla

- Listado + filtros + tabla.  
- Detalle con pestañas (General, Archivos, Historial, Permisos).  
- Formulario / asistente (registro + carga).  
- Reportes: parámetros → vista previa → exportación.

---

## 4–5. Módulos principales (objetivo, componentes, estados)

### Login

- **Objetivo:** autenticación clara y mensajes no enumeradores.  
- **Componentes:** marca, campos correo/contraseña, mostrar/ocultar contraseña, enlace recuperación, aviso de uso autorizado breve.  
- **Validación:** inline; error de credenciales genérico.  
- **Errores red:** mensaje genérico sin detalles técnicos al usuario final.

### Recuperación / restablecimiento de contraseña

- **Objetivo:** expectativa clara; **mismo mensaje de éxito** haya o no cuenta (anti enumeración).  
- **Estados:** éxito, error de red, token inválido con CTA a nueva solicitud.

### Dashboard

- **Objetivo:** situación operativa y accesos rápidos por rol.  
- **Componentes:** tarjetas KPI (cuando haya datos), estado de servicios, accesos a “Documentos” y catálogos.  
- **Vacío:** mensaje de bienvenida y enlaces a primeros pasos.

### Gestión de usuarios y roles *(cuando exista en UI)*

- Tabla + filtros; edición en modal/drawer; **confirmación** en desactivación y cambios sensibles; campo de **motivo** si la auditoría lo exige.

### Registro documental y archivos

- Formulario por secciones (identificación, clasificación, vigencias); carga con estados (pendiente, completado, error); **versión** explícita al reemplazar.

### Búsqueda avanzada *(cuando exista)*

- Constructor de filtros; resultados tabulares; exportación acotada por permiso.

### Visualización de documento

- Visor según tipo; panel de metadatos; historial de versiones; mensaje claro si no hay permiso de descarga.

### Auditoría e historial

- Tabla inmutable con quién/qué/cuándo; filtros; sin exponer tokens ni datos personales innecesarios.

### Reportes y configuración

- Parámetros explícitos; confirmación en cambios de retención o políticas críticas.

---

## 6. Criterios UX

| Criterio | Aplicación |
|----------|------------|
| Claridad | Lenguaje institucional simple; ayudas contextuales |
| Rapidez | Filtros persistentes, skeleton loaders, paginación clara |
| Facilidad | Valores por defecto; asistentes en flujos complejos |
| Accesibilidad | Contraste AA, foco visible, teclado, ARIA en modales |
| Menos errores | Confirmación en destructivos; validación antes de enviar |
| Consistencia | Orden único de botones (definido en design system) |
| Confianza | Trazabilidad visible en acciones sensibles |

---

## 7. Cumplimiento normativo vía UI/UX

### ISO/IEC 27001:2022

- Control de acceso **visible** (rol, solo lectura).  
- **Sesión** gestionada con avisos cuando se implemente caducidad.  
- **Alertas** sin datos sensibles en notificaciones.  
- **Auditoría** legible para roles autorizados.

### ISO 15489

- **Clasificación** visible en cabeceras (serie/subserie/tipo).  
- **Versiones e historial** accesibles según permiso.  
- **Búsqueda** alineada a metadatos de gestión documental.

### OWASP ASVS

- Formularios con validación; errores **genéricos** al usuario.  
- Acciones sensibles con confirmación o reautenticación según nivel objetivo.  
- No exponer stack traces ni rutas internas en la UI.

---

## 8. Recomendaciones UX de seguridad

1. Login con mensaje único ante fallo de credenciales.  
2. Recuperación de contraseña sin revelar existencia de cuenta.  
3. Modales de confirmación para borrado y cambios de permisos amplios.  
4. Indicador de sesión (y aviso previo a expiración cuando se implemente).  
5. Feedback en operaciones largas (“Validando permisos…”) sin filtrar internals.  
6. Descargas: acuse cuando la política lo requiera.

---

## 9. Wireframes textuales

### Login

```
┌──────────────────────────────────────┐
│ [Marca]  Sistema de gestión documental│
│ ┌──────────────────────────────────┐ │
│ │ Iniciar sesión                   │ │
│ │ Correo      [________________]   │ │
│ │ Contraseña  [________________]   │ │
│ │ [ Ingresar ]  ¿Olvidó contraseña?│ │
│ │ Aviso uso autorizado (breve)     │ │
│ └──────────────────────────────────┘ │
└──────────────────────────────────────┘
```

### Shell aplicación

```
┌ TopBar: [Menú] Título sistema    [Usuario ▼] ────────────────────────┐
│ ┌Nav────┐ ┌ Breadcrumb: Inicio > Documentos ────────────────────────┐│
│ │ Inicio │ │ Título página              [Acción principal]          ││
│ │ Docs   │ │ ┌ Filtros / contenido ──────────────────────────────────┐││
│ │ Cat.*  │ │ │ Tabla o detalle                                       │││
│ └────────┘ └─────────────────────────────────────────────────────────┘│
└────────────────────────────────────────────────────────────────────────┘
```

---

## 10. Accesibilidad y UCD

- Contraste mínimo **WCAG 2.1 AA** para texto y componentes UI.  
- Orden de foco lógico; modales con **trap** y cierre con Esc.  
- Errores de formulario asociados a campos (`aria-describedby`).  
- No usar solo color para transmitir estado (incluir icono o texto).  
- Validación con usuarios por **rol** (administrativo, consulta, archivo).

---

## 11. Design system (componentes)

### Botones

- **Primario:** relleno color primario; **Secundario:** borde; **Texto:** acciones terciarias; **Peligro:** destructivos.  
- `textTransform: none` para legibilidad en español.

### Inputs

- Label encima; altura mínima táctil ~40px; estados: default, focus, error, disabled, read-only.

### Tablas

- Cabecera clara; paginación; acciones en columna final o menú contextual.

### Modales

- Título + cuerpo + pie; foco inicial en acción segura o primer campo.

### Badges

- Estados documentales: borrador, registrado, vigente, en revisión (colores semánticos + texto).

### Tarjetas

- Sombra ligera; título + métrica o descripción + CTA opcional.

### Alertas

- Info / éxito / advertencia / error con icono y, si aplica, acción (p. ej. “Reintentar”).

---

## 12. Implementación en el repositorio

- **Tema MUI:** `frontend/src/theme/appTheme.ts` (palette, tipografía Inter, shape).  
- **Layout autenticación:** `frontend/src/layouts/AuthLayout.tsx` (card centrada, fondo institucional).  
- **Shell logueado:** `frontend/src/layouts/MainLayout.tsx` (drawer responsivo, breadcrumbs, iconos de navegación).  
- **Utilidad de migas:** `frontend/src/nav/breadcrumbs.ts` (opción `documentDetailLabel` para detalle de documento).  
- **Contexto de miga dinámica:** `breadcrumbDetailContext.ts`, `BreadcrumbDetailProvider.tsx` y `useBreadcrumbDetail.ts` (`useRegisterBreadcrumbDetail` en detalle de documento).  
- **Cabecera de página:** `frontend/src/components/PageHeader.tsx` (título, descripción, acciones, enlace “volver”).  
- **Estados vacíos:** `frontend/src/components/EmptyState.tsx` (tablas `dense`, paneles con icono).  
- **403 / 404:** mismas tarjeta y fondo que login vía `AuthLayout.tsx`.

Las pantallas de módulos futuros deben **reutilizar** el shell, el tema y los patrones de esta guía para mantener coherencia y trazabilidad de seguridad en la experiencia.

---

## Referencias cruzadas

- [18-seguridad-y-hardening.md](./18-seguridad-y-hardening.md)  
- [19-mapeo-iso27001-iso15489-owasp-asvs.md](./19-mapeo-iso27001-iso15489-owasp-asvs.md)  
- [05-modulo-auth.md](./05-modulo-auth.md)
