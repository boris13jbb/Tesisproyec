export type DashboardActividadMes = {
  esteMes: number;
  mesAnterior: number;
  /** `null` si no hay base comparable (mes anterior = 0 y sin variación definida). */
  variacionPorcentaje: number | null;
  mensaje: string | null;
};

export type MesCantidad = {
  anio: number;
  mes: number;
  cantidad: number;
};

/**
 * Compara el mes calendario actual con el anterior usando la serie de 12 meses.
 * Maneja división por cero sin devolver Infinity.
 */
export function computeActividadMes(
  series: ReadonlyArray<MesCantidad>,
  now: Date,
): DashboardActividadMes {
  const esteAnio = now.getFullYear();
  const esteMes = now.getMonth() + 1;
  const prevDate = new Date(esteAnio, now.getMonth() - 1, 1);
  const mesAnteriorAnio = prevDate.getFullYear();
  const mesAnteriorNum = prevDate.getMonth() + 1;

  const pick = (anio: number, mes: number) =>
    series.find((s) => s.anio === anio && s.mes === mes)?.cantidad ?? 0;

  const actual = pick(esteAnio, esteMes);
  const anterior = pick(mesAnteriorAnio, mesAnteriorNum);

  let variacionPorcentaje: number | null = null;
  let mensaje: string | null = null;

  if (anterior > 0) {
    const raw = ((actual - anterior) / anterior) * 100;
    variacionPorcentaje = Math.round(raw);
    if (variacionPorcentaje > 0) {
      mensaje = `La actividad documental aumentó ${variacionPorcentaje} % frente al mes anterior.`;
    } else if (variacionPorcentaje < 0) {
      mensaje = `La actividad documental disminuyó ${Math.abs(variacionPorcentaje)} % frente al mes anterior.`;
    } else {
      mensaje = 'La actividad documental se mantuvo igual que el mes anterior.';
    }
  } else if (actual > 0) {
    mensaje =
      'No hubo documentos registrados el mes anterior; el mes actual inicia actividad.';
  } else if (actual === 0 && anterior === 0) {
    mensaje = null;
  }

  return {
    esteMes: actual,
    mesAnterior: anterior,
    variacionPorcentaje,
    mensaje,
  };
}
