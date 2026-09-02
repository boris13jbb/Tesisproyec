import { buildDistribucionPorTipo } from './documentos-distribucion-tipo.util';

describe('buildDistribucionPorTipo', () => {
  it('calcula porcentajes y ordena por cantidad', () => {
    const result = buildDistribucionPorTipo([
      { codigo: 'MEM', nombre: 'Memorando', cantidad: 10 },
      { codigo: 'OFI', nombre: 'Oficio', cantidad: 5 },
    ]);
    expect(result).toEqual([
      { codigo: 'MEM', nombre: 'Memorando', cantidad: 10, porcentaje: 66.7 },
      { codigo: 'OFI', nombre: 'Oficio', cantidad: 5, porcentaje: 33.3 },
    ]);
  });

  it('agrupa excedentes en Otros', () => {
    const items = Array.from({ length: 7 }, (_, i) => ({
      codigo: `T${i}`,
      nombre: `Tipo ${i}`,
      cantidad: 10 - i,
    }));
    const result = buildDistribucionPorTipo(items, 5);
    expect(result.length).toBe(6);
    expect(result[5].codigo).toBe('OTROS');
    expect(result[5].nombre).toBe('Otros');
    expect(result[5].cantidad).toBe(9); // T5(5) + T6(4)
  });

  it('retorna vacío sin datos', () => {
    expect(buildDistribucionPorTipo([])).toEqual([]);
  });
});
