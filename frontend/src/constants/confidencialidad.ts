/** Etiquetas para `nivelConfidencialidad` en documentos (coherente con backend). */
export function labelNivelConfidencialidad(raw: string | null | undefined): string {
  if (raw == null || raw === '') return '—';
  const map: Record<string, string> = {
    PUBLICO: 'Público',
    INTERNO: 'Interno',
    RESERVADO: 'Reservado',
    CONFIDENCIAL: 'Confidencial',
  };
  return map[raw] ?? raw;
}

/** Color de Chip MUI según nivel de confidencialidad (solo presentación). */
export function confidencialidadChipColor(
  raw: string | null | undefined,
): 'default' | 'success' | 'warning' | 'info' | 'error' {
  switch (raw) {
    case 'PUBLICO':
      return 'success';
    case 'INTERNO':
      return 'info';
    case 'RESERVADO':
      return 'warning';
    case 'CONFIDENCIAL':
      return 'error';
    default:
      return 'default';
  }
}
