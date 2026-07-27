// Controller de reportes: arma el archivo (PDF/Excel) y lo envía como descarga.
const reportesService = require('../services/reportes.service');
const { generarPdfMensual } = require('../utils/reportePdf');
const { generarExcelMensual } = require('../utils/reporteExcel');

async function mensual(req, res, next) {
  try {
    const { anio, mes, formato } = req.query;
    const nombreBase = `JEAF_Reporte_${anio}-${String(mes).padStart(2, '0')}`;

    if (formato === 'xlsx') {
      // El Excel sigue siendo el desglose contable interno; el PDF es el
      // formato oficial de la organización (ver utils/reportePdf.js).
      const datos = await reportesService.datosMensual(anio, mes);
      const buffer = await generarExcelMensual(datos);
      res
        .set({
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename="${nombreBase}.xlsx"`,
          'Content-Length': buffer.length,
        })
        .send(buffer);
    } else {
      const datos = await reportesService.datosPlantilla(anio, mes);
      const buffer = await generarPdfMensual(datos);
      res
        .set({
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="${nombreBase}.pdf"`,
          'Content-Length': buffer.length,
        })
        .send(buffer);
    }
  } catch (err) {
    next(err);
  }
}

module.exports = { mensual };
