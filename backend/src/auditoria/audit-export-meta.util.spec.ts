import {
  redactAuditMetaJsonForExport,
  serializeAuditMetaForPersist,
} from './audit-export-meta.util';

describe('audit-export-meta.util', () => {
  it('redacta claves sensibles y conserva metadatos operativos', () => {
    const raw = JSON.stringify({
      decision: 'APROBADO',
      motivoRechazo: 'Falta respaldo',
      password: 'nunca-exportar',
      passwordHash: 'argon2-hash',
      accessToken: 'eyJhbGci',
      refreshToken: 'refresh-xyz',
      resetToken: 'reset-xyz',
      totpSecret: 'BASE32SECRET',
      otpauthUrl: 'otpauth://totp/SGD?secret=BASE32',
      challengeToken: 'chal-1',
      Authorization: 'Bearer abc',
      cookie: 'sid=abc',
      documentoId: 'doc-1',
    });
    const out = JSON.parse(redactAuditMetaJsonForExport(raw)) as Record<
      string,
      unknown
    >;
    expect(out.decision).toBe('APROBADO');
    expect(out.motivoRechazo).toBe('Falta respaldo');
    expect(out.documentoId).toBe('doc-1');
    expect(out.password).toBe('[REDACTED]');
    expect(out.passwordHash).toBe('[REDACTED]');
    expect(out.accessToken).toBe('[REDACTED]');
    expect(out.refreshToken).toBe('[REDACTED]');
    expect(out.resetToken).toBe('[REDACTED]');
    expect(out.totpSecret).toBe('[REDACTED]');
    expect(out.otpauthUrl).toBe('[REDACTED]');
    expect(out.challengeToken).toBe('[REDACTED]');
    expect(out.Authorization).toBe('[REDACTED]');
    expect(out.cookie).toBe('[REDACTED]');
  });

  it('redacta anidado, arrays y claves compuestas (case-insensitive)', () => {
    const json = serializeAuditMetaForPersist({
      payload: {
        auth: {
          accessToken: 'nested-access',
          otpauthUrl: 'otpauth://totp/x?secret=ABC',
        },
      },
      items: [{ resetToken: 'in-array' }, { decision: 'OK' }],
      setupChallengeToken: 'compound-chal',
      debugToken: 'compound-debug',
      refresh_token: 'underscore',
      'Set-Cookie': 'sid=1',
      JWT: 'header.payload.sig',
    });
    expect(json).toBeTruthy();
    const out = JSON.parse(json!) as {
      payload: { auth: Record<string, unknown> };
      items: Array<Record<string, unknown>>;
      setupChallengeToken: unknown;
      debugToken: unknown;
      refresh_token: unknown;
      'Set-Cookie': unknown;
      JWT: unknown;
    };
    expect(out.payload.auth.accessToken).toBe('[REDACTED]');
    expect(out.payload.auth.otpauthUrl).toBe('[REDACTED]');
    expect(out.items[0]?.resetToken).toBe('[REDACTED]');
    expect(out.items[1]?.decision).toBe('OK');
    expect(out.setupChallengeToken).toBe('[REDACTED]');
    expect(out.debugToken).toBe('[REDACTED]');
    expect(out.refresh_token).toBe('[REDACTED]');
    expect(out['Set-Cookie']).toBe('[REDACTED]');
    expect(out.JWT).toBe('[REDACTED]');
  });

  it('serializeAuditMetaForPersist redacta antes de guardar', () => {
    const json = serializeAuditMetaForPersist({
      reason: 'INVALID_PASSWORD',
      password: 'plain',
      Authorization: 'Bearer abc',
    });
    expect(json).toBeTruthy();
    const out = JSON.parse(json!) as Record<string, unknown>;
    expect(out.reason).toBe('INVALID_PASSWORD');
    expect(out.password).toBe('[REDACTED]');
    expect(out.Authorization).toBe('[REDACTED]');
  });

  it('devuelve vacío/null para meta nulo', () => {
    expect(redactAuditMetaJsonForExport(null)).toBe('');
    expect(redactAuditMetaJsonForExport('')).toBe('');
    expect(serializeAuditMetaForPersist(null)).toBeNull();
    expect(serializeAuditMetaForPersist({})).toBeNull();
  });
});
