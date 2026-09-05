import {
  filterSafeEmailAddresses,
  isDocumentoUuid,
  isSafeEmailAddress,
  isSafePublicHttpUrl,
  sanitizeEmailSubject,
  sanitizeSmtpErrorMessage,
  stripHeaderInjection,
} from './mail-safety.util';

describe('mail-safety.util', () => {
  it('bloquea CRLF en subject (header injection)', () => {
    const s = sanitizeEmailSubject('Hola\r\nBcc: attacker@example.test');
    expect(s).not.toMatch(/[\r\n]/);
    expect(s.toLowerCase()).not.toContain('bcc:');
  });

  it('variantes CR/LF y cabeceras no reintroducen headers', () => {
    const samples = [
      'Doc\rBcc: other@example.test',
      'Doc\nCc: other@example.test',
      'Doc\r\nTo: other@example.test',
      'Doc\r\nReply-To: other@example.test',
    ];
    for (const raw of samples) {
      const s = sanitizeEmailSubject(raw);
      expect(s).not.toMatch(/[\r\n]/);
      expect(s.toLowerCase()).not.toMatch(/\b(bcc|cc|to|reply-to)\s*:/);
    }
  });

  it('rechaza destinatario con CRLF o lista', () => {
    expect(isSafeEmailAddress('ok@local.test')).toBe(true);
    expect(isSafeEmailAddress('a\r\nbcc:x@evil.test')).toBe(false);
    expect(isSafeEmailAddress('a@b.test,c@d.test')).toBe(false);
    expect(isSafeEmailAddress('not-an-email')).toBe(false);
    expect(
      filterSafeEmailAddresses(['ok@local.test', 'ok@local.test', 'bad']),
    ).toEqual(['ok@local.test']);
  });

  it('solo acepta URLs http(s) públicas', () => {
    expect(isSafePublicHttpUrl('http://localhost:5173')).toBe(true);
    expect(isSafePublicHttpUrl('https://sgd.example.test/app')).toBe(true);
    expect(isSafePublicHttpUrl('javascript:alert(1)')).toBe(false);
    expect(isSafePublicHttpUrl('data:text/html,x')).toBe(false);
    expect(isSafePublicHttpUrl('http://user:pass@host.test')).toBe(false);
  });

  it('sanitizeSmtpErrorMessage no deja password ni emails', () => {
    const out = sanitizeSmtpErrorMessage(
      '535 auth failed user=ops@local.test password=SuperSecret99',
    );
    expect(out.toLowerCase()).not.toContain('supersecret99');
    expect(out).not.toContain('ops@local.test');
  });

  it('stripHeaderInjection colapsa control chars', () => {
    expect(stripHeaderInjection('a\n\nb')).toBe('a b');
  });

  it('isDocumentoUuid rechaza paths y javascript:', () => {
    expect(isDocumentoUuid('550e8400-e29b-41d4-a716-446655440000')).toBe(true);
    expect(isDocumentoUuid('javascript:alert(1)')).toBe(false);
    expect(isDocumentoUuid('../etc/passwd')).toBe(false);
  });
});
