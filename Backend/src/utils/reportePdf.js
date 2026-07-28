// Generador del reporte mensual en PDF con el formato oficial de la
// organización (ver config/plantillaReporte.js). Reproduce el documento tal
// como lo usa la iglesia: encabezado institucional, tabla de INGRESOS por día
// del mes, catálogo fijo de EGRESOS, RESUMEN de caja y firmas de Pastor y
// Tesorera. El formato no debe modificarse: cualquier ajuste de textos o de
// orden de conceptos va en la configuración, no aquí.
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

const NEGRO = '#000000';
const GRIS_CAB = '#D9D9D9';

// Sello de la organización, a la izquierda del encabezado. Va en PNG porque
// pdfkit no rasteriza SVG; el original vectorial está en docs/logo/.
const RUTA_LOGO = path.join(__dirname, '..', '..', 'assets', 'logo-miep.png');
const LADO_LOGO = 44;

// Geometría: carta vertical con los márgenes del formato original
// (0.7" laterales, 0.75" superior/inferior).
const MARGEN_X = 50.4;
const MARGEN_Y = 54;
const ANCHO = 511.2;

// Alturas compactas para que el formato completo quepa en una hoja, igual que
// el original impreso al 76% de escala.
const ALTO_FILA = 8.2;
const ALTO_CAB = 11;

// Anchos de la tabla de INGRESOS (suman ANCHO)
const COLS_ING = [
  { clave: 'dia', titulo: 'DIA', ancho: 34, align: 'center' },
  { clave: 'folio', titulo: 'FOLIO', ancho: 52, align: 'center' },
  { clave: 'actividad', titulo: 'ACTIVIDAD', ancho: 145, align: 'left' },
  { clave: 'OFRENDAS', titulo: 'OFRENDAS', ancho: 56, align: 'center' },
  { clave: 'DIEZMOS', titulo: 'DIEZMOS', ancho: 56, align: 'center' },
  { clave: 'TALENTOS', titulo: 'TALENTOS', ancho: 56, align: 'center' },
  { clave: 'APORTACIONES', titulo: 'APORTACIONES', ancho: 56, align: 'center' },
  { clave: 'total', titulo: 'TOTALES', ancho: 56.2, align: 'center' },
];

// Anchos de la tabla de EGRESOS (suman ANCHO)
const COLS_EGR = [
  { titulo: 'NUM.', ancho: 34, align: 'center' },
  { titulo: 'CONCEPTO', ancho: 197, align: 'left' },
  { titulo: 'FOLIO FACTURA/RECIBO', ancho: 112, align: 'center' },
  { titulo: 'FECHA', ancho: 84, align: 'center' },
  { titulo: 'IMPORTE', ancho: 84.2, align: 'center' },
];

const money = (n) =>
  Number(n || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
// El formato deja la casilla vacía cuando no hubo movimiento (no imprime 0.00)
const moneyOVacio = (n) => (Number(n || 0) === 0 ? '' : money(n));

/** Dibuja una celda con borde y su texto centrado verticalmente. */
function celda(doc, { x, y, w, h, texto = '', align = 'left', bold = false, size = 7, relleno = null }) {
  doc.lineWidth(0.5);
  if (relleno) doc.rect(x, y, w, h).fillAndStroke(relleno, NEGRO);
  else doc.rect(x, y, w, h).strokeColor(NEGRO).stroke();

  if (texto === '' || texto === null || texto === undefined) return;
  doc.font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(size).fillColor(NEGRO);
  const alturaTexto = doc.currentLineHeight();
  doc.text(String(texto), x + 3, y + (h - alturaTexto) / 2, {
    width: w - 6,
    align,
    lineBreak: false,
    ellipsis: true,
  });
}

/** Dibuja una fila completa a partir de la definición de columnas. */
function filaTabla(doc, columnas, valores, y, opciones = {}) {
  let x = MARGEN_X;
  columnas.forEach((col, i) => {
    celda(doc, {
      x,
      y,
      w: col.ancho,
      h: opciones.alto ?? ALTO_FILA,
      texto: valores[i],
      align: opciones.alignCab ?? col.align,
      bold: opciones.bold ?? false,
      size: opciones.size ?? 6.5,
      relleno: opciones.relleno ?? null,
    });
    x += col.ancho;
  });
}

function generarPdfMensual(datos) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'LETTER',
      margins: { top: MARGEN_Y, bottom: MARGEN_Y, left: MARGEN_X, right: MARGEN_X },
    });
    const chunks = [];
    doc.on('data', (c) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const limiteInferior = doc.page.height - MARGEN_Y;
    let y = MARGEN_Y;

    // Salta de página si no cabe el bloque que sigue. `redibujarCabecera` se
    // usa dentro de las tablas para repetir su encabezado en la hoja nueva.
    const asegurarEspacio = (alto, redibujarCabecera = null) => {
      if (y + alto > limiteInferior) {
        doc.addPage();
        y = MARGEN_Y;
        if (redibujarCabecera) redibujarCabecera();
      }
    };

    // ---------------- Encabezado institucional ----------------
    // 52pt: justo lo que ocupan las 5 líneas de texto (la última arranca a
    // +40 y mide ~10), más un respiro para que no toque el borde del recuadro.
    const altoEnc = 52;
    doc.lineWidth(0.5).rect(MARGEN_X, y, ANCHO, altoEnc).strokeColor(NEGRO).stroke();

    // Sello a la izquierda, centrado en el alto del recuadro. El texto va
    // centrado sobre el ancho completo y su línea más larga arranca ~70pt
    // después del logo, así que no se encima. Si el archivo faltara, el
    // reporte se genera igual: es un cierre contable, no puede depender de él.
    if (fs.existsSync(RUTA_LOGO)) {
      try {
        doc.image(RUTA_LOGO, MARGEN_X + 5, y + (altoEnc - LADO_LOGO) / 2, {
          fit: [LADO_LOGO, LADO_LOGO],
        });
      } catch {
        /* logo ilegible: continuar sin él */
      }
    }

    let yTexto = y + 4;
    doc.font('Helvetica-Bold').fontSize(7.5).fillColor(NEGRO)
      .text(datos.institucion.linea1, MARGEN_X + 4, yTexto, { width: ANCHO - 8, align: 'center', lineBreak: false });
    yTexto += 9;
    doc.font('Helvetica').fontSize(6.5)
      .text(datos.institucion.linea2, MARGEN_X + 4, yTexto, { width: ANCHO - 8, align: 'center', lineBreak: false });
    yTexto += 8;
    doc.text(datos.institucion.linea3, MARGEN_X + 4, yTexto, { width: ANCHO - 8, align: 'center', lineBreak: false });
    yTexto += 9;
    doc.font('Helvetica-Bold').fontSize(7)
      .text(datos.institucion.departamento, MARGEN_X + 4, yTexto, { width: ANCHO - 8, align: 'center', lineBreak: false });
    yTexto += 10;
    doc.font('Helvetica-Bold').fontSize(8).text(
      `INGRESOS     CORRESPONDIENTE AL MES DE:   ${datos.periodo.nombreMes}     AÑO:   ${datos.periodo.anio}`,
      MARGEN_X + 4,
      yTexto,
      { width: ANCHO - 8, align: 'center', lineBreak: false }
    );
    y += altoEnc;

    // ---------------- Datos de la congregación ----------------
    const a = 34 + 52; // ancho de A+B en la retícula original
    const b = 145;
    const c = 56 * 2;
    const d = ANCHO - a - b - c;

    celda(doc, { x: MARGEN_X, y, w: a, h: 10, texto: 'PASTOR TITULAR:', bold: true, size: 6.5, align: 'center' });
    celda(doc, { x: MARGEN_X + a, y, w: b, h: 10, texto: datos.iglesia.pastorTitular, size: 7.5, align: 'center' });
    celda(doc, { x: MARGEN_X + a + b, y, w: c, h: 10, texto: 'IGLESIA:', bold: true, size: 6.5, align: 'center' });
    celda(doc, { x: MARGEN_X + a + b + c, y, w: d, h: 10, texto: datos.iglesia.nombre, size: 7.5, align: 'center' });
    y += 10;

    celda(doc, { x: MARGEN_X, y, w: a, h: 10, texto: 'PASTOR:', bold: true, size: 6.5, align: 'center' });
    celda(doc, { x: MARGEN_X + a, y, w: ANCHO - a, h: 10, texto: datos.iglesia.pastor, size: 7.5, align: 'center' });
    y += 10;

    const cuartos = [ANCHO * 0.25, ANCHO * 0.25, ANCHO * 0.25, ANCHO - ANCHO * 0.75];
    const etiquetas = ['LOCALIDAD', 'MUNICIPIO', 'ESTADO', 'TELEFONO'];
    const valores = [datos.iglesia.localidad, datos.iglesia.municipio, datos.iglesia.estado, datos.iglesia.telefono];
    let xq = MARGEN_X;
    etiquetas.forEach((etq, i) => {
      celda(doc, { x: xq, y, w: cuartos[i], h: 9.5, texto: etq, bold: true, size: 6.5, align: 'center' });
      xq += cuartos[i];
    });
    y += 9.5;
    xq = MARGEN_X;
    valores.forEach((val, i) => {
      celda(doc, { x: xq, y, w: cuartos[i], h: 10, texto: val, size: 7.5, align: 'center' });
      xq += cuartos[i];
    });
    y += 10;

    // ---------------- INGRESOS ----------------
    const cabeceraIngresos = () => {
      filaTabla(doc, COLS_ING, COLS_ING.map((col) => col.titulo), y, {
        alto: ALTO_CAB,
        bold: true,
        size: 6,
        relleno: GRIS_CAB,
        alignCab: 'center',
      });
      y += ALTO_CAB;
    };
    cabeceraIngresos();

    // Una fila por movimiento (los cancelados no llegan hasta aquí: el service
    // solo pasa las transacciones activas).
    for (const fila of datos.ingresos.filas) {
      asegurarEspacio(ALTO_FILA, cabeceraIngresos);
      filaTabla(
        doc,
        COLS_ING,
        [
          fila.dia,
          fila.folio,
          fila.actividad,
          moneyOVacio(fila.OFRENDAS),
          moneyOVacio(fila.DIEZMOS),
          moneyOVacio(fila.TALENTOS),
          moneyOVacio(fila.APORTACIONES),
          moneyOVacio(fila.total),
        ],
        y
      );
      y += ALTO_FILA;
    }

    asegurarEspacio(ALTO_CAB);
    const t = datos.ingresos.totales;
    filaTabla(
      doc,
      COLS_ING,
      ['', '', 'TOTALES', money(t.OFRENDAS), money(t.DIEZMOS), money(t.TALENTOS), money(t.APORTACIONES), money(t.total)],
      y,
      { alto: ALTO_CAB, bold: true, size: 6.5 }
    );
    y += ALTO_CAB + 3;

    // ---------------- EGRESOS ----------------
    asegurarEspacio(14 + ALTO_CAB + ALTO_FILA * 3);
    celda(doc, { x: MARGEN_X, y, w: ANCHO, h: 14, texto: 'EGRESOS', bold: true, size: 11, align: 'center' });
    y += 14;

    const cabeceraEgresos = () => {
      filaTabla(doc, COLS_EGR, COLS_EGR.map((col) => col.titulo), y, {
        alto: ALTO_CAB,
        bold: true,
        size: 6,
        relleno: GRIS_CAB,
        alignCab: 'center',
      });
      y += ALTO_CAB;
    };
    cabeceraEgresos();

    // Cada concepto ocupa al menos una fila aunque no tenga movimientos: el
    // formato imprime el catálogo completo. Los movimientos adicionales de un
    // mismo concepto ocupan filas extra debajo, sin repetir número ni nombre.
    for (const item of datos.egresos.conceptos) {
      const partidas = item.partidas.length > 0 ? item.partidas : [null];
      partidas.forEach((p, i) => {
        asegurarEspacio(ALTO_FILA, cabeceraEgresos);
        filaTabla(
          doc,
          COLS_EGR,
          [
            i === 0 ? item.num : '',
            i === 0 ? item.concepto : '',
            p ? p.folio : '',
            p ? p.fecha : '',
            p ? money(p.importe) : '',
          ],
          y
        );
        y += ALTO_FILA;
      });
    }

    // OTROS: lo que no coincide con el catálogo conserva aquí su categoría
    const otros = datos.egresos.otros.length > 0 ? datos.egresos.otros : [null];
    otros.forEach((p) => {
      asegurarEspacio(ALTO_FILA, cabeceraEgresos);
      filaTabla(
        doc,
        COLS_EGR,
        ['', p ? `OTROS: ${p.detalle}` : 'OTROS:', p ? p.folio : '', p ? p.fecha : '', p ? money(p.importe) : ''],
        y
      );
      y += ALTO_FILA;
    });

    asegurarEspacio(ALTO_CAB);
    filaTabla(doc, COLS_EGR, ['', '', '', 'TOTAL', money(datos.egresos.total)], y, {
      alto: ALTO_CAB,
      bold: true,
      size: 6.5,
    });
    y += ALTO_CAB + 3;

    // ---------------- RESUMEN ----------------
    // El bloque RESUMEN + firmas nunca debe partirse entre hojas
    asegurarEspacio(12 + 9 * 5 + 38);
    const anchoEtq = 260;
    const anchoVal = 100;
    celda(doc, { x: MARGEN_X, y, w: anchoEtq + anchoVal, h: 12, texto: 'RESUMEN', bold: true, size: 8, align: 'center' });
    y += 12;

    const filasResumen = [
      ['SALDO DEL MES', datos.resumen.saldoAnterior],
      ['INGRESOS DEL PRESENTE MES', datos.resumen.ingresosMes],
      ['TOTAL DE INGRESOS MAS SALDO ANTERIOR', datos.resumen.totalConSaldo],
      ['EGRESOS DEL PRESENTE MES', datos.resumen.egresosMes],
      ['SALDO EN CAJA AL FINAL DEL MES', datos.resumen.saldoFinal],
    ];
    for (const [etiqueta, valor] of filasResumen) {
      celda(doc, { x: MARGEN_X, y, w: anchoEtq, h: 9, texto: etiqueta, size: 6.5 });
      celda(doc, { x: MARGEN_X + anchoEtq, y, w: anchoVal, h: 9, texto: money(valor), size: 6.5, align: 'center' });
      y += 9;
    }

    // ---------------- Firmas ----------------
    y += 14;
    asegurarEspacio(24);
    const anchoFirma = 190;
    const xPastor = MARGEN_X + 10;
    const xTesorera = MARGEN_X + ANCHO - anchoFirma - 10;
    doc.lineWidth(0.6).strokeColor(NEGRO);
    doc.moveTo(xPastor, y).lineTo(xPastor + anchoFirma, y).stroke();
    doc.moveTo(xTesorera, y).lineTo(xTesorera + anchoFirma, y).stroke();
    doc.font('Helvetica').fontSize(7.5).fillColor(NEGRO)
      .text(datos.firmas.pastor.nombre, xPastor, y + 3, { width: anchoFirma, align: 'center', lineBreak: false })
      .text(datos.firmas.tesorera.nombre, xTesorera, y + 3, { width: anchoFirma, align: 'center', lineBreak: false })
      .text(datos.firmas.pastor.cargo, xPastor, y + 13, { width: anchoFirma, align: 'center', lineBreak: false })
      .text(datos.firmas.tesorera.cargo, xTesorera, y + 13, { width: anchoFirma, align: 'center', lineBreak: false });

    doc.end();
  });
}

module.exports = { generarPdfMensual };
