// Cierre mensual (spec 3.2 y FASE 3): reúne las cifras oficiales del mes
// para los generadores de PDF y Excel. Las transacciones canceladas no
// suman: se listan aparte como anexo de auditoría.
const env = require('../config/env');
const reportesRepository = require('../repositories/reportes.repository');
const { rangoMesLocal, nombreMes } = require('../utils/fechas');

async function datosMensual(anio, mes) {
  const { desde, hasta } = rangoMesLocal(anio, mes);

  const [movimientos, porCategoria] = await Promise.all([
    reportesRepository.transaccionesDelPeriodo(desde, hasta),
    reportesRepository.totalesPorCategoria(desde, hasta),
  ]);

  const activas = movimientos.filter((m) => m.estado === 'activa');
  const canceladas = movimientos.filter((m) => m.estado === 'cancelada');

  const num = (v) => Number(v ?? 0);
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

module.exports = { datosMensual };
