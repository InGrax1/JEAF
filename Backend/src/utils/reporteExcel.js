// Generador del reporte mensual en Excel (spec 3.2): libro .xlsx para
// cruce contable con hojas de Resumen, Detalle y Cancelados.
const ExcelJS = require('exceljs');
const { formatoLocal } = require('./fechas');

const VERDE = 'FF1F6B3B';
const FORMATO_MONEDA = '$#,##0.00';

function estiloCabecera(fila) {
  fila.eachCell((celda) => {
    celda.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    celda.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: VERDE } };
    celda.alignment = { vertical: 'middle' };
  });
}

async function generarExcelMensual(datos) {
  const libro = new ExcelJS.Workbook();
  libro.creator = datos.iglesia;
  libro.created = datos.generadoEn;

  // ---------- Hoja Resumen ----------
  const resumen = libro.addWorksheet('Resumen');
  resumen.columns = [{ width: 38 }, { width: 20 }];
  resumen.addRow([datos.iglesia]).font = { bold: true, size: 14 };
  resumen.addRow([`Reporte Mensual — ${datos.nombreMes} ${datos.anio}`]).font = { bold: true, size: 12 };
  resumen.addRow([`Generado: ${formatoLocal(datos.generadoEn)}`]).font = { size: 9, color: { argb: 'FF666666' } };
  resumen.addRow([]);

  const filas = [
    ['Total de ingresos', datos.totales.ingresos],
    ['Total de egresos', datos.totales.egresos],
    ['Resultado del mes', datos.totales.resultado],
    ['Movimientos registrados', datos.activas.length],
    ['Movimientos cancelados', datos.canceladas.length],
  ];
  for (const [etiqueta, valor] of filas) {
    const fila = resumen.addRow([etiqueta, valor]);
    fila.getCell(1).font = { bold: true };
    if (etiqueta.startsWith('Total') || etiqueta.startsWith('Resultado')) {
      fila.getCell(2).numFmt = FORMATO_MONEDA;
    }
  }

  resumen.addRow([]);
  const cabCat = resumen.addRow(['Categoría (tipo)', 'Total']);
  estiloCabecera(cabCat);
  for (const c of datos.porCategoria) {
    const fila = resumen.addRow([`${c.categoria} (${c.tipo})`, c.total]);
    fila.getCell(2).numFmt = FORMATO_MONEDA;
  }

  // ---------- Hoja Detalle ----------
  const detalle = libro.addWorksheet('Detalle');
  detalle.columns = [
    { header: 'Fecha (local)', key: 'fecha', width: 18 },
    { header: 'Folio', key: 'folio', width: 10 },
    { header: 'Tipo', key: 'tipo', width: 10 },
    { header: 'Categoría', key: 'categoria', width: 22 },
    { header: 'Monto', key: 'monto', width: 14 },
    { header: 'Capturista', key: 'capturista', width: 22 },
    { header: 'Conciliada', key: 'conciliada', width: 11 },
    { header: 'Origen', key: 'origen', width: 14 },
    { header: 'Notas', key: 'notas', width: 40 },
    { header: 'ID completo', key: 'id', width: 38 },
  ];
  estiloCabecera(detalle.getRow(1));
  for (const m of datos.activas) {
    const fila = detalle.addRow({
      fecha: formatoLocal(m.fecha_transaccion),
      folio: m.id.slice(-6).toUpperCase(),
      tipo: m.tipo,
      categoria: m.categoria,
      monto: Number(m.monto) * (m.tipo === 'egreso' ? -1 : 1),
      capturista: m.capturista,
      conciliada: m.conciliada ? 'Sí' : 'No',
      origen: m.origen === 'ios_shortcut' ? 'Atajo iOS' : 'Panel web',
      notas: m.notas ?? '',
      id: m.id,
    });
    fila.getCell('monto').numFmt = FORMATO_MONEDA;
  }
  detalle.autoFilter = { from: 'A1', to: 'J1' };
  detalle.views = [{ state: 'frozen', ySplit: 1 }];

  // ---------- Hoja Cancelados (anexo de auditoría) ----------
  const cancelados = libro.addWorksheet('Cancelados');
  cancelados.columns = [
    { header: 'Fecha (local)', key: 'fecha', width: 18 },
    { header: 'Folio', key: 'folio', width: 10 },
    { header: 'Tipo', key: 'tipo', width: 10 },
    { header: 'Categoría', key: 'categoria', width: 22 },
    { header: 'Monto (no suma)', key: 'monto', width: 16 },
    { header: 'Motivo de cancelación', key: 'motivo', width: 45 },
    { header: 'ID completo', key: 'id', width: 38 },
  ];
  estiloCabecera(cancelados.getRow(1));
  for (const m of datos.canceladas) {
    const fila = cancelados.addRow({
      fecha: formatoLocal(m.fecha_transaccion),
      folio: m.id.slice(-6).toUpperCase(),
      tipo: m.tipo,
      categoria: m.categoria,
      monto: Number(m.monto),
      motivo: m.motivo_cancelacion ?? 'N/D',
      id: m.id,
    });
    fila.getCell('monto').numFmt = FORMATO_MONEDA;
  }

  return Buffer.from(await libro.xlsx.writeBuffer());
}

module.exports = { generarExcelMensual };
