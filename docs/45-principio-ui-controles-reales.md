# Principio de interfaz — solo controles reales y exigibles

**Versión:** 2026-05-27  
**Ámbito:** Toda la UI del SGD-GADPR-LM (frontend) y textos alineados en documentación de usuario.  
**Marco de referencia:** ISO/IEC 27001:2022, ISO 15489, OWASP ASVS (**referencia de diseño**, no certificación).

---

## 1. Objetivo

Evitar que la interfaz **prometa** controles, certificaciones o configuraciones que el servidor **no ejecuta**. La UI debe mostrar únicamente:

1. **Controles operativos verificables** (lo que el backend aplica hoy).
2. **Indicadores calculados** con definición clara de la métrica (no etiquetados como “cumplimiento ISO”).
3. **Registros institucionales** (notas, revisiones, verificaciones) cuando corresponda a ISO 15489 — sin confundirlos con cambio técnico inmediato.

---

## 2. Reglas obligatorias de redacción (UI)

| Regla | Ejemplo correcto | Evitar |
|-------|------------------|--------|
| No simular certificación | “Indicadores operativos de seguridad (30 días)” | Chips “ISO 27001” / “OWASP ASVS” en splash o panel |
| No políticas futuras en formularios | Ocultar MFA/historial de contraseñas hasta implementación | “Pendiente en servidor” con campos editables |
| No confundir registro con runtime | “Registrar revisión” + notas | “Guardar política” que no cambia el login |
| Métricas con definición | “Inicios de sesión exitosos vs fallidos (30 días)” | “Cumplimiento ISO A.5.17 — 77%” |
| Acciones honestas | “Ver procedimiento de restauración” | Botón rojo “Restaurar” que no restaura |
| Jerga técnica | Tooltips o acordeón “Evidencia técnica” | `GET /api/...`, `BACKUP_VERIFIED` en texto principal |
| Validación de formulario | Chip “Por completar” | Chip “Pendiente” (suena a feature futura) |

---

## 3. Pantallas alineadas (snapshot 2026-05-27)

| Pantalla | Comportamiento documentado |
|----------|----------------------------|
| **Splash** | Capacidades del sistema (acceso, trazabilidad, sesión), no logos de normas |
| **Panel principal** | “Indicadores operativos de seguridad”; aviso de no certificación |
| **Configuración** | Solo lectura de controles en uso + “Registrar revisión” (notas) |
| **Respaldos** | mysqldump/verificación reales; procedimientos en diálogos, no ejecución remota de restore |
| **Usuarios** | Matriz con ayuda en lenguaje institucional; detalle API en acordeón |
| **Clasificación** | Sin “ISO/pending” en datos vacíos de conservación |
| **Nuevo documento** | “Comprobaciones antes de guardar” |
| **Auditoría** | Etiquetas legibles de acciones; mensaje 429 sin “reinicie backend” |
| **Reportes** | “Verificaciones de respaldo registradas” (export auditoría) |

---

## 4. API y backend (coherencia)

- **`GET /auth/admin/security-summary`:** devuelve solo controles efectivos (sin `passwordReuseHistory` ni `adminStepUpAuth` en respuesta).
- **`POST /auth/admin/security-policy`:** persiste registro institucional + auditoría `SECURITY_POLICY_UPDATED`; los valores numéricos enviados en “Registrar revisión” son **copia del summary**, no editables por el usuario en UI.
- **`GET /dashboard/summary` → `compliance[]`:** el campo `standard` en backend describe **qué mide** el porcentaje (texto operativo), no códigos ISO.

Variables de entorno (`.env`) siguen siendo la fuente de verdad para lockout, JWT y backup automático. La UI **informa** y **no sustituye** ese canal.

---

## 5. Documentación vinculada

| Documento | Uso |
|---------|-----|
| [27-manual-usuario-sgd-gadpr-lm.md](./27-manual-usuario-sgd-gadpr-lm.md) | Pasos de usuario |
| [44-guia-secciones-menu-navegacion.md](./44-guia-secciones-menu-navegacion.md) | Detalle por menú |
| [17-modulo-configuracion.md](./17-modulo-configuracion.md) | Módulo configuración/respaldos |
| [25-ui-ux-diseno-sistema-institucional.md](./25-ui-ux-diseno-sistema-institucional.md) | Diseño UX |
| [19-mapeo-iso27001-iso15489-owasp-asvs.md](./19-mapeo-iso27001-iso15489-owasp-asvs.md) | Mapeo normativo → código (técnico) |

---

## 6. Controles no implementados (no mostrar en UI hasta desarrollo)

| Control | Estado backend | UI |
|---------|----------------|-----|
| Historial de contraseñas (reuso) | No implementado | No aparece |
| MFA / step-up administrador | No implementado | No aparece |
| Edición de lockout/JWT desde web | Solo `.env` | Solo lectura + nota |

Cuando se implementen, actualizar `getAdminSecuritySummary()`, la pantalla y este documento.
