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
