export type TipoCountRaw = {
  codigo: string;
  nombre: string;
  cantidad: number;
};

export type DistribucionPorTipoItem = {
  codigo: string;
  nombre: string;
  cantidad: number;
  porcentaje: number;
};

const OTROS_CODIGO = 'OTROS';
const OTROS_NOMBRE = 'Otros';

/** Consolida tipos menos frecuentes en «Otros» cuando superan el top N. */
export function buildDistribucionPorTipo(
  items: TipoCountRaw[],
  topN = 5,
): DistribucionPorTipoItem[] {
  const sorted = [...items]
    .filter((i) => i.cantidad > 0)
    .sort((a, b) => b.cantidad - a.cantidad);

  if (sorted.length === 0) {
    return [];
  }

  const total = sorted.reduce((s, i) => s + i.cantidad, 0);
  if (total <= 0) {
    return [];
  }

  const head = sorted.slice(0, topN);
  const tail = sorted.slice(topN);
  const otrosCount = tail.reduce((s, i) => s + i.cantidad, 0);

  const result: TipoCountRaw[] = [...head];
  if (otrosCount > 0) {
    result.push({
      codigo: OTROS_CODIGO,
      nombre: OTROS_NOMBRE,
      cantidad: otrosCount,
    });
  }

  return result.map((i) => ({
    codigo: i.codigo,
    nombre: i.nombre,
    cantidad: i.cantidad,
    porcentaje: Math.round((i.cantidad / total) * 1000) / 10,
  }));
}
