const SENSITIVE_META_KEY = new Set([
  'password',
  'passwordhash',
  'token',
  'accesstoken',
  'refreshtoken',
  'authorization',
  'cookie',
  'secret',
  'totp',
  'otp',
  'mfasecret',
  'jwt',
  'challengetoken',
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

/** Redacta claves sensibles de un objeto meta de auditoría (exportación). */
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
 * Prepara metaJson para export XLSX/PDF: conserva trazabilidad operativa,
 * redacta claves que podrían contener secretos de sesión/auth.
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
