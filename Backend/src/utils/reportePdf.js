// Generador del reporte mensual en PDF (spec 3.2): formato formal con
// logotipo (Backend/assets/logo.png si existe), cifras oficiales del mes
// y espacio en blanco reservado para firma física — sin firmas electrónicas.
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const { formatoLocal } = require('./fechas');

const VERDE = '#1F6B3B';
const GRIS = '#666666';
const RUTA_LOGO = path.join(__dirname, '..', '..', 'assets', 'logo.png');

const money = (n) =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(Number(n));

function generarPdfMensual(datos) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'LETTER', margins: { top: 50, bottom: 60, left: 50, right: 50 }, bufferPages: true });
    const chunks = [];
    doc.on('data', (c) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const anchoUtil = doc.page.width - 100; // márgenes de 50 a cada lado

    // ---------- Encabezado ----------
    let xTitulo = 50;
    if (fs.existsSync(RUTA_LOGO)) {
      try {
        doc.image(RUTA_LOGO, 50, 45, { fit: [55, 55] });
        xTitulo = 118;
      } catch {
        /* logo corrupto: continuar sin él */
      }
    }
    doc.fillColor(VERDE).font('Helvetica-Bold').fontSize(16).text(datos.iglesia, xTitulo, 48);
    doc.fillColor('#000000').fontSize(13)
      .text(`Reporte Mensual de Ingresos y Egresos — ${datos.nombreMes} ${datos.anio}`, xTitulo, 70);
    doc.font('Helvetica').fontSize(8).fillColor(GRIS)
      .text(`Generado: ${formatoLocal(datos.generadoEn)} · Documento de cierre contable`, xTitulo, 88);
    doc.moveTo(50, 110).lineTo(50 + anchoUtil, 110).lineWidth(1.5).strokeColor(VERDE).stroke();
    doc.y = 122;

    const saltoSiNecesario = (alturaNecesaria = 60) => {
      if (doc.y > doc.page.height - doc.page.margins.bottom - alturaNecesaria) doc.addPage();
    };

    // ---------- Resumen ----------
    doc.font('Helvetica-Bold').fontSize(11).fillColor('#000000').text('Resumen del mes', 50, doc.y);
    doc.moveDown(0.4);
    const resumen = [
      ['Total de ingresos', money(datos.totales.ingresos)],
      ['Total de egresos', money(datos.totales.egresos)],
      ['Resultado del mes', money(datos.totales.resultado)],
      ['Movimientos registrados', String(datos.activas.length)],
      ['Movimientos cancelados (anexo)', String(datos.canceladas.length)],
    ];
    doc.font('Helvetica').fontSize(9.5);
    for (const [etiqueta, valor] of resumen) {
      const y = doc.y;
      doc.fillColor(GRIS).text(etiqueta, 60, y, { width: 250 });
      doc.fillColor('#000000').font('Helvetica-Bold').text(valor, 320, y);
      doc.font('Helvetica');
      doc.y = y + 15;
    }
    doc.moveDown(0.8);

    // ---------- Desglose por categoría ----------
    doc.font('Helvetica-Bold').fontSize(11).text('Desglose por categoría', 50, doc.y);
    doc.moveDown(0.4);
    if (datos.porCategoria.length === 0) {
      doc.font('Helvetica').fontSize(9.5).fillColor(GRIS).text('Sin movimientos en el periodo.', 60);
    } else {
      const yCab = doc.y;
      doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#FFFFFF');
      doc.rect(50, yCab - 2, anchoUtil, 16).fill(VERDE);
      doc.fillColor('#FFFFFF')
        .text('Categoría', 58, yCab + 1, { width: 200 })
        .text('Tipo', 270, yCab + 1, { width: 80 })
        .text('Movs.', 360, yCab + 1, { width: 50, align: 'right' })
        .text('Total', 430, yCab + 1, { width: 120, align: 'right' });
      doc.y = yCab + 18;
      doc.font('Helvetica').fontSize(9).fillColor('#000000');
      for (const c of datos.porCategoria) {
        saltoSiNecesario(30);
        const y = doc.y;
        doc.text(c.categoria, 58, y, { width: 200 })
          .text(c.tipo === 'ingreso' ? 'Ingreso' : 'Egreso', 270, y, { width: 80 })
          .text(String(c.movimientos), 360, y, { width: 50, align: 'right' })
          .text(money(c.total), 430, y, { width: 120, align: 'right' });
        doc.y = y + 15;
      }
    }
    doc.moveDown(0.8);

    // ---------- Detalle de movimientos ----------
    saltoSiNecesario(90);
    doc.font('Helvetica-Bold').fontSize(11).text('Detalle de movimientos', 50, doc.y);
    doc.moveDown(0.4);
    const cabDetalle = () => {
      const y = doc.y;
      doc.rect(50, y - 2, anchoUtil, 16).fill(VERDE);
      doc.font('Helvetica-Bold').fontSize(8).fillColor('#FFFFFF')
        .text('Fecha', 56, y + 1, { width: 78 })
        .text('Folio', 138, y + 1, { width: 44 })
        .text('Tipo', 186, y + 1, { width: 42 })
        .text('Categoría', 232, y + 1, { width: 92 })
        .text('Capturista', 328, y + 1, { width: 80 })
        .text('Conc.', 412, y + 1, { width: 30 })
        .text('Monto', 448, y + 1, { width: 102, align: 'right' });
      doc.y = y + 18;
      doc.font('Helvetica').fontSize(8).fillColor('#000000');
    };
    if (datos.activas.length === 0) {
      doc.font('Helvetica').fontSize(9.5).fillColor(GRIS).text('Sin movimientos activos en el periodo.', 60);
    } else {
      cabDetalle();
      for (const m of datos.activas) {
        if (doc.y > doc.page.height - doc.page.margins.bottom - 30) {
          doc.addPage();
          cabDetalle();
        }
        const y = doc.y;
        const signo = m.tipo === 'ingreso' ? '' : '-';
        doc.text(formatoLocal(m.fecha_transaccion), 56, y, { width: 78 })
          .text(m.id.slice(-6).toUpperCase(), 138, y, { width: 44 })
          .text(m.tipo === 'ingreso' ? 'Ingreso' : 'Egreso', 186, y, { width: 42 })
          .text(m.categoria, 232, y, { width: 92, ellipsis: true, height: 12 })
          .text(m.capturista, 328, y, { width: 80, ellipsis: true, height: 12 })
          .text(m.conciliada ? 'Sí' : 'No', 412, y, { width: 30 })
          .text(`${signo}${money(m.monto)}`, 448, y, { width: 102, align: 'right' });
        doc.y = y + 14;
      }
    }

    // ---------- Anexo: cancelados ----------
    if (datos.canceladas.length > 0) {
      doc.moveDown(0.8);
      saltoSiNecesario(80);
      doc.font('Helvetica-Bold').fontSize(11).fillColor('#000000')
        .text('Anexo — Movimientos cancelados (no suman al cierre)', 50, doc.y);
      doc.moveDown(0.4);
      doc.font('Helvetica').fontSize(8).fillColor(GRIS);
      for (const m of datos.canceladas) {
        saltoSiNecesario(30);
        const y = doc.y;
        doc.text(
          `${formatoLocal(m.fecha_transaccion)} · Folio ${m.id.slice(-6).toUpperCase()} · ${m.categoria} · ${money(m.monto)} — Motivo: ${m.motivo_cancelacion ?? 'N/D'}`,
          58,
          y,
          { width: anchoUtil - 16 }
        );
        doc.moveDown(0.3);
      }
    }

    // ---------- Espacio reservado para firma física (spec 3.2) ----------
    if (doc.y > doc.page.height - 200) doc.addPage();
    doc.y = doc.page.height - 175;
    const yFirma = doc.y;
    doc.lineWidth(0.8).strokeColor('#000000');
    doc.moveTo(80, yFirma + 55).lineTo(270, yFirma + 55).stroke();
    doc.moveTo(330, yFirma + 55).lineTo(520, yFirma + 55).stroke();
    doc.font('Helvetica').fontSize(9).fillColor('#000000')
      .text('Tesorero(a)', 80, yFirma + 60, { width: 190, align: 'center' })
      .text('Pastor / Auditor', 330, yFirma + 60, { width: 190, align: 'center' });
    doc.fontSize(7.5).fillColor(GRIS)
      .text('Nombre y firma', 80, yFirma + 73, { width: 190, align: 'center' })
      .text('Nombre y firma', 330, yFirma + 73, { width: 190, align: 'center' });

    // ---------- Pie de página con numeración ----------
    const rango = doc.bufferedPageRange();
    for (let i = rango.start; i < rango.start + rango.count; i++) {
      doc.switchToPage(i);
      // Anular el margen inferior mientras se escribe el pie: si no, PDFKit
      // agrega una página en blanco al detectar texto dentro del margen
      const margenInferior = doc.page.margins.bottom;
      doc.page.margins.bottom = 0;
      doc.font('Helvetica').fontSize(7.5).fillColor(GRIS).text(
        `${datos.iglesia} · Cierre ${datos.nombreMes} ${datos.anio} · Página ${i + 1} de ${rango.count}`,
        50,
        doc.page.height - 40,
        { width: anchoUtil, align: 'center', lineBreak: false }
      );
      doc.page.margins.bottom = margenInferior;
    }

    doc.end();
  });
}

module.exports = { generarPdfMensual };
