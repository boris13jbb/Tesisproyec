/**
 * Redacción central de metadatos de auditoría (persistencia, lectura API y export).
 * Claves normalizadas en minúsculas; valores sensibles → `[REDACTED]`.
 */
const SENSITIVE_META_KEY = new Set([
  'password',
  'passwordhash',
  'token',
  'accesstoken',
  'refreshtoken',
  'resettoken',
  'authorization',
  'cookie',
  'set-cookie',
  'secret',
  'totp',
  'totpsecret',
  'otp',
  'otpauth',
  'otpauthurl',
  'mfasecret',
  'jwt',
  'challengetoken',
  'bearer',
]);

function isSensitiveMetaKey(key: string): boolean {
  return SENSITIVE_META_KEY.has(key.trim().toLowerCase());
}

function redactMetaValue(key: string, value: unknown): unknown {
  if (isSensitiveMetaKey(key)) {
    return '[REDACTED]';
  }
  if (Array.isArray(value)) {
    return value.map((item, index) => redactMetaValue(String(index), item));
  }
  if (value && typeof value === 'object') {
    return redactAuditMetaObject(value as Record<string, unknown>);
  }
  return value;
}

/** Redacta claves sensibles de un objeto meta de auditoría. */
export function redactAuditMetaObject(
  meta: Record<string, unknown>,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(meta)) {
    out[key] = redactMetaValue(key, value);
  }
  return out;
}

/**
 * Serializa meta para persistir en `audit_logs.meta_json` sin secretos.
 */
export function serializeAuditMetaForPersist(
  meta: Record<string, unknown> | undefined | null,
): string | null {
  if (!meta || Object.keys(meta).length === 0) {
    return null;
  }
  return JSON.stringify(redactAuditMetaObject(meta));
}

/**
 * Prepara metaJson para lectura API / export XLSX:
 * conserva trazabilidad operativa y redacta secretos de sesión/auth.
 */
export function redactAuditMetaJsonForExport(
  metaJson: string | null | undefined,
): string {
  if (!metaJson?.trim()) {
    return '';
  }
  try {
    const parsed: unknown = JSON.parse(metaJson);
    if (typeof parsed !== 'object' || parsed === null) {
      return metaJson;
    }
    return JSON.stringify(
      redactAuditMetaObject(parsed as Record<string, unknown>),
    );
  } catch {
    return metaJson;
  }
}

/** Alias semántico para respuestas GET /auditoria (misma política que export). */
export const redactAuditMetaJsonForRead = redactAuditMetaJsonForExport;
