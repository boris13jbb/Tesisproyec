import { BadRequestException } from '@nestjs/common';

/** Solo dígitos (cédula/RUC sin guiones ni espacios). */
export function normalizeIdentificacionEc(raw: string): string {
  return raw.replace(/\D/g, '');
}

export function validateCedulaEcuatoriana(raw: string): boolean {
  const cedula = normalizeIdentificacionEc(raw);
  if (cedula.length !== 10 || !/^\d{10}$/.test(cedula)) {
    return false;
  }

  const provincia = Number.parseInt(cedula.slice(0, 2), 10);
  if (provincia < 1 || (provincia > 24 && provincia !== 30)) {
    return false;
  }

  const tercer = Number.parseInt(cedula[2] ?? '0', 10);
  if (tercer >= 6) {
    return false;
  }

  const digits = cedula.split('').map((d) => Number.parseInt(d, 10));
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
  return verificador === (digits[9] ?? -1);
}

export function validateRucEcuatoriano(raw: string): boolean {
  const ruc = normalizeIdentificacionEc(raw);
  if (ruc.length !== 13 || !/^\d{13}$/.test(ruc)) {
    return false;
  }

  const tercer = Number.parseInt(ruc[2] ?? '0', 10);
  const sufijo = ruc.slice(10, 13);

  if (tercer < 6) {
    return sufijo === '001' && validateCedulaEcuatoriana(ruc.slice(0, 10));
  }

  if (tercer === 6 || tercer === 9) {
    const coef = [3, 2, 7, 6, 5, 4, 3, 2];
    let suma = 0;
    for (let i = 0; i < 8; i++) {
      suma += Number.parseInt(ruc[i] ?? '0', 10) * (coef[i] ?? 0);
    }
    const mod = suma % 11;
    const verificador = mod === 0 ? 0 : 11 - mod;
    return verificador === Number.parseInt(ruc[8] ?? '-1', 10);
  }

  return false;
}

export function assertCedulaValida(raw: string, label = 'Cédula'): string {
  const norm = normalizeIdentificacionEc(raw);
  if (!validateCedulaEcuatoriana(norm)) {
    throw new BadRequestException(`${label} ecuatoriana inválida`);
  }
  return norm;
}

export function assertRucValido(raw: string, label = 'RUC'): string {
  const norm = normalizeIdentificacionEc(raw);
  if (!validateRucEcuatoriano(norm)) {
    throw new BadRequestException(`${label} ecuatoriano inválido`);
  }
  return norm;
}
