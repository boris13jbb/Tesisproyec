import { BadRequestException } from '@nestjs/common';
import {
  assertCedulaValida,
  assertRucValido,
  normalizeIdentificacionEc,
} from './ecuador-id.util';
import { normalizeAdministrativeText } from './text-normalize.util';

export type PartyTipo = 'NATURAL' | 'JURIDICA';

export type PartyInput = {
  tipo: PartyTipo;
  cedula?: string | null;
  ruc?: string | null;
  nombres?: string | null;
  apellidos?: string | null;
  razonSocial?: string | null;
  correo?: string | null;
  telefono?: string | null;
  direccion?: string | null;
};

export type PartyNormalized = {
  tipo: PartyTipo;
  cedula: string | null;
  ruc: string | null;
  nombres: string | null;
  apellidos: string | null;
  razonSocial: string | null;
  correo: string | null;
  telefono: string | null;
  direccion: string | null;
};

export function normalizePartyInput(input: PartyInput): PartyNormalized {
  const tipo = input.tipo;
  if (tipo !== 'NATURAL' && tipo !== 'JURIDICA') {
    throw new BadRequestException('Tipo debe ser NATURAL o JURIDICA');
  }

  const correo = input.correo?.trim().toLowerCase() || null;
  const telefono = input.telefono?.trim() || null;
  const direccion = normalizeAdministrativeText(input.direccion);

  if (tipo === 'NATURAL') {
    const cedula = assertCedulaValida(input.cedula ?? '', 'Cédula');
    const nombres = normalizeAdministrativeText(input.nombres);
    const apellidos = normalizeAdministrativeText(input.apellidos);
    if (!nombres || !apellidos) {
      throw new BadRequestException(
        'Persona natural: nombres y apellidos son obligatorios',
      );
    }
    return {
      tipo,
      cedula,
      ruc: null,
      nombres,
      apellidos,
      razonSocial: null,
      correo,
      telefono,
      direccion,
    };
  }

  const rucNorm = assertRucValido(input.ruc ?? '', 'RUC');
  const razonSocial = normalizeAdministrativeText(input.razonSocial);
  if (!razonSocial) {
    throw new BadRequestException(
      'Persona jurídica: razón social es obligatoria',
    );
  }

  return {
    tipo,
    cedula: null,
    ruc: rucNorm,
    nombres: null,
    apellidos: null,
    razonSocial,
    correo,
    telefono,
    direccion,
  };
}

/** Actualización parcial: revalida según tipo resultante. */
export function mergePartyUpdate(
  existing: PartyNormalized,
  patch: Partial<PartyInput>,
): PartyNormalized {
  return normalizePartyInput({
    tipo: patch.tipo ?? existing.tipo,
    cedula: patch.cedula !== undefined ? patch.cedula : existing.cedula,
    ruc: patch.ruc !== undefined ? patch.ruc : existing.ruc,
    nombres: patch.nombres !== undefined ? patch.nombres : existing.nombres,
    apellidos:
      patch.apellidos !== undefined ? patch.apellidos : existing.apellidos,
    razonSocial:
      patch.razonSocial !== undefined
        ? patch.razonSocial
        : existing.razonSocial,
    correo: patch.correo !== undefined ? patch.correo : existing.correo,
    telefono: patch.telefono !== undefined ? patch.telefono : existing.telefono,
    direccion:
      patch.direccion !== undefined ? patch.direccion : existing.direccion,
  });
}

export function partyDisplayLabel(row: {
  tipo: string;
  cedula?: string | null;
  ruc?: string | null;
  nombres?: string | null;
  apellidos?: string | null;
  razonSocial?: string | null;
}): string {
  if (row.tipo === 'JURIDICA') {
    return row.razonSocial ?? row.ruc ?? '—';
  }
  const name = `${row.nombres ?? ''} ${row.apellidos ?? ''}`.trim();
  return name || row.cedula || '—';
}

export function normalizePartyLookupId(raw?: string | null): string | null {
  if (!raw?.trim()) return null;
  return normalizeIdentificacionEc(raw);
}
