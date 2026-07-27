// Conversión UTC <-> zona horaria local de la iglesia (spec 6.1):
// la BD guarda UTC; los límites de mes y el formato de salida usan la
// zona configurada en LOCAL_TIMEZONE. Centralizado aquí, no en clientes.
const env = require('../config/env');

// Desfase (ms) de una zona horaria respecto a UTC en una fecha dada
function offsetMs(fechaUtc, tz) {
  const enUtc = new Date(fechaUtc.toLocaleString('en-US', { timeZone: 'UTC' }));
  const enLocal = new Date(fechaUtc.toLocaleString('en-US', { timeZone: tz }));
  return enLocal.getTime() - enUtc.getTime();
}

/**
 * Rango [desde, hasta) en UTC que corresponde al mes calendario
 * (anio, mes 1-12) en la zona horaria local de la iglesia.
 */
function rangoMesLocal(anio, mes, tz = env.localTimezone) {
  const inicioNominal = new Date(Date.UTC(anio, mes - 1, 1));
  const finNominal = new Date(Date.UTC(anio, mes, 1));
  return {
    desde: new Date(inicioNominal.getTime() - offsetMs(inicioNominal, tz)),
    hasta: new Date(finNominal.getTime() - offsetMs(finNominal, tz)),
  };
}

function formatoLocal(fechaUtc, tz = env.localTimezone) {
  return new Date(fechaUtc).toLocaleString('es-MX', {
    timeZone: tz,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

function nombreMes(mes) {
  return new Date(2000, mes - 1, 1).toLocaleDateString('es-MX', { month: 'long' });
}

/**
 * Descompone una fecha UTC en año/mes/día tal como se ven en la zona local de
 * la iglesia. Necesario para asentar cada movimiento en su día correcto del
 * formato oficial: una ofrenda de las 23:00 hora local cae al día siguiente en
 * UTC, y en el reporte debe aparecer en el día en que realmente se recibió.
 */
function partesLocales(fechaUtc, tz = env.localTimezone) {
  const partes = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
    .formatToParts(new Date(fechaUtc))
    .reduce((acc, p) => ({ ...acc, [p.type]: p.value }), {});
  return { anio: Number(partes.year), mes: Number(partes.month), dia: Number(partes.day) };
}

/** Fecha corta dd/mm/aaaa en hora local (formato de la columna FECHA del reporte) */
function formatoFechaCorta(fechaUtc, tz = env.localTimezone) {
  const { anio, mes, dia } = partesLocales(fechaUtc, tz);
  return `${String(dia).padStart(2, '0')}/${String(mes).padStart(2, '0')}/${anio}`;
}

module.exports = {
  rangoMesLocal,
  formatoLocal,
  nombreMes,
  offsetMs,
  partesLocales,
  formatoFechaCorta,
};
