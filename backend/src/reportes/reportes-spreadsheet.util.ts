import type { Row, Worksheet } from 'exceljs';
import { sanitizeSpreadsheetRow } from '../common/spreadsheet-sanitize.util';

/** Añade fila XLSX con sanitización anti formula-injection en strings. */
export function addSanitizedSpreadsheetRow(
  ws: Worksheet,
  row: Record<string, unknown>,
): Row {
  return ws.addRow(sanitizeSpreadsheetRow(row));
}
