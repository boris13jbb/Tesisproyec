import { parseStrictBoolean } from './strict-boolean.util';

describe('parseStrictBoolean', () => {
  it('acepta booleanos reales', () => {
    expect(parseStrictBoolean(true)).toBe(true);
    expect(parseStrictBoolean(false)).toBe(false);
  });

  it('interpreta strings true/false (trim + lowercase)', () => {
    expect(parseStrictBoolean('true')).toBe(true);
    expect(parseStrictBoolean('false')).toBe(false);
    expect(parseStrictBoolean(' TRUE ')).toBe(true);
    expect(parseStrictBoolean('False')).toBe(false);
  });

  it('no usa Boolean(string): "false" no es true', () => {
    expect(Boolean('false')).toBe(true);
    expect(parseStrictBoolean('false')).toBe(false);
  });

  it('deja valores inválidos para que @IsBoolean falle', () => {
    expect(parseStrictBoolean('yes')).toBe('yes');
    expect(parseStrictBoolean('1')).toBe('1');
    expect(parseStrictBoolean(1)).toBe(1);
  });
});
