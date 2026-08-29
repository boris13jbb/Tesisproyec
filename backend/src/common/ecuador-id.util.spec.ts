import {
  validateCedulaEcuatoriana,
  validateRucEcuatoriano,
} from './ecuador-id.util';

function cedulaFromBase9(base9: string): string {
  const digits = base9.split('').map((d) => Number.parseInt(d, 10));
  let suma = 0;
  for (let i = 0; i < 9; i++) {
    let val = digits[i] ?? 0;
    if (i % 2 === 0) {
      val *= 2;
      if (val > 9) val -= 9;
    }
    suma += val;
  }
  const verificador = (10 - (suma % 10)) % 10;
  return `${base9}${verificador}`;
}

describe('ecuador-id.util', () => {
  const cedulaOk = cedulaFromBase9('170543210');

  it('acepta cédula con dígito verificador y provincia válidos', () => {
    expect(validateCedulaEcuatoriana(cedulaOk)).toBe(true);
  });

  it('rechaza cédula de longitud incorrecta', () => {
    expect(validateCedulaEcuatoriana('17054321')).toBe(false);
  });

  it('rechaza cédula con verificador alterado', () => {
    const bad = `${cedulaOk.slice(0, 9)}${cedulaOk[9] === '0' ? '1' : '0'}`;
    expect(validateCedulaEcuatoriana(bad)).toBe(false);
  });

  it('acepta RUC de persona natural (cédula + 001)', () => {
    expect(validateRucEcuatoriano(`${cedulaOk}001`)).toBe(true);
  });

  it('rechaza RUC de 12 dígitos', () => {
    expect(validateRucEcuatoriano(`${cedulaOk}00`)).toBe(false);
  });
});
