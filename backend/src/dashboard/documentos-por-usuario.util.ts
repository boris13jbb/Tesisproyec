export type TipoActividadUsuarioRaw = {
  tipoId: string;
  codigo: string;
  nombre: string;
  cantidad: number;
};

export type ActividadUsuarioRaw = {
  usuarioId: string;
  nombre: string;
  email: string;
  rolNombre: string;
  documentosRegistrados: number;
  tiposRaw: TipoActividadUsuarioRaw[];
};

export type TipoActividadUsuarioItem = {
  tipoId: string;
  codigo: string;
  nombre: string;
  cantidad: number;
};

export type ActividadPorUsuarioItem = {
  usuarioId: string;
  nombre: string;
  email: string;
  rol: string;
  documentosRegistrados: number;
  tipos: TipoActividadUsuarioItem[];
};

const OTROS_CODIGO = 'OTROS';
const OTROS_NOMBRE = 'Otros';

/** Consolida tipos menos frecuentes en «Otros» por usuario (top N independiente). */
export function buildTiposActividadUsuario(
  items: TipoActividadUsuarioRaw[],
  topN = 5,
): TipoActividadUsuarioItem[] {
  const sorted = [...items]
    .filter((i) => i.cantidad > 0)
    .sort(
      (a, b) =>
        b.cantidad - a.cantidad || a.nombre.localeCompare(b.nombre, 'es'),
    );

  if (sorted.length === 0) {
    return [];
  }

  const head = sorted.slice(0, topN);
  const tail = sorted.slice(topN);
  const otrosCount = tail.reduce((s, i) => s + i.cantidad, 0);

  const result: TipoActividadUsuarioItem[] = head.map((i) => ({
    tipoId: i.tipoId,
    codigo: i.codigo,
    nombre: i.nombre,
    cantidad: i.cantidad,
  }));

  if (otrosCount > 0) {
    result.push({
      tipoId: OTROS_CODIGO,
      codigo: OTROS_CODIGO,
      nombre: OTROS_NOMBRE,
      cantidad: otrosCount,
    });
  }

  return result;
}

export function buildTopActividadPorUsuario(
  rows: ActividadUsuarioRaw[],
  topN = 5,
): ActividadPorUsuarioItem[] {
  return [...rows]
    .filter((r) => r.documentosRegistrados > 0)
    .sort((a, b) => {
      const diff = b.documentosRegistrados - a.documentosRegistrados;
      if (diff !== 0) {
        return diff;
      }
      return a.nombre.localeCompare(b.nombre, 'es');
    })
    .slice(0, topN)
    .map((r) => ({
      usuarioId: r.usuarioId,
      nombre: r.nombre,
      email: r.email,
      rol: r.rolNombre,
      documentosRegistrados: r.documentosRegistrados,
      tipos: buildTiposActividadUsuario(r.tiposRaw),
    }));
}

export function displayUserName(
  nombres: string | null,
  apellidos: string | null,
  email: string,
): string {
  const parts = [nombres?.trim(), apellidos?.trim()].filter(Boolean);
  if (parts.length > 0) {
    return parts.join(' ');
  }
  return email;
}

/** Verifica que la suma de tipos coincide con el total del usuario. */
export function actividadUsuarioTiposConsistente(
  item: ActividadPorUsuarioItem,
): boolean {
  const sum = item.tipos.reduce((s, t) => s + t.cantidad, 0);
  return sum === item.documentosRegistrados;
}
