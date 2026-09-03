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
      accessToken: 'eyJhbGci',
      resetToken: 'reset-xyz',
      totpSecret: 'BASE32SECRET',
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
    expect(out.accessToken).toBe('[REDACTED]');
    expect(out.resetToken).toBe('[REDACTED]');
    expect(out.totpSecret).toBe('[REDACTED]');
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
