import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRequire } from 'node:module';

// Los módulos CommonJS comparten la caché de require; se espían las instancias reales.
const require = createRequire(import.meta.url);
const repository = require('../src/repositories/reportes.repository');
const service = require('../src/services/reportes.service');
const PDFDocument = require('pdfkit');
const { generarPdfMensual } = require('../src/utils/reportePdf');

const gasto = {
  id: 'gasto-25873e',
  tipo: 'egreso',
  monto: '1994.30',
  categoria: 'Otros',
  notas: '  licuadora  ',
  estado: 'activa',
  fecha_transaccion: new Date('2026-09-30T18:00:00Z'),
};

beforeEach(() => {
  vi.spyOn(repository, 'transaccionesDelPeriodo').mockResolvedValue([gasto]);
  vi.spyOn(repository, 'totalesPorCategoria').mockResolvedValue([]);
  vi.spyOn(repository, 'acumuladoAntesDe').mockResolvedValue({ ingresos: '0.00', egresos: '0.00' });
});

afterEach(() => vi.restoreAllMocks());

describe('concepto de egresos en el PDF mensual', () => {
  it('imprime las notas de OTROS sin prefijo y conserva folio, fecha e importe', async () => {
    const textos = vi.spyOn(PDFDocument.prototype, 'text');
    const datos = await service.datosPlantilla(2026, 9);

    expect(datos.egresos.otros).toEqual([
      { detalle: 'licuadora', folio: '25873E', fecha: '30/09/2026', importe: 1994.30 },
    ]);
    await generarPdfMensual(datos);
    const impresos = textos.mock.calls.map(([texto]) => texto);
    expect(impresos).toContain('licuadora');
    expect(impresos).toContain('25873E');
    expect(impresos).toContain('30/09/2026');
    expect(impresos).toContain('1,994.30');
    expect(impresos.some((texto) => String(texto).startsWith('OTROS:'))).toBe(false);
  });

  it.each([null, undefined, '', '   ', '\n\t'])('usa la categoría cuando las notas son %j', async (notas) => {
    repository.transaccionesDelPeriodo.mockResolvedValue([{ ...gasto, notas }]);
    const textos = vi.spyOn(PDFDocument.prototype, 'text');
    const datos = await service.datosPlantilla(2026, 9);
    await generarPdfMensual(datos);

    expect(textos.mock.calls.map(([texto]) => texto)).toContain('Otros');
  });

  it('usa las notas también para categorías sin equivalencia en el catálogo', async () => {
    repository.transaccionesDelPeriodo.mockResolvedValue([{ ...gasto, categoria: 'Equipo de cocina' }]);
    const datos = await service.datosPlantilla(2026, 9);
    expect(datos.egresos.otros[0].detalle).toBe('licuadora');

    repository.transaccionesDelPeriodo.mockResolvedValue([{ ...gasto, categoria: 'Equipo de cocina', notas: null }]);
    const sinNotas = await service.datosPlantilla(2026, 9);
    expect(sinNotas.egresos.otros[0].detalle).toBe('Equipo de cocina');
  });

  it('mantiene los conceptos oficiales y excluye los gastos cancelados', async () => {
    repository.transaccionesDelPeriodo.mockResolvedValue([
      { ...gasto, categoria: 'Luz', notas: 'Recibo CFE' },
      { ...gasto, estado: 'cancelada', notas: 'Compra cancelada' },
    ]);
    const textos = vi.spyOn(PDFDocument.prototype, 'text');
    const datos = await service.datosPlantilla(2026, 9);
    await generarPdfMensual(datos);

    expect(datos.egresos.otros).toEqual([]);
    expect(datos.egresos.total).toBe(1994.30);
    expect(datos.egresos.conceptos.find((item) => item.concepto === 'LUZ').partidas).toHaveLength(1);
    const impresos = textos.mock.calls.map(([texto]) => texto);
    expect(impresos).toContain('LUZ');
    expect(impresos).toContain('OTROS:');
    expect(impresos).not.toContain('Recibo CFE');
    expect(impresos).not.toContain('Compra cancelada');
  });
});
