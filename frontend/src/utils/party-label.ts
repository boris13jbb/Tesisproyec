export type PartyCatalogRow = {
  id: string;
  tipo: 'NATURAL' | 'JURIDICA';
  cedula: string | null;
  ruc: string | null;
  nombres: string | null;
  apellidos: string | null;
  razonSocial: string | null;
  activo?: boolean;
};

/** Etiqueta legible para selectores y metadatos (alineado al backend). */
export function partyDisplayLabel(row: PartyCatalogRow): string {
  if (row.tipo === 'JURIDICA') {
    return row.razonSocial ?? row.ruc ?? '—';
  }
  const name = `${row.nombres ?? ''} ${row.apellidos ?? ''}`.trim();
  return name || row.cedula || '—';
}

export function partyIdentificacion(row: PartyCatalogRow): string {
  return row.cedula ?? row.ruc ?? '—';
}

/** Opción enriquecida para desplegables de documentos. */
export function partySelectLabel(row: PartyCatalogRow): string {
  const id = partyIdentificacion(row);
  const name = partyDisplayLabel(row);
  if (id !== '—' && name !== id) {
    return `${id} — ${name}`;
  }
  return name;
}
