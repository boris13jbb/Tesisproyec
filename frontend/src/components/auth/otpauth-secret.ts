/** Extrae la clave TOTP del otpauth URL (solo en memoria de UI). */
export function extractTotpSecretFromOtpauth(otpauthUrl: string): string {
  const raw = (otpauthUrl ?? '').trim();
  if (!raw) return '';
  try {
    const u = new URL(raw);
    return (u.searchParams.get('secret') ?? '').trim();
  } catch {
    const m = /[?&]secret=([^&]+)/i.exec(raw);
    return m?.[1] ? decodeURIComponent(m[1]).trim() : '';
  }
}
