// Resumen financiero para el dashboard del panel web (spec 3.2):
// flujo de caja (balance dinámico), ingresos vs gastos y desglose por categoría.
const dashboardRepository = require('../repositories/dashboard.repository');

function inicioDeMesUTC(fecha) {
  return new Date(Date.UTC(fecha.getUTCFullYear(), fecha.getUTCMonth(), 1));
}

function inicioDeAnioUTC(fecha) {
  return new Date(Date.UTC(fecha.getUTCFullYear(), 0, 1));
}

async function resumen() {
  const ahora = new Date();
  const inicioMes = inicioDeMesUTC(ahora);
  const inicioMesSiguiente = new Date(Date.UTC(ahora.getUTCFullYear(), ahora.getUTCMonth() + 1, 1));
  const inicioAnio = inicioDeAnioUTC(ahora);
  const hace12Meses = new Date(Date.UTC(ahora.getUTCFullYear(), ahora.getUTCMonth() - 11, 1));

  const [historico, mesActual, anioActual, serie, categoriasMes] = await Promise.all([
    dashboardRepository.totales(),
    dashboardRepository.totalesPeriodo(inicioMes, inicioMesSiguiente),
    dashboardRepository.totalesPeriodo(inicioAnio, inicioMesSiguiente),
    dashboardRepository.serieMensual(hace12Meses),
    dashboardRepository.desglosePorCategoria(inicioMes, inicioMesSiguiente),
  ]);

  // DECIMAL llega como string desde mysql2: convertir una sola vez aquí
  const num = (v) => Number(v ?? 0);

  return {
    balanceTotal: num(historico.ingresos) - num(historico.egresos),
    mesActual: { ingresos: num(mesActual.ingresos), egresos: num(mesActual.egresos) },
    anioActual: { ingresos: num(anioActual.ingresos), egresos: num(anioActual.egresos) },
    serieMensual: serie.map((r) => ({ mes: r.mes, ingresos: num(r.ingresos), egresos: num(r.egresos) })),
    porCategoriaMes: categoriasMes.map((r) => ({ categoria: r.categoria, tipo: r.tipo, total: num(r.total) })),
  };
}

module.exports = { resumen };
