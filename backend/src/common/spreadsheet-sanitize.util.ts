/** Caracteres iniciales que Excel/LibreOffice pueden interpretar como fórmula. */
const FORMULA_PREFIX = /^[=+\-@\t\r]/;

/**
 * Evita formula injection en celdas de texto de exportaciones XLSX.
 * No altera números, booleanos ni fechas.
 */
export function sanitizeSpreadsheetCell(value: unknown): unknown {
  if (value === null || value === undefined) {
    return value;
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return value;
  }
  if (value instanceof Date) {
    return value;
  }
  if (typeof value !== 'string') {
    return value;
  }
  const trimmed = value;
  if (FORMULA_PREFIX.test(trimmed)) {
    return `'${trimmed}`;
  }
  return trimmed;
}

/** Sanitiza todas las propiedades string de una fila antes de `worksheet.addRow`. */
export function sanitizeSpreadsheetRow<T extends Record<string, unknown>>(
  row: T,
): Record<string, unknown> {
  const out: Record<string, unknown> = { ...row };
  for (const key of Object.keys(out)) {
    out[key] = sanitizeSpreadsheetCell(out[key]);
  }
  return out;
}
