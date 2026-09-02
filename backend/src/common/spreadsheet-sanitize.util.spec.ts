import ExcelJS from 'exceljs';
import {
  sanitizeSpreadsheetCell,
  sanitizeSpreadsheetRow,
} from './spreadsheet-sanitize.util';

describe('spreadsheet-sanitize.util', () => {
  it('antepone comilla a strings con prefijo de fórmula', () => {
    expect(sanitizeSpreadsheetCell('=SUM(1,1)')).toBe("'=SUM(1,1)");
    expect(sanitizeSpreadsheetCell('+CMD')).toBe("'+CMD");
    expect(sanitizeSpreadsheetCell('-1+1')).toBe("'-1+1");
    expect(sanitizeSpreadsheetCell('@SUM(A1:A2)')).toBe("'@SUM(A1:A2)");
  });

  it('preserva números, booleanos y fechas', () => {
    const d = new Date('2026-01-15T12:00:00Z');
    expect(sanitizeSpreadsheetCell(42)).toBe(42);
    expect(sanitizeSpreadsheetCell(3.14)).toBe(3.14);
    expect(sanitizeSpreadsheetCell(true)).toBe(true);
    expect(sanitizeSpreadsheetCell(d)).toBe(d);
  });

  it('preserva strings seguros', () => {
    expect(sanitizeSpreadsheetCell('Informe mensual')).toBe('Informe mensual');
    expect(sanitizeSpreadsheetCell('')).toBe('');
  });

  it('ExcelJS no interpreta celda sanitizada como fórmula', () => {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('test');
    ws.columns = [
      { header: 'Asunto', key: 'asunto', width: 20 },
      { header: 'Total', key: 'total', width: 10 },
    ];
    ws.addRow(sanitizeSpreadsheetRow({ asunto: '=SUM(1,1)', total: 5 }));
    const dataRow = ws.getRow(2);
    const textCell = dataRow.getCell('asunto');
    const numCell = dataRow.getCell('total');
    expect(textCell.formula).toBeUndefined();
    expect(textCell.value).toBe("'=SUM(1,1)");
    expect(numCell.value).toBe(5);
    expect(numCell.formula).toBeUndefined();
  });
});
