/**
 * Sanitización de correo (headers, destinatarios, URLs) para MailService existente.
 * No introduce providers, colas ni plantillas nuevas.
 */

const EMAIL_MAX = 254;
const SUBJECT_MAX = 200;

export function stripHeaderInjection(raw: string): string {
  return raw
    .replace(/[\r\n\0]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function sanitizeEmailSubject(raw: string): string {
  const s = stripHeaderInjection(raw)
    .replace(/\b(bcc|cc|to|from|reply-to|content-type)\s*:/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!s) return 'Notificación';
  return s.slice(0, SUBJECT_MAX);
}

/** Dirección única apta para cabecera To (sin CRLF ni lista). */
export function isSafeEmailAddress(raw: string): boolean {
  const s = raw.trim();
  if (!s || s.length > EMAIL_MAX) return false;
  if (/[\r\n\0,;<>]/.test(s)) return false;
  return /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(s);
}

export function filterSafeEmailAddresses(input: string | string[]): string[] {
  const list = Array.isArray(input) ? input : [input];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const item of list) {
    const email = String(item ?? '')
      .trim()
      .toLowerCase();
    if (!isSafeEmailAddress(email) || seen.has(email)) continue;
    seen.add(email);
    out.push(email);
  }
  return out;
}

/** Enlaces de notificación: solo http(s) de configuración, no Host header. */
export function isSafePublicHttpUrl(raw: string | undefined): boolean {
  if (!raw?.trim()) return false;
  try {
    const u = new URL(raw.trim());
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return false;
    if (u.username || u.password) return false;
    return Boolean(u.hostname);
  } catch {
    return false;
  }
}

export function escapeHtmlText(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function sanitizeSmtpErrorMessage(raw: string): string {
  let s = raw.replace(/\s+/g, ' ').trim();
  if (!s) return 'smtp_error';
  s = s.replace(/password\s*=\s*\S+/gi, 'password=[redacted]');
  s = s.replace(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, '[email]');
  return s.slice(0, 200);
}

/** UUID documental (resourceId / path). No es un validador RFC exhaustivo. */
export function isDocumentoUuid(raw: string | undefined | null): boolean {
  if (!raw) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    raw.trim(),
  );
}

/** Ventana de deduplicación ya usada por vencimientos/SLA (no es retención). */
export const NOTIFICATION_DEDUP_MS = 23 * 60 * 60 * 1000;
