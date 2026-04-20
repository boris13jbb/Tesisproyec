# Expediente Técnico Integral

## Desarrollo de una aplicación web para la gestión documental institucional digitalizada basada en estándares de seguridad con énfasis en ISO/IEC 27001:2022, ISO 15489 y OWASP ASVS, en el GADPR-LM

**Marco:** Este expediente sustenta un **proyecto de titulación (tesis)**. El **GADPR-LM** se utiliza como **caso de estudio / contexto de referencia** para el diseño y la demostración del software; el **entregable académico** es un **prototipo funcional** documentado y defendible, no un sistema en producción institucional, salvo extensión explícita posterior. Salvo indicación contraria, las secciones se interpretan en este marco.

---

## 1. Portada técnica del proyecto

| Campo | Contenido |
|-------|-----------|
| **Nombre del proyecto** | Sistema Web de Gestión Documental Institucional Digitalizada (SGD-GADPR-LM) |
| **Institución beneficiaria** | Gobierno Autónomo Descentralizado Provincial Rural de la provincia de Loja — Modalidad (GADPR-LM) *(supuesto propuesto: denominación institucional según nomenclatura habitual; ajustar a razón social oficial)* |
| **Área de desarrollo** | Tecnologías de la Información y Comunicaciones / Gestión Documental / Seguridad de la Información |
| **Tema técnico** | Plataforma web intranet para registro, clasificación, almacenamiento, consulta, trazabilidad y protección de documentos digitalizados, con control de acceso por roles y auditoría |
| **Versión del expediente** | 1.6 |
| **Fecha** | 19 de abril de 2026 |
| **Naturaleza del proyecto** | **Trabajo de titulación (tesis)** — prototipo de software demostrable; el diseño arquitectónico prioriza **claridad académica**, **viabilidad en tiempo de grado** y **evidencias para evaluación**, sin pretender un despliegue institucional de producción completo salvo extensión futura. |
| **Código único del documento** | `GADPR-LM-ETI-SGD-2026-001` *(supuesto propuesto: asignar correlativo oficial de gestión documental institucional)* |
| **Estado del expediente** | **Vigente — Baseline para desarrollo** *(sustituir por: Borrador / En revisión / Aprobado según acta)* |
| **Repositorio de verdad (fuente única)** | Repositorio Git institucional o carpeta controlada de Gestión Documental *(indicar URL o ruta UNC al aprobar)* |
| **Hash de integridad** *(opcional)* | SHA-256 del archivo `.md` aprobado, registrado en acta de validación |
| **Autor o equipo técnico** | Equipo técnico multidisciplinario (Arquitectura de software, Análisis funcional, Seguridad de la información, Gestión documental, Base de datos) *(genérico)* |
| **Entorno de aplicación** | **Tesis:** PC de desarrollo en **Windows** con **XAMPP** para el servicio de base de datos (**MySQL/MariaDB** según versión de XAMPP, conexión típica `localhost:3306` vía Prisma); **ngrok** para túnel HTTPS hacia el backend o el frontend en demos remotas. **Extensión opcional:** intranet institucional *(supuesto propuesto)*. |
| **Tipo de sistema** | Sistema de información web transaccional, orientado a procesos documentales, con módulos administrativos, de consulta, reportes y auditoría |

**Clasificación del documento:** Técnico-institucional — Uso interno para análisis, diseño, construcción, pruebas e implementación.

### 1.1 Control documental: expediente único, formal y trazable

El **problema de gobernanza** que resuelve esta sección es la dispersión de especificaciones en correos o archivos sueltos, que impide demostrar *qué* se aprobó, *cuándo* y *con qué alcance*. Para el proyecto SGD-GADPR-LM se establece lo siguiente:

| Regla | Descripción |
|-------|-------------|
| **Fuente única** | Este expediente (código `GADPR-LM-ETI-SGD-2026-001`) es la **línea base** de requisitos y diseño para el desarrollo, salvo cambios registrados formalmente. |
| **Versionado** | Toda modificación sustantiva incrementa la **versión menor o mayor** del expediente y se anota en el **Registro de cambios** (Anexo B). |
| **Trazabilidad** | Los requisitos se relacionan con módulos, datos y pruebas mediante la **Matriz de trazabilidad** (Anexo A), actualizable en cada versión. |
| **Aprobación** | La puesta en vigencia de una versión requiere **firma o acta** (responsable técnico y, según política, jefe de TI o unidad documental) *(supuesto propuesto)*. |
| **Distribución** | Copias PDF o exportaciones deben llevar **código de documento, versión y fecha** en pie de página; la copia **sin** metadatos de versión se considera **no controlada**. |
| **Relación con el software** | Las versiones del expediente se enlazan en el **changelog del código** (p. ej. “Alineado a expediente v1.6”) y en etiquetas de release. |

**Roles sugeridos respecto al expediente (supuesto propuesto):**

| Rol | Responsabilidad |
|-----|-----------------|
| **Líder técnico / PM** | Mantener el `.md` o fuente, versiones y Anexos A–B. |
| **Gestor documental institucional** | Validar coherencia con política archivística y cuadro de clasificación. |
| **Oficial de seguridad de la información** | Validar capítulos de seguridad y controles ISO/ASVS. |
| **Control de calidad / QA** | Verificar que la Matriz de trazabilidad cubra RF/RNF acordados. |

---

## 2. Resumen ejecutivo

El presente expediente técnico define los fundamentos, requisitos, arquitectura, diseño de datos, seguridad, procesos, interfaz, pruebas y **entrega académica** de un **prototipo de sistema web** para la **gestión documental digitalizada** en el contexto del **GADPR-LM** (caso de estudio). El trabajo se enmarca en un **proyecto de tesis**: el objetivo central es demostrar **viabilidad técnica**, **aplicación de buenas prácticas** y **trazabilidad documental y de seguridad**, usando **ISO/IEC 27001:2022**, **ISO 15489** y **OWASP ASVS** como **referencias orientativas** para el diseño — **sin** pretender certificación ni despliegue institucional completo dentro del alcance del grado.

### 2.1 Problema que resuelve

La dispersión de expedientes físicos y digitales sin metadatos uniformes, la dificultad para localizar documentos, el riesgo de accesos indebidos, la ausencia de trazabilidad confiable y la falta de respaldos sistemáticos generan **ineficiencia administrativa**, **exposición a riesgos legales y reputacionales** y **pérdida de continuidad institucional**.

### 2.2 Qué hace el sistema

El sistema centraliza el **ciclo de vida documental** digital: captura (carga), registro, clasificación según tipología y series documentales, indexación, control de versiones y estados, consulta con búsqueda avanzada, visualización y descarga controladas, generación de reportes, **bitácora de auditoría** y procedimientos de **respaldo y recuperación**, todo bajo **control de acceso basado en roles** (RBAC) y políticas de credenciales.

### 2.3 Beneficios

- **Orden documental** mediante catálogos y reglas de negocio.
- **Consulta rápida** por metadatos, texto asociado y filtros.
- **Trazabilidad** de acciones y cambios sobre documentos y usuarios.
- **Seguridad** coherente con estándares internacionalmente reconocidos.
- **Reportes** para gestión y supervisión.
- **Continuidad operativa** apoyada en respaldos y recuperación documentadas.

### 2.4 Importancia para el GADPR-LM (caso de estudio)

El prototipo **ilustra** cómo fortalecer la **gobernanza de la información** y la **organización documental** en un ente similar al GADPR-LM. La **validación institucional real** (usuarios finales, puesta en marcha) queda como **trabajo futuro** o **piloto** fuera del alcance mínimo de tesis, salvo acuerdo explícito con la institución.

### 2.5 Relación con seguridad de la información y gestión documental

La solución **plantea** la articulación entre **CID** y principios documentales: los controles técnicos descritos se **mapean** a ideas de ISO 27001/ASVS y a ISO 15489 como **marco de análisis** en la memoria de tesis. La profundidad de implementación se acota a lo **demostrable en código y pruebas** dentro del tiempo de titulación (véase capítulos 7, 11, 19 y 21).

---

## 3. Antecedentes y problemática

### 3.1 Situación actual (típica en instituciones públicas)

Frecuentemente coexisten **expedientes físicos** sin inventario digital actualizado, **carpetas en equipos personales** o unidades compartidas sin control de versiones, y **correos electrónicos** como depósito informal de documentos oficiales. *(Supuesto propuesto: validar mediante diagnóstico institucional.)*

### 3.2 Riesgos por pérdida de información

Pérdida por **fallos de hardware**, **borrados accidentales**, **desastres** o **robo de medios** sin políticas de retención y respaldo verificadas.

### 3.3 Accesos no autorizados

Cuando no hay **autenticación centralizada**, **roles** ni **auditoría**, un usuario interno o externo con acceso físico a una carpeta puede consultar información sensible.

### 3.4 Falta de organización

Sin **tipologías**, **series/subseries** y **metadatos obligatorios**, la búsqueda depende de la memoria humana o nombres de archivo inconsistentes.

### 3.5 Carencia de trazabilidad

Sin **registro de eventos** (quién vio, descargó, modificó, aprobó), no es posible reconstruir hechos ante reclamos o auditorías.

### 3.6 Debilidades de seguridad

Contraseñas débiles, **sin expiración de sesión**, **sin validación de entradas**, **carga de archivos sin antivirus ni lista blanca**, **errores que filtran stack traces**, ausencia de **HTTPS** incluso en intranet donde hay segmentación insuficiente.

### 3.7 Necesidad de digitalización y control

Digitalizar con **propósito**: no solo escanear, sino **indexar**, **clasificar**, **proteger** y **conservar** con políticas claras, alineadas a normativa interna y buenas prácticas.

---

## 4. Justificación técnica

| Perspectiva | Justificación |
|-------------|---------------|
| **Institucional (referencia)** | El marco GADPR-LM aporta **realismo de dominio** a la tesis; la validación política plena es **futura**. |
| **Operativa** | Reduce tiempos de búsqueda y tramitación; estandariza procesos. |
| **Tecnológica** | Arquitectura web por capas facilita mantenimiento, pruebas y escalamiento modular. |
| **Documental** | Aplica principios ISO 15489 sobre autenticidad, integridad y disponibilidad probada de los documentos como evidencia. |
| **Seguridad** | Implementa controles acordes a ISO/IEC 27001:2022 y ASVS para reducir superficie de ataque. |
| **Cumplimiento** | Facilita demostrar debido proceso en controles internos *(supuesto propuesto: mapear a normativa nacional aplicable en fase legal)*. |
| **Eficiencia** | Automatiza reportes, reduce retrabajo y duplicidad de documentos. |
| **Académica (tesis)** | Demuestra aplicación de ingeniería de software, bases de datos y seguridad aplicada a un dominio real (gestión documental pública). |

---

## 5. Objetivo general y objetivos específicos

### 5.1 Objetivo general

Diseñar e implementar un **prototipo de aplicación web de gestión documental digital** orientado al contexto del **GADPR-LM** (caso de estudio), ejecutable en **entorno local o de laboratorio**, que permita registrar, clasificar, almacenar, consultar, auditar y resguardar documentos de prueba con **controles de seguridad** fundamentados en **ISO/IEC 27001:2022**, **ISO 15489** y **OWASP ASVS** como marco de referencia, y **documentar** el resultado para la **defensa de titulación**.

### 5.2 Objetivos específicos

1. **Análisis:** Definir requisitos funcionales y no funcionales coherentes con el alcance de tesis; validación con **director de tesis** y, si existe disponibilidad, **referente institucional opcional** (no exigible para aprobar el grado).
2. **Diseño:** Establecer arquitectura (cap. 11), modelo de datos (cap. 16), navegación, reglas de negocio y modelo de seguridad.
3. **Desarrollo:** Implementar los **módulos prioritarios** del capítulo 12 suficientes para una **demostración defendible** (autenticación, RBAC, documentos, archivos, búsqueda, auditoría básica, reportes mínimos); los módulos secundarios pueden acotarse por **MVP** acordado con el director.
4. **Seguridad:** Aplicar en el prototipo autenticación robusta, RBAC, validación/sanitización, CSRF donde aplique, sesiones y registro de auditoría **en el alcance demostrable**.
5. **Pruebas:** Ejecutar pruebas funcionales y de seguridad **acordes a tesis** (cap. 21); evidencias en memoria o anexos.
6. **Entrega académica:** Desplegar el prototipo en **equipo propio o laboratorio**, documentar instalación, **manual de usuario básico** y **recomendaciones de trabajo futuro** (institucionalización, hardening, backups operativos).

---

## 6. Alcance del sistema

### 6.0 Alcance del trabajo de titulación

| Elemento | Alcance en tesis |
|------------|------------------|
| **Producto** | Prototipo web **funcional** y **reproducible** por el tribunal (código + BD + datos de prueba). |
| **Institución** | GADPR-LM como **referencia de dominio** y datos de ejemplo; **no** se exige contrato ni despliegue oficial. |
| **Normas ISO/ASVS** | Marco **teórico y de diseño**; la memoria explica el **mapeo** control a funcionalidad; **no** certificación. |
| **Pruebas** | Conjunto **representativo** con evidencias; no auditoría de seguridad externa obligatoria. |
| **Mantenimiento en producción** | Fuera de alcance; solo **recomendaciones** (cap. 23). |

### 6.1 Incluye

- Autenticación, recuperación controlada de credenciales, gestión de usuarios, roles y permisos.
- Catálogo de **dependencias/áreas**, **tipos documentales**, **series y subseries**.
- Registro de documentos, carga de archivos, indexación, versiones, estados, historial.
- Consulta, búsqueda avanzada, visualización y descarga con autorización.
- Bitácora de auditoría, reportes administrativos, configuración general.
- Procedimientos y registros de respaldo/restauración *(en tesis: **registro en BD** y/o **script/manual** documentado; operación 24/7 no requerida)*.
- Gestión de sesiones y cierre seguro.

### 6.2 No incluye (alcance base — tesis y extensiones)

- **Despliegue institucional** en servidores del GADPR-LM, **SLA**, **mesa de soporte** ni **capacitación masiva** de usuarios finales (salvo proyecto piloto explícito fuera del alcance mínimo).
- **Integración** con sistemas financieros, RR.HH. o trámites en línea ciudadanos *(trabajo futuro)*.
- **Firma electrónica avanzada** o **PKI institucional** completa (puede añadirse como módulo futuro).
- **Reconocimiento óptico de caracteres (OCR)** masivo en servidor, salvo que se especifique licenciamiento y hardware.
- **Gestión de archivo físico** (préstamo de carpetas, ubicación en estantería) más allá de campos opcionales de referencia.
- **Desarrollo de app móvil nativa** (solo navegador web responsive).

### 6.3 Límites funcionales

El sistema gestiona **metadatos y archivos digitales** bajo reglas definidas; la **validez jurídica** de ciertos actos administrativos debe confirmarse con área legal *(supuesto propuesto)*.

### 6.4 Límites técnicos

Rendimiento, tamaño máximo de archivo y usuarios concurrentes acotados al **hardware de desarrollo o laboratorio** del tesista *(parametrizable en configuración)*; no se exige dimensionamiento para producción.

### 6.5 Límites operativos

En tesis: **no** hay comité archivístico operativo obligatorio; las políticas de retención/eliminación se **modelan** en el sistema (parámetros/catálogos) como **demostración de diseño**. Una política institucional real sería **trabajo futuro** con el GADPR-LM.

### 6.6 Módulos contemplados

Los listados en el capítulo 12 (splash a cierre de sesión) y navegación capítulo 13.

---

## 7. Marco normativo y técnico aplicable

En el marco de la **tesis**, las normas y ASVS se utilizan como **referencias académicas y criterios de buenas prácticas** para fundamentar decisiones de diseño e implementación. El trabajo **no** constituye implementación de un **Sistema de Gestión de Seguridad de la Información (SGSI)** certificado ni auditoría formal; en la memoria se recomienda incluir una **tabla de trazabilidad** “control / decisión de diseño / evidencia en el prototipo”.

### 7.1 ISO/IEC 27001:2022 — Aplicación práctica *(referencia para el prototipo)*

| Tema del estándar | Traducción en el sistema |
|-------------------|--------------------------|
| Control de acceso | RBAC, permisos granulares por módulo/acción, restricción por dependencia. |
| Gestión de identidades | Alta/baja/modificación de usuarios, asignación de roles, revocación inmediata al desactivar. |
| Autenticación | Contraseñas con política (longitud, complejidad, historial opcional), hash fuerte, bloqueo por intentos, MFA *(opcional fase 2)*. |
| Segregación de funciones | Roles que separan administración de seguridad de auditoría y operación documental cuando aplique. |
| Registro de eventos | Tabla de auditoría con usuario, IP, acción, entidad, timestamp, resultado. |
| Respaldo | En tesis: registro de respaldos y/o script documentado + **una** prueba de restauración en entorno de demostración *(evidencia para memoria)*. |
| Gestión segura de la información | Clasificación de acceso a documentos, cifrado en tránsito (HTTPS), cifrado en reposo *(opcional para volumen sensible)*. |

### 7.2 ISO 15489 — Aplicación práctica

| Principio | Funcionalidad |
|-----------|---------------|
| Autenticidad | Metadatos de origen, usuario creador, sellos de tiempo, historial de cambios. |
| Integridad | Hash de archivo *(recomendado SHA-256 en tabla archivos)*, control de versiones, prohibición de sobrescritura silenciosa. |
| Fiabilidad | Catálogos validados, reglas de completitud antes de archivar. |
| Usabilidad | Búsqueda avanzada, etiquetas consistentes, mensajes claros. |
| Clasificación | Tipos, series, subseries obligatorios según reglas. |
| Organización | Dependencias, responsables, estados. |
| Conservación | Versiones, historial, políticas de retención parametrizables. |
| Trazabilidad | Historial documental + auditoría técnica. |

### 7.3 OWASP ASVS — Aplicación práctica

| Área ASVS | Implementación |
|-----------|----------------|
| Autenticación | Política de contraseñas, almacenamiento con Argon2id/bcrypt, recuperación con token de un solo uso con caducidad. |
| Sesiones | Identificador de sesión aleatorio, expiración por inactividad, invalidación al cerrar sesión. |
| Validación de entradas | Validación servidor + cliente, listas blancas, tipos de datos estrictos. |
| Control de acceso | Comprobación en cada endpoint sensible, no solo ocultar botones. |
| Protección de datos | Minimización en logs, no registrar contraseñas ni tokens completos. |
| Registros de auditoría | Eventos de seguridad relevantes, protección de integridad de logs. |
| Manejo de errores | Páginas genéricas, códigos correlativos internos para soporte. |
| Almacenamiento seguro | Permisos de sistema de archivos restrictivos, rutas fuera de webroot público. |
| Archivos subidos | Validación MIME/extensiones, tamaño, renombrado interno; **antivirus** como mejora opcional *(en tesis suele bastar lista blanca + validación)*. |
| Ataques comunes | CSRF tokens, cabeceras de seguridad HTTP, protección XSS, SQL parametrizado. |

---

## 8. Metodología de desarrollo recomendada

### 8.1 Propuesta para la tesis: **desarrollo incremental con revisiones con el director**

**Justificación:** Un proyecto de titulación suele ser llevado por **una persona** (con apoyo del **director de tesis**). Scrum “puro” con varios roles no es realista; se recomienda un **ciclo incremental** (mini-sprints o Kanban personal) con **hitos** alineados al calendario académico y **reuniones periódicas** de avance y priorización del MVP.

### 8.2 Fases y entregables (adaptados a tesis)

| Fase | Entregables |
|------|-------------|
| Planificación | Plan de trabajo de titulación, alcance del MVP, riesgos (cap. 24) |
| Análisis | Lista de RF/RNF priorizados, historias o lista de funcionalidades |
| Diseño | Modelo de datos, contratos API, decisiones de seguridad (caps. 11, 16, 19) |
| Iteración 1 | Autenticación, usuarios, roles, dependencias (base del sistema) |
| Iteración 2 | Documentos, archivos, clasificación, búsqueda |
| Iteración 3 | Versiones, estados, historial, reportes esenciales |
| Iteración 4 | Auditoría, configuración, endurecimiento básico, documentación |
| Pruebas y cierre | Casos de prueba ejecutados, capturas/evidencias, preparación de defensa |
| Entrega | Repositorio, instrucciones de instalación, manual de usuario breve |

### 8.3 Roles (tesis)

| Rol | Función |
|-----|---------|
| **Tesista** | Desarrollo, pruebas, documentación, despliegue local/laboratorio. |
| **Director de tesis** | Validación académica, priorización de alcance, revisión de avances. |
| **Tribunal / revisores** | Evaluación final del producto y memoria (no gestión del día a día). |
| **Institución GADPR-LM** | Opcional: entrevista o revisión de requisitos; **no** requisito para cerrar la tesis. |

### 8.4 Artefactos

Repositorio Git, README de instalación, scripts SQL o migraciones, colección API (Postman/Insomnia opcional), matriz de trazabilidad (Anexo A), evidencias de pruebas, memoria de titulación.

### 8.5 Cronograma orientativo *(ajustar al reglamento de la facultad)*

| Etapa | Duración orientativa |
|-------|----------------------|
| Análisis y diseño | 3–6 semanas |
| Desarrollo iterativo | según plazo total (p. ej. 10–20 semanas) |
| Pruebas y documentación | 3–4 semanas |
| Buffer ante imprevistos | 2+ semanas |

*El cronograma real debe cuadrar con el calendario de la carrera y las revisiones con el director.*

---

## 9. Levantamiento y análisis de requerimientos

### 9.1 Requerimientos funcionales (numerados)

**RF-001 Autenticación:** El sistema debe permitir iniciar sesión con usuario y contraseña, aplicando bloqueo tras N intentos fallidos.

**RF-002 Gestión de usuarios:** CRUD de usuarios con datos mínimos: nombres, correo, dependencia, cargo, estado (activo/inactivo).

**RF-003 Gestión de roles y permisos:** Definir roles y mapear permisos por pantalla/acción.

**RF-004 Dependencias:** Mantener catálogo jerárquico o plano de áreas institucionales.

**RF-005 Tipos documentales:** CRUD de tipos con código y nombre.

**RF-006 Series y subseries:** Relación serie → subserie asociada a tipología o tabla reticular según modelo.

**RF-007 Registro de documentos:** Crear ficha documental con metadatos obligatorios antes de transiciones críticas.

**RF-008 Carga de archivos:** Subir uno o más archivos por versión, con validación de tipo y tamaño.

**RF-009 Indexación:** Campos de indexación (remitente, destinatario, número de oficio, fecha, palabras clave, etc.).

**RF-010 Búsqueda avanzada:** Filtros combinables y búsqueda por texto en metadatos.

**RF-011 Visualización:** Visor integrado para PDF e imágenes; otros formatos según política.

**RF-012 Descarga:** Descarga autorizada con registro en auditoría.

**RF-013 Versiones:** Crear nueva versión sin borrar la anterior; comparación de metadatos.

**RF-014 Estados:** Flujo de estados (borrador, revisión, aprobado, archivado, etc.) parametrizable.

**RF-015 Historial:** Línea de tiempo de cambios de estado y metadatos.

**RF-016 Bitácora:** Registro de accesos y acciones de seguridad.

**RF-017 Reportes:** Inventarios y estadísticas exportables.

**RF-018 Respaldo:** Registro de jobs de respaldo y verificación *(la ejecución física puede ser script del SO + registro en BD)*.

**RF-019 Configuración:** Parámetros globales (tamaño máximo archivo, extensiones permitidas, tiempo de sesión).

**RF-020 Recuperación de contraseña:** Flujo por token de un solo uso vía correo *(en tesis puede **simularse** el envío — log en consola / pantalla admin — si no hay SMTP; lo deseable es integrar SMTP de prueba)*.

**RF-021 Auditoría de consultas:** Listado filtrable por usuario, acción, fecha.

**RF-022 Sesiones:** Administrador puede invalidar sesiones activas *(opcional según política)*.

### 9.2 Requerimientos no funcionales

| ID | Categoría | Descripción |
|----|-----------|-------------|
| RNF-SEG-01 | Seguridad | Controles del cap. 19 **implementados en el prototipo** en la medida del alcance de tesis; memoria explica mapeo a ISO/ASVS **sin** exigir certificación. |
| RNF-PERF-01 | Rendimiento | Tiempos de respuesta **razonables** en equipo de desarrollo/laboratorio en operaciones típicas *(objetivo orientativo: inferior a 3 s)*. |
| RNF-USA-01 | Usabilidad | Interfaz usable y responsive en navegadores comunes; mensajes en español. |
| RNF-MAN-01 | Mantenibilidad | Código organizado por módulos, configuración externalizada, README claro *(evaluable en defensa)*. |
| RNF-DISP-01 | Disponibilidad | **No** se exige 99 %; basta disponibilidad durante **sesiones de prueba y defensa**; caídas por mantenimiento del PC de demo son aceptables si están documentadas. |
| RNF-BAK-01 | Respaldo | **Al menos** un procedimiento documentado de copia de BD y/o carpeta `storage/` + **una** restauración exitosa en entorno de prueba *(evidencia)*. |
| RNF-INT-01 | Integridad | Transacciones ACID en operaciones críticas de registro documental + metadatos de archivo. |
| RNF-ESC-01 | Escalabilidad | Arquitectura por capas **preparada** para separar app y BD en el futuro; **no** obligatorio desplegar en dos máquinas en la tesis. |
| RNF-COMP-01 | Compatibilidad | Navegadores: Chrome/Edge/Firefox recientes en Windows *(entorno del tesista/tribunal)*. |
| RNF-AUD-01 | Auditoría | Retención de logs/auditoría suficiente para **demostrar trazabilidad** en pruebas; plazo de retención largo **trabajo futuro**. |
| RNF-INTNET-01 | Red | Prototipo pensado para **localhost o red de laboratorio**; exposición a Internet pública **fuera de alcance** y desaconsejada sin hardening. |

---

## 10. Identificación de actores del sistema

Los actores siguientes son **roles funcionales** para el diseño del prototipo y la **matriz de permisos**; en la demo académica pueden interpretarse con **usuarios de prueba** (cuentas en BD) sin necesidad de personal real del GADPR-LM.

### 10.1 Administrador del sistema

- **Responsabilidades:** Configuración global, usuarios, roles, parámetros de seguridad, respaldos (coordinación).
- **Permisos:** Todos los módulos administrativos; puede ver auditoría técnica.
- **Restricciones:** No debe eludir segregación si se define auditor independiente; acciones sensibles quedan registradas.
- **Acciones:** CRUD usuarios/roles, parametrización, gestión de catálogos críticos si se asigna.

### 10.2 Secretario/a o gestor documental

- **Responsabilidades:** Registro, clasificación, carga, cambios de estado dentro de su competencia.
- **Permisos:** Módulos documentales completos según dependencia asignada.
- **Restricciones:** No administra roles globales salvo delegación.
- **Acciones:** Crear/editar documentos, cargar archivos, proponer archivado.

### 10.3 Usuario institucional

- **Responsabilidades:** Consulta y trámites acotados a su función.
- **Permisos:** Consulta de documentos autorizados; carga si el rol lo permite.
- **Restricciones:** Sin acceso a administración ni auditoría global.
- **Acciones:** Búsqueda, visualización, descarga permitida.

### 10.4 Auditor interno

- **Responsabilidades:** Revisión de trazabilidad y cumplimiento.
- **Permisos:** Lectura de auditoría, reportes, sin edición de documentos salvo excepción.
- **Restricciones:** No eliminación de logs; lectura exportable.
- **Acciones:** Consultas de bitácora, exportación de informes.

### 10.5 Supervisor o autoridad

- **Responsabilidades:** Aprobaciones de estado, visión agregada por área.
- **Permisos:** Dashboard con KPI, aprobación/rechazo, reportes de área.
- **Restricciones:** Según matriz de aprobación institucional.
- **Acciones:** Aprobar trámites documentales, ver indicadores.

---

## 11. Arquitectura general del sistema

Este capítulo **define de forma cerrada** la arquitectura del SGD-GADPR-LM para el **proyecto de tesis**: un sistema **web cliente–servidor** con **API REST**, **base de datos relacional** y **almacenamiento de archivos en disco**, organizado en **capas** para separar presentación, reglas de negocio y persistencia. No se asume un centro de datos empresarial; la **arquitectura física de referencia** es **una sola máquina** (o contenedores en la misma) para desarrollo y demostración académica.

### 11.0 Alcance arquitectónico: tesis frente a producción

| Aspecto | Alcance **tesis** (este documento) | Extensión **producción** *(fuera del grado)* |
|---------|-----------------------------------|---------------------------------------------|
| Objetivo | Prototipo **funcional y evaluable** (casos de uso core, seguridad básica demostrable) | Alta disponibilidad, DR, clustering |
| Despliegue | Localhost, red de laboratorio o **Docker Compose** en un host | VMs separadas, Kubernetes, balanceadores |
| Concurrencia | Usuarios concurrentes moderados (pruebas académicas) | Dimensionamiento y pruebas de carga formales |
| Observabilidad | Logs de aplicación y BD suficientes para la defensa | ELK, APM, SIEM |
| Criterio | **Trazabilidad en el documento y en el código** para la defensa | Operación 24/7 con ITIL |

### 11.1 Estilo arquitectónico

Se adopta una **arquitectura en tres capas lógicas** (presentación, aplicación, datos) con **API REST** como frontera entre cliente y servidor. El backend sigue el **modelo modular** propio de **NestJS** (módulos, controladores, servicios, guards), lo que facilita mapear cada **caso de uso** del expediente a **módulos de código** en la memoria de la tesis.

```mermaid
flowchart TB
  subgraph cliente [Capa de presentación]
    SPA[SPA React + TypeScript]
  end
  subgraph api [Capa de aplicación]
    REST[API REST NestJS]
    DOM[Servicios de dominio]
    SEC[Guards JWT / RBAC]
  end
  subgraph datos [Capa de datos]
    MYSQL[(MySQL 8)]
    FS[Sistema de archivos storage]
  end
  SPA -->|HTTPS JSON| REST
  REST --> SEC
  SEC --> DOM
  DOM --> MYSQL
  DOM --> FS
```

### 11.2 Stack tecnológico (definición única — sin alternativas)

**Línea base fijada para el código del proyecto:** el stack siguiente es el **único** adoptado; sustituir un componente implica actualizar el expediente y el repositorio.

**Resumen en una línea:** *React 18 + TypeScript + Vite + MUI + React Router + React Hook Form + Zod + axios → NestJS + Prisma + **BD en XAMPP (MySQL/MariaDB localhost)** → JWT (access) + refresh en cookie HttpOnly → Argon2id → archivos en `storage/` → **ngrok** opcional para demos HTTPS remotas → Nginx solo si aplica.*

| Capa | Tecnología | Función |
|------|------------|---------|
| **Runtime** | **Node.js** (LTS) | Ejecución del backend. |
| **Frontend** | **React 18** + **TypeScript** + **Vite** | SPA. |
| **Enrutamiento SPA** | **React Router** | Navegación del cliente. |
| **UI** | **Material UI (MUI)** | Componentes, layout, tablas, formularios. |
| **Formularios y validación (cliente)** | **React Hook Form** + **Zod** | Validación tipada alineada con DTOs del backend. |
| **HTTP (cliente → API)** | **axios** | Llamadas REST, interceptores para JWT / refresh. |
| **Backend** | **NestJS** + **TypeScript** | API REST, módulos, Guards, Pipes, validación con **class-validator** / **class-transformer** en DTOs. |
| **ORM / BD** | **Prisma** | Cliente type-safe, migraciones, acceso a **MySQL 8**. |
| **Base de datos** | **MySQL 8** compatible *(en desarrollo: motor **MySQL/MariaDB** suministrado por **XAMPP**; Prisma usa el proveedor `mysql` y `DATABASE_URL` apuntando a `localhost`)* | Persistencia relacional y transacciones. |
| **Autenticación** | **JWT** (access de corta duración) + **refresh token** en **cookie HttpOnly** (`Secure`, `SameSite=Strict` en entornos con HTTPS) | Sesión sin guardar contraseñas en el cliente. |
| **Hash de contraseñas** | **Argon2id** | Almacenamiento de `hash_password` en `usuarios`. |
| **Archivos digitales** | Sistema de archivos local **`storage/`** | Digitalizados fuera del webroot público; metadatos en BD. |
| **Reverse proxy (demo / laboratorio)** | **Nginx** *(opcional)* | TLS y proxy hacia NestJS en red de laboratorio; en desarrollo local puede omitirse. |

**Exportación de reportes (backend):** **Excel** con **ExcelJS**; **PDF** con **pdfkit** *(fijado para no dispersar dependencias)*.

**Qué no entra en este stack:** Redis, RabbitMQ/Kafka, microservicios, réplicas MySQL, Kubernetes, MinIO/S3 *(solo como mejora futura)*.

### 11.3 Descomposición lógica por componentes

| Componente | Responsabilidad |
|------------|-----------------|
| **SPA (React)** | Vistas, formularios, estado de UI (Context o estado local; **Zustand** opcional si crece), llamadas HTTP con **axios** e interceptores JWT/refresh. |
| **Módulo Auth (NestJS)** | Login, refresh, logout, recuperación de contraseña; emisión de JWT; integración con tabla `usuarios`, `sesiones` / refresh store. |
| **Módulo Usuarios y RBAC** | CRUD usuarios, roles, permisos; comprobación de permisos en Guards usando metadatos por ruta. |
| **Módulo Documental** | CRUD documentos, estados, versiones, metadatos; orquestación transaccional al subir archivo. |
| **Módulo Archivos** | Validación MIME/extensión/tamaño, cálculo SHA-256, escritura en disco, registro en `archivos`. |
| **Módulo Auditoría** | Middleware o interceptor que registra acciones en `auditoria` (éxito/denegado/error). |
| **Módulo Reportes** | Consultas parametrizadas; exportación **ExcelJS** / **pdfkit** según §11.2. |

### 11.4 Arquitectura lógica (flujo de dependencias)

Las dependencias **apuntan hacia dentro**: la capa de presentación depende del contrato REST, no al revés. El backend **no** sirve la SPA en la misma aplicación salvo configuración explícita de “static files” para la demo; en desarrollo típico, **Vite dev server** (puerto 5173) y **NestJS** (puerto 3000) con **CORS** restringido al origen del front.

Secuencia típica: **React** → **axios** → **Controller** → **Guard (JWT + permisos)** → **Service** → **Prisma** → **MySQL**; operaciones con archivo invocan **FileStorageService** (abstracción sobre el disco).

### 11.5 Arquitectura física y despliegue para la tesis

**Escenario de referencia fijado para este proyecto:** un único equipo **Windows** con:

1. **XAMPP** instalado; desde el **Panel de control de XAMPP** se inicia el módulo **MySQL** (en versiones recientes de XAMPP el motor puede ser **MariaDB**, compatible con el cliente Prisma configurado como `provider = "mysql"`). La base de datos se crea en **phpMyAdmin** (incluido en XAMPP) o por script SQL; la cadena de conexión en `.env` típica es del estilo `DATABASE_URL="mysql://usuario:clave@localhost:3306/nombre_bd"`.
2. **Aplicación NestJS** en ejecución (`npm run start:dev`), puerto por defecto **3000** (ajustable).
3. **Carpeta `storage/`** en el mismo host para archivos digitales.
4. **Frontend Vite** (`npm run dev`, puerto **5173** por defecto) o build estático según fase.

**ngrok (demostración y acceso remoto temporal):** se utiliza **ngrok** para crear un túnel **HTTPS** público hacia el puerto donde escucha la API NestJS (p. ej. `ngrok http 3000`) y/o, si se configura, hacia el frontend. Esto permite:
- probar el sistema desde otro equipo o red sin VPN;
- mostrar el prototipo al director o tribunal sin desplegar en servidor;
- verificar cookies `Secure` / CORS en un origen HTTPS.

**Advertencias con ngrok:** la URL pública cambia en el plan gratuito; **no** usar datos personales reales ni credenciales de producción; tratar el túnel como **entorno de prueba expuesto**. Cerrar el túnel al terminar la sesión.

**Escenario alternativo (opcional):** **Docker Compose** con MySQL si en el futuro se deja de usar XAMPP; no es el escenario principal de este expediente.

```mermaid
flowchart LR
  PC[PC Windows + XAMPP]
  PC --> MYSQLC[(MySQL/MariaDB XAMPP)]
  PC --> API[NestJS]
  PC --> ST[storage/]
  PC --> WEB[Vite React]
  API --> NG[ngrok HTTPS]
  WEB --> NG
```

**Intranet institucional** (GADPR-LM) queda como **evolución**: misma arquitectura lógica, más hardening de red y políticas de backup (capítulo 22).

### 11.6 Contrato de interfaz: API REST

- **Estilo:** recursos en plural (`/api/v1/documentos`, `/api/v1/usuarios`), códigos HTTP semánticos (401, 403, 404, 422, 429).
- **Formato:** JSON; errores con estructura `{ code, message, correlationId }` sin filtrar stack al cliente.
- **Autenticación:** cabecera `Authorization: Bearer <access_token>`; refresh mediante endpoint dedicado y cookie HttpOnly.
- **Paginación:** `?page=&limit=` o cursor en listados grandes.
- **Subida de archivos:** `multipart/form-data` hacia endpoint específico por documento o versión.

### 11.7 Almacenamiento documental (disco)

Estructura lógica recomendada:

`storage/{año}/{mes}/{id_documento}/{uuid}_{nombreSeguro}.ext`

La API **nunca** confía en el nombre original para la ruta física; conserva `nombre_original` solo en BD. Permisos del SO: usuario del proceso NestJS **solo** lectura/escritura en `storage/`.

### 11.8 Seguridad en la arquitectura (resumen)

Los controles del capítulo 19 se **inyectan** en: **Guards y políticas** (acceso), **validación de DTOs** (entrada), **ORM parametrizado** (SQLi), **cabeceras HTTP** vía middleware (CORS, HSTS si hay HTTPS). La arquitectura de tesis **sí debe** demostrar estos puntos en el código entregable, aunque no se exija certificación ISO.

### 11.9 Flujo de interacción (ejemplo: descarga de documento)

1. Usuario autenticado solicita descarga desde la SPA.
2. Petición `GET /api/v1/documentos/:id/archivos/:archivoId/descarga` con JWT.
3. Guard verifica permiso `documentos.descargar` y **ámbito de dependencia**.
4. Service comprueba estado del documento y existencia del archivo en disco.
5. Se inserta fila en `auditoria` (`DOCUMENTO_DESCARGAR`, resultado `ok`).
6. Respuesta **stream** con `Content-Disposition: attachment` y tipo MIME correcto.

### 11.10 Limitaciones explícitas (tesis)

- No se garantiza escalabilidad horizontal ni disponibilidad 99,9 %.
- Los respaldos pueden ser **manuales o script simple** documentados en memoria, siempre verificables.
- Integraciones externas (firma electrónica, correo SMTP institucional) pueden estar **simuladas o con SMTP de prueba**.

---

## 12. Diseño completo del sistema por módulos

### 12.1 Flujo general del sistema desde el inicio

1. **Splash:** Verificación de conectividad con API (`GET /health`), carga de tema y versión.
2. **Validación inicial:** Si hay sesión válida (refresh), redirige a dashboard; si no, a login.
3. **Login:** Captura credenciales → `POST /auth/login` → establece tokens/sesión.
4. **Recuperación:** Solicitud de correo → email con enlace tokenizado → formulario nueva contraseña.
5. **Dashboard:** KPI, accesos recientes, alertas.
6. **Navegación principal:** Menú lateral/top según rol.
7. **Módulos documentales:** Registro → carga → estados → consulta.
8. **Reportes:** Filtros → vista previa → exportación.
9. **Cierre de sesión:** Invalidación servidor + borrado cliente de tokens.

---

### 12.2 Descripción detallada por módulo obligatorio

A continuación, cada módulo sigue estructura uniforme: **Objetivo, Actor, Ruta, Funcionalidad, Campos, Validaciones, Botones, Permisos, Reglas, Persistencia, Errores, Seguridad.**

---

#### 1. Splash o pantalla inicial

| Aspecto | Detalle |
|---------|---------|
| **Objetivo** | Mostrar identidad institucional mientras se valida disponibilidad del servicio. |
| **Actor** | Todos |
| **Ruta** | `/` o `/splash` |
| **Descripción funcional** | Muestra logo, nombre del sistema, versión; llama a endpoint de salud; tras 1–2 s navega a login o dashboard. |
| **Campos** | Ninguno. |
| **Validaciones** | Si `/health` falla, mensaje: “Servicio no disponible. Contacte a TI.” |
| **Botones** | “Reintentar” → nueva llamada a `/health`. |
| **Permisos** | Público. |
| **Reglas** | No exponer detalles técnicos del error en UI. |
| **Persistencia** | Opcional: `localStorage` solo para preferencia de tema, no datos sensibles. |
| **Errores** | Log en cliente genérico + correlativo para soporte. |
| **Seguridad** | No precarga tokens; CSP básico en front. |

---

#### 2. Inicio de sesión

| Campo | Tipo | Validación |
|-------|------|------------|
| Usuario | string 3–50 | Regex alfanumérico institucional |
| Contraseña | string | Longitud mínima según política (p. ej. 10) |
| Recordar equipo | boolean | Solo UI; **no almacenar contraseña** |

**Botones:** “Ingresar” → POST login; “¿Olvidó su contraseña?” → `/recuperar`.

**Internamente:** Rate limit por IP+usuario; hash comparado en servidor; si OK, emite access/refresh o crea sesión servidor.

**BD:** Inserta/actualiza `sesiones`, registra `auditoria` login exitoso/fallido.

**Errores:** Mensaje genérico “Credenciales inválidas”; lockout tras N intentos.

**ASVS/27001:** MFA preparado como extensión futura.

---

#### 3. Recuperación de contraseña

**Flujo:** Paso A: email → genera `recuperacion_credenciales.token` (UUID), `expira_en`, estado `pendiente`. Paso B: enlace `/restablecer?token=` → valida token → nueva contraseña + confirmación.

**Validaciones:** Token no usado, no expirado; contraseña cumple política; no reutiliza últimas 5 *(supuesto)*.

**Botones:** “Enviar enlace”, “Guardar nueva contraseña”.

**Seguridad:** No revelar si el correo existe; mismo mensaje genérico.

---

#### 4. Dashboard principal

**Widgets:** Documentos registrados en el mes, pendientes de revisión, descargas recientes (según rol), accesos fallidos (admin).

**Ruta:** `/dashboard`

**Permisos:** Autenticados; datos filtrados por dependencia.

**Botones:** Accesos rápidos a “Nuevo documento”, “Búsqueda”, “Reportes”.

---

#### 5. Gestión de usuarios

**Ruta:** `/admin/usuarios`

**Tabla principal:** usuarios con columnas: código, nombre, dependencia, roles, estado, último acceso.

**Formulario alta/edición:**

| Campo | Tipo | Notas |
|-------|------|-------|
| nombres | varchar(150) | Requerido |
| apellidos | varchar(150) | Requerido |
| usuario_login | varchar(50) | Único |
| correo | varchar(150) | Único, formato email |
| dependencia_id | FK | Requerido |
| cargo_id | FK | Opcional |
| roles | multiselect | Al menos uno |
| estado | enum activo/inactivo | |

**Botones:** Nuevo, Guardar, Cancelar, Desactivar (soft delete), Restablecer contraseña (genera flujo o password temporal con cambio forzado).

**Reglas:** No eliminar físico; `inactivo` revoca sesiones.

**Auditoría:** Todo cambio en `auditoria`.

---

#### 6. Gestión de roles y permisos

**Ruta:** `/admin/roles`

**Entidades:** rol, lista de permisos agrupados por módulo (documentos.ver, documentos.editar, admin.usuarios, …).

**UI:** Matriz checkboxes.

**Reglas:** Rol `AUDITOR` no puede editar documentos; `ADMIN` no puede apagar auditoría.

---

#### 7. Gestión de dependencias o áreas

**Ruta:** `/admin/dependencias`

**Campos:** código, nombre, padre_id (jerárquico opcional), responsable_usuario_id opcional.

**Validaciones:** código único; no ciclos en jerarquía.

---

#### 8. Gestión de tipos documentales

**Ruta:** `/catalogos/tipos-documentales`

**Campos:** codigo, nombre, descripcion, retencion_anios (opcional), requiere_respuesta (bool).

---

#### 9. Gestión de series y subseries

**Rutas:** `/catalogos/series`, `/catalogos/subseries`

**Relación:** `subseries.serie_id` FK; opcional `tipo_documental_id` si aplica cuadro de clasificación.

**Reglas:** No borrar si hay documentos asociados (solo inactivar).

---

#### 10. Registro de documentos

**Ruta:** `/documentos/nuevo` y `/documentos/:id/editar`

**Campos principales:**

| Campo | Tipo |
|-------|------|
| titulo | varchar(500) |
| tipo_documental_id | FK |
| serie_id, subserie_id | FK |
| dependencia_origen_id | FK |
| fecha_documento | date |
| numero_oficio | varchar(100) |
| remitente, destinatario | varchar(200) |
| palabras_clave | text |
| estado_documento_id | FK |
| responsable_usuario_id | FK |

**Botones:** Guardar borrador, Enviar a revisión (valida campos mínimos), Cancelar.

**BD:** INSERT en `documentos`, `historial_documento` con evento “creado”.

---

#### 11. Carga y digitalización de archivos

| Aspecto | Detalle |
|---------|---------|
| **Objetivo** | Asociar uno o más archivos digitales a un documento institucional, conservando integridad y trazabilidad. |
| **Actores** | Gestor documental, Usuario con permiso `documentos.adjuntar`, Administrador (casos excepcionales). |
| **Ruta** | `/documentos/:id/archivos` (pestaña dentro de la ficha) |
| **Descripción funcional** | Zona de arrastre (drag-and-drop) y botón “Examinar”; lista de archivos en cola; progreso por archivo; resultado por archivo (éxito/error). Cada carga exitosa crea registro en `archivos`, incrementa `documentos_versiones` y actualiza hash de integridad. |
| **Campos (UI)** | `archivo` (file, múltiple si política lo permite), `motivo_version` (texto 3–500, obligatorio si no es primera versión), `marcar_como_version_vigente` (checkbox, por defecto verdadero). |
| **Validaciones** | Tamaño ≤ `MAX_UPLOAD_MB`; extensión y MIME en lista blanca; número máximo de archivos por documento *(parametrizable)*; documento no en estado `archivado` sin permiso `documentos.adjuntar_archivado`; escaneo antivirus *(supuesto propuesto: integración con motor institucional; si no hay, cuarentena manual)*. |
| **Botones** | **Examinar** → abre selector de SO; **Subir** → inicia transferencia multipart; **Cancelar cola** → aborta pendientes; **Eliminar de lista** → solo antes de confirmar subida; **Ver historial de versiones** → desplaza a panel lateral. |
| **Acción interna por botón** | **Subir:** valida token CSRF → `POST /api/documentos/:id/archivos` → servidor valida permisos y estado → escribe temporal → antivirus → calcula SHA-256 → mueve a ruta definitiva con UUID → INSERT transaccional `archivos` + `documentos_versiones` + `historial_documento` (“version_agregada”) + `auditoria` (`ARCHIVO_SUBIR_OK`). |
| **Menús / submenús** | Contexto: Documentos → Ficha → pestaña “Archivos digitales”. |
| **Mensajes** | Éxito: “Archivo cargado correctamente (versión N).”; Error: “Tipo de archivo no permitido.”, “El archivo supera el tamaño máximo permitido.”, “No se pudo completar el análisis de seguridad del archivo.” |
| **Permisos por rol** | Gestor: sí; Usuario consulta: no; Auditor: solo lectura de metadatos de archivo, sin descarga si política restringe. |
| **Reglas de negocio** | RN-003, RN-006, RN-013; no se sobrescribe archivo existente: siempre nueva fila de versión. |
| **Persistencia** | `archivos`, `documentos_versiones`, `historial_documento`, `auditoria`; sistema de archivos en ruta no servida estáticamente. |
| **Errores** | Fallo de disco: transacción rollback, mensaje genérico, código correlativo en log servidor; fallo AV: archivo en cuarentena y estado `pendiente_validacion` *(opcional)*. |
| **Seguridad** | ASVS V12 (archivos), ISO 27001 (control de cambios), ISO 15489 (integridad por hash). |

---

#### 12. Indexación documental

| Aspecto | Detalle |
|---------|---------|
| **Objetivo** | Capturar metadatos descriptivos y de gestión que permitan recuperación probada y gestión del ciclo de vida. |
| **Actores** | Gestor documental, Usuario autorizado a editar metadatos. |
| **Ruta** | `/documentos/:id/indexacion` o misma ficha en sección “Indexación”. |
| **Campos (formulario)** | **Fijos en `documentos`:** `titulo`, `fecha_documento`, `numero_oficio`, `remitente`, `destinatario`, `palabras_clave` (texto libre separado por comas), `observaciones` (textarea). **Dinámicos en `documento_metadatos`:** pares `clave`/`valor` según esquema por tipo documental *(supuesto propuesto: tabla `tipo_documental_campos` con JSON de esquema en fase 2)*. |
| **Tipos de dato** | Fechas `DATE`, textos `VARCHAR/TEXT`, numéricos `INT/DECIMAL`, listas cerradas desde catálogos. |
| **Validaciones** | Campos obligatorios según matriz por `tipo_documental_id`; formato de `numero_oficio` según máscara institucional; `palabras_clave` máximo 20 términos; sin caracteres de control. |
| **Botones** | **Guardar metadatos**, **Validar completitud** (pre-chequeo para archivar), **Restaurar última versión guardada** (descarta cambios locales). |
| **Mensajes** | “Metadatos actualizados.”; “Faltan campos obligatorios para el tipo documental seleccionado: [lista].” |
| **Permisos** | `documentos.editar_metadatos`; lectura para consulta. |
| **Qué guarda BD** | `UPDATE documentos`, upsert en `documento_metadatos`, `historial_documento` “metadatos_editados” con diff resumido *(no guardar datos sensibles en exceso en historial)*. |
| **Seguridad** | Sanitización de entradas; validación servidor; trazabilidad ISO 15489. |

---

#### 13. Consulta y búsqueda avanzada

| Aspecto | Detalle |
|---------|---------|
| **Objetivo** | Localizar documentos con criterios combinados y paginación estable. |
| **Actores** | Todos los perfiles con permiso de consulta acotado a su ámbito. |
| **Ruta** | `/documentos/buscar` |
| **Campos de filtro** | `fecha_desde`, `fecha_hasta` (date), `dependencia_id` (select), `tipo_documental_id`, `serie_id`, `subserie_id`, `estado_id`, `texto` (búsqueda en título/palabras clave/oficio), `solo_mis_documentos` (bool), `incluir_eliminados_logicamente` (solo admin). |
| **Validaciones** | Rango de fechas coherente; `texto` mínimo 3 caracteres si es único criterio; límite de página por defecto 25. |
| **Botones** | **Buscar**, **Limpiar filtros**, **Guardar búsqueda** *(guarda criterios en `notificaciones` o tabla `busquedas_guardadas` — opcional)*, **Exportar resultados** (si permiso). |
| **Resultados** | Tabla: `codigo_interno`, `titulo`, `tipo`, `fecha_documento`, `estado`, `dependencia`, `acciones` (Ver). Orden por defecto: fecha descendente. |
| **Seguridad** | WHERE clause siempre incluye predicado de ámbito por dependencias; prevención SQLi; auditoría opcional `BUSQUEDA_EJECUTADA` en modo estricto *(configurable)*. |
| **Errores** | Timeout de consulta: mensaje “Refine los criterios de búsqueda.”; log de consultas lentas. |

---

#### 14. Visualización de documentos

| Aspecto | Detalle |
|---------|---------|
| **Objetivo** | Permitir lectura en pantalla sin descarga obligatoria, con control de permisos y registro de evento. |
| **Ruta** | `/documentos/:id/ver` |
| **Componentes UI** | Cabecera con metadatos; pestañas “Ficha”, “Archivos”, “Historial”; visor central; pie con acciones permitidas. |
| **Visor** | PDF: PDF.js con desactivación de descarga desde visor si el rol lo exige *(configuración `VISOR_SOLO_LECTURA`)*; imágenes: zoom; Office: conversión a PDF en servidor *(supuesto fase 2)* o descarga forzada. |
| **Botones** | **Abrir en nueva pestaña**, **Pantalla completa**, **Descargar** (si permiso), **Cambiar versión** (dropdown). |
| **Auditoría** | `DOCUMENTO_VISUALIZAR` con `archivo_id` y `version`. |
| **Errores** | Archivo corrupto: “No es posible renderizar el documento; intente descargar o contacte a archivo.” |
| **Seguridad** | Tokens de acceso temporal opcionales para URL de visor (evitar hotlinking); cabeceras `Content-Security-Policy` para visor. |

---

#### 15. Descarga de documentos

| Aspecto | Detalle |
|---------|---------|
| **Objetivo** | Transferir copia del archivo al cliente con autorización y trazabilidad. |
| **Ruta/API** | `GET /api/documentos/:id/archivos/:archivoId/descarga` |
| **Botones** | **Descargar versión vigente**, **Descargar versión histórica** (selector). |
| **Validaciones previas** | Permiso `documentos.descargar`; estado del documento compatible; si `restringido`, verificar rol adicional. |
| **Internamente** | Genera registro `auditoria` antes de stream; nombre descargable: `{codigo_interno}_v{n}_{nombre_original}`; cabeceras `Content-Type` y `Content-Disposition: attachment`. |
| **Mensajes** | Éxito silencioso (navegador descarga); denegación: “No tiene permisos para descargar este documento.” |
| **Reglas** | Mismo ámbito de dependencia que consulta; opción de marcar documento como “solo consulta en sala” *(supuesto político — campo en documento)*. |

---

#### 16. Control de versiones documentales

| Aspecto | Detalle |
|---------|---------|
| **Objetivo** | Mantener historial inmutable de versiones con motivo y responsable. |
| **Ruta (panel)** | Sección “Versiones” en `/documentos/:id/ver` |
| **Tabla de versiones** | Columnas: N°, fecha, usuario, motivo, tamaño, hash corto, acciones (Ver, Descargar, Comparar metadatos). |
| **Botones** | **Nueva versión** (abre módulo 11), **Establecer como vigente** *(solo si política permite revertir — requiere permiso alto y justificación)*. |
| **Reglas** | Versión vigente = máxima `numero_version` salvo marca explícita `es_vigente` *(si se implementa reversión controlada)*. |
| **BD** | Inmutabilidad: `UPDATE` prohibido sobre `archivos.ruta_almacenamiento`; correcciones solo vía nueva versión. |
| **Seguridad** | Toda nueva versión auditada; integridad por hash. |

---

#### 17. Estados del trámite documental

| Aspecto | Detalle |
|---------|---------|
| **Objetivo** | Modelar el ciclo de vida administrativo del documento digital. |
| **Catálogo** | `estados_documento`: `borrador`, `en_revision`, `aprobado`, `rechazado`, `archivado`, `anulado` *(opcional)*. |
| **Ruta de administración del flujo** | `/admin/flujo-documental` *(supuesto)* para matriz de transiciones. |
| **Botones por estado** | Desde `borrador`: **Enviar a revisión**; desde `en_revision`: **Aprobar**, **Rechazar**; desde `aprobado`: **Archivar**; global: **Anular** *(permiso especial)*. |
| **Campos adicionales** | En rechazo: `motivo_rechazo` (obligatorio, 10–1000 caracteres); en aprobación: `comentario_aprobacion` (opcional). |
| **Servicio** | `WorkflowService.validarTransicion(estado_actual, estado_nuevo, rol)` → lanza excepción de negocio si no es válido. |
| **BD** | `UPDATE documentos.estado_id`; `INSERT historial_documento`; notificación al responsable si aplica. |
| **Mensajes** | “Transición no permitida para su rol.”; “El documento debe completar índice obligatorio antes de archivar.” |

---

#### 18. Historial y trazabilidad

| Aspecto | Detalle |
|---------|---------|
| **Objetivo** | Presentar línea de tiempo unificada de hechos de negocio y eventos de seguridad relevantes al documento. |
| **Ruta** | `/documentos/:id/historial` |
| **Fuentes** | `historial_documento` (eventos de negocio) + subconjunto de `auditoria` donde `entidad='documento'` y `entidad_id=:id` (visualización, descarga, exportaciones). |
| **Presentación** | Tarjetas cronológicas: icono por tipo, fecha/hora servidor, usuario, descripción, detalle expandible. |
| **Filtros** | Solo eventos de negocio / incluir auditoría técnica. |
| **Exportación** | **Exportar historial PDF** (permiso `documentos.exportar_historial`). |
| **Reglas** | No permitir edición ni borrado de eventos; solo compensación mediante nuevo evento “rectificación” *(opcional)*. |

---

#### 19. Bitácora de auditoría

| Aspecto | Detalle |
|---------|---------|
| **Objetivo** | Registrar acciones de seguridad y trazabilidad técnica para supervisión y auditorías internas. |
| **Actores** | Administrador, Auditor interno; Supervisor solo lectura de su ámbito si se parametriza. |
| **Ruta** | `/admin/auditoria` |
| **Filtros** | `fecha_desde/hasta`, `usuario_id`, `accion`, `resultado`, `entidad`, `ip`, `texto en detalle` (con cuidado de rendimiento). |
| **Columnas** | `creado_en`, `usuario`, `ip`, `accion`, `entidad`, `entidad_id`, `resultado`, `id_correlacion`. |
| **Botones** | **Buscar**, **Exportar CSV**, **Exportar PDF**, **Ver detalle JSON** *(solo admin, datos no sensibles)*. |
| **Seguridad** | Los registros no se eliminan; rotación/archivado en tabla histórica `auditoria_archivo` *(opcional)*; acceso fuertemente autenticado. |
| **ISO/ASVS** | ISO 27001 A.8.15; ASVS V7. |

---

#### 20. Módulo de reportes

| Aspecto | Detalle |
|---------|---------|
| **Objetivo** | Generar informes administrativos y de gestión documental con filtros y formatos exportables. |
| **Ruta** | `/reportes` |
| **UI** | Cuadrícula de tarjetas: cada reporte con descripción, ícono, filtros requeridos, roles autorizados. |
| **Flujo** | Selección → formulario de parámetros → **Vista previa** (tabla paginada) → **Exportar** (Excel/PDF). |
| **Botones** | **Generar vista previa**, **Exportar Excel**, **Exportar PDF**, **Programar envío por correo** *(fase 2)*. |
| **Persistencia** | Opcional: `reportes_ejecuciones` con usuario, parámetros, timestamp, para trazabilidad. |
| **Seguridad** | Filtros de dependencia aplicados en consulta; auditoría `REPORTE_GENERADO`. |

---

#### 21. Configuración general del sistema

| Aspecto | Detalle |
|---------|---------|
| **Objetivo** | Centralizar parámetros operativos y de seguridad sin redeploy de código. |
| **Ruta** | `/admin/configuracion` |
| **Secciones** | Seguridad (sesión, contraseñas), Archivos (extensiones, tamaño, cuarentena), Rendimiento (paginación máxima), Apariencia (logo institucional — rutas seguras), Mantenimiento (modo lectura). |
| **Campos (tabla `configuracion`)** | Ver subsección 21.1 más abajo. |
| **Botones** | **Guardar**, **Restaurar valores por defecto** (doble confirmación), **Probar envío de correo** (SMTP). |
| **Validaciones** | Rangos numéricos; JSON válido para listas de extensiones; `MAINTENANCE_MODE` solo modificable por rol `ADMIN_SEGURIDAD`. |
| **Efecto** | Invalidación de caché de configuración en API; usuarios activos mantienen sesión salvo cambios que fuercen re-login *(opcional)*. |

**21.1 Parámetros sugeridos (clave `configuracion.clave`)**

| Clave | Tipo | Ejemplo | Descripción |
|-------|------|---------|-------------|
| SESSION_TIMEOUT_MIN | int | 30 | Inactividad máxima |
| MAX_UPLOAD_MB | int | 25 | Tamaño máximo por archivo |
| ALLOWED_EXTENSIONS | json | `["pdf","jpg",...]` | Lista blanca |
| PASSWORD_MIN_LENGTH | int | 10 | Política de clave |
| LOGIN_MAX_ATTEMPTS | int | 5 | Antes de bloqueo |
| LOCKOUT_MINUTES | int | 15 | Duración bloqueo |
| MAINTENANCE_MODE | bool | false | Solo lectura |
| FORCE_HTTPS | bool | true | Redirección |

---

#### 22. Respaldo y recuperación

| Aspecto | Detalle |
|---------|---------|
| **Objetivo** | Documentar y registrar operaciones de copia de seguridad y pruebas de restauración para disponibilidad e integridad. |
| **Ruta** | `/admin/respaldo` |
| **UI — pestañas** | **Historial de jobs**, **Programación** *(solo lectura de cron si scripts externos)*, **Verificación**, **Runbook** (enlace a documento externo PDF interno). |
| **Campos de registro manual** *(opcional)* | `tipo`, `ubicacion`, `checksum`, `notas`, `ejecutado_por`. |
| **Botones** | **Registrar ejecución de respaldo** (formulario), **Adjuntar log**, **Marcar restauración de prueba OK** con fecha. |
| **Operación real** | mysqldump cifrado *(opcional)*, snapshot NAS, copia off-site *(supuesto)*; la UI no sustituye procedimientos del área de sistemas. |
| **Reglas** | RN de backup 3-2-1 documentado; responsable TI firma checklist trimestral *(supuesto institucional)*. |

---

#### 23. Gestión de sesiones

| Aspecto | Detalle |
|---------|---------|
| **Objetivo** | Permitir a administradores auditar sesiones activas y revocar accesos ante incidentes. |
| **Ruta** | `/admin/sesiones` |
| **Tabla** | `id_sesion`, `usuario`, `ip`, `user_agent`, `inicio`, `expira`, `activa`. |
| **Botones** | **Refrescar**, **Cerrar sesión seleccionada**, **Cerrar todas las sesiones de un usuario** (doble confirmación). |
| **Internamente** | Marca `sesiones.activa=0` o invalida refresh token en almacén; próximo request falla con 401. |
| **Auditoría** | `SESION_REVOCADA_ADMIN` con motivo obligatorio. |
| **Privacidad** | No mostrar token completo; truncar user agent. |

---

#### 24. Cierre de sesión seguro

| Aspecto | Detalle |
|---------|---------|
| **Objetivo** | Finalizar sesión en servidor y cliente eliminando artefactos sensibles. |
| **Ruta** | Acción global desde menú usuario; **no** requiere vista dedicada. |
| **Botón** | **Salir** / **Cerrar sesión** en barra superior. |
| **Flujo** | `POST /auth/logout` → invalida sesión/refresh → borra cookies HttpOnly `Path=/` → limpia `sessionStorage` (si se usó para UI) → `navigate('/login?logout=1')`. |
| **Mensajes** | “Sesión cerrada correctamente.”; si ya expiró: “Su sesión había expirado; ingrese nuevamente.” |
| **Seguridad** | Protección CSRF en POST; cabecera `Clear-Site-Data` opcional para cookies cache *(según navegador)*. |
| **Atajos de teclado** | *(Opcional)* `Ctrl+Shift+Q` para logout (configurable). |

---

## 13. Diseño detallado de navegación

### 13.1 Estructura del menú principal *(ejemplo)*

- Inicio (Dashboard)
- Documentos
  - Nuevo
  - Buscar
  - Mis pendientes
- Catálogos *(según rol)*
  - Tipos
  - Series / Subseries
- Reportes
- Administración *(admin)*
  - Usuarios
  - Roles
  - Dependencias
  - Configuración
  - Auditoría
  - Respaldo

### 13.2 Barra superior

Logo, nombre usuario, dependencia, notificaciones *(opcional)*, ayuda, cerrar sesión.

### 13.3 Panel lateral

Navegación colapsable; iconos + texto; resalta ruta activa.

### 13.4 Breadcrumbs

`Inicio > Documentos > Buscar > DOC-2026-000123`

### 13.5 Comportamiento por rol

Menú filtrado server-side (permisos en token + verificación en API).

### 13.6 Botones típicos — acción interna

| Botón | Validación previa | Resultado |
|-------|-------------------|-----------|
| Nuevo | permiso `crear` | Abre formulario limpio |
| Guardar | esquema + unicidad | Persiste; toast éxito |
| Editar | permiso + estado permite | Modo edición |
| Eliminar | permiso elevado + confirmación | Baja lógica + auditoría |
| Buscar | al menos un criterio o paginación | Lista |
| Filtrar | — | Refina consulta |
| Ver detalle | permiso lectura | Vista read-only |
| Cargar archivo | tipo/tamaño | Archivo en disco + BD |
| Descargar | permiso | Stream + auditoría |
| Aprobar | rol supervisor + estado | Cambia estado + historial |
| Rechazar | motivo obligatorio | Estado rechazado |
| Archivar | metadatos completos | Estado archivado |
| Restaurar | permiso | Revierte baja lógica documento |
| Exportar PDF/Excel | permiso reporte | Genera archivo |
| Imprimir | permiso | CSS print-friendly |
| Cerrar sesión | — | Invalidación |

---

## 14. Flujo de procesos del sistema

### 14.1 Registro de documento nuevo (extremo a extremo)

1. Usuario con permiso abre `/documentos/nuevo`.
2. Completa metadatos mínimos del borrador → Guardar → `documentos` INSERT estado `borrador`, historial “creado”.
3. Sube archivo → validaciones → archivo guardado → `archivos` + primera `documentos_versiones`.
4. Envía a revisión → validación campos → estado `en_revision`, notificación opcional al supervisor.
5. Supervisor aprueba → `aprobado`, sellado de fecha/actor en historial.
6. Gestor archiva → `archivado` si cumple reglas de completitud.

### 14.2 Consulta posterior

Usuario busca por filtros → abre detalle → sistema verifica ámbito → visualiza/descarga con auditoría.

### 14.3 Generación de reporte

Selección de informe → parámetros → consulta optimizada (índices) → render plantilla → exportación → registro en auditoría “reporte_generado”.

---

## 15. Reglas de negocio (conjunto amplio)

**RN-001** Un usuario solo consulta documentos de dependencias incluidas en su alcance salvo rol global de consulta.

**RN-002** Un documento no pasa a `archivado` sin: tipo, serie/subserie, fecha documento, responsable y al menos un archivo en versión vigente.

**RN-003** Extensiones permitidas: lista blanca en configuración (p. ej. pdf, jpg, png, tiff, docx, xlsx).

**RN-004** No eliminación física de documento sin rol `DOCUMENTOS_ELIMINAR_FISICO` y doble confirmación + registro jurídico *(supuesto)*.

**RN-005** Toda modificación de metadatos genera entrada en `historial_documento`.

**RN-006** Nombre de archivo interno no usa nombre original completo; se almacena nombre original en BD para mostrar.

**RN-007** Clasificación (tipo/serie/subserie) obligatoria antes de salir de `borrador` si política `CLASIFICACION_EN_BORRADOR=false`.

**RN-008** Sesión expira tras `SESSION_TIMEOUT_MIN` de inactividad.

**RN-009** Contraseñas: longitud ≥10, mayúscula, minúscula, número, especial *(ajustable)*.

**RN-010** Descarga masiva requiere permiso específico y genera auditoría por cada ítem o lote con ID de lote.

**RN-011** Usuario inactivo no puede autenticarse.

**RN-012** Roles conflictivos no se asignan simultáneamente si matriz lo prohíbe *(configurable)*.

**RN-013** Versiones: la vigente es la última `documentos_versiones` marcada; anteriores conservadas.

**RN-014** Supervisores no aprueban documentos de los que son únicos responsables si hay segregación *(opcional institucional)*.

**RN-015** Token de recuperación de un solo uso y caducidad máxima 30 minutos *(parametrizable)*.

---

## 16. Diseño de la base de datos

### 16.1 Modelo conceptual — entidades principales

Usuario, Rol, Permiso, Dependencia, Cargo, TipoDocumental, Serie, Subserie, Documento, VersionDocumento, Archivo, EstadoDocumento, HistorialDocumento, Auditoria, Sesion, Respaldo, Configuracion, Notificacion, RecuperacionCredencial, DocumentoMetadato (opcional).

### 16.2 Modelo lógico — relaciones

- Usuario **N:M** Rol mediante `usuario_rol`.
- Rol **N:M** Permiso mediante `rol_permiso`.
- Dependencia **1:N** Usuario.
- Serie **1:N** Subserie.
- Documento **N:1** Dependencia, Tipo, Serie, Subserie, Estado.
- Documento **1:N** Versiones; Versión **N:1** Archivo.
- Documento **1:N** Historial.

### 16.3 Modelo relacional — tablas (resumen de campos)

> **Nota:** Tipos orientativos para MySQL 8. Ajustar longitudes según volumen.

#### Tabla: `usuarios`

| Campo | Tipo | Nulo | PK/FK | Índices | Default |
|-------|------|------|-------|---------|---------|
| id | BIGINT | NO | PK | PK | AUTO_INCREMENT |
| usuario_login | VARCHAR(50) | NO | | UNIQUE | |
| correo | VARCHAR(150) | NO | | UNIQUE | |
| hash_password | VARCHAR(255) | NO | | | |
| nombres | VARCHAR(150) | NO | | | |
| apellidos | VARCHAR(150) | NO | | | |
| dependencia_id | BIGINT | NO | FK | IDX | |
| cargo_id | BIGINT | SÍ | FK | | |
| estado | ENUM('activo','inactivo') | NO | | IDX | 'activo' |
| debe_cambiar_clave | TINYINT(1) | NO | | | 0 |
| intentos_fallidos | INT | NO | | | 0 |
| bloqueado_hasta | DATETIME | SÍ | | | |
| creado_en | DATETIME | NO | | | CURRENT_TIMESTAMP |
| actualizado_en | DATETIME | NO | | | CURRENT_TIMESTAMP ON UPDATE |

#### Tabla: `roles`

| Campo | Tipo | Nulo | PK/FK |
|-------|------|------|-------|
| id | BIGINT | NO | PK |
| codigo | VARCHAR(50) | NO | UNIQUE |
| nombre | VARCHAR(100) | NO | | |
| descripcion | VARCHAR(255) | SÍ | | |

#### Tabla: `permisos`

| Campo | Tipo | Nulo | PK/FK |
|-------|------|------|-------|
| id | BIGINT | NO | PK |
| codigo | VARCHAR(80) | NO | UNIQUE |
| modulo | VARCHAR(50) | NO | | |
| descripcion | VARCHAR(255) | SÍ | | |

#### Tabla: `usuario_rol`

| Campo | Tipo | Nulo | PK/FK |
|-------|------|------|-------|
| usuario_id | BIGINT | NO | PK, FK usuarios |
| rol_id | BIGINT | NO | PK, FK roles |

#### Tabla: `rol_permiso`

| Campo | Tipo | Nulo | PK/FK |
|-------|------|------|-------|
| rol_id | BIGINT | NO | PK, FK roles |
| permiso_id | BIGINT | NO | PK, FK permisos |

#### Tabla: `dependencias`

| Campo | Tipo | Nulo | PK/FK |
|-------|------|------|-------|
| id | BIGINT | NO | PK |
| codigo | VARCHAR(20) | NO | UNIQUE |
| nombre | VARCHAR(200) | NO | | |
| padre_id | BIGINT | SÍ | FK self |
| activo | TINYINT(1) | NO | | 1 |

#### Tabla: `cargos`

| Campo | Tipo | Nulo | PK/FK |
|-------|------|------|-------|
| id | BIGINT | NO | PK |
| nombre | VARCHAR(150) | NO | | |

#### Tabla: `tipos_documentales`

| Campo | Tipo | Nulo | PK/FK |
|-------|------|------|-------|
| id | BIGINT | NO | PK |
| codigo | VARCHAR(30) | NO | UNIQUE |
| nombre | VARCHAR(200) | NO | | |
| retencion_anios | INT | SÍ | | |
| activo | TINYINT(1) | NO | | 1 |

#### Tabla: `series_documentales`

| Campo | Tipo | Nulo | PK/FK |
|-------|------|------|-------|
| id | BIGINT | NO | PK |
| codigo | VARCHAR(30) | NO | UNIQUE |
| nombre | VARCHAR(200) | NO | | |
| tipo_documental_id | BIGINT | SÍ | FK |

#### Tabla: `subseries_documentales`

| Campo | Tipo | Nulo | PK/FK |
|-------|------|------|-------|
| id | BIGINT | NO | PK |
| serie_id | BIGINT | NO | FK series |
| codigo | VARCHAR(30) | NO | | |
| nombre | VARCHAR(200) | NO | | |
| UNIQUE(serie_id, codigo) | | | | |

#### Tabla: `estados_documento`

| Campo | Tipo | Nulo | PK/FK |
|-------|------|------|-------|
| id | BIGINT | NO | PK |
| codigo | VARCHAR(30) | NO | UNIQUE |
| nombre | VARCHAR(100) | NO | | |

#### Tabla: `documentos`

| Campo | Tipo | Nulo | PK/FK |
|-------|------|------|-------|
| id | BIGINT | NO | PK |
| codigo_interno | VARCHAR(50) | NO | UNIQUE |
| titulo | VARCHAR(500) | NO | | |
| tipo_documental_id | BIGINT | NO | FK |
| serie_id | BIGINT | NO | FK |
| subserie_id | BIGINT | SÍ | FK |
| dependencia_id | BIGINT | NO | FK |
| estado_id | BIGINT | NO | FK estados |
| fecha_documento | DATE | NO | | |
| numero_oficio | VARCHAR(100) | SÍ | | |
| remitente | VARCHAR(200) | SÍ | | |
| destinatario | VARCHAR(200) | SÍ | | |
| palabras_clave | TEXT | SÍ | FULLTEXT opcional | |
| responsable_id | BIGINT | SÍ | FK usuarios |
| creado_por | BIGINT | NO | FK usuarios |
| creado_en | DATETIME | NO | | |
| actualizado_en | DATETIME | NO | | |
| eliminado_logico | TINYINT(1) | NO | IDX | 0 |

#### Tabla: `documentos_versiones`

| Campo | Tipo | Nulo | PK/FK |
|-------|------|------|-------|
| id | BIGINT | NO | PK |
| documento_id | BIGINT | NO | FK documentos |
| numero_version | INT | NO | | |
| archivo_id | BIGINT | NO | FK archivos |
| motivo_cambio | VARCHAR(255) | SÍ | | |
| creado_por | BIGINT | NO | FK |
| creado_en | DATETIME | NO | | |
| UNIQUE(documento_id, numero_version) | | | | |

#### Tabla: `archivos`

| Campo | Tipo | Nulo | PK/FK |
|-------|------|------|-------|
| id | BIGINT | NO | PK |
| nombre_original | VARCHAR(255) | NO | | |
| mime_type | VARCHAR(120) | NO | | |
| tamano_bytes | BIGINT | NO | | |
| ruta_almacenamiento | VARCHAR(500) | NO | | |
| hash_sha256 | CHAR(64) | NO | INDEX | |
| creado_en | DATETIME | NO | | |

#### Tabla: `historial_documento`

| Campo | Tipo | Nulo | PK/FK |
|-------|------|------|-------|
| id | BIGINT | NO | PK |
| documento_id | BIGINT | NO | FK |
| evento | VARCHAR(80) | NO | | |
| detalle | TEXT | SÍ | | |
| usuario_id | BIGINT | SÍ | FK |
| creado_en | DATETIME | NO | INDEX | |

#### Tabla: `auditoria`

| Campo | Tipo | Nulo | PK/FK |
|-------|------|------|-------|
| id | BIGINT | NO | PK |
| usuario_id | BIGINT | SÍ | FK |
| ip | VARCHAR(45) | SÍ | | |
| accion | VARCHAR(80) | NO | INDEX | |
| entidad | VARCHAR(80) | SÍ | | |
| entidad_id | BIGINT | SÍ | | |
| resultado | ENUM('ok','denegado','error') | NO | | |
| detalle | TEXT | SÍ | | |
| creado_en | DATETIME | NO | INDEX | |

#### Tabla: `sesiones`

| Campo | Tipo | Nulo | PK/FK |
|-------|------|------|-------|
| id | VARCHAR(128) | NO | PK |
| usuario_id | BIGINT | NO | FK |
| ip | VARCHAR(45) | SÍ | | |
| user_agent | VARCHAR(255) | SÍ | | |
| creado_en | DATETIME | NO | | |
| expira_en | DATETIME | NO | INDEX | |
| activa | TINYINT(1) | NO | | 1 |

#### Tabla: `respaldos`

| Campo | Tipo | Nulo | PK/FK |
|-------|------|------|-------|
| id | BIGINT | NO | PK |
| tipo | ENUM('bd','archivos','completo') | NO | | |
| iniciado_en | DATETIME | NO | | |
| finalizado_en | DATETIME | SÍ | | |
| estado | ENUM('en_proceso','ok','fallo') | NO | | |
| ubicacion | VARCHAR(500) | SÍ | | |
| checksum | VARCHAR(128) | SÍ | | |
| tamano_bytes | BIGINT | SÍ | | |
| mensaje_error | TEXT | SÍ | | |

#### Tabla: `configuracion`

| Campo | Tipo | Nulo | PK/FK |
|-------|------|------|-------|
| clave | VARCHAR(80) | NO | PK |
| valor | TEXT | NO | | |
| tipo_dato | ENUM('string','int','bool','json') | NO | | |
| descripcion | VARCHAR(255) | SÍ | | |

#### Tabla: `notificaciones`

| Campo | Tipo | Nulo | PK/FK |
|-------|------|------|-------|
| id | BIGINT | NO | PK |
| usuario_id | BIGINT | NO | FK |
| titulo | VARCHAR(200) | NO | | |
| cuerpo | TEXT | SÍ | | |
| leida | TINYINT(1) | NO | | 0 |
| creado_en | DATETIME | NO | | |

#### Tabla: `recuperacion_credenciales`

| Campo | Tipo | Nulo | PK/FK |
|-------|------|------|-------|
| id | BIGINT | NO | PK |
| usuario_id | BIGINT | NO | FK |
| token_hash | CHAR(64) | NO | INDEX |
| expira_en | DATETIME | NO | | |
| usado | TINYINT(1) | NO | | 0 |
| creado_en | DATETIME | NO | | |

#### Tabla opcional: `documento_metadatos`

| Campo | Tipo | Nulo | PK/FK |
|-------|------|------|-------|
| id | BIGINT | NO | PK |
| documento_id | BIGINT | NO | FK |
| clave | VARCHAR(80) | NO | | |
| valor | TEXT | SÍ | | |
| UNIQUE(documento_id, clave) | | | | |

### 16.4 Relaciones (resumen)

- `usuarios` **N:1** `dependencias`
- `documentos` **N:1** `tipos_documentales`, `series_documentales`, `estados_documento`
- `documentos_versiones` **N:1** `documentos`, **N:1** `archivos`
- `usuario_rol` resuelve **N:M** usuarios-roles; `rol_permiso` resuelve roles-permisos

### 16.5 Diccionario de datos

#### 16.5.1 Entidad `usuarios`

| Atributo | Tipo lógico | Significado / uso | Reglas |
|----------|---------------|-------------------|--------|
| id | entero largo | Surrogate key interno | No expuesto en URLs sin autorización |
| usuario_login | texto | Cuenta para ingreso | Único, sin espacios |
| correo | texto | Comunicación y recuperación | Único, validado |
| hash_password | texto | Secreto irreversible | Nunca retornar por API |
| dependencia_id | FK | Ámbito organizacional | Obligatorio para alcance documental |
| estado | enum | activo/inactivo | Inactivo bloquea login |
| intentos_fallidos | entero | Control de fuerza bruta | Reset en login OK |
| bloqueado_hasta | fecha/hora | Ventana de lockout | NULL si no bloqueado |

#### 16.5.2 Entidad `documentos`

| Atributo | Significado | Reglas |
|----------|-------------|--------|
| codigo_interno | Clave humana tipo DOC-AAAA-NNNNNN | Generado por secuencia o función BD; inmutable |
| titulo | Descripción breve del asunto | Obligatorio; indexado FULLTEXT opcional |
| estado_id | Punto del flujo | Transiciones solo vía `WorkflowService` |
| eliminado_logico | Baja lógica | No visible en consultas estándar |
| responsable_id | Funcionario responsable del trámite | Puede cambiar con historial |

#### 16.5.3 Entidad `archivos`

| Atributo | Significado | Reglas |
|----------|-------------|--------|
| ruta_almacenamiento | Ruta interna no pública | Sin `..` ni caracteres de control |
| hash_sha256 | Huella de integridad | Recalcular al restaurar desde backup |
| mime_type | Tipo declarado | Contrastar con firma mágica del archivo |

#### 16.5.4 Entidad `auditoria`

| Atributo | Significado | Reglas |
|----------|-------------|--------|
| accion | Código normalizado | Catálogo cerrado en código (enum servidor) |
| resultado | ok/denegado/error | Obligatorio para métricas de seguridad |
| detalle | Contexto no sensible | No PII innecesaria; truncar payloads |

#### 16.5.5 Catálogo sugerido de valores `auditoria.accion`

| Código | Descripción |
|--------|-------------|
| LOGIN_OK | Autenticación exitosa |
| LOGIN_FAIL | Fallo de credenciales |
| LOGOUT | Cierre de sesión |
| DOC_CREAR | Alta de documento |
| DOC_VER | Apertura de ficha o visor |
| DOC_DESCARGAR | Descarga de archivo |
| ARCHIVO_SUBIR | Carga exitosa |
| ROL_EDITAR | Cambio de permisos |
| CONFIG_EDITAR | Cambio de parámetro sensible |
| RESPALDO_REGISTRAR | Registro de job de backup |

### 16.6 Script SQL propuesto (tablas principales)

```sql
CREATE TABLE dependencias (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  codigo VARCHAR(20) NOT NULL UNIQUE,
  nombre VARCHAR(200) NOT NULL,
  padre_id BIGINT NULL,
  activo TINYINT(1) NOT NULL DEFAULT 1,
  CONSTRAINT fk_dep_padre FOREIGN KEY (padre_id) REFERENCES dependencias(id),
  INDEX idx_dep_padre (padre_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE cargos (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  nombre VARCHAR(150) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE usuarios (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  usuario_login VARCHAR(50) NOT NULL UNIQUE,
  correo VARCHAR(150) NOT NULL UNIQUE,
  hash_password VARCHAR(255) NOT NULL,
  nombres VARCHAR(150) NOT NULL,
  apellidos VARCHAR(150) NOT NULL,
  dependencia_id BIGINT NOT NULL,
  cargo_id BIGINT NULL,
  estado ENUM('activo','inactivo') NOT NULL DEFAULT 'activo',
  intentos_fallidos INT NOT NULL DEFAULT 0,
  bloqueado_hasta DATETIME NULL,
  creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_usu_dep FOREIGN KEY (dependencia_id) REFERENCES dependencias(id),
  CONSTRAINT fk_usu_cargo FOREIGN KEY (cargo_id) REFERENCES cargos(id),
  INDEX idx_usu_dep (dependencia_id),
  INDEX idx_usu_estado (estado)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Catálogos y seguridad (orden sugerido tras dependencias/usuarios base)

CREATE TABLE roles (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  codigo VARCHAR(50) NOT NULL UNIQUE,
  nombre VARCHAR(100) NOT NULL,
  descripcion VARCHAR(255) NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE permisos (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  codigo VARCHAR(80) NOT NULL UNIQUE,
  modulo VARCHAR(50) NOT NULL,
  descripcion VARCHAR(255) NULL,
  INDEX idx_perm_mod (modulo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE usuario_rol (
  usuario_id BIGINT NOT NULL,
  rol_id BIGINT NOT NULL,
  PRIMARY KEY (usuario_id, rol_id),
  CONSTRAINT fk_ur_u FOREIGN KEY (usuario_id) REFERENCES usuarios(id),
  CONSTRAINT fk_ur_r FOREIGN KEY (rol_id) REFERENCES roles(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE rol_permiso (
  rol_id BIGINT NOT NULL,
  permiso_id BIGINT NOT NULL,
  PRIMARY KEY (rol_id, permiso_id),
  CONSTRAINT fk_rp_r FOREIGN KEY (rol_id) REFERENCES roles(id),
  CONSTRAINT fk_rp_p FOREIGN KEY (permiso_id) REFERENCES permisos(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE estados_documento (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  codigo VARCHAR(30) NOT NULL UNIQUE,
  nombre VARCHAR(100) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE tipos_documentales (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  codigo VARCHAR(30) NOT NULL UNIQUE,
  nombre VARCHAR(200) NOT NULL,
  retencion_anios INT NULL,
  activo TINYINT(1) NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE series_documentales (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  codigo VARCHAR(30) NOT NULL UNIQUE,
  nombre VARCHAR(200) NOT NULL,
  tipo_documental_id BIGINT NULL,
  CONSTRAINT fk_ser_tipo FOREIGN KEY (tipo_documental_id) REFERENCES tipos_documentales(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE subseries_documentales (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  serie_id BIGINT NOT NULL,
  codigo VARCHAR(30) NOT NULL,
  nombre VARCHAR(200) NOT NULL,
  UNIQUE KEY uk_subserie (serie_id, codigo),
  CONSTRAINT fk_sub_ser FOREIGN KEY (serie_id) REFERENCES series_documentales(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE archivos (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  nombre_original VARCHAR(255) NOT NULL,
  mime_type VARCHAR(120) NOT NULL,
  tamano_bytes BIGINT NOT NULL,
  ruta_almacenamiento VARCHAR(500) NOT NULL,
  hash_sha256 CHAR(64) NOT NULL,
  creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_arch_hash (hash_sha256)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE documentos (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  codigo_interno VARCHAR(50) NOT NULL UNIQUE,
  titulo VARCHAR(500) NOT NULL,
  tipo_documental_id BIGINT NOT NULL,
  serie_id BIGINT NOT NULL,
  subserie_id BIGINT NULL,
  dependencia_id BIGINT NOT NULL,
  estado_id BIGINT NOT NULL,
  fecha_documento DATE NOT NULL,
  numero_oficio VARCHAR(100) NULL,
  remitente VARCHAR(200) NULL,
  destinatario VARCHAR(200) NULL,
  palabras_clave TEXT NULL,
  responsable_id BIGINT NULL,
  creado_por BIGINT NOT NULL,
  creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  eliminado_logico TINYINT(1) NOT NULL DEFAULT 0,
  CONSTRAINT fk_doc_tipo FOREIGN KEY (tipo_documental_id) REFERENCES tipos_documentales(id),
  CONSTRAINT fk_doc_serie FOREIGN KEY (serie_id) REFERENCES series_documentales(id),
  CONSTRAINT fk_doc_sub FOREIGN KEY (subserie_id) REFERENCES subseries_documentales(id),
  CONSTRAINT fk_doc_dep FOREIGN KEY (dependencia_id) REFERENCES dependencias(id),
  CONSTRAINT fk_doc_est FOREIGN KEY (estado_id) REFERENCES estados_documento(id),
  CONSTRAINT fk_doc_resp FOREIGN KEY (responsable_id) REFERENCES usuarios(id),
  CONSTRAINT fk_doc_creador FOREIGN KEY (creado_por) REFERENCES usuarios(id),
  INDEX idx_doc_dep_fecha (dependencia_id, fecha_documento),
  INDEX idx_doc_estado (estado_id),
  FULLTEXT KEY ft_doc_titulo (titulo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE documentos_versiones (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  documento_id BIGINT NOT NULL,
  numero_version INT NOT NULL,
  archivo_id BIGINT NOT NULL,
  motivo_cambio VARCHAR(255) NULL,
  creado_por BIGINT NOT NULL,
  creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_doc_ver (documento_id, numero_version),
  CONSTRAINT fk_dv_doc FOREIGN KEY (documento_id) REFERENCES documentos(id),
  CONSTRAINT fk_dv_arch FOREIGN KEY (archivo_id) REFERENCES archivos(id),
  CONSTRAINT fk_dv_u FOREIGN KEY (creado_por) REFERENCES usuarios(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE historial_documento (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  documento_id BIGINT NOT NULL,
  evento VARCHAR(80) NOT NULL,
  detalle TEXT NULL,
  usuario_id BIGINT NULL,
  creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_hist_doc_fecha (documento_id, creado_en),
  CONSTRAINT fk_hd_doc FOREIGN KEY (documento_id) REFERENCES documentos(id),
  CONSTRAINT fk_hd_u FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE auditoria (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  usuario_id BIGINT NULL,
  ip VARCHAR(45) NULL,
  accion VARCHAR(80) NOT NULL,
  entidad VARCHAR(80) NULL,
  entidad_id BIGINT NULL,
  resultado ENUM('ok','denegado','error') NOT NULL,
  detalle TEXT NULL,
  creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_aud_fecha (creado_en),
  INDEX idx_aud_accion (accion),
  CONSTRAINT fk_aud_u FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE recuperacion_credenciales (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  usuario_id BIGINT NOT NULL,
  token_hash CHAR(64) NOT NULL,
  expira_en DATETIME NOT NULL,
  usado TINYINT(1) NOT NULL DEFAULT 0,
  creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_rec_token (token_hash),
  CONSTRAINT fk_rec_u FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE respaldos (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  tipo ENUM('bd','archivos','completo') NOT NULL,
  iniciado_en DATETIME NOT NULL,
  finalizado_en DATETIME NULL,
  estado ENUM('en_proceso','ok','fallo') NOT NULL,
  ubicacion VARCHAR(500) NULL,
  checksum VARCHAR(128) NULL,
  tamano_bytes BIGINT NULL,
  mensaje_error TEXT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE configuracion (
  clave VARCHAR(80) PRIMARY KEY,
  valor TEXT NOT NULL,
  tipo_dato ENUM('string','int','bool','json') NOT NULL,
  descripcion VARCHAR(255) NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

**Notas de despliegue:** Usar **migraciones Prisma** (`prisma migrate`) respetando dependencias FK; alternativa puntual: scripts SQL manuales alineados al `schema.prisma`. Agregar tablas `sesiones`, `notificaciones`, `documento_metadatos` y seeds de `estados_documento`/`permisos` en scripts posteriores. Los índices FULLTEXT requieren InnoDB compatible y plan de mantenimiento (fragmentación).

### 16.7 Integridad y normalización

- **3FN** en catálogos y entidades maestras; redundancia controlada en vistas/materializadas para reportes.
- **Integridad referencial** ON DELETE RESTRICT en maestros; soft delete en documentos.
- **Consistencia de metadatos** mediante transacciones al crear versión + archivo.

### 16.8 Tablas mínimas sugeridas

Todas las listadas en 16.3 cumplen el mínimo solicitado; `documento_metadatos` y `clasificaciones` (si se prefiere tabla separada) son extensiones justificadas por flexibilidad de indexación.

---

## 17. Diseño de formularios y campos

### 17.1 Convenciones transversales

| Convención | Descripción |
|------------|-------------|
| Etiquetas | Siempre visibles; `*` en obligatorios |
| Ayuda | Tooltip con ejemplo de formato válido |
| Validación | Cliente (UX inmediata) + servidor (fuente de verdad) |
| Errores | Debajo del campo y resumen al pie del formulario |
| Deshabilitado | Campos no editables según estado del documento o rol (con texto “solo lectura por permiso”) |
| CSRF | Token en todos los POST que mutan estado |

### 17.2 Formulario “Documento — Alta / Edición”

| Campo | Control UI | Tipo | Obligatorio | Validación | Mensaje de error típico |
|-------|-------------|------|-------------|------------|-------------------------|
| titulo | Input texto | string 500 | Sí | No vacío; sin solo espacios | “Ingrese el asunto o título del documento.” |
| tipo_documental_id | Select | FK | Sí | Catálogo activo | “Seleccione un tipo documental.” |
| serie_id | Select | FK | Sí | Pertenece al tipo | “Seleccione la serie documental.” |
| subserie_id | Select | FK | No* | *Obligatoria si la serie tiene subseries activas | “Seleccione la subserie.” |
| dependencia_id | Select | FK | Sí | Ámbito permitido al usuario | “Seleccione la dependencia.” |
| fecha_documento | DatePicker | date | Sí | ≤ fecha sistema salvo política de fechas históricas | “La fecha del documento no es válida.” |
| numero_oficio | Input | string 100 | Según tipo | Máscara institucional | “El número de oficio no cumple el formato.” |
| remitente / destinatario | Input | string 200 | Según tipo | Longitud mínima si aplica | “Complete el remitente.” |
| palabras_clave | Textarea o tags | text | Recomendado | Máx. términos | “Reduzca la cantidad de palabras clave.” |
| responsable_id | Select usuarios | FK | No en borrador / Sí al archivar | Usuario activo | “Asigne un responsable.” |

**Botones:** `Guardar borrador` (validación mínima), `Enviar a revisión` (validación extendida), `Cancelar` (confirma si hay cambios sin guardar).

**Procesamiento:** `PUT/POST` API → validación esquema → transacción → `historial_documento` + respuesta DTO sin datos internos de BD.

### 17.3 Formulario “Usuario — Alta / Edición”

| Campo | Validación | Notas |
|-------|------------|-------|
| usuario_login | Regex `^[a-zA-Z0-9._-]{3,50}$` | Inmutable tras crear *(o solo admin con auditoría)* |
| correo | Email RFC simplificado | Único |
| roles | ≥1 rol | Matriz de conflictos |
| dependencia_id | FK obligatorio | Determina alcance |
| estado | activo/inactivo | Inactivo cierra sesiones |

**Botón “Restablecer contraseña”:** abre modal con opción “forzar cambio en próximo login”.

### 17.4 Formulario “Rol — Permisos”

| Elemento | Descripción |
|----------|-------------|
| nombre | string 100 |
| permisos | Matriz agrupada por módulo con checkbox “seleccionar grupo” |
| Validación | Al menos un permiso si el rol no es “solo lectura de auditoría vacío” *(definir política)* |

### 17.5 Formulario “Dependencia”

| Campo | Validación |
|-------|--------------|
| codigo | Único, mayúsculas, sin espacios |
| padre_id | No autoreferencia circular (validar en servicio con recorrido de árbol) |

### 17.6 Formulario “Tipos / Series / Subseries”

| Campo | Validación |
|-------|--------------|
| codigo | Único en su nivel |
| nombre | No duplicado lógico (advertencia si existe similar) |

**Dependencias en cascada:** al cambiar `tipo_documental`, limpiar `serie` y `subserie` seleccionados.

### 17.7 Formulario “Búsqueda avanzada”

| Campo | Comportamiento |
|-------|----------------|
| texto | Debounce 300 ms; mínimo 3 caracteres si es único filtro |
| fechas | `fecha_desde` ≤ `fecha_hasta` |
| exportar | Solo si ≤ N filas *(configurable)* o con confirmación de “consulta pesada” |

### 17.8 Formulario “Recuperación de contraseña — Paso 1”

| Campo | Validación |
|-------|------------|
| correo | Formato; **no** indicar si existe en BD |

### 17.9 Formulario “Recuperación — Paso 2”

| Campo | Validación |
|-------|------------|
| nueva_clave / confirmación | Igualdad; política PASSWORD_POLICY |
| token | En URL; validado servidor antes de mostrar formulario |

### 17.10 Formulario “Configuración global”

| Campo | Validación |
|-------|------------|
| SESSION_TIMEOUT_MIN | 5–480 |
| MAX_UPLOAD_MB | 1–config hardware |
| ALLOWED_EXTENSIONS | JSON array no vacío |

---

## 18. Reportes del sistema

| Código | Objetivo | Filtros | Columnas principales | Fuente | Formato | Periodicidad *(tesis)* | Rol |
|--------|----------|---------|----------------------|--------|---------|-------------------------|-----|
| RPT-INV-01 | Inventario documental | Dependencia, fechas | Código, título, tipo, estado, responsable | documentos+joins | Excel/PDF | Bajo demanda / defensa | Gestor, Admin |
| RPT-AREA-01 | Documentos por área | Área, rango fechas | Conteos por estado | agregación SQL | Excel | Bajo demanda | Supervisor |
| RPT-TIPO-01 | Por tipo documental | Tipo, fechas | Cantidad, tamaño total archivos | joins | Excel | Bajo demanda | Gestor |
| RPT-EST-01 | Por estado | Estado | Listado | documentos | PDF | Bajo demanda | Auditor |
| RPT-MOV-01 | Historial de movimientos | Documento ID | Línea de tiempo exportada | historial_documento | PDF | Bajo demanda | Gestor |
| RPT-USR-01 | Usuarios activos | — | Usuario, último acceso | usuarios/sesiones | Excel | Bajo demanda | Admin |
| RPT-AUD-01 | Auditoría de accesos | Usuario, fechas, acción | Fecha, IP, resultado | auditoria | CSV/PDF | Bajo demanda | Auditor |
| RPT-CARGA-01 | Carga documental | Usuario, fechas | # archivos, MB | archivos | Excel | Bajo demanda | Admin |
| RPT-BAK-01 | Respaldos | Estado, fechas | Job, checksum, éxito | respaldos | PDF | Bajo demanda / evidencia memoria | Admin |

*En tesis no se exige periodicidad institucional (mensual/trimestral); basta demostrar que el reporte **funciona** sobre datos de prueba.*

---

## 19. Seguridad del sistema

| Control | Implementación | Referencia |
|---------|----------------|------------|
| Autenticación | Argon2id/bcrypt, política de claves | ASVS V2, ISO 27001 A.5.17 |
| Sesiones | Timeout, rotación, invalidación | ASVS V3, ISO 27001 A.8 |
| CSRF | Token synchronizer en formularios/API | ASVS V4 |
| XSS | Escapado contextual, CSP | ASVS V5 |
| SQLi | Consultas parametrizadas/ORM | ASVS V5 |
| Archivos | Lista blanca, tamaño, AV, almacenamiento fuera de webroot | ASVS V12 |
| Errores | Mensajes genéricos, logs internos | ASVS V7 |
| Auditoría | Eventos completos, reloj NTP | ISO 27001 A.8.15, ASVS V7 |
| HTTPS intranet | TLS 1.2+ interno | ISO 27001 A.8.24 |
| Respaldo | 3-2-1 documentado | ISO 27001 A.8.13 |
| Integridad documental | Hash SHA-256 | ISO 15489 |

**Nota (tesis):** La tabla resume el **objetivo de diseño**. Controles exigentes (NTP en todos los nodos, DLP, SIEM) **no** son obligatorios en el prototipo; deben citarse en **limitaciones y trabajo futuro** de la memoria.

---

## 20. Diseño de experiencia de usuario e interfaz

- **Consistencia:** Paleta institucional *(supuesto: azules/grises sobrios)*, tipografía legible 14–16 px cuerpo.
- **Accesibilidad:** Contraste WCAG AA objetivo; foco visible; etiquetas en inputs.
- **Confirmaciones:** Eliminar, rechazar, archivar siempre con modal.
- **Errores:** Texto claro, sin stack trace; código de correlación.
- **Jerarquía:** Título de página, subtítulo contextual, acciones primarias a la derecha en barras de herramientas.

---

## 21. Diseño de pruebas

### 21.1 Plan por tipo *(alcance tesis)*

- **Funcionales:** recorridos principales por RF priorizados (login, CRUD documento, carga, búsqueda, permisos).
- **Seguridad:** pruebas manuales y/o checklist OWASP ASVS aplicable; **OWASP ZAP** u otra herramienta automatizada **recomendada pero opcional** si el tiempo lo permite (documentar si no se ejecuta).
- **Validación de formularios y permisos:** casos positivos y negativos representativos.
- **Archivos:** límite de tamaño, extensión no permitida, integridad hash.
- **Reportes:** generación correcta sobre dataset de prueba.
- **Respaldo:** al menos una restauración de BD o copia de `storage/` documentada.
- **Sesión:** timeout y cierre de sesión.

### 21.2 Casos de prueba (ejemplos)

| Código | Objetivo | Precondición | Pasos | Resultado esperado |
|--------|----------|--------------|-------|---------------------|
| CP-AUTH-01 | Login válido | Usuario activo | POST credenciales correctas | 200, cookie/token, auditoría LOGIN_OK |
| CP-AUTH-02 | Bloqueo | Usuario existe | N intentos fallidos | 401, bloqueo temporal, auditoría |
| CP-AUTH-03 | Usuario inactivo | Usuario inactivo | POST login válido histórico | 401 genérico, sin filtrar motivo |
| CP-AUTH-04 | Recuperación OK | Token válido | POST nueva clave | 200, token usado=1, login posible |
| CP-AUTH-05 | Token expirado | Token caducado | GET restablecer | Página error “Enlace inválido o expirado” |
| CP-DOC-01 | Crear borrador | Permiso crear | Guardar mínimos | documento en BD estado borrador |
| CP-DOC-02 | Archivar sin datos | Doc incompleto | Archivar | 400, mensaje validación |
| CP-DOC-03 | Transición inválida | Estado borrador | Aprobar sin revisión | 400 “Transición no permitida” |
| CP-DOC-04 | Versión nueva | Doc en revisión | Subir archivo con motivo | INSERT versión N+1, historial OK |
| CP-PERM-01 | Acceso cruzado | Usuario área A | GET documento área B | 403 denegado |
| CP-PERM-02 | Escalación URL | Sin permiso descarga | GET URL directa API descarga | 403 + auditoría denegado |
| CP-UP-01 | Archivo peligroso | Permiso carga | Subir .exe renombrado | Rechazo por MIME/lista blanca |
| CP-UP-02 | Tamaño excedido | MAX_UPLOAD_MB=25 | Subir 30 MB | 413/400 con mensaje configurado |
| CP-UP-03 | Integridad | Archivo OK | Comparar hash SHA-256 almacenado vs archivo en disco | Coinciden |
| CP-SES-01 | Timeout | Sesión activa | Esperar inactividad | Redirección login |
| CP-SES-02 | Logout | Sesión activa | POST logout + reutilizar token | 401 en siguiente request |
| CP-AUD-01 | Trazabilidad descarga | Doc existente | Descargar | Fila auditoría DOC_DESCARGAR con archivo_id |
| CP-REP-01 | Reporte pesado | >100k filas | Exportar sin filtro | Advertencia o paginación obligatoria |
| CP-BAK-01 | Registro respaldo | Rol admin | Registrar job OK | Fila en `respaldos` estado ok |
| CP-CSRF-01 | CSRF | Sesión válida | POST sin token | 403/419 según diseño API |
| CP-XSS-01 | XSS almacenado | Campo título | Insertar `<script>` | Escapado en listado; no ejecución |

### 21.3 Criterios de aceptación global *(tesis)*

- Los **RF críticos** acordados con el director (autenticación, RBAC, registro/carga documental, auditoría mínima) tienen **al menos un** caso de prueba positivo y, cuando aplique, uno negativo.
- Herramientas automatizadas de seguridad: **deseables**; si no se usan, documentar **pruebas manuales** y checklist.
- **Al menos una** evidencia de copia/restauración de BD o de datos de demostración.

---

## 22. Plan de implementación

**Ámbito:** entorno del tesista (PC **Windows** con **XAMPP** + **ngrok** según se describe), no producción institucional.

1. **Preparación:** instalar **Node.js** LTS, **Git**, **XAMPP** y **ngrok** (cuenta ngrok si se requiere authtoken). Clonar repositorio.
2. **Base de datos (XAMPP):** abrir el panel de XAMPP e iniciar **MySQL**. Crear la base de datos vacía (phpMyAdmin o `mysql` CLI). Configurar **`DATABASE_URL`** en `.env` apuntando a `localhost:3306` con usuario/clave de XAMPP (p. ej. `root` solo en desarrollo local). Ejecutar **`npx prisma migrate dev`** (o `prisma db push` en arranque inicial) y seeds si existen.
3. **Backend:** `npm install`, variables `JWT`, CORS (origen del Vite `http://localhost:5173` y, si se usa ngrok, el origen HTTPS que entregue ngrok). Ejecutar `npm run start:dev` (puerto 3000 u otro definido).
4. **Frontend:** `npm run dev` (Vite). Configurar la URL base de la API en variable de entorno (p. ej. `VITE_API_URL=http://localhost:3000/api/v1`).
5. **ngrok (cuando se necesite demo remota):** en terminal aparte, `ngrok http 3000` (API) o el puerto que corresponda; actualizar CORS en NestJS con la URL https de ngrok si el front también se accede por túnel. Documentar en README que la URL ngrok es **temporal**.
6. **Almacenamiento:** carpeta `storage/` con permisos escritura para el proceso Node; no exponer como estáticos públicos.
7. **Opcional:** Nginx solo si se deja de usar ngrok y se despliega en máquina con TLS local; **Docker Compose** como alternativa a XAMPP *(no es la línea base)*.
8. **Pruebas finales:** checklist del capítulo 21 sobre el entorno de demo.
9. **Entrega académica:** repositorio + README con pasos **XAMPP + Prisma + ngrok** + capturas o video de demostración.

**Control de cambios:** ramas Git, commits con mensajes claros, etiqueta de versión para la entrega de grado.

---

## 23. Plan de mantenimiento

En un **proyecto de tesis**, el “mantenimiento” posterior al grado **no** está garantizado. Esta sección se interpreta como:

- **Durante el desarrollo:** commits frecuentes, backups locales del código y de la BD de prueba.
- **Tras la defensa:** el prototipo puede quedar como **referencia**; el **mantenimiento evolutivo** (parches, dependencias, despliegue institucional) se describe como **líneas futuras** en conclusiones.
- **Si se continúa el proyecto:** entonces aplicar prácticas preventivas (logs, espacio en disco, actualizar dependencias con cuidado) y correctivas según necesidad.

*Las obligaciones de SLA, mesa 24/7 y parches corporativos **no aplican** al alcance de titulación.*

---

## 24. Riesgos del proyecto y mitigación *(enfoque tesis)*

| Riesgo | Impacto | Prob. | Mitigación |
|--------|---------|-------|------------|
| **Alcance excesivo (scope creep)** | Alto | Alta | MVP acordado con director; priorizar módulos del cap. 12; diferir “nice to have” a anexos futuros. |
| **Tiempo insuficiente** | Alto | Media | Cronograma con buffer (§8.5); entregas incrementales; prototipo “vertical” antes que pantallas perfectas. |
| **Solo un desarrollador** | Medio | Alta | Reutilizar plantillas (UI), ORM, código documentado; no microservicios innecesarios. |
| **Falta de datos o contacto institucional** | Medio | Media | Usar **datos ficticios** realistas; el GADPR-LM como referencia de dominio sin depender de integración real. |
| **Fallo de equipo o pérdida de BD de prueba** | Alto | Media | Git + dumps periódicos de MySQL + copia de `storage/` en nube o segundo disco. |
| **Complejidad de seguridad** | Medio | Media | Implementar controles base (hash, JWT, RBAC, validación); documentar el resto como limitación y trabajo futuro. |
| **Disponibilidad del director** | Medio | Baja | Reuniones agendadas con agenda escrita. |
| **XAMPP / puerto 3306 ocupado o MySQL no inicia** | Medio | Media | Verificar que no haya otro MySQL en el PC; revisar logs de XAMPP; cambiar puerto en XAMPP y en `DATABASE_URL` de forma coherente. |
| **ngrok (URL cambiante, CORS, sesión)** | Bajo | Media | Documentar en README la URL ngrok del día; añadir origen ngrok en CORS; no depender de ngrok para desarrollo diario (localhost). |

*(Los riesgos típicos de producción institucional — resistencia al cambio, DLP corporativo— se trasladan a **trabajo futuro** si el sistema se adoptara.)*

---

## 25. Conclusiones y recomendaciones técnicas

El SGD-GADPR-LM como **caso de estudio** demuestra que es **viable** plantear un **prototipo** de gestión documental alineado con buenas prácticas (ISO 15489, referencias ISO 27001 y ASVS) y con una arquitectura moderna y defendible. En **tesis**, la **prioridad** es la **coherencia** entre memoria, expediente y código: la arquitectura del **capítulo 11** (React+Vite+MUI + NestJS + Prisma + **BD vía XAMPP** + almacenamiento local; **ngrok** solo para demos) es la **referencia de implementación**; los capítulos 22–23 describen **entrega académica** y **continuidad opcional**, no operación institucional.

**Recomendaciones para cerrar el trabajo de titulación:** (1) fijar con el **director** el **MVP** y congelar alcance en la última fase; (2) documentar **datos de prueba** y **usuarios demo**; (3) preparar **guion de defensa** (5–10 min de demo en vivo o video); (4) incluir capítulo de **limitaciones** y **trabajo futuro** (despliegue en GADPR-LM, firma electrónica, OCR, antivirus centralizado); (5) mantener **Anexo A y B** actualizados hasta la versión final del expediente; (6) archivar **repositorio** y **dump de BD** entregados al tribunal según reglamento.

---

## Anexo A — Matriz de trazabilidad (requisitos → diseño → verificación)

*Objetivo (tesis): demostrar que los requisitos **priorizados con el director** tienen soporte en el diseño y al menos una verificación planificada. Los códigos de caso de prueba remiten al capítulo 21. Los RF no críticos pueden marcarse como “pendiente / futuro” sin invalidar el grado si el alcance quedó acotado por escrito.*

| ID requisito | Descripción breve | Ubicación en el expediente (diseño) | Caso(s) de prueba sugerido(s) |
|--------------|-------------------|--------------------------------------|-------------------------------|
| RF-001 | Autenticación | §12 módulos 2, 23, 24; §19; §16 tablas `usuarios`, `sesiones` | CP-AUTH-01, CP-AUTH-02, CP-AUTH-03, CP-SES-01, CP-SES-02 |
| RF-002 | Gestión de usuarios | §12 módulo 5; §16; §17.3 | CP-PERM-01 (derivado) |
| RF-003 | Roles y permisos | §12 módulo 6; §10; §16 `roles`, `permisos`, `usuario_rol`, `rol_permiso` | CP-PERM-01, CP-PERM-02 |
| RF-007–009 | Registro, carga, indexación | §12 módulos 10–12; §14; §17.2 | CP-DOC-01, CP-DOC-04, CP-UP-01 |
| RF-010–015 | Búsqueda, visualización, descarga, versiones, estados | §12 módulos 13–17; §13 | CP-DOC-03, CP-AUD-01, CP-UP-03 |
| RF-016–017 | Historial, auditoría | §12 módulos 18–19; §16 `auditoria` | CP-AUD-01, CP-PERM-02 |
| RF-018 | Respaldo | §12 módulo 22; §16 `respaldos` | CP-BAK-01 |
| RF-019 | Configuración | §12 módulo 21; §17.10 | *(prueba funcional de admin)* |
| RNF-SEG-01 | Seguridad global | §19; §7.3 | CP-CSRF-01, CP-XSS-01 |
| RNF-INT-01 | Integridad transaccional | §16.7; §14 | CP-DOC-04 |
| Arquitectura | Cliente–servidor, REST, capas, pila definida | **§11** (completo) | Revisión de coherencia en defensa / checklist de capas |

**Mantenimiento del anexo:** ante cada nuevo RF o cambio de alcance, actualizar filas y versión del expediente.

---

## Anexo B — Registro de cambios del expediente técnico

| Versión | Fecha | Autor / responsable *(supuesto)* | Descripción resumida |
|---------|-------|-----------------------------------|----------------------|
| 1.0 | 19/04/2026 | Equipo técnico | Versión inicial del expediente integral. |
| 1.1 | 19/04/2026 | Equipo técnico | Ampliación módulos 11–24, diccionario de datos, SQL, formularios y casos de prueba. |
| 1.2 | 19/04/2026 | Equipo técnico | **Control documental:** identificación única del expediente, reglas de fuente única y trazabilidad; Anexos A (matriz) y B (historial de versiones); vínculo explícito con aprobación y distribución controlada. |
| 1.3 | 19/04/2026 | Equipo técnico | **Capítulo 11 redefinido:** arquitectura general acorde a **proyecto de tesis** (alcance, pila cerrada React+Vite+TS / NestJS / MySQL, despliegue en equipo único o Docker Compose, diagramas, API REST, limitaciones); portada con **naturaleza de tesis**; matriz de trazabilidad enlazada a §11. |
| 1.4 | 19/04/2026 | Equipo técnico | **Alineación integral a la tesis:** marco en portada; resumen ejecutivo y objetivos; §6.0 alcance académico; marco normativo como referencia no certificación; metodología (director, iteraciones); RNF y RF ajustados; reportes, seguridad, pruebas, implementación, mantenimiento y riesgos reinterpretados para **prototipo y defensa**; conclusiones académicas. |
| 1.5 | 19/04/2026 | Equipo técnico | **Stack tecnológico único y cerrado** en §11.2: MUI, Prisma, axios, Argon2id, ExcelJS/pdfkit; eliminación de alternativas (Ant Design, TypeORM, bcrypt como opción equivalente). |
| 1.6 | 19/04/2026 | Equipo técnico | **Entorno de desarrollo fijado:** conexión a BD mediante **XAMPP** (MySQL/MariaDB local); **ngrok** para túnel HTTPS en demostraciones; portada, §11.5, §11.2 (nota BD), capítulo 22 y diagrama actualizados. |

---

**Fin del expediente técnico — Versión 1.6 — Código `GADPR-LM-ETI-SGD-2026-001`**

*Documento para el desarrollo del prototipo en el marco de un **trabajo de titulación**. Los “supuestos propuestos” pueden sustituirse por datos reales si el trabajo evoluciona hacia un piloto con el GADPR-LM. Las copias deben incluir versión y código de documento (§1.1).*
