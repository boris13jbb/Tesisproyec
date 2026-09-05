# Matriz — Notificaciones / SLA / correo SMTP

**Proyecto:** SGD-GADPR-LM (`Tesisproyec`)  
**Estándares:** ISO/IEC 27001:2022 (comunicaciones, control de acceso), ISO 15489 (trazabilidad de avisos de expediente), OWASP ASVS V2/V4/V5/V7/V10.

Complementa [05-modulo-auth.md](./05-modulo-auth.md) (reset SMTP, **no reabrir**), [18-seguridad-y-hardening.md](./18-seguridad-y-hardening.md) y [22-changelog-tecnico.md](./22-changelog-tecnico.md).

## Arquitectura

Sistema **operativo real**. No hay cola distribuida, Redis, Bull, SendGrid, FCM, SMS ni WebSocket.

| Componente | Existe | Operativo | Descripción |
|---|---:|---:|---|
| Notification service | Sí | Sí | `NotificationService` — despacho email + in-app |
| Mail service | Sí | Sí | `MailService` / nodemailer |
| SMTP | Sí | Condicional | Si `SMTP_HOST`/`SMTP_SERVER` + `SMTP_FROM_EMAIL` válido |
| Scheduler/Cron | Sí | Condicional | `ExpiryNotificationScheduler` — `NOTIFY_EXPIRY_CRON` (default `0 7 * * *`) |
| SLA service | Parcial | Sí | `documento-sla.util.ts` + `fechaLimiteSla` en envío a revisión |
| Notification DB table | Sí | Sí | `user_notifications` (`UserNotification`) |
| Endpoint list | Sí | Sí | `GET /notifications` (JWT, propias) |
| Endpoint unread count | Sí | Sí | Campo `unread` en el listado |
| Endpoint mark read | Sí | Sí | `PATCH /notifications/:id/read` |
| Endpoint mark all | Sí | Sí | `PATCH /notifications/read-all` |
| Endpoint detail GET :id | NO EXISTE | — | No implementar |
| Endpoint acknowledge notificación | NO EXISTE | — | ACK de **dashboard** es otro recurso |
| Endpoint resend / manual send | NO EXISTE | — | No implementar |
| Frontend inbox | Sí | Sí | Campana `InAppNotificationsMenu` |
| Frontend badges | Sí | Sí | `Badge` con `unread` propio |
| Dashboard alerts | Sí | Sí | `POST /dashboard/admin/alerts/acknowledge` + `DASHBOARD_ALERT_ACK` |
| Audit events | Sí | Sí | `NOTIFICATION_DISPATCHED` |
| Email templates | Parcial | Sí | HTML/text construido en código (sin Handlebars/EJS) |

## Tipos de notificación

| Tipo | Trigger | Destinatario | Canal | Persistido | Audit |
|---|---|---|---|---:|---:|
| `REVISION_PENDING` | `POST .../enviar-revision` | ADMIN/REVISOR **activos** (BD, take 200) | email + in-app | Sí | `NOTIFICATION_DISPATCHED` |
| `REVISION_RESOLVED` | Resolver revisión | Creador activo (`createdById` → BD) | email + in-app | Sí | idem |
| `DOCUMENT_EXPIRING` | Cron vencimiento `fechaVencimiento` | Creador activo | email + in-app | Sí | idem |
| `SLA_OVERDUE` | Mismo cron, `EN_REVISION` + `fechaLimiteSla < now` | ADMIN/REVISOR activos | email + in-app | Sí | idem |

Reset / invitación de usuario usan `MailService` pero **no** son tipos de `UserNotification`. Auth/IAM ya cerrados.

## SLA

**Regla real:** al enviar a revisión se fija `fechaIngresoRevision` y `fechaLimiteSla` = ingreso + `SLA_DIAS_REVISION` días **calendario** (default 5, clamp 1–90). Semáforo: `VENCIDO` si `now > limite`; `POR_VENCER` si faltan ≤ 24 h; si no `EN_PLAZO`.

**Scheduler:** el cron de vencimientos (no un cron SLA aparte) también busca documentos `EN_REVISION` con `fechaLimiteSla < now` y dispara `SLA_OVERDUE`. **Frecuencia no modificada.**

**Timezone:** `setHours` / `Date` del proceso Node (hora local del host). No se cambió a UTC forzado. El `CronJob` se crea **sin** `timeZone` (`America/Guayaquil` no está en código). `0 7 * * *` son las 07:00 del TZ del proceso/host, **no** “07:00 Ecuador” salvo que el deployment fije `TZ`. Mejora futura / config de despliegue.

**Dedup:** ventana **23 h** (`NOTIFICATION_DEDUP_MS`) por `tipo` + `resourceId` (`SLA_OVERDUE`) o + `userId` (`DOCUMENT_EXPIRING`). Evita spam accidental si el job corre dos veces el mismo día. Recordatorios al día siguiente son **legítimos** (mismo cron diario).

**Idempotencia:** `findFirst` + `createMany` **no es atómico**. Dos instancias simultáneas pueden duplicar (carrera). Lock solo in-process: **NO EXISTE** lock distribuido. Mejora futura.

Revisión submit/resolve: cada evento de negocio es un aviso nuevo (no es duplicado accidental).

## Scheduler

| Variable | Default | Notas |
|---|---|---|
| `NOTIFY_EXPIRY_ENABLED` | activo salvo `false` | |
| `NOTIFY_EXPIRY_CRON` | `0 7 * * *` | No cambiar en esta fase |
| `NOTIFY_EXPIRY_DAYS_AHEAD` | `30,7,1` | Ventanas de `fechaVencimiento` |

Desactivar: `NOTIFY_EXPIRY_ENABLED=false`.

## Destinatarios

**Server-side: Sí.** Emails y `userId` se resuelven en BD (`activo: true`). Se **ignoran** `creatorEmail` / `recipientEmails` del caller.

- No hay body/query/header de destinatario en la API de notificaciones.
- No hay endpoint de creación client-driven (mass assignment de `userId`/`recipient` **NO EXISTE**).
- Usuario sin email válido: no SMTP, sí in-app si está activo. Sin dirección inventada.
- Usuario inactivo: skip.

## RBAC

No existen permisos `NOTIFICATIONS_*` ni `SLA_*`.

| Superficie | Quién | Alcance |
|---|---|---|
| Inbox JWT | Cualquier usuario autenticado | Solo filas `userId = JWT.id` |
| Dashboard ACK | `@Roles('ADMIN')` (incluye SUPERADMIN) + `DASHBOARD_ADMIN_READ` | Alertas del panel, no inbox |
| Despacho automático | Backend / cron | ADMIN/REVISOR o creador según tipo |

USER no ve inbox ajeno. ADMIN **no** tiene listado global de notificaciones. SUPERADMIN: misma política (propias + ACK de dashboard si rol ADMIN efectivo).

## IDOR / BOLA

| Operación | Resultado |
|---|---|
| List | `where: { userId: JWT }` |
| Detail GET :id | NO EXISTE |
| Mark read | `updateMany({ id, userId })` — 204 aunque 0 filas (no enumeración) |
| Mark all | Solo `userId` JWT |
| Unread count | Mismo scope |
| Ack dashboard | Actor JWT; `codigo` whitelist; timestamp servidor |

## SMTP

| Tema | Valor real |
|---|---|
| Config | Solo env: `SMTP_HOST`/`SMTP_SERVER`, `SMTP_PORT` (default 587), `SMTP_SECURE` o puerto 465, `SMTP_USER`/`SMTP_PASSWORD`, `SMTP_FROM_EMAIL` |
| From | Server-side. Cliente no controla from/reply-to |
| Password logs/audit/API | No |
| TLS | `secure=true` si `SMTP_SECURE` o puerto 465; 587 típico STARTTLS. `rejectUnauthorized` **no** se fuerza a `false` (default nodemailer: verificar CA) |
| Timeout | No hay timeout explícito (default nodemailer) |
| Retry framework | NO EXISTE |
| Adjuntos | NO EXISTE |
| sendMail | Síncrono en el request/job (best-effort). Fallo SMTP **no** revierte el flujo documental (fail-open de notificación) |

`.env` real: no tracked. `.env.example`: placeholders.

## Headers / injection

- Subject y display name: se eliminan CR/LF.
- Destinatario: una dirección, regex segura; se rechaza CRLF, comas y listas.
- Envío **individual** (un `To:` por mensaje) para no filtrar la lista de revisores.
- BCC/CC: no se usan.

## Templates

Motor: **ninguno** (template literals). Texto de usuario (`asunto`, `motivo`, `codigo`) se escapa en HTML (`escapeHtmlText`). Versión text: sí. No hay `dangerouslySetInnerHTML` en la campana.

## Links

- Base: `APP_PUBLIC_URL` validada `http:`/`https:` (sin userinfo). **No** se usa `Host` / `Origin` / `X-Forwarded-Host`.
- Path documental: UUID. Frontend: `documentoPathFromNotification` (bloquea `javascript:` / IDs no UUID).
- JWT de acceso: **no** en links de notificación.
- Reset token: solo flujo Auth ya cerrado (`/restablecer?token=`).
- Open redirect: no hay `redirectUrl` en notificaciones.

## Delivery

`NOTIFICATION_DISPATCHED` = **intento de despacho** (in-app persistido + SMTP si configurado). `dispatchResult`: `OK` (SMTP aceptó **al menos un** envío) o `SKIP` (sin SMTP / sin email válido). **No** significa “leído por el usuario” ni “entregado al buzón”.

Éxito SMTP parcial (A ok, B falla, C ok): `smtpSent=true`; in-app se crea para todos los destinatarios resueltos; no hay retry. El error de B no se persiste ni se devuelve al cliente.

Meta permitida: `tipo`, `documentoId`, `channel`, `recipientCount` (cantidad, no emails), `smtpSent`, `decision`, `diasRestantes`. **No:** password, HTML, body, token, lista de correos.

Fallo SMTP de notificación: mensaje genérico en log; `sendIfConfigured` no lanza al cliente del flujo documental.

## Frontend

- Campana en layout autenticado (JWT). Sin `PermissionRoute` específico (inbox propio).
- Texto MUI (`ListItemText`) — XSS de payload se muestra como texto.
- Mark read: el servidor exige `userId` JWT.
- Sin página `/notificaciones` dedicada.

## PII

| Dato | Uso |
|---|---|
| Email | SMTP `To:` individual; **no** en audit meta |
| Nombre | No en plantillas de notificación documental |
| Código/asunto/motivo | In-app + email al destinatario autorizado |
| IP | No en notificación; sí en otros módulos de auth |

## Retención

**NO DEFINIDA.** No hay TTL/cleanup automático. Mejora futura.

## Concurrencia

Dedup in-process + `findFirst`. Multi-instancia: riesgo residual de duplicado el mismo día. No se añadió lock distribuido.

## Tests

Ver `mail-safety.util.spec.ts`, `mail.service.spec.ts`, `notification.service.spec.ts`, `notifications.controller.spec.ts`, `expiry-notification.scheduler.spec.ts`, `documento-sla.util.spec.ts`, `dashboard.alerts.authorization.spec.ts`. Transporte mock; sin SMTP real ni cron contra BD real.

## Riesgos residuales

- Carrera multi-instancia en SLA/expiry (sin unique constraint; schema no tocado).
- Fail-open: si `createMany` in-app falla **después** de persistir el estado documental, el HTTP de revisión puede fallar (comportamiento previo).
- Lista To: ya no masiva; N envíos SMTP por N destinatarios (sin cola).
- Sin métricas de delivery ni retención.
- Timeout SMTP no configurado.
