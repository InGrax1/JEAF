// Cierre mensual (spec 3.2 y FASE 3): reúne las cifras oficiales del mes
// para los generadores de PDF y Excel. Las transacciones canceladas no
// suman: se listan aparte como anexo de auditoría.
//
// `datosPlantilla` traduce esas cifras al formato oficial de la organización
// (ver config/plantillaReporte.js): las categorías libres de JEAF se reparten
// en las casillas fijas del formato y los movimientos se asientan por día.
const env = require('../config/env');
const reportesRepository = require('../repositories/reportes.repository');
const { rangoMesLocal, nombreMes, partesLocales, formatoFechaCorta } = require('../utils/fechas');
const plantilla = require('../config/plantillaReporte');

const num = (v) => Number(v ?? 0);
const folioDe = (id) => String(id).slice(-6).toUpperCase();

async function datosMensual(anio, mes) {
  const { desde, hasta } = rangoMesLocal(anio, mes);

  const [movimientos, porCategoria] = await Promise.all([
    reportesRepository.transaccionesDelPeriodo(desde, hasta),
    reportesRepository.totalesPorCategoria(desde, hasta),
  ]);

  const activas = movimientos.filter((m) => m.estado === 'activa');
  const canceladas = movimientos.filter((m) => m.estado === 'cancelada');

  const totalIngresos = activas.filter((m) => m.tipo === 'ingreso').reduce((s, m) => s + num(m.monto), 0);
  const totalEgresos = activas.filter((m) => m.tipo === 'egreso').reduce((s, m) => s + num(m.monto), 0);

  return {
    iglesia: env.iglesiaNombre,
    anio,
    mes,
    nombreMes: nombreMes(mes),
    rango: { desde, hasta },
    generadoEn: new Date(),
    totales: {
      ingresos: totalIngresos,
      egresos: totalEgresos,
      resultado: totalIngresos - totalEgresos,
    },
    porCategoria: porCategoria.map((c) => ({
      categoria: c.categoria,
      tipo: c.tipo,
      total: num(c.total),
      movimientos: c.movimientos,
    })),
    activas,
    canceladas,
  };
}

/** Días que tiene el mes (para no imprimir un 31 en febrero) */
function diasDelMes(anio, mes) {
  return new Date(Date.UTC(anio, mes, 0)).getUTCDate();
}

/**
 * Arma la estructura exacta que pide el formato oficial impreso.
 * Devuelve las cifras ya repartidas en las casillas fijas del documento.
 */
async function datosPlantilla(anio, mes) {
  const base = await datosMensual(anio, mes);
  const acumulado = await reportesRepository.acumuladoAntesDe(base.rango.desde);

  // ---------- INGRESOS: una fila por movimiento, agrupadas por día ----------
  // El formato lista los 31 días del mes; los días con varios movimientos
  // ocupan una fila por movimiento (misma convención que la sección de
  // egresos), de modo que cada transacción aparece con su folio y se puede
  // auditar una por una en vez de ver solo el total del día.
  const totalDias = diasDelMes(anio, mes);
  const filaVacia = () =>
    plantilla.COLUMNAS_INGRESO.reduce((acc, col) => ({ ...acc, [col]: 0 }), {});

  const porDia = new Map();
  for (const m of base.activas.filter((t) => t.tipo === 'ingreso')) {
    const { dia } = partesLocales(m.fecha_transaccion);
    if (dia < 1 || dia > totalDias) continue; // defensa: fecha fuera del mes
    if (!porDia.has(dia)) porDia.set(dia, []);
    porDia.get(dia).push(m);
  }

  const filas = [];
  for (let dia = 1; dia <= totalDias; dia++) {
    const movimientos = porDia.get(dia) ?? [];
    if (movimientos.length === 0) {
      filas.push({ dia, folio: '', actividad: '', ...filaVacia(), total: 0 });
      continue;
    }
    movimientos.forEach((m, i) => {
      const fila = {
        // Solo la primera fila del día lleva el número, igual que en egresos
        dia: i === 0 ? dia : '',
        folio: folioDe(m.id),
        actividad: plantilla.ACTIVIDAD_POR_DEFECTO,
        ...filaVacia(),
        total: num(m.monto),
      };
      fila[plantilla.columnaIngreso(m.categoria)] = num(m.monto);
      filas.push(fila);
    });
  }

  const totalesIngreso = plantilla.COLUMNAS_INGRESO.reduce(
    (acc, col) => ({ ...acc, [col]: filas.reduce((s, f) => s + f[col], 0) }),
    {}
  );
  totalesIngreso.total = filas.reduce((s, f) => s + f.total, 0);

  // ---------- EGRESOS: catálogo fijo + OTROS ----------
  // Cada concepto conserva su fila aunque no tenga movimientos (el formato
  // imprime el catálogo completo); los que tienen varios movimientos ocupan
  // una fila por movimiento, como en el Excel original.
  const partidasPorConcepto = new Map(plantilla.CONCEPTOS_EGRESO.map((c) => [c, []]));
  const otros = [];

  for (const m of base.activas.filter((t) => t.tipo === 'egreso')) {
    const partida = {
      folio: folioDe(m.id),
      fecha: formatoFechaCorta(m.fecha_transaccion),
      importe: num(m.monto),
      detalle: m.categoria,
    };
    const concepto = plantilla.conceptoEgreso(m.categoria);
    if (concepto === plantilla.CONCEPTO_EGRESO_RESTO) otros.push(partida);
    else partidasPorConcepto.get(concepto).push(partida);
  }

  const conceptos = plantilla.CONCEPTOS_EGRESO.map((concepto, i) => ({
    num: i + 1,
    concepto,
    partidas: partidasPorConcepto.get(concepto),
  }));

  const totalEgresos = base.totales.egresos;

  // ---------- RESUMEN ----------
  const saldoAnterior =
    env.saldoInicialCaja + num(acumulado.ingresos) - num(acumulado.egresos);
  const ingresosMes = totalesIngreso.total;
  const totalConSaldo = saldoAnterior + ingresosMes;

  return {
    institucion: plantilla.INSTITUCION,
    iglesia: plantilla.IGLESIA,
    firmas: plantilla.FIRMAS,
    periodo: { anio, mes, nombreMes: nombreMes(mes).toUpperCase() },
    generadoEn: base.generadoEn,
    columnasIngreso: plantilla.COLUMNAS_INGRESO,
    ingresos: { filas, totales: totalesIngreso },
    egresos: { conceptos, otros, total: totalEgresos },
    resumen: {
      saldoAnterior,
      ingresosMes,
      totalConSaldo,
      egresosMes: totalEgresos,
      saldoFinal: totalConSaldo - totalEgresos,
    },
  };
}

module.exports = { datosMensual, datosPlantilla };
