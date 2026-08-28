export type TrafficLightLevel = 'green' | 'yellow' | 'red';

export type TrafficLightInput = {
  value: number;
  /** Percentil 33 % de la muestra (inclusive). */
  p33: number;
  /** Percentil 66 % de la muestra (inclusive). */
  p66: number;
};

/**
 * Semáforo automático según percentiles de la muestra (sin usuarios hardcodeados).
 * - 0 registros → verde
 * - valor ≤ p33 → verde; ≤ p66 → amarillo; resto → rojo
 */
export function trafficLightFromPercentiles(
  input: TrafficLightInput,
): TrafficLightLevel {
  const { value, p33, p66 } = input;
  if (!Number.isFinite(value) || value <= 0) {
    return 'green';
  }
  if (value <= p33) return 'green';
  if (value <= p66) return 'yellow';
  return 'red';
}

export function computePercentileThresholds(values: number[]): {
  p33: number;
  p66: number;
} {
  const sorted = values
    .filter((v) => Number.isFinite(v) && v >= 0)
    .sort((a, b) => a - b);
  if (sorted.length === 0) {
    return { p33: 0, p66: 0 };
  }
  const at = (p: number) => {
    if (sorted.length === 1) return sorted[0] ?? 0;
    const idx = Math.ceil((p / 100) * sorted.length) - 1;
    return sorted[Math.max(0, Math.min(sorted.length - 1, idx))] ?? 0;
  };
  return { p33: at(33), p66: at(66) };
}
