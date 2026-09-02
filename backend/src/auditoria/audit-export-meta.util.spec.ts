import { redactAuditMetaJsonForExport } from './audit-export-meta.util';

describe('audit-export-meta.util', () => {
  it('redacta claves sensibles y conserva metadatos operativos', () => {
    const raw = JSON.stringify({
      decision: 'APROBADO',
      motivoRechazo: 'Falta respaldo',
      password: 'nunca-exportar',
      accessToken: 'eyJhbGci',
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
  });

  it('devuelve vacío para meta nulo', () => {
    expect(redactAuditMetaJsonForExport(null)).toBe('');
    expect(redactAuditMetaJsonForExport('')).toBe('');
  });
});
