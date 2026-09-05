import {
  buildHelmetOptions,
  createCorsOriginDelegate,
  isAllowedCorsOrigin,
  isProductionNodeEnv,
  parseCorsOrigins,
  parseListenPort,
} from './http-bootstrap.util';

describe('http-bootstrap.util', () => {
  it('parseListenPort rechaza NaN, negativos y fuera de rango', () => {
    expect(parseListenPort('3000')).toBe(3000);
    expect(parseListenPort('1')).toBe(1);
    expect(parseListenPort('65535')).toBe(65535);
    expect(parseListenPort('0')).toBe(3000);
    expect(parseListenPort('-1')).toBe(3000);
    expect(parseListenPort('65536')).toBe(3000);
    expect(parseListenPort('abc')).toBe(3000);
    expect(parseListenPort(Number.NaN)).toBe(3000);
    expect(parseListenPort(Number.POSITIVE_INFINITY)).toBe(3000);
    expect(parseListenPort(undefined)).toBe(3000);
  });

  it('parseCorsOrigins es allowlist exacta y descarta * / URLs no http(s)', () => {
    expect(
      parseCorsOrigins('http://localhost:5173, https://sgd.local.test'),
    ).toEqual(['http://localhost:5173', 'https://sgd.local.test']);
    expect(
      parseCorsOrigins(
        'http://localhost:5173, http://localhost:5173, https://sgd.local.test',
      ),
    ).toEqual(['http://localhost:5173', 'https://sgd.local.test']);
    expect(parseCorsOrigins('*')).toEqual(['http://localhost:5173']);
    expect(parseCorsOrigins('javascript:alert(1),data:text/html,x')).toEqual([
      'http://localhost:5173',
    ]);
  });

  it('isAllowedCorsOrigin no hace substring bypass ni acepta null/*', () => {
    const allow = ['http://localhost:5173'];
    expect(isAllowedCorsOrigin('http://localhost:5173', allow)).toBe(true);
    expect(isAllowedCorsOrigin('http://evil.localhost:5173', allow)).toBe(
      false,
    );
    expect(isAllowedCorsOrigin('http://localhost:5173.evil.test', allow)).toBe(
      false,
    );
    expect(
      isAllowedCorsOrigin('https://trusted.example.evil.test', [
        'https://trusted.example',
      ]),
    ).toBe(false);
    expect(
      isAllowedCorsOrigin('https://trusted.example/admin', [
        'https://trusted.example',
      ]),
    ).toBe(false);
    expect(isAllowedCorsOrigin('*', allow)).toBe(false);
    expect(isAllowedCorsOrigin('null', allow)).toBe(false);
    expect(isAllowedCorsOrigin(undefined, allow)).toBe(false);
  });

  it('delegate: sin Origin permite; Origin no listado deniega', () => {
    const fn = createCorsOriginDelegate(['http://localhost:5173']);
    const allowed = jest.fn();
    fn(undefined, allowed);
    expect(allowed).toHaveBeenCalledWith(null, true);
    const denied = jest.fn();
    fn('https://evil.example', denied);
    expect(denied).toHaveBeenCalledWith(null, false);
  });

  it('HSTS solo en production', () => {
    expect(buildHelmetOptions(false).hsts).toBe(false);
    expect(buildHelmetOptions(true).hsts).toEqual(
      expect.objectContaining({ maxAge: 15_552_000 }),
    );
    expect(isProductionNodeEnv('production')).toBe(true);
    expect(isProductionNodeEnv('Production')).toBe(true);
    expect(isProductionNodeEnv(' production')).toBe(true);
    expect(isProductionNodeEnv('production-debug')).toBe(false);
    expect(isProductionNodeEnv('prod')).toBe(false);
    expect(isProductionNodeEnv('true')).toBe(false);
    expect(isProductionNodeEnv('development')).toBe(false);
  });
});
