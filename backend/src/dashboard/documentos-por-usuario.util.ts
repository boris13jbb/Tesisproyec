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
  totalRegistrados: number;
  totalEnRevision: number;
  totalAprobados: number;
  totalRechazados: number;
  totalBorradores: number;
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
  totalRegistrados: number;
  totalEnRevision: number;
  totalAprobados: number;
  totalRechazados: number;
  totalBorradores: number;
  tipos: TipoActividadUsuarioItem[];
};

const OTROS_CODIGO = 'OTROS';
const OTROS_NOMBRE = 'Otros';

const TIPOS_TOP_DEFAULT = 3;

function countInMap(map: ReadonlyMap<string, number>, key: string): number {
  return map.get(key) ?? 0;
}

function countInRecord(record: Record<string, number>, key: string): number {
  return record[key] ?? 0;
}

function valuesFromMap(map: ReadonlyMap<string, number>): number[] {
  const result: number[] = [];
  map.forEach((count) => {
    result.push(count);
  });
  return result;
}

function estadoCountFromMap(
  estados: Map<string, number> | Record<string, number>,
  key: string,
): number {
  if (estados instanceof Map) {
    return countInMap(estados, key);
  }
  return countInRecord(estados, key);
}

function estadoValuesFromMap(
  estados: Map<string, number> | Record<string, number>,
): number[] {
  if (estados instanceof Map) {
    return valuesFromMap(estados);
  }
  return Object.keys(estados).map((key) => countInRecord(estados, key));
}

export function extractEstadoCounts(
  estados: Map<string, number> | Record<string, number>,
): {
  totalEnRevision: number;
  totalAprobados: number;
  totalRechazados: number;
  totalBorradores: number;
} {
  return {
    totalEnRevision: estadoCountFromMap(estados, 'EN_REVISION'),
    totalAprobados: estadoCountFromMap(estados, 'APROBADO'),
    totalRechazados: estadoCountFromMap(estados, 'RECHAZADO'),
    totalBorradores: estadoCountFromMap(estados, 'BORRADOR'),
  };
}

/** Consolida tipos menos frecuentes en «Otros» por usuario (top N independiente). */
export function buildTiposActividadUsuario(
  items: TipoActividadUsuarioRaw[],
  topN = TIPOS_TOP_DEFAULT,
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
    .filter((r) => r.totalRegistrados > 0)
    .sort((a, b) => {
      const diff = b.totalRegistrados - a.totalRegistrados;
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
      totalRegistrados: r.totalRegistrados,
      totalEnRevision: r.totalEnRevision,
      totalAprobados: r.totalAprobados,
      totalRechazados: r.totalRechazados,
      totalBorradores: r.totalBorradores,
      tipos: buildTiposActividadUsuario(r.tiposRaw, TIPOS_TOP_DEFAULT),
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
  return sum === item.totalRegistrados;
}

/** Estados actuales deben sumar el total de documentos del período. */
export function actividadUsuarioEstadosConsistente(
  totalRegistrados: number,
  estados: Map<string, number> | Record<string, number>,
): boolean {
  const values = estadoValuesFromMap(estados);
  const sum = values.reduce((s, c) => s + c, 0);
  return sum === totalRegistrados;
}
