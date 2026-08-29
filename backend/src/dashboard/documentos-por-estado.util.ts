export type DocumentosPorEstadoCounts = {
  total: number;
  registrados: number;
  borradores: number;
  enRevision: number;
  aprobados: number;
  rechazados: number;
};

/** Completa KPI por estado con ceros si el groupBy no devolvió esa clave. */
export function fillDocumentosPorEstadoCounts(
  grouped: ReadonlyArray<{ estado: string; count: number }>,
): DocumentosPorEstadoCounts {
  const map = new Map(grouped.map((g) => [g.estado, g.count]));
  const pick = (estado: string) => map.get(estado) ?? 0;
  const registrados = pick('REGISTRADO');
  const borradores = pick('BORRADOR');
  const enRevision = pick('EN_REVISION');
  const aprobados = pick('APROBADO');
  const rechazados = pick('RECHAZADO');
  const total = grouped.reduce((acc, g) => acc + g.count, 0);
  return { total, registrados, borradores, enRevision, aprobados, rechazados };
}
